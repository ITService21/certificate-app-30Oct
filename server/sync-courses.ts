// Makes the course list the 8 official courses (local or production): adds missing ones, applies the official
// wording, removes the 4 retired first-seed courses. Never touches courses the admin added or edited.
//   Usage: npm run courses:sync
import { pool } from './db';
import { syncCourses } from './reference-data';

const { added, updated, removed } = await syncCourses(pool);
console.log(added.length ? `Added: ${added.join(', ')}` : 'Added: none');
if (updated.length) console.log(`Official regulation wording applied to: ${updated.join(', ')}`);
console.log(removed.length ? `Removed: ${removed.join(', ')}` : 'Removed: none');
const [rows] = await pool.query<any[]>('SELECT code FROM course_templates ORDER BY sort_order, title');
console.log(`Courses now (${rows.length}): ${rows.map((r) => r.code).join(', ')}`);
await pool.end();
