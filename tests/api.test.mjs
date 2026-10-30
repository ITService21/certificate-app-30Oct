// API integration tests. Needs: MySQL up, `npm run db:init && npm run db:seed`, and the API running with
//   LOGIN_RATE_MAX=1000 ALLOW_DEMO_RESET=true npm run server
// WARNING: the last section calls /admin/reset-demo, which wipes the database back to the demo dataset.
// Run:  npm run test:api   (BASE=http://host:port/api to target another server)
const BASE = process.env.BASE || 'http://127.0.0.1:4100/api';
let pass = 0, fail = 0;
const failures = [];
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name} ${extra}`); }
};
const section = (t) => console.log(`\n== ${t}`);

async function call(method, path, { token, json, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(BASE + path, { method, headers, body });
  if (raw) return res;
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const login = async (email, password = 'Admin@12345') => (await call('POST', '/auth/login', { json: { email, password } }));

const num = () => String(Math.floor(1e13 + Math.random() * 9e13));
const makeForm = (data, file) => {
  const f = new FormData();
  f.append('data', JSON.stringify(data));
  if (file) f.append('file', file.blob, file.name);
  return f;
};

// ------------------------------------------------------------------
section('1. Authentication');
let r = await login('admin@ctc.com.pa', 'wrong-password');
ok(r.status === 401, 'wrong password rejected (401)');
r = await login('nobody@x.com');
ok(r.status === 401, 'unknown email rejected (401)');
r = await call('GET', '/admin/certificates');
ok(r.status === 401, 'admin API without token -> 401');
r = await call('GET', '/admin/certificates', { token: 'garbage.token.here' });
ok(r.status === 401, 'admin API with bad token -> 401');
r = await login('admin@ctc.com.pa');
ok(r.status === 200 && r.data.token && r.data.user.role === 'super_admin', 'super admin login ok');
const admin = r.data.token;
r = await login('issuer@ctc.com.pa');
ok(r.status === 200 && r.data.user.role === 'issuer', 'issuer login ok');
const issuer = r.data.token;
r = await call('GET', '/admin/me', { token: admin });
ok(r.status === 200 && r.data.email === 'admin@ctc.com.pa', '/admin/me returns current user');
ok(!JSON.stringify(r.data).includes('password'), 'no password hash leaked in user payload');

// ------------------------------------------------------------------
section('2. Seeded data readable by admin');
r = await call('GET', '/admin/certificates', { token: admin });
const seeded = r.data;
ok(r.status === 200 && seeded.length >= 6, `certificates list (${seeded?.length})`);
ok(seeded.every((c) => c.documentUrl), 'every seeded certificate has a stored PDF');
const statuses = new Set(seeded.map((c) => c.status));
ok(statuses.has('valid') && statuses.has('revoked') && statuses.has('expiring'), `statuses present: ${[...statuses].join(',')}`);
r = await call('GET', '/admin/users', { token: admin });
ok(r.status === 200 && r.data.length >= 3, 'users list');
r = await call('GET', '/admin/scan-logs?limit=500', { token: admin });
ok(r.status === 200 && r.data.length >= 9, 'scan logs list');
ok(r.data.some((l) => l.isSuspicious), 'seed includes a suspicious scan');

// ------------------------------------------------------------------
section('3. Public verification + scan logging');
const valid = seeded.find((c) => c.status === 'valid');
const before = (await call('GET', '/admin/certificates', { token: admin })).data.find((c) => c.id === valid.id).scanCount;
r = await call('GET', `/verify/${valid.uniqueNumber}?method=qr_scan`);
ok(r.status === 200 && r.data.uniqueNumber === valid.uniqueNumber, 'verify by 14-digit number');
r = await call('GET', `/verify/${valid.certificateId}`);
ok(r.status === 200 && r.data.id === valid.id, 'verify by certificate ID');
const after = (await call('GET', '/admin/certificates', { token: admin })).data.find((c) => c.id === valid.id).scanCount;
ok(after === before + 2, `scan count incremented by 2 (${before} -> ${after})`);
let logs = (await call('GET', '/admin/scan-logs?limit=5', { token: admin })).data;
ok(logs[0].searchMethod === 'number_lookup' && logs[1].searchMethod === 'qr_scan', 'scan logs record qr_scan / number_lookup');
ok(logs[0].ipAddress && logs[0].deviceType, `log has ip + device (${logs[0].ipAddress}, ${logs[0].deviceType})`);
// staff views are not counted
await call('GET', `/verify/${valid.uniqueNumber}`, { token: admin });
const staffAfter = (await call('GET', '/admin/certificates', { token: admin })).data.find((c) => c.id === valid.id).scanCount;
ok(staffAfter === after, 'staff lookups do not inflate scan count');
// revoked + expiring
const revokedSeed = seeded.find((c) => c.status === 'revoked');
r = await call('GET', `/verify/${revokedSeed.uniqueNumber}`);
ok(r.status === 200 && r.data.status === 'revoked' && r.data.revocationReason, 'revoked certificate shows revoked + reason');
const expiringSeed = seeded.find((c) => c.status === 'expiring');
r = await call('GET', `/verify/${expiringSeed.uniqueNumber}`);
ok(r.status === 200 && r.data.status === 'expiring', 'expiring certificate shows expiring');
// unknown
r = await call('GET', '/verify/99999999999999');
ok(r.status === 404, 'unknown number -> 404');
logs = (await call('GET', '/admin/scan-logs?limit=3', { token: admin })).data;
ok(logs[0].isSuspicious && logs[0].certificateId === 'UNKNOWN-PROBE', 'unknown lookup logged as suspicious');
r = await call('GET', '/verify/bad%20id!');
ok(r.status === 400, 'malformed id -> 400');
r = await call('GET', "/verify/1'%20OR%20'1'='1");
ok(r.status === 400 || r.status === 404, `SQL-injection style id handled (${r.status})`);

// ------------------------------------------------------------------
section('4. Stored PDF served from MySQL');
let res = await call('GET', `/verify/${valid.uniqueNumber}/document`, { raw: true });
let buf = Buffer.from(await res.arrayBuffer());
ok(res.status === 200 && res.headers.get('content-type') === 'application/pdf', 'document content-type application/pdf');
ok(buf.subarray(0, 5).toString() === '%PDF-', 'bytes are a real PDF');
ok((res.headers.get('content-disposition') || '').startsWith('inline'), 'served inline');
res = await call('GET', `/verify/${valid.uniqueNumber}/document?download=1`, { raw: true });
ok((res.headers.get('content-disposition') || '').startsWith('attachment'), '?download=1 -> attachment');
res = await call('GET', '/verify/00000000000000/document', { raw: true });
ok(res.status === 404, 'missing document -> 404');

// ------------------------------------------------------------------
section('5. Create certificate (admin + issuer)');
const baseCert = { traineeName: 'test seafarer one', certificateId: `TST-${Date.now()}`, courseTitle: 'Test Course', passportNumber: 'P1234567', traineeTitle: 'Capt.' };
const n1 = num();
r = await call('POST', '/admin/certificates', { token: issuer, form: makeForm({ ...baseCert, uniqueNumber: n1 }) });
ok(r.status === 201, 'issuer can create certificate', JSON.stringify(r.data));
const created = r.data;
ok(created.traineeName === 'TEST SEAFARER ONE', 'trainee name upper-cased');
ok(created.uniqueNumber === n1 && created.status === 'valid', 'defaults + unique number applied');
ok(created.documentUrl && created.documentName === `${baseCert.certificateId}.pdf`, 'auto-generated PDF attached');
ok(seeded.find((c) => c.uniqueNumber === '32625474824291')?.nationality === 'INDIAN', 'seeded certificate carries nationality');
ok(typeof created.nationality === 'string', 'nationality field present (defaults to empty)');
res = await call('GET', `/verify/${n1}/document`, { raw: true });
const generatedBuf = Buffer.from(await res.arrayBuffer());
ok(res.status === 200 && generatedBuf.subarray(0, 5).toString() === '%PDF-', 'generated PDF retrievable publicly');
r = await call('GET', `/verify/${n1}`);
ok(r.status === 200, 'new certificate immediately verifiable publicly');

r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'OTHER-' + Date.now(), uniqueNumber: n1 }) });
ok(r.status === 409, 'duplicate unique number -> 409');
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, uniqueNumber: num() }) });
ok(r.status === 409, 'duplicate certificate ID -> 409');
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'X' + Date.now(), uniqueNumber: '123' }) });
ok(r.status === 400, 'short unique number -> 400');
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'Y' + Date.now(), issueDate: '31/12/2026' }) });
ok(r.status === 400, 'bad date format -> 400');
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'Z' + Date.now(), status: 'hacked' }) });
ok(r.status === 400, 'invalid status enum -> 400');
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'W' + Date.now(), traineeName: '' }) });
ok(r.status === 201 && r.data.traineeName === 'UNKNOWN SEAFARER', 'blank name falls back to default (matches old behaviour)');

// ------------------------------------------------------------------
section('6. Upload your own PDF');
const realPdf = generatedBuf;
const n2 = num();
r = await call('POST', '/admin/certificates', {
  token: admin,
  form: makeForm({ ...baseCert, certificateId: 'UP-' + Date.now(), uniqueNumber: n2 }, { blob: new Blob([realPdf], { type: 'application/pdf' }), name: 'my scan (final).pdf' }),
});
ok(r.status === 201 && r.data.documentName === 'my scan (final).pdf', 'uploaded PDF stored with original file name');
const uploaded = r.data;
res = await call('GET', `/verify/${n2}/document`, { raw: true });
const got = Buffer.from(await res.arrayBuffer());
ok(got.equals(realPdf), 'downloaded bytes identical to uploaded bytes');
r = await call('POST', '/admin/certificates', {
  token: admin,
  form: makeForm({ ...baseCert, certificateId: 'FK-' + Date.now() }, { blob: new Blob(['<script>alert(1)</script>'], { type: 'application/pdf' }), name: 'evil.pdf' }),
});
ok(r.status === 400, 'fake PDF (wrong magic bytes) rejected');
const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(11 * 1024 * 1024)]);
r = await call('POST', '/admin/certificates', {
  token: admin,
  form: makeForm({ ...baseCert, certificateId: 'BG-' + Date.now() }, { blob: new Blob([big], { type: 'application/pdf' }), name: 'big.pdf' }),
});
ok(r.status === 400, 'file > 10 MB rejected');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
r = await call('POST', `/admin/certificates/${uploaded.id}/document`, {
  token: issuer,
  form: (() => { const f = new FormData(); f.append('file', new Blob([png], { type: 'image/png' }), 'scan.png'); return f; })(),
});
ok(r.status === 200 && r.data.documentName === 'scan.png', 'replace document with PNG');
res = await call('GET', `/verify/${n2}/document`, { raw: true });
ok(res.headers.get('content-type') === 'image/png', 'served as image/png after replace');

// ------------------------------------------------------------------
section('7. Drafts are private');
const n3 = num();
r = await call('POST', '/admin/certificates', { token: admin, form: makeForm({ ...baseCert, certificateId: 'DR-' + Date.now(), uniqueNumber: n3, status: 'draft' }) });
ok(r.status === 201 && r.data.status === 'draft', 'draft created');
const draft = r.data;
r = await call('GET', `/verify/${n3}`);
ok(r.status === 404, 'draft hidden from public verify');
res = await call('GET', `/verify/${n3}/document`, { raw: true });
ok(res.status === 404, 'draft document hidden from public');
r = await call('GET', `/verify/${n3}`, { token: admin });
ok(r.status === 200, 'draft visible to staff');
r = await call('PUT', `/admin/certificates/${draft.id}`, { token: issuer, json: { status: 'valid' } });
ok(r.status === 200 && r.data.status === 'valid', 'publishing a draft (status -> valid)');
r = await call('GET', `/verify/${n3}`);
ok(r.status === 200, 'published draft now public');

// ------------------------------------------------------------------
section('8. Update + PDF regeneration');
res = await call('GET', `/verify/${n1}/document`, { raw: true });
const pdfBefore = Buffer.from(await res.arrayBuffer());
r = await call('PUT', `/admin/certificates/${created.id}`, { token: issuer, json: { traineeName: 'renamed person', courseTitle: 'Updated Course Title' } });
ok(r.status === 200 && r.data.traineeName === 'RENAMED PERSON', 'update fields saved');
res = await call('GET', `/verify/${n1}/document`, { raw: true });
const pdfAfter = Buffer.from(await res.arrayBuffer());
ok(!pdfBefore.equals(pdfAfter), 'auto-generated PDF regenerated after edit');
r = await call('PUT', `/admin/certificates/${uploaded.id}`, { token: issuer, json: { traineeName: 'edited uploaded' } });
res = await call('GET', `/verify/${n2}/document`, { raw: true });
ok(res.headers.get('content-type') === 'image/png', 'uploaded file untouched by edit');
r = await call('PUT', `/admin/certificates/${created.id}`, { token: issuer, json: { issueDate: 'not-a-date' } });
ok(r.status === 400, 'update with bad date -> 400');
r = await call('PUT', `/admin/certificates/${created.id}`, { token: issuer, json: { unique_number: '1', uniqueNumber: '11111111111111' } });
ok(r.status === 400, 'cannot change unique number via update (no editable fields)');
r = await call('PUT', '/admin/certificates/does-not-exist', { token: issuer, json: { traineeName: 'x' } });
ok(r.status === 404, 'update unknown id -> 404');

// ------------------------------------------------------------------
section('9. Revoke / delete permissions');
r = await call('POST', `/admin/certificates/${created.id}/revoke`, { token: issuer, json: { reason: 'fraud', notes: 'x' } });
ok(r.status === 403, 'issuer cannot revoke (403)');
r = await call('POST', `/admin/certificates/${created.id}/revoke`, { token: admin, json: { reason: 'bogus' } });
ok(r.status === 400, 'invalid revoke reason -> 400');
r = await call('POST', `/admin/certificates/${created.id}/revoke`, { token: admin, json: { reason: 'issued_in_error', notes: 'Typo in name' } });
ok(r.status === 200 && r.data.status === 'revoked' && r.data.revokedBy.includes('Claudia'), 'super admin revokes with audit trail');
r = await call('GET', `/verify/${n1}`);
ok(r.data.status === 'revoked' && r.data.revocationNotes === 'Typo in name' && r.data.revokedAt, 'public sees revoked + notes + timestamp');
r = await call('DELETE', `/admin/certificates/${created.id}`, { token: issuer });
ok(r.status === 403, 'issuer cannot delete (403)');
r = await call('DELETE', `/admin/certificates/${created.id}`, { token: admin });
ok(r.status === 200, 'super admin deletes');
r = await call('GET', `/verify/${n1}`);
ok(r.status === 404, 'deleted certificate no longer verifiable');
res = await call('GET', `/verify/${n1}/document`, { raw: true });
ok(res.status === 404, 'its PDF removed too (cascade)');
r = await call('DELETE', `/admin/certificates/${created.id}`, { token: admin });
ok(r.status === 404, 'delete again -> 404');

// ------------------------------------------------------------------
section('10. Bulk import');
const stamp = Date.now();
r = await call('POST', '/admin/certificates/bulk', { token: issuer, json: { items: [
  { traineeName: 'bulk a', certificateId: `BK-A-${stamp}`, uniqueNumber: num() },
  { traineeName: 'bulk b', certificateId: `BK-B-${stamp}` },
  { traineeName: 'bulk dup', certificateId: `BK-A-${stamp}` },
  { traineeName: 'bulk bad date', certificateId: `BK-D-${stamp}`, issueDate: 'nope' },
] } });
ok(r.status === 201 && r.data.imported === 2 && r.data.failed.length === 2, `bulk: 2 imported, 2 failed (${JSON.stringify(r.data.failed)})`);
ok(r.data.certificates.every((c) => c.documentUrl), 'bulk rows get generated PDFs');
r = await call('POST', '/admin/certificates/bulk', { token: issuer, json: { items: [] } });
ok(r.status === 400, 'empty bulk -> 400');

// ------------------------------------------------------------------
section('11. Exact-match lookup, no name search');
r = await call('GET', '/search?q=elby');
ok(r.status === 404, 'name search endpoint removed');
r = await call('GET', '/verify/3262547482429');
ok(r.status === 404, 'partial number (13 of 14 digits) does not match');
r = await call('GET', '/verify/32625474');
ok(r.status === 404, 'number prefix does not match');
r = await call('GET', '/verify/UAG-TC-22-PSCRB');
ok(r.status === 404, 'partial certificate ID does not match');
r = await call('GET', '/verify/PSCRB-01115');
ok(r.status === 404, 'certificate ID substring does not match');
r = await call('GET', '/verify/32625474824291');
ok(r.status === 200 && r.data.uniqueNumber === '32625474824291', 'full 14-digit number matches');
r = await call('GET', '/verify/UAG-TC-22-PSCRB-01115');
ok(r.status === 200 && r.data.uniqueNumber === '32625474824291', 'full certificate ID matches');
r = await call('POST', '/admin/certificates/preview', { json: { traineeName: 'x' } });
ok(r.status === 401, 'PDF preview requires login');
res = await call('POST', '/admin/certificates/preview', { token: issuer, json: { traineeName: 'preview person', certificateId: 'PRV-1', nationality: 'GREEK' }, raw: true });
ok(res.status === 200 && res.headers.get('content-type') === 'application/pdf' && Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString() === '%PDF-', 'PDF preview renders a real PDF without saving');
r = await call('GET', '/verify/PRV-1');
ok(r.status === 404, 'preview did not create a certificate');

// ------------------------------------------------------------------
section('11b. Certificate generator (seeded course templates)');
r = await call('GET', '/admin/generator-config');
ok(r.status === 401, 'generator config needs login');
r = await call('GET', '/admin/generator-config', { token: issuer });
ok(r.status === 200 && r.data.courses.length >= 7 && r.data.courses.some((c) => c.code === 'COOK' && c.title === "SHIP'S COOK"), `templates seeded (${r.data.courses?.length})`);
ok(r.data.defaults.signatoryName === 'Claudia Galeano', 'default signatory seeded');
const gen = { courseCode: 'COOK', traineeName: 'stanley cardozo', passportNumber: 'Z4326490', nationality: 'INDIAN', trainingStartDate: '2026-03-02', trainingEndDate: '2026-03-06', trainingLocation: 'AZERBAIJAN', issueDate: '2026-03-08' };
r = await call('POST', '/admin/certificates', { token: issuer, form: makeForm(gen) });
ok(r.status === 201, `generate with trainee details only (${r.status})`);
const g1 = r.data;
ok(/^UAG-TC-26-COOK-\d{5}$/.test(g1.certificateId), `certificate ID auto-generated (${g1.certificateId})`);
ok(g1.uniqueNumber.length === 14, 'unique number auto-generated');
ok(g1.courseTitle === "SHIP'S COOK" && g1.approvalResolution.includes('DGGM-CFM-005-2024') && g1.signatoryTitle === 'CTC General Manager', 'course, approval and signatory filled from seeded data');
ok(g1.expiryDate === '2031-03-07' && g1.validityYears === 5, `expiry computed from issue date (${g1.expiryDate})`);
ok(g1.documentName === `${g1.certificateId}.pdf`, 'PDF generated');
r = await call('POST', '/admin/certificates', { token: issuer, form: makeForm({ ...gen, traineeName: 'second trainee' }) });
const seq1 = Number(g1.certificateId.slice(-5)), seq2 = Number(r.data.certificateId.slice(-5));
ok(r.status === 201 && seq2 === seq1 + 1, `ID sequence increments (${g1.certificateId} -> ${r.data.certificateId})`);
r = await call('POST', '/admin/certificates', { token: issuer, form: makeForm({ ...gen, courseCode: 'NOPE' }) });
ok(r.status === 400, 'unknown course rejected');
res = await call('POST', '/admin/certificates/preview', { token: issuer, json: gen, raw: true });
ok(res.status === 200 && res.headers.get('content-type') === 'application/pdf', 'preview works with a course template');

// ------------------------------------------------------------------
section('12. Users & roles');
r = await call('POST', '/admin/users', { token: issuer, json: { name: 'X', email: 'x@y.com', role: 'issuer' } });
ok(r.status === 403, 'issuer cannot add users');
const email = `new.${stamp}@ctc.com.pa`;
r = await call('POST', '/admin/users', { token: admin, json: { name: 'New Officer', email, role: 'issuer', title: 'T', department: 'D' } });
ok(r.status === 201 && r.data.temporaryPassword?.length >= 8, 'super admin adds user, gets temp password');
const newUser = r.data.user; const temp = r.data.temporaryPassword;
ok(!JSON.stringify(r.data.user).includes('hash'), 'no hash in response');
r = await call('POST', '/admin/users', { token: admin, json: { name: 'Dup', email, role: 'issuer' } });
ok(r.status === 409, 'duplicate email -> 409');
r = await call('POST', '/admin/users', { token: admin, json: { name: 'Bad', email: 'not-an-email', role: 'issuer' } });
ok(r.status === 400, 'invalid email -> 400');
r = await call('POST', '/admin/users', { token: admin, json: { name: 'Bad', email: 'a@b.co', role: 'root' } });
ok(r.status === 400, 'invalid role -> 400');
r = await login(email, temp);
ok(r.status === 200, 'new user logs in with temp password');
const newToken = r.data.token;
r = await call('POST', '/admin/me/password', { token: newToken, json: { currentPassword: temp, newPassword: 'short' } });
ok(r.status === 400, 'weak new password rejected');
r = await call('POST', '/admin/me/password', { token: newToken, json: { currentPassword: 'wrong', newPassword: 'A-Much-Longer-Pass1' } });
ok(r.status === 401, 'wrong current password rejected');
r = await call('POST', '/admin/me/password', { token: newToken, json: { currentPassword: temp, newPassword: 'A-Much-Longer-Pass1' } });
ok(r.status === 200, 'password changed');
ok((await login(email, temp)).status === 401, 'old password no longer works');
ok((await login(email, 'A-Much-Longer-Pass1')).status === 200, 'new password works');
r = await call('PATCH', `/admin/users/${newUser.id}/status`, { token: issuer, json: { status: 'inactive' } });
ok(r.status === 403, 'issuer cannot deactivate users');
r = await call('PATCH', `/admin/users/${newUser.id}/status`, { token: admin, json: { status: 'inactive' } });
ok(r.status === 200 && r.data.status === 'inactive', 'super admin deactivates user');
ok((await login(email, 'A-Much-Longer-Pass1')).status === 401, 'inactive user cannot log in');
r = await call('GET', '/admin/certificates', { token: newToken });
ok(r.status === 401, 'existing token of deactivated user is rejected immediately');
r = await call('PATCH', `/admin/users/${(await call('GET', '/admin/me', { token: admin })).data.id}/status`, { token: admin, json: { status: 'inactive' } });
ok(r.status === 400, 'cannot deactivate yourself');

// ------------------------------------------------------------------
section('13. Portal settings');
r = await call('PUT', '/admin/config', { token: issuer, json: { portalName: 'Hacked' } });
ok(r.status === 403, 'issuer cannot change settings');
r = await call('PUT', '/admin/config', { token: admin, json: { portalName: 'CertVerify QA', showWatermark: false } });
ok(r.status === 200, 'super admin saves settings');
r = await call('PUT', '/admin/config', { token: admin, json: { evil: 'x' } });
ok(r.status === 400, 'unknown setting key rejected');
r = await call('GET', '/config');
ok(r.data.settings.portalName === 'CertVerify QA' && r.data.settings.showWatermark === false, 'settings persisted + public');
ok(!!r.data.publicUrl, `publicUrl exposed (${r.data.publicUrl})`);

// ------------------------------------------------------------------
section('14. Demo reset restores clean state');
r = await call('POST', '/admin/reset-demo', { token: issuer });
ok(r.status === 403, 'issuer cannot reset');
r = await call('POST', '/admin/reset-demo', { token: admin });
ok(r.status === 200, 'super admin reset ok');
r = await call('GET', '/admin/certificates', { token: (await login('admin@ctc.com.pa')).data.token });
ok(r.data.length === 6, `back to 6 seeded certificates (${r.data.length})`);
r = await call('GET', '/config');
ok(Object.keys(r.data.settings).length === 0, 'settings cleared by reset');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
