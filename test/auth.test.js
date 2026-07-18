import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-auth-'));
const secretFile = path.join(tempRoot, 'token-secret');
process.env.TOKEN_SECRET = '';
process.env.TOKEN_SECRET_FILE = secretFile;

const { loadTokenSecret } = await import('../src/auth.js');

after(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('generates and reuses a persistent token secret without manual config', () => {
  const first = loadTokenSecret({ configuredSecret: '', secretFile });
  const second = loadTokenSecret({ configuredSecret: '', secretFile });

  assert.equal(first, second);
  assert.ok(first.length >= 32);
  assert.equal(fs.readFileSync(secretFile, 'utf8').trim(), first);
});

test('uses an explicit token secret when one is provided by the environment', () => {
  const configuredSecret = 'a-secure-explicit-token-secret-for-testing';
  assert.equal(loadTokenSecret({ configuredSecret, secretFile }), configuredSecret);
});
