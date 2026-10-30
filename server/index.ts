import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { config } from './config';
import { CERT_SELECT, pool, toCertificate, toScanLog, toUser, toDbDateTime } from './db';
import { hasValidToken, rateLimit, requireAuth, requireSuperAdmin, signToken, type AuthedRequest } from './auth';
import { generateCertificatePdf } from './pdf';
import { saveDocument, sniffMime } from './documents';
import { seedDemo } from './seed';
import type { Certificate } from '../src/types';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const ah = (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const baseUrlFor = (req: Request) => config.publicUrl || `${req.protocol}://${req.get('host')}`;

// ---- certificate field spec (camelCase API <-> snake_case column) ------------
type Spec = { col: string; kind: 'str' | 'date' | 'enum' | 'int'; max?: number; values?: string[]; required?: boolean };
const FIELDS: Record<string, Spec> = {
  certificateId: { col: 'certificate_id', kind: 'str', max: 60, required: true },
  status: { col: 'status', kind: 'enum', values: ['valid', 'expiring', 'revoked', 'draft'] },
  traineeTitle: { col: 'trainee_title', kind: 'enum', values: ['Mr.', 'Ms.', 'Capt.', 'Eng.', 'Dr.'] },
  traineeName: { col: 'trainee_name', kind: 'str', max: 160, required: true },
  passportNumber: { col: 'passport_number', kind: 'str', max: 40 },
  nationality: { col: 'nationality', kind: 'str', max: 60 },
  courseTitle: { col: 'course_title', kind: 'str', max: 255 },
  stcwRegulation: { col: 'stcw_regulation', kind: 'str', max: 400 },
  approvalResolution: { col: 'approval_resolution', kind: 'str', max: 160 },
  approvalAuthority: { col: 'approval_authority', kind: 'str', max: 255 },
  approvalDate: { col: 'approval_date', kind: 'date' },
  approvalValidUntil: { col: 'approval_valid_until', kind: 'date' },
  trainingStartDate: { col: 'training_start_date', kind: 'date' },
  trainingEndDate: { col: 'training_end_date', kind: 'date' },
  trainingMode: { col: 'training_mode', kind: 'enum', values: ['Presential', 'Online', 'Blended'] },
  trainingLocation: { col: 'training_location', kind: 'str', max: 190 },
  issueDate: { col: 'issue_date', kind: 'date' },
  expiryDate: { col: 'expiry_date', kind: 'date' },
  validityYears: { col: 'validity_years', kind: 'int' },
  signatoryName: { col: 'signatory_name', kind: 'str', max: 120 },
  signatoryTitle: { col: 'signatory_title', kind: 'str', max: 160 },
};

const today = () => new Date().toISOString().slice(0, 10);
const plusYears = (n: number) => new Date(Date.now() + n * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const DEFAULTS = (): Record<string, unknown> => ({
  status: 'valid',
  traineeTitle: 'Mr.',
  passportNumber: 'N/A',
  courseTitle: 'STCW Maritime Training Course',
  stcwRegulation: 'STCW 1978 as amended, Regulation VI/2',
  approvalResolution: 'Resolution No. DGGM-CFM-005-2024',
  approvalAuthority: 'Government of Panama, Directorate General of Merchant Marine',
  approvalDate: '2024-02-06',
  approvalValidUntil: '2026-06-12',
  trainingStartDate: today(),
  trainingEndDate: today(),
  trainingMode: 'Presential',
  trainingLocation: 'Panama Maritime Academy, Balboa',
  issueDate: today(),
  expiryDate: plusYears(5),
  validityYears: 5,
  signatoryName: 'Claudia Galeano',
  signatoryTitle: 'CTC General Manager',
});

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Validates the provided keys only; returns column->value. */
function validateFields(input: any, keys: string[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of keys) {
    const spec = FIELDS[key];
    let v = input[key];
    if (v === undefined || v === null || v === '') {
      if (spec.required) throw new HttpError(400, `${key} is required`);
      continue;
    }
    if (spec.kind === 'int') {
      v = Number(v);
      if (!Number.isInteger(v) || v < 1 || v > 50) throw new HttpError(400, `${key} must be a whole number between 1 and 50`);
    } else {
      v = String(v).trim();
      if (spec.kind === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))) {
        throw new HttpError(400, `${key} must be a date (YYYY-MM-DD)`);
      }
      if (spec.kind === 'enum' && !spec.values!.includes(v)) throw new HttpError(400, `${key} must be one of ${spec.values!.join(', ')}`);
      if (spec.kind === 'str' && v.length > (spec.max ?? 255)) throw new HttpError(400, `${key} is too long`);
    }
    out[spec.col] = v;
  }
  return out;
}

