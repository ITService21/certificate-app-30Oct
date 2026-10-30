import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from './db';

const sql = readFileSync(resolve(process.cwd(), 'server/schema.sql'), 'utf8');
const statements = sql
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const stmt of statements) await pool.query(stmt);
console.log(`Schema ready (${statements.length} statements applied).`);
await pool.end();
