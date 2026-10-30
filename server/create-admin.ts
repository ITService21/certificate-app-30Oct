// Usage: npm run admin:create -- "Full Name" email@domain.com 'StrongPassword!'
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { pool } from './db';

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password || password.length < 10) {
  console.error('Usage: npm run admin:create -- "Full Name" email@domain.com "Password (10+ chars)"');
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
await pool.query(
  `INSERT INTO users (id, name, email, password_hash, role, title, department, status)
   VALUES (?,?,?,?, 'super_admin', 'Registrar', 'Administration', 'active')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'super_admin', status = 'active'`,
  [`user-${randomUUID().slice(0, 8)}`, name, email.toLowerCase(), hash],
);
console.log(`Super admin ready: ${email}`);
await pool.end();