async function newUniqueNumber(db: Pool | PoolConnection): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const n = String(Math.floor(10 ** 13 + Math.random() * 9 * 10 ** 13));
    const [r] = await db.query<any[]>('SELECT 1 FROM certificates WHERE unique_number = ?', [n]);
    if (!r.length) return n;
  }
  throw new HttpError(500, 'Could not allocate a unique number');
}

async function fetchCertificate(db: Pool | PoolConnection, where: string, params: unknown[]): Promise<Certificate | null> {
  const [rows] = await db.query<any[]>(`${CERT_SELECT} WHERE ${where} LIMIT 1`, params);
  return rows.length ? toCertificate(rows[0]) : null;
}

interface UploadedFile { originalname: string; buffer: Buffer }

async function createCertificate(data: any, user: { id: string }, file: UploadedFile | undefined, baseUrl: string): Promise<Certificate> {
  const uniqueNumber = data.uniqueNumber ? String(data.uniqueNumber).replace(/\D/g, '') : '';
  if (data.uniqueNumber && uniqueNumber.length !== 14) throw new HttpError(400, 'Unique number must be exactly 14 digits');

  const merged = { ...DEFAULTS(), ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v != null)) } as any;
  if (!merged.certificateId) merged.certificateId = `UAG-TC-26-${Math.floor(Math.random() * 9000 + 1000)}`;
  if (!merged.traineeName) merged.traineeName = 'UNKNOWN SEAFARER';
  merged.traineeName = String(merged.traineeName).toUpperCase();
  const cols = validateFields(merged, Object.keys(FIELDS));

  let uploadMime: string | null = null;
  if (file) {
    uploadMime = sniffMime(file.buffer);
    if (!uploadMime) throw new HttpError(400, 'Only PDF, PNG or JPEG files are accepted');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = `cert-${randomUUID().slice(0, 12)}`;
    const row = { id, unique_number: uniqueNumber || (await newUniqueNumber(conn)), ...cols, created_by: user.id };
    const keys = Object.keys(row);
    try {
      await conn.query(`INSERT INTO certificates (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(row));
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, /unique_number/.test(e.message) ? 'This 14-digit number is already registered' : 'This Certificate ID is already registered');
      }
      throw e;
    }
    let cert = (await fetchCertificate(conn, 'c.id = ?', [id]))!;
    if (file && uploadMime) {
      await saveDocument(conn, id, { fileName: file.originalname.slice(0, 250), mimeType: uploadMime, data: file.buffer, uploadedBy: user.id });
    } else {
      const pdf = await generateCertificatePdf(cert, baseUrl);
      await saveDocument(conn, id, { fileName: `${cert.certificateId}.pdf`, mimeType: 'application/pdf', data: pdf, generated: true, uploadedBy: user.id });
    }
    cert = (await fetchCertificate(conn, 'c.id = ?', [id]))!;
    await conn.commit();
    return cert;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ---- scan logging -------------------------------------------------------------
const deviceFromUA = (ua = '') => {
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/iPhone|iPod/i.test(ua)) return 'Mobile (iOS)';
  if (/Android/i.test(ua)) return 'Mobile (Android)';
  if (/Windows/i.test(ua)) return 'Desktop (Windows)';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Desktop (macOS)';
  return 'Desktop (Linux)';
};

async function logScan(req: Request, cert: Certificate | null, queried: string, method: string) {
  const ip = (req.ip || '').replace('::ffff:', '') || 'unknown';
  const device = deviceFromUA(req.get('user-agent'));
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO scan_logs (id, certificate_unique_number, certificate_id, trainee_name, ip_address, device_type,
         search_method, is_suspicious, suspicion_reason) VALUES (?,?,?,?,?,?,?,?,?)`,
      [`scan-${Date.now()}-${randomBytes(3).toString('hex')}`, cert?.uniqueNumber ?? queried.slice(0, 40), cert?.certificateId ?? 'UNKNOWN-PROBE',
        cert?.traineeName ?? 'N/A', ip.slice(0, 64), device, method, cert ? 0 : 1,
        cert ? null : 'Lookup of an unregistered certificate number'],
    );
    if (cert) {
      await conn.query('UPDATE certificates SET scan_count = scan_count + 1, last_scanned_at = UTC_TIMESTAMP() WHERE id = ?', [cert.id]);
    }
  } finally {
    conn.release();
  }
}

