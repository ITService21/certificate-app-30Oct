import mysql from 'mysql2/promise';
import { config } from './config';
import type { Certificate, ScanLog, User } from '../src/types';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE/DATETIME come back as plain strings, no timezone surprises
  charset: 'utf8mb4',
});

// Keep every session in UTC so CURRENT_TIMESTAMP and our conversions agree.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

// ---- date helpers -----------------------------------------------------------
export const nowDb = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

/** 'YYYY-MM-DD HH:MM:SS' (UTC) -> ISO string */
export const dbToIso = (s?: string | null) => (s ? `${s.replace(' ', 'T')}Z` : undefined);

/** ISO / loose UTC string -> 'YYYY-MM-DD HH:MM:SS' or null */
export const toDbDateTime = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// ---- row mappers ------------------------------------------------------------
export const CERT_SELECT = `
  SELECT c.*, d.file_name AS doc_name, d.size_bytes AS doc_size
  FROM certificates c
  LEFT JOIN certificate_documents d ON d.certificate_id = c.id`;

export function toCertificate(r: any): Certificate {
  return {
    id: r.id,
    uniqueNumber: r.unique_number,
    certificateId: r.certificate_id,
    status: r.status,
    traineeTitle: r.trainee_title,
    traineeName: r.trainee_name,
    passportNumber: r.passport_number,
    nationality: r.nationality ?? '',
    courseTitle: r.course_title,
    stcwRegulation: r.stcw_regulation,
    approvalResolution: r.approval_resolution,
    approvalAuthority: r.approval_authority,
    approvalDate: r.approval_date,
    approvalValidUntil: r.approval_valid_until,
    trainingStartDate: r.training_start_date,
    trainingEndDate: r.training_end_date,
    trainingMode: r.training_mode,
    trainingLocation: r.training_location,
    issueDate: r.issue_date,
    expiryDate: r.expiry_date,
    validityYears: r.validity_years,
    signatoryName: r.signatory_name,
    signatoryTitle: r.signatory_title,
    revocationReason: r.revocation_reason ?? undefined,
    revocationNotes: r.revocation_notes ?? undefined,
    revokedAt: dbToIso(r.revoked_at),
    revokedBy: r.revoked_by ?? undefined,
    documentUrl: r.doc_name ? `/api/verify/${r.unique_number}/document` : undefined,
    documentName: r.doc_name ?? undefined,
    documentSize: r.doc_size ? formatSize(r.doc_size) : undefined,
    createdAt: dbToIso(r.created_at)!,
    updatedAt: dbToIso(r.updated_at)!,
    scanCount: r.scan_count,
    lastScannedAt: dbToIso(r.last_scanned_at),
  };
}

export function toUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    title: r.title,
    department: r.department,
    status: r.status,
    lastLogin: r.last_login ? `${r.last_login.slice(0, 16)} UTC` : 'Never',
  };
}

export function toScanLog(r: any): ScanLog {
  return {
    id: r.id,
    certificateUniqueNumber: r.certificate_unique_number,
    certificateId: r.certificate_id,
    traineeName: r.trainee_name,
    timestamp: `${r.scanned_at} UTC`,
    ipAddress: r.ip_address,
    locationCity: r.location_city,
    locationCountry: r.location_country,
    deviceType: r.device_type,
    searchMethod: r.search_method,
    isSuspicious: !!r.is_suspicious,
    suspicionReason: r.suspicion_reason ?? undefined,
  };
}
