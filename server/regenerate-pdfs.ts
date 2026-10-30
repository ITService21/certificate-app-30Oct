// Rebuilds every auto-generated certificate PDF (layout + QR link) from the current database row and PUBLIC_URL.
// Uploaded files (is_generated = 0) are never touched.   Usage: npm run pdf:regenerate [-- --dry-run]
import { config } from './config';
import { pool, toCertificate, CERT_SELECT } from './db';
import { generateCertificatePdf } from './pdf';
import { saveDocument } from './documents';

const dryRun = process.argv.includes('--dry-run');
const baseUrl = config.publicUrl || `http://localhost:${config.port}`;

const [rows] = await pool.query<any[]>(
  `${CERT_SELECT} WHERE d.is_generated = 1 OR d.certificate_id IS NULL ORDER BY c.created_at`,
);
console.log(`${dryRun ? '[dry run] ' : ''}Regenerating ${rows.length} PDF(s); QR base URL = ${baseUrl}`);

let done = 0;
for (const r of rows) {
  const cert = toCertificate(r);
  if (!dryRun) {
    const pdf = await generateCertificatePdf(cert, baseUrl);
    await saveDocument(pool, cert.id, { fileName: `${cert.certificateId}.pdf`, mimeType: 'application/pdf', data: pdf, generated: true });
  }
  done++;
  console.log(`  ${dryRun ? '-' : '✓'} ${cert.certificateId}  ->  ${baseUrl}/certificate/${cert.uniqueNumber}`);
}
console.log(`${dryRun ? 'Would regenerate' : 'Regenerated'} ${done} PDF(s).`);
await pool.end();