// =============================== PUBLIC API =====================================
const publicLimiter = rateLimit(120, 60_000);

app.get('/api/health', ah(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.get('/api/config', ah(async (req, res) => {
  const [rows] = await pool.query<any[]>('SELECT config_key, config_value FROM portal_settings');
  const settings: Record<string, unknown> = {};
  for (const r of rows) settings[r.config_key] = JSON.parse(r.config_value);
  res.json({ settings, publicUrl: baseUrlFor(req) });
}));

app.get('/api/verify/:id', publicLimiter, ah(async (req, res) => {
  const id = String(req.params.id).trim();
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(id)) return res.status(400).json({ error: 'Invalid certificate number' });
  const isStaff = hasValidToken(req);
  const draftClause = isStaff ? '' : " AND c.status <> 'draft'";
  const cert = await fetchCertificate(pool, `(c.unique_number = ? OR c.certificate_id = ?)${draftClause}`, [id, id]);
  const method = req.query.method === 'qr_scan' ? 'qr_scan' : 'number_lookup';
  if (!isStaff) await logScan(req, cert, id, method);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  res.json(cert);
}));

app.get('/api/verify/:uniqueNumber/document', publicLimiter, ah(async (req, res) => {
  const isStaff = hasValidToken(req);
  const [rows] = await pool.query<any[]>(
    `SELECT d.file_name, d.mime_type, d.data FROM certificate_documents d
     JOIN certificates c ON c.id = d.certificate_id
     WHERE c.unique_number = ?${isStaff ? '' : " AND c.status <> 'draft'"}`,
    [req.params.uniqueNumber],
  );
  if (!rows.length) return res.status(404).json({ error: 'Document not found' });
  const d = rows[0];
  const safeName = String(d.file_name).replace(/[^\w.\- ]/g, '_');
  res.setHeader('Content-Type', d.mime_type);
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(d.data);
}));

app.get('/api/search', publicLimiter, ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'Enter at least 2 characters' });
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  const [rows] = await pool.query<any[]>(
    `${CERT_SELECT} WHERE c.status <> 'draft' AND (c.trainee_name LIKE ? OR c.course_title LIKE ?)
     ORDER BY c.issue_date DESC LIMIT 50`,
    [like, like],
  );
  res.json(rows.map(toCertificate));
}));

// ================================= AUTH ==========================================
const loginLimiter = rateLimit(Number(process.env.LOGIN_RATE_MAX) || 10, 15 * 60_000);
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

app.post('/api/auth/login', loginLimiter, ah(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const row = rows[0];
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !ok || row.status !== 'active') return res.status(401).json({ error: 'Invalid credentials or account inactive' });
  await pool.query('UPDATE users SET last_login = UTC_TIMESTAMP() WHERE id = ?', [row.id]);
  const [fresh] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [row.id]);
  const user = toUser(fresh[0]);
  res.json({ token: signToken(user), user });
}));

app.get('/api/admin/me', requireAuth, (req: AuthedRequest, res) => res.json(req.user));

app.post('/api/admin/me/password', requireAuth, ah(async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 10) throw new HttpError(400, 'New password must be at least 10 characters');
  const [rows] = await pool.query<any[]>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!(await bcrypt.compare(String(currentPassword || ''), rows[0].password_hash))) throw new HttpError(401, 'Current password is incorrect');
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), req.user!.id]);
  res.json({ ok: true });
}));

