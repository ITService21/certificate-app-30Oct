import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from './db';
import { seedReferenceData } from './reference-data';

const sql = readFileSync(resolve(process.cwd(), 'server/schema.sql'), 'utf8');
const statements = sql
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const stmt of statements) await pool.query(stmt);

// Columns added after the first release. CREATE TABLE IF NOT EXISTS won't touch an existing table,
// so older databases get them here (safe to re-run).
const ADDED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: 'certificates', column: 'nationality', ddl: "VARCHAR(60) NOT NULL DEFAULT '' AFTER passport_number" },
];
for (const { table, column, ddl } of ADDED_COLUMNS) {
  const [rows] = await pool.query<any[]>(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column],
  );
  if (!rows.length) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
    console.log(`Added column ${table}.${column}`);
  }
}
await seedReferenceData(pool);
console.log('Reference data ready (course templates, certificate defaults).');
console.log(`Schema ready (${statements.length} statements applied).`);
await pool.end();
