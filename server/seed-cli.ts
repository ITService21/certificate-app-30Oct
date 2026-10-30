import { pool } from './db';
import { seedDemo } from './seed';

await seedDemo({ reset: process.argv.includes('--reset') });
await pool.end();
