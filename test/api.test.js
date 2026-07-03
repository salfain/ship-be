import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-api-'));
process.env.DATA_DIR = path.join(tempRoot, 'data');
process.env.UPLOAD_DIR = path.join(tempRoot, 'uploads');
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.TOKEN_SECRET = 'test-secret';

const { createApp } = await import('../src/app.js');
const { ensureStorage } = await import('../src/db.js');

let server;
let baseUrl;

before(() => {
  ensureStorage();
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('manager can validate a submission using manager-validation endpoint', async () => {
  const admin = await login('admin', 'password');
  const manager = await login('manager', 'password');

  const submissions = await getJson('/submissions', admin.token);
  const target = submissions.data.find(
    (item) => item.status === 'WAITING_MANAGER_VALIDATION',
  );
  assert.ok(target, 'expected seed submission waiting for manager validation');

  const response = await fetch(
    `${baseUrl}/submissions/${target.id}/manager-validation`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${manager.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        reviewNote: 'Disetujui dari test.',
      }),
    },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.status, 'APPROVED');
  assert.equal(body.data.reviewNote, 'Disetujui dari test.');
});

test('root endpoint explains the API is running', async () => {
  const response = await fetch(baseUrl.replace('/api', '/'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.message, 'Ship Monitoring API aktif.');
});

test('manager cannot use admin approve endpoint', async () => {
  const manager = await login('manager', 'password');
  const response = await fetch(`${baseUrl}/submissions/sub-2025-001/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${manager.token}` },
  });

  assert.equal(response.status, 403);
});

async function login(username, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function getJson(pathname, token) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  return response.json();
}
