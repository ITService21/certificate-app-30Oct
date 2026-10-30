import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be set (32+ chars) when NODE_ENV=production');
  process.exit(1);
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4100),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'certverify',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'certverify',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
  seedPassword: process.env.SEED_PASSWORD || 'Admin@12345',
  allowDemoReset: process.env.ALLOW_DEMO_RESET === 'true',
};