// ================================ ADMIN API ======================================
const admin = express.Router();
admin.use(requireAuth);

admin.get('/certificates', ah(async (_req, res) => {
  const [rows] = await pool.query<any[]>(`${CERT_SELECT} ORDER BY c.created_at DESC, c.issue_date DESC`);
  res.json(rows.map(toCertificate));
}));

const parseBody = (req: Request) => {
  const raw = (req.body as any)?.data;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { throw new HttpError(400, 'Malformed "data" JSON'); }
  }
  return req.body || {};
};

admin.post('/certificates', upload.single('file'), ah(async (req: AuthedRequest, res) => {
  const cert = await createCertificate(parseBody(req), req.user!, req.file, baseUrlFor(req));
  res.status(201).json(cert);
}));

admin.post('/certificates/bulk', ah(async (req: AuthedRequest, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items || !items.length) throw new HttpError(400, 'items[] is required');
  if (items.length > 500) throw new HttpError(400, 'Maximum 500 rows per import');
  const created: Certificate[] = [];
  const failed: { row: number; error: string }[] = [];
  for (const [i, item] of items.entries()) {
    try {
      created.push(await createCertificate(item, req.user!, undefined, baseUrlFor(req)));
    } catch (e: any) {
      failed.push({ row: i + 1, error: e instanceof HttpError ? e.message : 'Could not import this row' });
    }
  }
  res.status(created.length ? 201 : 400).json({ imported: created.length, failed, certificates: created });
}));

admin.put('/certificates/:id', ah(async (req: AuthedRequest, res) => {
  const body = req.body || {};
  if (body.traineeName) body.traineeName = String(body.traineeName).toUpperCase();
  const cols = validateFields(body, Object.keys(FIELDS).filter((k) => body[k] !== undefined));
  if (!Object.keys(cols).length) throw new HttpError(400, 'No editable fields supplied');
  try {
    const [r] = await pool.query<any>(
      `UPDATE certificates SET ${Object.keys(cols).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(cols), req.params.id],
    );
    if (!r.affectedRows) throw new HttpError(404, 'Certificate not found');
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That Certificate ID is already registered');
    throw e;
  }
  let cert = (await fetchCertificate(pool, 'c.id = ?', [req.params.id]))!;
  // Keep auto-generated PDFs in step with edited details (uploaded files are never touched).
  const [docs] = await pool.query<any[]>('SELECT is_generated FROM certificate_documents WHERE certificate_id = ?', [cert.id]);
  if (docs.length && docs[0].is_generated) {
    const pdf = await generateCertificatePdf(cert, baseUrlFor(req));
    await saveDocument(pool, cert.id, { fileName: `${cert.certificateId}.pdf`, mimeType: 'application/pdf', data: pdf, generated: true, uploadedBy: req.user!.id });
    cert = (await fetchCertificate(pool, 'c.id = ?', [cert.id]))!;
  }
  res.json(cert);
}));

admin.post('/certificates/:id/document', upload.single('file'), ah(async (req: AuthedRequest, res) => {
  if (!req.file) throw new HttpError(400, 'file is required');
  const mime = sniffMime(req.file.buffer);
  if (!mime) throw new HttpError(400, 'Only PDF, PNG or JPEG files are accepted');
  const cert = await fetchCertificate(pool, 'c.id = ?', [req.params.id]);
  if (!cert) throw new HttpError(404, 'Certificate not found');
  await saveDocument(pool, cert.id, { fileName: req.file.originalname.slice(0, 250), mimeType: mime, data: req.file.buffer, uploadedBy: req.user!.id });
  res.json(await fetchCertificate(pool, 'c.id = ?', [cert.id]));
}));

admin.post('/certificates/:id/revoke', requireSuperAdmin, ah(async (req: AuthedRequest, res) => {
  const reasons = ['issued_in_error', 'fraud', 'course_withdrawn', 'administrative_suspension', 'other'];
  const { reason, notes } = req.body || {};
  if (!reasons.includes(reason)) throw new HttpError(400, 'A valid revocation reason is required');
  const by = `${req.user!.name} (Super Admin)`;
  const [r] = await pool.query<any>(
    `UPDATE certificates SET status = 'revoked', revocation_reason = ?, revocation_notes = ?, revoked_at = UTC_TIMESTAMP(), revoked_by = ?
     WHERE id = ?`,
    [reason, String(notes || '').slice(0, 2000), by, req.params.id],
  );
  if (!r.affectedRows) throw new HttpError(404, 'Certificate not found');
  res.json(await fetchCertificate(pool, 'c.id = ?', [req.params.id]));
}));

admin.delete('/certificates/:id', requireSuperAdmin, ah(async (req, res) => {
  const [r] = await pool.query<any>('DELETE FROM certificates WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Certificate not found');
  res.json({ ok: true });
}));

admin.get('/scan-logs', ah(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  const [rows] = await pool.query<any[]>('SELECT * FROM scan_logs ORDER BY scanned_at DESC, id DESC LIMIT ?', [limit]);
  res.json(rows.map(toScanLog));
}));

admin.get('/users', ah(async (_req, res) => {
  const [rows] = await pool.query<any[]>('SELECT * FROM users ORDER BY created_at, name');
  res.json(rows.map(toUser));
}));

admin.post('/users', requireSuperAdmin, ah(async (req, res) => {
  const { name, email, role, title, department } = req.body || {};
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) throw new HttpError(400, 'Valid name and email are required');
  if (!['super_admin', 'issuer'].includes(role)) throw new HttpError(400, 'Role must be super_admin or issuer');
  const temporaryPassword = randomBytes(9).toString('base64url');
  const id = `user-${randomUUID().slice(0, 8)}`;
  try {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, title, department) VALUES (?,?,?,?,?,?,?)`,
      [id, String(name).slice(0, 120), String(email).trim().toLowerCase(), await bcrypt.hash(temporaryPassword, 12), role,
        String(title || '').slice(0, 160), String(department || '').slice(0, 160)],
    );
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'A user with this email already exists');
    throw e;
  }
  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [id]);
  res.status(201).json({ user: toUser(rows[0]), temporaryPassword });
}));

