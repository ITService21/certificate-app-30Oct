// Reference data every installation needs (local, staging, production). Applied by `npm run db:init`:
//  - course templates are UPSERTED (edit here, run db:init, the database follows),
//  - certificate defaults are only inserted when missing, so values edited later in the database are kept.
import type { Pool } from 'mysql2/promise';

const AUTHORITY = 'Government of Panama, Directorate General of Merchant Marine';
const RESOLUTION = 'Resolution No. DGGM-CFM-005-2024';
const APPROVED = '2024-02-06';
const APPROVAL_VALID_UNTIL = '2026-06-12';

interface Template { code: string; title: string; regulation: string; sort: number; resolution?: string; approvalDate?: string; validUntil?: string }

export const COURSE_TEMPLATES: Template[] = [
  { code: 'COOK', sort: 10, title: "SHIP'S COOK", regulation: 'According to Maritime Labor Convention, 2006 and Resolution ADM No. 068-2013, Regulation 3.2, Standard A3. and Guideline B3.2 of Maritime Labour Convention' },
  { code: 'PSCRB', sort: 20, title: 'Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats', regulation: 'STCW 1978 as amended, Regulation VI/2, Section A-VI/2, Paragraphs 1-6, Table A-VI/2-1' },
  { code: 'AFF', sort: 30, title: 'Advanced Fire Fighting (STCW VI/3)', regulation: 'STCW 1978 as amended, Regulation VI/3, Section A-VI/3, Paragraphs 1-4, Table A-VI/3' },
  { code: 'MFA', sort: 40, title: 'Medical First Aid On Board Ship', regulation: 'STCW 1978 as amended, Regulation VI/4, Section A-VI/4, Paragraphs 1-3, Table A-VI/4-1' },
  { code: 'BRM', sort: 50, title: 'Bridge Resource Management & Leadership and Teamwork', regulation: 'STCW 1978 as amended, Regulations II/1, II/2 and VIII/2, Section A-II/1, Table A-II/1' },
  { code: 'BST', sort: 60, title: 'Basic Safety Training (STCW VI/1 Familiarization)', regulation: 'STCW 1978 as amended, Regulation VI/1, Section A-VI/1, Paragraph 2, Table A-VI/1-1 to 1-4' },
  { code: 'ECDIS', sort: 70, title: 'Operational Use of Electronic Chart Display and Information Systems (ECDIS)', regulation: 'STCW 1978 as amended, Regulation II/1, II/2, Section A-II/1, Table A-II/1' },
];

export const CERTIFICATE_DEFAULTS = {
  signatoryName: 'Claudia Galeano',
  signatoryTitle: 'CTC General Manager',
  trainingMode: 'Presential',
};

export async function seedReferenceData(db: Pool) {
  for (const t of COURSE_TEMPLATES) {
    await db.query(
      `INSERT INTO course_templates (code, title, stcw_regulation, approval_resolution, approval_authority, approval_date, approval_valid_until, validity_years, sort_order)
       VALUES (?,?,?,?,?,?,?,5,?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), stcw_regulation = VALUES(stcw_regulation), approval_resolution = VALUES(approval_resolution),
         approval_authority = VALUES(approval_authority), approval_date = VALUES(approval_date), approval_valid_until = VALUES(approval_valid_until),
         validity_years = VALUES(validity_years), sort_order = VALUES(sort_order)`,
      [t.code, t.title, t.regulation, t.resolution ?? RESOLUTION, AUTHORITY, t.approvalDate ?? APPROVED, t.validUntil ?? APPROVAL_VALID_UNTIL, t.sort],
    );
  }
  await db.query(
    'INSERT IGNORE INTO certificate_defaults (id, signatory_name, signatory_title, training_mode) VALUES (1,?,?,?)',
    [CERTIFICATE_DEFAULTS.signatoryName, CERTIFICATE_DEFAULTS.signatoryTitle, CERTIFICATE_DEFAULTS.trainingMode],
  );
}
