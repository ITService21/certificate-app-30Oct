// Reference data every installation needs (local, staging, production). Applied by `npm run db:init`:
//  - course templates are only inserted into an EMPTY table (afterwards the admin manages them in Admin -> Courses),
//  - certificate defaults are only inserted when missing, so values edited later in the database are kept.
import type { Pool } from 'mysql2/promise';
import { NATIONALITIES } from './nationalities';

const AUTHORITY = 'Government of Panama, Directorate General of Merchant Marine';
const RESOLUTION = 'Resolution No. DGGM-CFM-005-2024';
const APPROVED = '2024-02-06';
const APPROVAL_VALID_UNTIL = '2026-06-12';

// The official wording that follows the regulation reference on the printed certificates.
const IMO_TAIL = ' of the IMO International Convention on Standards of Training,\nCertification and Watchkeeping for Seafarers STCW 1978, as amended';

interface Template { code: string; title: string; regulation: string; sort: number; days: number; resolution?: string; approvalDate?: string; validUntil?: string }

export const COURSE_TEMPLATES: Template[] = [
  { code: 'COOK', days: 5, sort: 10, title: "SHIP'S COOK", regulation: 'According to Maritime Labor Convention, 2006 and Resolution ADM No. 068-2013, Regulation 3.2, Standard A3. and Guideline B3.2 of Maritime Labour Convention' },
  { code: 'PSCRB', days: 4, sort: 20, title: 'Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats', regulation: `Regulation VI/2, Section A-VI/2,  Paragraphs 1-6 and Table A-VI/2-1${IMO_TAIL}` },
  { code: 'AFF', days: 5, sort: 30, title: 'Advanced Fire Fighting (STCW VI/3)', regulation: 'STCW 1978 as amended, Regulation VI/3, Section A-VI/3, Paragraphs 1-4, Table A-VI/3' },
  // Taken from the issued certificates (course title, regulation wording and training length).
  { code: 'BTOCT', days: 6, sort: 80, title: 'Basic Training for Oil and Chemical Tanker Cargo Operations', regulation: `Regulation V/1-1, Section A-V/1-1, Table A-V/1-1${IMO_TAIL}` },
  { code: 'ASD', days: 12, sort: 90, title: 'Able Seafarer Deck', regulation: `Regulation II/5, Section A-II/5, Table II/5${IMO_TAIL}` },
  { code: 'ASE', days: 32, sort: 100, title: 'Able Seafarer Engine', regulation: `Regulation III/5, Section A-III/5, Table III/5${IMO_TAIL}` },
  { code: 'RFEW', days: 13, sort: 110, title: 'Ratings Forming Part of an Engineering Watch', regulation: `Regulation III/4, Section A-III/4, Table A-III/4${IMO_TAIL}` },
  { code: 'RFNW', days: 5, sort: 120, title: 'Ratings Forming Part of a Navigational Watch', regulation: `Regulation II/4, Section A-II/4, Table A-II/4${IMO_TAIL}` },
];

export const CERTIFICATE_DEFAULTS = {
  signatoryName: 'Claudia Galeano',
  signatoryTitle: 'CTC General Manager',
  trainingMode: 'Presential',
};

/** Courses of the first seed that are no longer offered; `npm run courses:sync` removes them (issued certificates keep their wording). */
const RETIRED_COURSES = ['MFA', 'BRM', 'BST', 'ECDIS'];

/** Wording seeded earlier that is replaced by the official text, but only where the admin has not edited it. */
const OLD_REGULATION: Record<string, string> = {
  PSCRB: 'STCW 1978 as amended, Regulation VI/2, Section A-VI/2, Paragraphs 1-6, Table A-VI/2-1',
};

/**
 * `npm run courses:sync` (local and production): makes the course list the 8 official courses. It adds the ones that
 * are missing, swaps the earlier seeded wording for the official one and removes the retired first-seed courses.
 * Courses that exist and were edited, and courses the admin added, are never changed or removed.
 */
export async function syncCourses(db: Pool) {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  for (const t of COURSE_TEMPLATES) {
    const [found] = await db.query<any[]>('SELECT code FROM course_templates WHERE code = ?', [t.code]);
    if (!found.length) {
      await db.query(
        `INSERT INTO course_templates (code, title, stcw_regulation, approval_resolution, approval_authority, approval_date, approval_valid_until, validity_years, duration_days, sort_order)
         VALUES (?,?,?,?,?,?,?,5,?,?)`,
        [t.code, t.title, t.regulation, t.resolution ?? RESOLUTION, AUTHORITY, t.approvalDate ?? APPROVED, t.validUntil ?? APPROVAL_VALID_UNTIL, t.days, t.sort],
      );
      added.push(t.code);
    } else {
      // swap in the official wording (with its line break) only where the stored text is still an earlier seeded version
      const earlier = [OLD_REGULATION[t.code], t.regulation.replace(/\n/g, ' ')].filter((x) => x && x !== t.regulation);
      for (const old of earlier) {
        const [u] = await db.query<any>('UPDATE course_templates SET stcw_regulation = ? WHERE code = ? AND stcw_regulation = ?', [t.regulation, t.code, old]);
        if (u.affectedRows) { updated.push(t.code); break; }
      }
    }
  }
  for (const code of RETIRED_COURSES) {
    const [d] = await db.query<any>('DELETE FROM course_templates WHERE code = ?', [code]);
    if (d.affectedRows) removed.push(code);
  }
  return { added, updated, removed };
}

export async function seedReferenceData(db: Pool) {
  // Courses are managed by the admin (Admin -> Courses). The list above only starts a brand-new installation:
  // once the table has any row, db:init never adds, restores or overwrites a course.
  const [[{ n }]] = await db.query<any[]>('SELECT COUNT(*) AS n FROM course_templates');
  if (Number(n) === 0) {
    for (const t of COURSE_TEMPLATES) {
      await db.query(
        `INSERT INTO course_templates (code, title, stcw_regulation, approval_resolution, approval_authority, approval_date, approval_valid_until, validity_years, duration_days, sort_order)
         VALUES (?,?,?,?,?,?,?,5,?,?)`,
        [t.code, t.title, t.regulation, t.resolution ?? RESOLUTION, AUTHORITY, t.approvalDate ?? APPROVED, t.validUntil ?? APPROVAL_VALID_UNTIL, t.days, t.sort],
      );
    }
  }
  await db.query(
    'INSERT IGNORE INTO certificate_defaults (id, signatory_name, signatory_title, training_mode) VALUES (1,?,?,?)',
    [CERTIFICATE_DEFAULTS.signatoryName, CERTIFICATE_DEFAULTS.signatoryTitle, CERTIFICATE_DEFAULTS.trainingMode],
  );
  await db.query('INSERT IGNORE INTO nationalities (name) VALUES ?', [NATIONALITIES.map((n) => [n])]);
}
