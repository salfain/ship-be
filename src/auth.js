import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const tokenSecret = loadTokenSecret();
const tokenTtlMs = 1000 * 60 * 60 * 24 * 7;

export function loadTokenSecret({
  configuredSecret = process.env.TOKEN_SECRET,
  secretFile = process.env.TOKEN_SECRET_FILE || './data/token-secret',
} = {}) {
  const explicitSecret = `${configuredSecret || ''}`.trim();
  if (
    explicitSecret &&
    explicitSecret !== 'ganti_dengan_secret_panjang' &&
    explicitSecret !== 'ship-monitoring-dev-secret'
  ) {
    return explicitSecret;
  }

  const secretPath = path.resolve(secretFile);
  if (fs.existsSync(secretPath)) return readSecretFile(secretPath);

  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  const generatedSecret = crypto.randomBytes(48).toString('base64url');
  try {
    fs.writeFileSync(secretPath, `${generatedSecret}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    return generatedSecret;
  } catch (error) {
    if (error?.code === 'EEXIST') return readSecretFile(secretPath);
    throw error;
  }
}

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

function readSecretFile(secretPath) {
  const secret = fs.readFileSync(secretPath, 'utf8').trim();
  if (secret.length < 32) {
    throw new Error(`TOKEN_SECRET_FILE tidak valid: ${secretPath}`);
  }
  return secret;
}
