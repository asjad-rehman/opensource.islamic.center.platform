import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import jwt from 'jsonwebtoken';

// Run after next build. Isolate all writes from remote storage and restore the
// exact local scratch files, including a file that existed before this test.
const scratch = ['/tmp/ichattiesburg-settings.json', '/tmp/ichattiesburg-impact.json'];
const original = await Promise.all(scratch.map(path => readFile(path).catch(() => null)));
const env = { ...process.env, JWT_SECRET: 'local-cache-test-only',
  GITHUB_TOKEN: '', GH_TOKEN: '', GITHUB_PAT: '',
  UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '' };
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3117'],
  { env, stdio: 'ignore', windowsHide: true });
const base = 'http://localhost:3117';
const cookie = 'admin_token=' + jwt.sign({ id: 'cache-test', email: 'cache@example.invalid', name: 'Cache test' }, env.JWT_SECRET);
const read = async path => { const response = await fetch(base + path); assert.equal(response.status, 200); return response.text(); };
const save = async (path, body, authenticated = true) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { await read('/api/jamaat'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, 'production test server started');
  const marker = 'cache-probe-' + Date.now();
  await read('/about'); await read('/donate'); await read('/impact');
  assert.equal((await save('/api/admin/settings', { missionText: marker }, false)).status, 401);
  assert.ok(!(await read('/about')).includes(marker), 'unauthorized edits do not affect cached content');
  const settings = await save('/api/admin/settings', { missionText: marker, zeffyOneTimeId: marker });
  assert.equal(settings.status, 200, await settings.text());
  assert.ok((await read('/about')).includes(marker), 'about reflects saved settings immediately');
  assert.ok((await read('/donate')).includes(marker), 'donation configuration reflects saved settings immediately');
  const impact = await save('/api/admin/impact', { title: marker, description: 'Local test only' });
  assert.equal(impact.status, 200, await impact.text());
  assert.ok((await read('/impact')).includes(marker), 'impact reflects a successful save immediately');
  assert.ok((await read('/about')).includes(marker), 'unrelated save preserves settings');
  const manifest = JSON.parse(await read('/api/jamaat'));
  assert.equal(manifest.ok, true); assert.ok(manifest.data.fajr);
  console.log('PASS: production cache invalidation, unauthorized-write denial, donation settings freshness, impact freshness and prayer API.');
} finally {
  server.kill();
  await new Promise(resolve => server.once('exit', resolve));
  await Promise.all(scratch.map((path, i) => original[i] === null ? unlink(path).catch(() => {}) : writeFile(path, original[i])));
}
