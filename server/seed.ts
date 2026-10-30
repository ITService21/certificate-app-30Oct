import bcrypt from 'bcryptjs';
import { config } from './config';
import { pool, toCertificate, CERT_SELECT, toDbDateTime } from './db';
import { generateCertificatePdf } from './pdf';
import { saveDocument } from './documents';
import { seedReferenceData } from './reference-data';
import { INITIAL_CERTIFICATES, INITIAL_SCAN_LOGS, INITIAL_USERS } from '../src/data/mockData';

const CERT_COLUMNS = (c: any) => ({
  id: c.id,
  unique_number: c.uniqueNumber,
  certificate_id: c.certificateId,
  status: c.status,
  trainee_title: c.traineeTitle,
  trainee_name: c.traineeName,
  passport_number: c.passportNumber,
  nationality: c.nationality ?? '',
  course_title: c.courseTitle,
  stcw_regulation: c.stcwRegulation,
  approval_resolution: c.approvalResolution,
  approval_authority: c.approvalAuthority,
  approval_date: c.approvalDate,
  approval_valid_until: c.approvalValidUntil,
  training_start_date: c.trainingStartDate,
  training_end_date: c.trainingEndDate,
  training_mode: c.trainingMode,
  training_location: c.trainingLocation,
  issue_date: c.issueDate,
  expiry_date: c.expiryDate,
  validity_years: c.validityYears,
  signatory_name: c.signatoryName,
  signatory_title: c.signatoryTitle,
  revocation_reason: c.revocationReason ?? null,
  revocation_notes: c.revocationNotes ?? null,
  revoked_at: toDbDateTime(c.revokedAt),
  revoked_by: c.revokedBy ?? null,
  scan_count: c.scanCount,
  last_scanned_at: toDbDateTime(c.lastScannedAt),
  created_at: toDbDateTime(c.createdAt),
  updated_at: toDbDateTime(c.updatedAt),
});

export async function seedDemo({ reset = false }: { reset?: boolean } = {}) {
  if (reset) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['certificate_documents', 'scan_logs', 'certificates', 'users', 'portal_settings']) {
      await pool.query(`TRUNCATE TABLE ${t}`);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } else {
    const [rows] = await pool.query<any[]>('SELECT COUNT(*) AS n FROM users');
    if (rows[0].n > 0) {
      console.log('Database already has users - skipping demo seed (use --reset to wipe and reseed).');
      return false;
    }
  }

  await seedReferenceData(pool);
  const hash = await bcrypt.hash(config.seedPassword, 10);
  for (const u of INITIAL_USERS) {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, title, department, status, last_login)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [u.id, u.name, u.email, hash, u.role, u.title, u.department, u.status, toDbDateTime(u.lastLogin)],
    );
  }

  const baseUrl = config.publicUrl || `http://localhost:${config.port}`;
  for (const c of INITIAL_CERTIFICATES) {
    const cols = CERT_COLUMNS(c);
    const keys = Object.keys(cols);
    await pool.query(
      `INSERT INTO certificates (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      Object.values(cols),
    );
    const [rows] = await pool.query<any[]>(`${CERT_SELECT} WHERE c.id = ?`, [c.id]);
    const pdf = await generateCertificatePdf(toCertificate(rows[0]), baseUrl);
    await saveDocument(pool, c.id, {
      fileName: c.documentName || `${c.certificateId}.pdf`,
      mimeType: 'application/pdf',
      data: pdf,
      generated: true,
      uploadedBy: 'user-001',
    });
  }

  for (const l of INITIAL_SCAN_LOGS) {
    await pool.query(
      `INSERT INTO scan_logs (id, certificate_unique_number, certificate_id, trainee_name, scanned_at, ip_address,
         location_city, location_country, device_type, search_method, is_suspicious, suspicion_reason)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [l.id, l.certificateUniqueNumber, l.certificateId, l.traineeName, toDbDateTime(l.timestamp), l.ipAddress,
        l.locationCity, l.locationCountry, l.deviceType, l.searchMethod, l.isSuspicious ? 1 : 0, l.suspicionReason ?? null],
    );
  }

  console.log(
    `Seeded ${INITIAL_USERS.length} users, ${INITIAL_CERTIFICATES.length} certificates (with PDFs), ${INITIAL_SCAN_LOGS.length} scan logs.`,
  );
  return true;
}
