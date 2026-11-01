# Mosque Website Template (Next.js 16)

A modern, responsive website + admin dashboard for a masjid / Islamic community
center. Originally built for the **Islamic Center of Hattiesburg (ICH)** and
structured so any masjid can fork it and rebrand with its own colours, prayer
configuration, content, and donation forms — **no SQL database to run**.

It ships with a public marketing site, a self-service admin dashboard, live
prayer-time calculation, and a full-screen **TV display** board for the prayer
hall.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [How It Works (Architecture)](#how-it-works-architecture)
  - [Rendering & routing](#rendering--routing)
  - [Content storage](#content-storage-srclibremote-storagets)
  - [Prayer times](#prayer-times)
  - [Admin authentication](#admin-authentication)
  - [Donations](#donations)
  - [Styling & fonts](#styling--fonts)
- [Pages](#pages)
- [Project Structure](#project-structure)
- [Rebranding for Your Masjid](#rebranding-for-your-masjid)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Seed Data Files](#seed-data-files)
- [API Reference](#api-reference)
- [Deployment (Vercel)](#deployment-vercel)
- [Author](#author)

---

## Tech Stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16.2** (App Router, React 19, TypeScript) |
| Styling | Inline styles driven by a shared theme object (`src/lib/theme.ts`) **+** Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`) for a few components |
| Animation | `framer-motion` (scroll reveals) and `lenis` (smooth scroll) |
| Icons | `lucide-react` |
| Prayer times | Main pages: **AlAdhan REST API** (`api.aladhan.com`); `/display` board: **`adhan`** npm library locally — both configured from `src/config/masjid.ts` |
| Content storage | Tiered `remote-storage` layer: Upstash Redis / Vercel KV **or** GitHub Contents API, with bundled `public/*.json` seeds as the fallback — **no PostgreSQL/MySQL required** |
| Auth | Stateless JWT in an httpOnly cookie (`jsonwebtoken` + `bcryptjs`) |
| Donations | **Zeffy** embedded forms + a **LaunchGood** link (no payment keys needed) |
| Hosting | Vercel-optimized |

---

## How It Works (Architecture)

### Rendering & routing

- App Router. Most content pages are **server components** with
  `export const dynamic = "force-dynamic"` so they always read the latest
  content, then hand data to a `"use client"` component for interactivity.
- `src/middleware.ts` sets an `x-pathname` response header on every request.
  `src/app/layout.tsx` reads it and, for `/display`, renders the page **without**
  the navbar/announcements/footer (so the TV board is chrome-free). All other
  routes get the shared shell (`AnnouncementsBanner` → `Navbar` → page →
  `Footer`, wrapped in `LenisProvider`).

### Content storage (`src/lib/remote-storage.ts`)

There is **no relational database**. Editable content lives in small JSON
documents, each addressed by a name (e.g. `impact`, `events`, `settings`).
`src/lib/store.ts` wraps each document in a collection with a 10-second
in-process cache; `src/lib/jamaat.ts` does the same for congregation times.

**Reads** (`remoteRead`) try, in order:
1. Upstash Redis / Vercel KV (if configured)
2. GitHub Contents API (if a token is configured — bypasses CDN caching)
3. `/tmp/ichattiesburg-<name>.json` (per-instance scratch)
4. Bundled seed `public/<name>.json`
5. Hard-coded defaults in code

**Writes** (`remoteWrite`) fan out to every configured backend (Redis/KV, `/tmp`,
and GitHub). A write only reports failure when a **durable** backend (Redis/KV or
GitHub) was configured and *all* of them failed — so, e.g., a stale GitHub token
no longer breaks a save that Redis already persisted. With no durable backend
configured, writes fall back to `/tmp` (dev/local mode) and resolve silently.

> ⚠️ **Serverless persistence:** `/tmp` is per-instance and ephemeral. For admin
> edits to persist across requests on Vercel you **must** configure Redis/KV or a
> valid GitHub token (see [Environment Variables](#environment-variables)). The
> GitHub target repo/branch are hard-coded as `GH_OWNER` / `GH_REPO` /
> `GH_BRANCH` in `remote-storage.ts` and must be changed when you fork.

### Prayer times

`src/lib/prayer-times.ts` fetches daily adhan times from the **AlAdhan API**
(`https://api.aladhan.com/v1/timings`, cached for 1 hour) using the coordinates,
calculation method, and madhab from `src/config/masjid.ts`. If the API call
fails it falls back to sane hard-coded times.

**Jamaat (iqama) and Jumuah times are separate** and admin-controlled — stored
under the `jamaat` document (`src/lib/jamaat.ts`). The site shows the calculated
adhan time alongside the admin-set jamaat time for each prayer.

There are **two** adhan-calculation paths:
- The main pages (`/`, `/prayer-times`) fetch from the **AlAdhan API**
  server-side via `prayer-times.ts`.
- The `/display` TV board computes times **client-side using the `adhan` npm
  library** (`Coordinates`/`CalculationMethod`/`Madhab`/`PrayerTimes`) so it
  updates live every second without hitting the network, and polls `/api/jamaat`
  every 10s for the admin-set jamaat times.

Both paths read the same `src/config/masjid.ts` settings, so keep them consistent.

### Admin authentication

- `POST /api/admin/login` compares the submitted username against `ADMIN_EMAIL`
  and the password directly against `ADMIN_PASSWORD`. No hash generation is needed.
  `ADMIN_PASSWORD` takes priority; existing `ADMIN_PASSWORD_HASH` (bcrypt) setups
  remain supported when `ADMIN_PASSWORD` is empty or unset. On success it sets a
  signed JWT (`jsonwebtoken`, 7-day expiry) in an httpOnly `admin_token` cookie.
- The username defaults to `ichattiesburg` when `ADMIN_EMAIL` is unset.
- **Production refuses to log anyone in** unless `ADMIN_PASSWORD` (or
  `ADMIN_PASSWORD_HASH`) is set, and refuses every session unless `JWT_SECRET`
  is set (16+ characters). The `ichattiesburg` / `3223` login works only in
  `next dev`.
- Sign-in is rate-limited to 10 attempts per IP per 15 minutes (shared through
  Redis/KV when configured). The cookie is `Secure` in production.
- Write endpoints call `getAdminUser(req)` and 401 without a valid cookie. Every
  write payload is validated (`src/lib/validate.ts`): unknown fields are dropped,
  types and lengths are checked, and links must be `http(s)`, `mailto:` or `tel:`.
- Uploads accept only JPG/PNG/GIF/WebP (checked by file contents, max 5 MB).
  Photos uploaded since the last deploy are served from storage via
  `/api/media/[name]` (a fallback rewrite for `/uploads/*`).
  Read (`GET`) endpoints are intentionally public so client components (footer,
  contact, resources) can fetch settings/content.

### Donations

The `/donate` page (`src/app/donate/donate-client.tsx`) renders **Zeffy**
donation forms in an iframe (one-time / monthly, IDs from site settings) plus a
**LaunchGood** button for the Oak Grove building campaign. It needs no payment
keys — Zeffy hosts the checkout.

### Styling & fonts

- Colours come from the `ICH` object in `src/lib/theme.ts`, applied mostly via
  inline styles and re-exported through `src/components/ui-primitives.tsx`
  (`Btn`, `Card`, `SectionHead`, `GoldLabel`, `Tag`, `ScrollReveal`).
  > Because `ui-primitives.tsx` is a `"use client"` module, **server components
  > must import `ICH` from `@/lib/theme` directly** — importing the value through
  > the client module yields `undefined` at render time.
- Tailwind v4 is also enabled and used by a few components (e.g. the
  announcements banner, the `/display` board) and the root layout.
- Fonts: **Inter** (sans) and **Cormorant Garamond** (serif headings) via
  `next/font/google`, plus a bundled **Madina/Uthmanic** Arabic webfont
  (`public/fonts/UthmanicHafs.woff2`, used via the `.arabic-text` class).

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — hero, live prayer strip with countdown, Jumuah card, about, donate CTA |
| `/prayer-times` | Full daily schedule (adhan + jamaat), live countdown, Jumuah details |
| `/events` | Category-filterable events / calendar |
| `/about` | Mission, board members, programs, Oak Grove project, location map |
| `/impact` | Impact stories and metrics |
| `/resources` | Local halal listings + curated Islamic link grid |
| `/contact` | Contact form (submits to Web3Forms) + address/socials |
| `/donate` | Zeffy embedded forms + LaunchGood link |
| `/display` | **Full-screen TV board** for the prayer hall (no site chrome; not mobile-oriented) |
| `/admin`, `/admin/login` | Admin dashboard + login |
| `/privacy`, `/robots.txt`, `/sitemap.xml` | Legal + SEO |

---

## Project Structure

```
src/
├─ app/
│  ├─ layout.tsx            # Root shell; hides chrome on /display via x-pathname
│  ├─ page.tsx              # Home (server) → components/home-client.tsx
│  ├─ <route>/page.tsx      # about, events, impact, resources, contact, donate, …
│  ├─ display/              # TV board (own layout, no navbar/footer)
│  └─ api/
│     ├─ announcements/     # public GET
│     ├─ jamaat/            # public GET + jamaat/update (admin POST)
│     └─ admin/             # login/logout, settings, events, board, impact,
│                           # programs, resources, resource-links, upload
├─ components/              # navbar, footer, *-client pages, ui-primitives, …
├─ config/masjid.ts         # coordinates, timezone, calc method, madhab
├─ lib/
│  ├─ theme.ts              # ICH colour tokens
│  ├─ store.ts              # content collections (board, events, impact, …)
│  ├─ jamaat.ts             # congregation/Jumuah times
│  ├─ remote-storage.ts     # tiered read/write (Redis/KV · GitHub · /tmp · seed)
│  ├─ prayer-times.ts       # AlAdhan API fetch + formatting
│  ├─ auth.ts               # JWT sign/verify, bcrypt, getAdminUser
│  ├─ use-settings.ts       # client hook for site settings
│  └─ time.ts, utils.ts
├─ middleware.ts            # sets x-pathname header
└─ types/index.ts

public/                     # seed *.json, fonts, uploads/, images
```

---

## Rebranding for Your Masjid

1. **Prayer config** — `src/config/masjid.ts`: name, IANA `timezone`,
   `coordinates`, `calc.method`, and `madhab` (`HANAFI` = later Asr,
   `SHAFI` = earlier Asr).
2. **Colours** — `src/lib/theme.ts`: edit the `ICH` tokens to match your brand.
   (Optional: the `/display` board uses its own palette in
   `src/app/display/page.tsx`.)
3. **Logo & assets** — replace `public/uploads/logo.png` (navbar/footer),
   `src/app/icon.png` (favicon), and the home hero image `public/ich.jpeg`. The
   home hero also draws a mosque silhouette SVG in the `MosqueHero` function of
   `src/components/home-client.tsx`.
4. **SEO / domain** — `src/app/layout.tsx`: `metadataBase`, title/description,
   keywords, and OpenGraph. Update image `remotePatterns` in `next.config.ts`.
5. **GitHub persistence target** — if you use the GitHub storage backend, set
   `GH_OWNER` / `GH_REPO` / `GH_BRANCH` in `src/lib/remote-storage.ts`.
6. **Seed content** — edit the JSON files in `public/` (see
   [Seed Data Files](#seed-data-files)) or just manage everything from `/admin`
   once a durable backend is configured.
7. **Contact form** — the contact page posts to Web3Forms; replace the
   `access_key` in `src/app/contact/page.tsx`.
8. **Donations** — set your Zeffy form UUIDs and LaunchGood URL from
   **Admin → Site Settings** (or in `public/settings.json`).

---

## Local Development

```bash
git clone https://github.com/asjad-rehman/ichattiesburg.git your-masjid-web
cd your-masjid-web
npm install
cp .env.example .env.local     # then fill in values (or leave blank for dev login)
npm run dev                    # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

Without any env vars `npm run dev` runs with seed content and the dev admin login
(`ichattiesburg` / `3223`); edits persist only to `/tmp` locally.

Admin dashboard: `http://localhost:3000/admin`.

---

## Environment Variables

See [`.env.example`](./.env.example) for the annotated template.

| Variable | Required? | Purpose |
|---|---|---|
| `JWT_SECRET` | Prod | Signs the admin session cookie (16+ chars; admin is disabled without it) |
| `ADMIN_EMAIL` | Prod | Admin login username (defaults to `ichattiesburg`) |
| `ADMIN_PASSWORD` | Prod | Your admin password, entered directly; store as a Vercel Secret |
| `ADMIN_PASSWORD_HASH` | Optional | Legacy bcrypt hash, used only without `ADMIN_PASSWORD` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | One backend | Upstash Redis persistence |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | One backend | Vercel KV aliases for the above |
| `GITHUB_TOKEN` (or `GH_TOKEN` / `GITHUB_PAT`) | One backend | GitHub Contents API persistence — PAT with **Contents: Read and write** |
| `CONTENT_REPO_OWNER` / `CONTENT_REPO_NAME` / `CONTENT_REPO_BRANCH` | Optional | Repo the GitHub backend writes to (defaults: `asjad-rehman` / `ichattiesburg` / `main`) — set these on a fork |

`vercel.json` skips rebuilds for commits that only change `public/*.json` (content
saved from the dashboard is read at runtime, so no rebuild is needed).

Generate secrets:

```bash
# JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**For production you must configure at least one durable backend** (Redis/KV or a
GitHub token with `Contents: Read and write`) or admin edits will not persist.

---

## Seed Data Files

Bundled JSON in `public/` provides the initial content and the read fallback when
no durable backend is set. Each maps to a `remote-storage` document of the same
name:

| File | Content |
|---|---|
| `settings.json` | Address, email, phone, socials, mission, Oak Grove copy, Zeffy UUIDs, Maghrib display |
| `announcements.json` | Site-wide banner alerts |
| `events.json` | Events / calendar items |
| `board.json` | Leadership board members |
| `programs.json` | Programs/classes shown on About |
| `resource_links.json` | Categorized link grid on Resources |
| `halal_resources.json` | Local halal dining/grocery text |
| `impact.json` | Impact metrics and stories |
| `jamaat.json` | Congregation (iqama) + Jumuah times |

---

## API Reference

Read (`GET`) endpoints are public; all write verbs require the admin cookie.

**Public reads**
- `GET /api/announcements`
- `GET /api/jamaat` — congregation/Jumuah times
- `GET /api/admin/{settings,programs,resource-links,resources,impact,events,board}`

**Admin (cookie required)**
- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET/POST/PUT/DELETE /api/admin/{announcements,events,board,impact,programs,resource-links}`
- `POST /api/admin/settings`
- `POST /api/admin/upload` — multipart image upload → returns `/uploads/<uuid>.<ext>`
- `POST /api/jamaat/update` — congregation/Jumuah times

Admin write handlers surface the underlying failure reason in their JSON error
(e.g. a GitHub `Bad credentials` / `Resource not accessible` response), which the
dashboard renders inline so misconfiguration is visible.

---

## Deployment (Vercel)

1. Push your fork to GitHub.
2. Vercel → **Add New Project** → import the repo.
3. Add environment variables (**Settings → Environment Variables**):
   `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (your actual password, stored as a Secret), and **one** durable
   storage backend (Vercel KV / Upstash, or a `GITHUB_TOKEN` with
   `Contents: Read and write`).
4. **Deploy.** After changing env vars, redeploy so the new values take effect.

Tip: **Vercel KV / Upstash is recommended** over the GitHub backend — it persists
instantly, whereas the GitHub backend commits a file on every save (which also
triggers a redeploy).

---

## Author

Built and maintained by **Muhammad Asjad Rehman Hashmi** —
[asjadrehman.com](https://asjadrehman.com).

Originally developed for the Islamic Center of Hattiesburg and released as a
reusable template for other masajid. Contributions and forks are welcome.