admin.patch('/users/:id/status', requireSuperAdmin, ah(async (req: AuthedRequest, res) => {
  const { status } = req.body || {};
  if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Invalid status');
  if (req.params.id === req.user!.id) throw new HttpError(400, 'You cannot change your own status');
  const [r] = await pool.query<any>('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'User not found');
  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [req.params.id]);
  res.json(toUser(rows[0]));
}));

const SETTING_KEYS = [
  'portalName', 'companyName', 'companyGroup', 'accreditationAuthority', 'resolutionNumber', 'headquartersAddress',
  'contactEmail', 'contactPhone', 'websiteUrl', 'defaultSignatoryName', 'defaultSignatoryTitle', 'showWatermark', 'maskPassportByDefault',
];
admin.put('/config', requireSuperAdmin, ah(async (req, res) => {
  const body = req.body || {};
  for (const key of Object.keys(body)) {
    if (!SETTING_KEYS.includes(key)) throw new HttpError(400, `Unknown setting: ${key}`);
    await pool.query(
      `INSERT INTO portal_settings (config_key, config_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, JSON.stringify(body[key])],
    );
  }
  res.json({ ok: true });
}));

admin.post('/reset-demo', requireSuperAdmin, ah(async (_req, res) => {
  if (!config.allowDemoReset) throw new HttpError(403, 'Demo reset is disabled on this server');
  await seedDemo({ reset: true });
  res.json({ ok: true });
}));

app.use('/api/admin', admin);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- production: serve the built SPA ------------------------------------------
const dist = resolve(process.cwd(), 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

// ---- errors -------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 10 MB' : err.message });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

pool.query('SELECT 1').then(
  () => app.listen(config.port, () => console.log(`CertVerify API listening on :${config.port}`)),
  (e) => { console.error('Cannot connect to MySQL:', e.message); process.exit(1); },
);
