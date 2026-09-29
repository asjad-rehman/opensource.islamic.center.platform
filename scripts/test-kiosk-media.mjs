import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AsyncLocalStorage } from 'node:async_hooks';
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server.js');
const source = readFileSync('public/donation-kiosk.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const middleware = readFileSync('src/middleware.ts', 'utf8');
const matcher = JSON.parse(middleware.match(/matcher: (\[.*\])/)[1]);
for (const url of ['/gemini_generated_video_77009492.mp4', '/other.webm', '/uploads/a.jpg', '/api/jamaat']) {
  assert.equal(unstable_doesMiddlewareMatch({ config: { matcher }, nextConfig: {}, url }), false, url);
}
assert.equal(unstable_doesMiddlewareMatch({ config: { matcher }, nextConfig: {}, url: '/prayer-times' }), true);
const entries = new Map(); let downloads = 0;
const cache = { match: async k => entries.get(k)?.clone(), put: async (k, r) => entries.set(k, r) };
async function load({ storage = true, offline = false } = {}) {
  const events = {}; const video = { play: async () => {}, pause() {}, addEventListener: (k,f) => events[k] = f };
  await vm.runInNewContext(source, {
    document: { getElementById: () => video, addEventListener() {}, hidden: false },
    window: { addEventListener() {} }, console: { warn() {} },
    caches: { open: async () => { if (!storage) throw Error('disabled'); return cache; } },
    fetch: async () => { downloads++; if (offline) throw Error('offline'); return new Response('video data', { headers: { 'Content-Type': 'video/mp4' } }); },
    URL: { createObjectURL: blob => { assert.equal(blob.size, 10); return 'blob:local-video'; } },
  });
  return { video, events };
}
let page = await load();
assert.equal(page.video.src, 'blob:local-video');
for (let i=0;i<100;i++) page.events.ended();
assert.equal(downloads, 1, 'loops must not fetch video');
page = await load({ offline: true });
assert.equal(page.video.src, 'blob:local-video');
assert.equal(downloads, 1, 'reload must reuse persistent copy offline');
page = await load({ storage: false });
assert.equal(page.video.src, 'blob:local-video');
assert.equal(downloads, 2, 'storage denial must still loop an in-memory copy');
page = await load({ storage: false, offline: true });
assert.equal(page.video.src, undefined, 'failure must not fall back to repeated streaming');
console.log('PASS: media bypasses middleware; 100 loops use one download; offline reload reuses cache; storage denial and network failure are bounded.');
