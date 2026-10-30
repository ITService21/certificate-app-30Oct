import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { pool, toUser } from './db';
import type { User } from '../src/types';

export interface AuthedRequest extends Request {
  user?: User;
}

export const signToken = (user: User) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h' });

const readToken = (req: Request): string | null => {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
};

/** True when the request carries a valid admin token (used to skip scan logging for staff). */
export const hasValidToken = (req: Request) => {
  const t = readToken(req);
  if (!t) return false;
  try {
    jwt.verify(t, config.jwtSecret);
    return true;
  } catch {
    return false;
  }
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [payload.sub]);
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account inactive or removed' });
    }
    req.user = toUser(rows[0]);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

export const requireSuperAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a Super Admin can perform this action' });
  }
  next();
};

/** Tiny in-memory fixed-window limiter (single-process deployment). */
export const rateLimit = (max: number, windowMs: number) => {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      return next();
    }
    if (++h.n > max) {
      res.setHeader('Retry-After', Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ error: 'Too many requests, slow down' });
    }
    next();
  };
};
