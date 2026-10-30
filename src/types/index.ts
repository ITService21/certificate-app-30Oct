export type CertificateStatus = 'valid' | 'expiring' | 'revoked' | 'draft';

export type UserRole = 'super_admin' | 'issuer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

export interface Certificate {
  id: string; // internal unique id
  uniqueNumber: string; // 14-digit unique number (e.g. '32625474824291')
  certificateId: string; // ID e.g. 'UAG-TC-22-PSCRB-01115'
  status: CertificateStatus;
  
  // Trainee details
  traineeTitle: 'Mr.' | 'Ms.' | 'Capt.' | 'Eng.' | 'Dr.';
  traineeName: string; // e.g. 'ELBY MATHEW'
  passportNumber: string; // e.g. 'Z6045152'
  nationality?: string; // e.g. 'INDIAN' (shown on the public QR page)
  
  // Course details
  courseTitle: string; // e.g. 'Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats'
  stcwRegulation: string; // e.g. 'STCW 1978 as amended, Regulation VI/2, Section A-VI/2, Paragraphs 1-6, Table A-VI/2-1'
  approvalResolution: string; // e.g. 'Resolution No. DGGM-CFM-005-2024'
  approvalAuthority: string; // 'Government of Panama, Directorate General of Merchant Marine'
  approvalDate: string; // e.g. '2024-02-06'
  approvalValidUntil: string; // e.g. '2026-06-12'
  
  // Training details
  trainingStartDate: string; // e.g. '2026-05-11'
  trainingEndDate: string; // e.g. '2026-05-14'
  trainingMode: 'Presential' | 'Online' | 'Blended';
  trainingLocation: string; // e.g. 'Azerbaijan'
  
  // Validity & Signatory
  issueDate: string; // e.g. '2026-05-15'
  expiryDate: string; // e.g. '2031-05-14'
  validityYears: number; // e.g. 5
  signatoryName: string; // e.g. 'Claudia Galeano'
  signatoryTitle: string; // e.g. 'CTC General Manager'
  
  // Revocation details (if applicable)
  revocationReason?: 'issued_in_error' | 'fraud' | 'course_withdrawn' | 'administrative_suspension' | 'other';
  revocationNotes?: string;
  revokedAt?: string;
  revokedBy?: string;
  
  // File & Document
  documentUrl?: string;
  documentName?: string;
  documentSize?: string;
  
  // Metadata & Analytics
  createdAt: string;
  updatedAt: string;
  scanCount: number;
  lastScannedAt?: string;
}

export interface ScanLog {
  id: string;
  certificateUniqueNumber: string;
  certificateId: string;
  traineeName: string;
  timestamp: string;
  ipAddress: string;
  locationCity: string;
  locationCountry: string;
  deviceType: 'Mobile (iOS)' | 'Mobile (Android)' | 'Desktop (Windows)' | 'Desktop (macOS)' | 'Desktop (Linux)' | 'Tablet';
  searchMethod: 'qr_scan' | 'number_lookup' | 'name_search';
  isSuspicious?: boolean;
  suspicionReason?: string;
}

export interface PortalConfig {
  portalName: string;
  companyName: string;
  companyGroup: string;
  accreditationAuthority: string;
  resolutionNumber: string;
  headquartersAddress: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  defaultSignatoryName: string;
  defaultSignatoryTitle: string;
  showWatermark: boolean;
  maskPassportByDefault: boolean;
}
