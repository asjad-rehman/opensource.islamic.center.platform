import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, deps = {}, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, require: name => {
    if (name in deps) return deps[name];
    throw Error(`Unexpected import: ${name}`);
  }, Date, Promise, JSON, Error, structuredClone, ...globals }, { filename: file });
  return exports;
}
const { createReadThroughCache } = load('src/lib/read-through-cache.ts');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
let reads = 0;
let wait = deferred();
const cache = createReadThroughCache(() => { reads++; return wait.promise; });
const batch = Array.from({ length: 100 }, () => cache.get());
assert.equal(reads, 1, '100 simultaneous consumers share one read');
wait.resolve('old');
await Promise.all(batch);
assert.equal(await cache.get(), 'old');
assert.equal(reads, 1, 'TTL reuses a resolved read');
wait = deferred();
const oldRead = cache.get(true);
cache.set('saved');
wait.resolve('obsolete');
await oldRead;
assert.equal(await cache.get(), 'saved', 'late read cannot replace successful save');
let attempts = 0;
const retry = createReadThroughCache(async () => { if (++attempts === 1) throw Error('offline'); return 'recovered'; });
await assert.rejects(retry.get(), /offline/);
assert.equal(await retry.get(), 'recovered', 'failed reads can retry');
let clock = 1;
class Clock extends Date { static now() { return clock; } }
const timedFactory = load('src/lib/read-through-cache.ts', {}, { Date: Clock }).createReadThroughCache;
let ttlReads = 0;
const timed = timedFactory(async () => ++ttlReads, 10);
assert.equal(await timed.get(), 1); clock = 12;
assert.equal(await timed.get(), 2, 'expired value refetches');

let settings = [{ id: 'main', address: 'original' }];
let writes = 0; let fail = false; const tags = [];
const store = load('src/lib/store.ts', {
  'crypto': { randomUUID: () => 'new-id' },
  './utils': { parseLocalDate: s => new Date(s) },
  './read-through-cache': { createReadThroughCache },
  'next/cache': { revalidateTag: (tag, profile) => tags.push([tag, profile.expire]) },
  './remote-storage': {
    remoteRead: async (_name, fallback) => structuredClone(_name === 'settings' ? settings : fallback),
    remoteWrite: async (_name, data) => { writes++; if (fail) throw Error('save failed'); settings = structuredClone(data); },
  },
}).store;
await store.getSettings(true);
await store.updateSettings({ address: 'original' });
assert.equal(writes, 0, 'unchanged save skips storage and GitHub commit');
fail = true;
await assert.rejects(store.updateSettings({ address: 'failed' }), /save failed/);
assert.equal((await store.getSettings()).address, 'original', 'failed save does not poison memory');
assert.equal(tags.length, 0, 'failed save does not invalidate');
fail = false;
await store.updateSettings({ address: 'saved' });
assert.equal((await store.getSettings()).address, 'saved');
assert.equal(tags.at(-1)[0], 'content:settings');
assert.equal(tags.at(-1)[1], 0, 'successful save expires shared data');

let requests = 0; const effects = []; const values = [];
const hook = load('src/lib/use-settings.ts', {
  'react': { useEffect: f => effects.push(f), useState: () => [null, v => values.push(v)] },
  './read-through-cache': { createReadThroughCache },
}, { fetch: async () => { requests++; return { ok: true, json: async () => ({ settings: { id: 'main' } }) }; } });
hook.useSettings(); hook.useSettings();
effects.forEach(f => f());
await new Promise(r => setImmediate(r));
assert.equal(requests, 1, 'contact and footer share one settings request');
assert.equal(values.length, 2, 'both consumers receive settings');

const schema = load('src/lib/jamaat-schema.ts');
let jamaat = structuredClone(schema.DEFAULT_JAMAAT); let jamaatWrites = 0;
const jamaatStore = load('src/lib/jamaat.ts', {
  './jamaat-schema': schema, './read-through-cache': { createReadThroughCache },
  'next/cache': { revalidateTag: tag => tags.push([tag]) },
  './remote-storage': { remoteRead: async () => jamaat, remoteWrite: async (_name, data) => { jamaatWrites++; jamaat = data; } },
});
await jamaatStore.getJamaatTimes(true);
await jamaatStore.saveJamaatTimes({ ...jamaat, updatedAt: 'irrelevant' });
assert.equal(jamaatWrites, 0, 'unchanged prayer schedule skips durable writes');
await jamaatStore.saveJamaatTimes({ ...jamaat, fajr: '06:00' });
assert.equal(jamaatWrites, 1);
const copy = await jamaatStore.getJamaatTimes(); copy.jummah[0].salah = 'mutated';
assert.notEqual((await jamaatStore.getJamaatTimes()).jummah[0].salah, 'mutated');
assert.equal(tags.at(-1)[0], 'content:jamaat');
console.log('PASS: read coalescing, TTL, retries, save/read races, no-op saves, failed saves, invalidation, settings deduplication, prayer persistence and defensive copies.');
const countdownStates = [];
let localTime = { hour: 10, minute: 0, second: 0 };
const countdown = load('src/lib/use-prayer-countdown.ts', {
  'react': { useEffect: f => f(), useState: () => [null, v => countdownStates.push(v)] },
  './time': { zonedParts: (_date, zone) => { assert.equal(zone, 'America/Chicago'); return localTime; } },
  '@/config/masjid': { masjid: { timezone: 'America/Chicago' } },
}, { setInterval: () => 1, clearInterval: () => {} });
const schedule = [{ name: 'Fajr', display: '6:00 AM' }, { name: 'Dhuhr', display: '12:30 PM' }, { name: 'Isha', display: '8:00 PM' }];
countdown.usePrayerCountdown(schedule);
assert.equal(countdownStates.at(-1).countdown, '02:30:00');
assert.equal(countdownStates.at(-1).nextName, 'Dhuhr');
localTime = { hour: 21, minute: 0, second: 0 };
countdown.usePrayerCountdown(schedule);
assert.equal(countdownStates.at(-1).countdown, '09:00:00');
assert.equal(countdownStates.at(-1).nextName, 'Fajr');
console.log('PASS: shared countdown uses masjid timezone and rolls over after Isha.');
let scratchWrites = 0; let durableFails = true;
const remoteStorage = load('src/lib/remote-storage.ts', {
  fs: { readFileSync() {}, existsSync: () => false, writeFileSync: () => { scratchWrites++; } },
  path: { join: (...parts) => parts.join('/') },
  '@upstash/redis': { Redis: class { async set() { if (durableFails) throw Error('durable failure'); } } },
}, {
  process: { env: { UPSTASH_REDIS_REST_URL: 'https://example.invalid', UPSTASH_REDIS_REST_TOKEN: 'test-only' }, cwd: () => '/fixture' },
  console: { log() {}, warn() {}, error() {} },
});
await assert.rejects(remoteStorage.remoteWrite('settings', []), /durable failure/);
assert.equal(scratchWrites, 0, 'failed durable writes must not leak through scratch fallback');
durableFails = false;
await remoteStorage.remoteWrite('settings', []);
assert.equal(scratchWrites, 1, 'successful durable write also refreshes scratch fallback');
console.log('PASS: durable persistence failure cannot publish an unconfirmed local fallback.');
