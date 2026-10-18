# Code and data usage audit — October 18, 2026

Scope: all 58 application source files, public assets, public data routes, admin mutation paths, cache layers, and prayer display/media behavior. Graphify AST analysis produced 296 nodes and 669 edges before edits; findings were verified against source and browser requests.

## Removed redundancies

- Settings: the contact page and footer invoked separate copies of the same fetching hook. Consumers now share a pending request and a 60-second cache. Failed requests remain retryable; unmounted consumers ignore responses.
- Resources: two hydration-time requests to admin-named public APIs now become parallel server reads behind the shared 60-second data cache. Resource text and links are present in the initial page response.
- Storage: collection and prayer caches now use one read-through implementation. Concurrent ordinary cache misses share a promise. A generation guard stops an older read from replacing a successful save or explicit fresh read.
- Writes: unchanged collection documents and prayer schedules skip remote writes, including GitHub commits and any builds those commits would trigger. Prayer timestamp differences alone do not trigger a save.
- Persistence: failed saves no longer publish optimistic memory or scratch-file values. Successful saves expire the corresponding Next data-cache tag, including the prayer data used by both public prayer pages. Shared cache refreshes bypass per-instance memory so another worker's old value cannot repopulate an invalidated shared cache.
- Prayer UI: home and prayer-times pages share one countdown hook. This also corrects the homepage's previous dependency on the visitor's local timezone. Both use the configured masjid timezone.
- Display: daily astronomical calculations depend on the local calendar day rather than the one-second clock. The live site also reproduced a React hydration error from prerendered clock text; the clock now mounts on the client after hydration.
- Models: the display and server use one prayer schema, validator, and fallback. Announcements use the store's model. Removed the unused duplicate type file and unused memory-store facade.
- Photo: replaced the homepage's full-resolution JPEG element with a responsive Next image.
- Tests: repaired the kiosk media regression script, which still tried to read a middleware file removed by an earlier change.

## Observed before/after

Measured using isolated headless Chromium sessions at 1280 × 900 against https://www.ichattiesburg.org and the changed local production build. Counts below are first-party API requests on a full page load, excluding framework prefetch traffic.

- Contact: 3 → 2 requests; settings reads 2 → 1.
- Resources: 4 → 2 requests; separate resource requests 2 → 0. Quran link content remained present.
- Homepage photo: 1,918,149 → 50,846 response-body bytes (97.35% reduction) at the tested desktop viewport. Other sizes and formats vary.
- Display: live reproduced a hydration exception; changed build had none.
- Unit scenario: 100 concurrent ordinary cache misses → 1 underlying read.

These are request and payload observations, not measured production billing savings. Existing CDN settings, traffic, image optimization costs, and cache hit rates affect actual spend.

## Verification

- Production build and TypeScript check passed.
- Data regression suite covers coalescing, TTL expiry, retry after failure, read/save races, unchanged saves, failed saves, tag invalidation, shared settings requests, nested prayer-cache isolation, prayer persistence, timezone countdown and overnight rollover, and durable-failure scratch-file behavior.
- Kiosk media suite: 100 loops use one download; offline reload reuses the persistent copy; storage denial and network failure stay bounded.
- Browser comparison: home, contact, resources, prayer-times, display; all changed pages returned 200 without browser exceptions.
- Mobile checks at 390 × 844: home, contact, resources, prayer-times; no horizontal overflow or browser exceptions.
- Four changed mutation endpoints rejected unauthenticated POSTs with 401.

Run `npm run test:usage`, `npm run test:kiosk-media`, and `npm run build`. Start the production server on port 3107 before `npm run test:browser-usage`; set `AUDIT_LOCAL_ONLY=1` to omit the live-site baseline.

## Limits and remaining concerns

- Local verification used bundled data because production Redis/GitHub credentials were unavailable. Persistence failures were tested with controlled backend mocks; no live records were modified.
- Kept Redis plus GitHub writes when configured: these are existing durability copies. Removing a backend would change recovery behavior. Unchanged saves now avoid both.
- Kept display polling at once per minute with hidden/offline and in-flight guards. Longer polling would delay prayer schedule updates. Existing public CDN freshness windows remain 30–60 seconds.
- Existing document-based admin edits can still lose concurrent edits made from different instances; distributed compare-and-swap is separate work.
- Existing authentication code has development credential and signing-secret fallbacks and a cookie without the secure flag. Production environment coverage was not verified; this deserves a separate security change. No production sign-in attempts were made.
- The storage adapter still addresses the repository's former GitHub name; making it configurable and migrating persistence needs explicit backend verification.
- Build reports a local workspace-root warning caused by an ancestor lockfile. No build failure occurred.

Changes are prepared on `codex/redundancy-audit`; production publication is separate from the local verification above.
