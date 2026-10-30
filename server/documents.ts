import { createHash } from 'node:crypto';
import type { Pool, PoolConnection } from 'mysql2/promise';

export interface StoredDocument {
  fileName: string;
  mimeType: string;
  data: Buffer;
  generated?: boolean;
  uploadedBy?: string | null;
}

/** Insert or replace the single document attached to a certificate. */
export async function saveDocument(db: Pool | PoolConnection, certificateId: string, doc: StoredDocument) {
  const sha = createHash('sha256').update(doc.data).digest('hex');
  await db.query(
    `INSERT INTO certificate_documents (certificate_id, file_name, mime_type, size_bytes, sha256, is_generated, data, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), mime_type = VALUES(mime_type), size_bytes = VALUES(size_bytes),
       sha256 = VALUES(sha256), is_generated = VALUES(is_generated), data = VALUES(data),
       uploaded_by = VALUES(uploaded_by), uploaded_at = CURRENT_TIMESTAMP`,
    [certificateId, doc.fileName, doc.mimeType, doc.data.length, sha, doc.generated ? 1 : 0, doc.data, doc.uploadedBy ?? null],
  );
}

/** Reject files whose bytes don't match a PDF/PNG/JPEG, whatever the client claimed. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png';
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  return null;
}
