import crypto from 'node:crypto';

const tokenSecret = process.env.TOKEN_SECRET || 'ship-monitoring-dev-secret';
const tokenTtlMs = 1000 * 60 * 60 * 24 * 7;

export function createToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    exp: Date.now() + tokenTtlMs,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (signature !== sign(body)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );
    if (!payload.id || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normalizeRole(value) {
  return `${value || ''}`.trim().toUpperCase();
}

function sign(body) {
  return crypto
    .createHmac('sha256', tokenSecret)
    .update(body)
    .digest('base64url');
}
