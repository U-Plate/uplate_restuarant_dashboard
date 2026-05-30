# UPlate Restaurant Dashboard — Cloudflare Backend Specification

This document is the complete blueprint for building the backend that the UPlate
restaurant dashboard talks to, deployed entirely on **Cloudflare**. It is written
to be read by a human engineer and executed by an AI coding agent: every table,
column, index, endpoint, request/response shape, aggregation query, and
deployment step is spelled out.

The contract is not invented here — it is dictated by the frontend that already
exists. The browser app talks to the backend exclusively through the typed
`ApiClient` in `src/api/client.ts`, with wire DTOs in `src/api/types.ts` and the
HTTP wiring in `src/api/http.ts`. **The job of this backend is to make the HTTP
adapter (`createHttpClient`) work against a real server, byte-for-byte with the
shapes those files declare.** A reference in-memory implementation of every
endpoint already exists in `src/api/local.ts` — when this doc and that file
disagree about an aggregation, `local.ts` is the source of truth for behavior.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Technology stack & Cloudflare resources](#2-technology-stack--cloudflare-resources)
3. [Project layout](#3-project-layout)
4. [Configuration: wrangler, bindings, secrets](#4-configuration-wrangler-bindings-secrets)
5. [Authentication & multi-tenancy](#5-authentication--multi-tenancy)
6. [Global conventions](#6-global-conventions)
7. [D1 database schema](#7-d1-database-schema)
8. [Request lifecycle & middleware](#8-request-lifecycle--middleware)
9. [Shared DTO types](#9-shared-dto-types)
10. [Dashboard endpoint reference](#10-dashboard-endpoint-reference)
11. [Analytics computation (SQL)](#11-analytics-computation-sql)
12. [Consumer-facing endpoints: event ingestion & ad serving](#12-consumer-facing-endpoints-event-ingestion--ad-serving)
13. [Page → endpoint map](#13-page--endpoint-map)
14. [Error contract](#14-error-contract)
15. [Security, rate limiting & abuse](#15-security-rate-limiting--abuse)
16. [Deployment & local development](#16-deployment--local-development)
17. [Testing strategy](#17-testing-strategy)
18. [Implementation checklist](#18-implementation-checklist)

---

## 1. System overview

There are two distinct client populations that hit this backend:

| Client | Who | Auth | What it does |
| --- | --- | --- | --- |
| **Restaurant dashboard** (this repo) | A restaurant's staff | Firebase ID token, restaurant-scoped | Creates/edits campaigns & ads, reads analytics |
| **UPlate consumer app** (separate codebase, students) | End users | App/service token | Renders ads, emits impression & click events |

The dashboard **reads** analytics. The consumer app **writes** the raw events
(`ad_events`) that those analytics are derived from, and **reads** which ads to
serve based on each ad's targeting rules. Both populations share one D1
database. This document specifies the dashboard surface in full (§10–11) and the
consumer surface that produces the underlying data (§12).

### Core design principles

1. **One screen → one fetch.** Every dashboard page reads from exactly one GET
   endpoint. The Worker pre-joins and pre-aggregates so the browser never fans
   out N requests or sums series client-side.
2. **Bootstrap once.** `GET /bootstrap` returns the entire writable working set
   (restaurant profile, campaigns, ads with targeting + metrics) on first load.
3. **Mutations return the full updated entity.** No follow-up GET after a
   POST/PATCH/PUT/DELETE — the response is enough to update local state.
4. **Composite mutations are atomic.** "Duplicate campaign with its ads,"
   "delete campaign and cascade its ads/events," etc. run in a single D1 batch
   (one implicit transaction). The client never orchestrates multi-step writes.
5. **All aggregates are computed server-side in SQL.** Impressions, clicks, CTR,
   daily series, heatmaps, tag usage, dietary mix, click signals — every number
   falls out of `GROUP BY` over the event and targeting tables.
6. **Strict tenant isolation.** Every row carries a `restaurant_id`; every query
   filters on the caller's resolved `restaurant_id`. A user can never read or
   mutate another restaurant's data.

---

## 2. Technology stack & Cloudflare resources

| Concern | Choice | Notes |
| --- | --- | --- |
| Compute | **Cloudflare Workers** | Single Worker, module syntax (`export default { fetch }`). |
| Router | **Hono** (`hono`) | Lightweight, first-class Workers support, typed. |
| Database | **Cloudflare D1** (SQLite) | Relational store. Accessed via the `DB` binding. |
| Key/value cache | **Cloudflare KV** | Caches Google's Firebase public keys and (optionally) rate-limit counters. |
| Object storage (optional) | **Cloudflare R2** | Restaurant/ad icon uploads, if/when added. Not required for v1. |
| Auth verification | **Firebase Auth** ID tokens | Verified inside the Worker (no Firebase Admin SDK; verify the JWT directly). |
| Scheduled jobs (optional) | **Cron Triggers** | E.g. nightly rollup tables if event volume grows. Not required for v1. |
| Language | **TypeScript** | Shares the domain types with the frontend where practical. |
| Tooling | **Wrangler** (`wrangler`) | Dev server, migrations, deploy, secrets. |

D1 is SQLite, so honor SQLite semantics throughout:

- Booleans are stored as `INTEGER` (`0`/`1`).
- Timestamps are stored as `TEXT` in ISO-8601 UTC (`2026-05-29T14:03:00.000Z`)
  so string comparison and `substr(...,1,10)` date-slicing behave exactly like
  the reference adapter's `occurredAt.slice(0,10)`.
- There is no native `BOOLEAN`, `JSON`, or `UUID` type; use `INTEGER`, `TEXT`.
- Multi-statement atomicity is achieved with `env.DB.batch([...])`, which runs
  the array of prepared statements in a single implicit transaction. D1 does
  **not** support interactive `BEGIN/COMMIT` across awaits — design every
  composite write as one `batch()`.

---

## 3. Project layout

A suggested Worker repository structure (separate from this dashboard repo, or a
`/server` subfolder):

```
server/
├─ wrangler.toml
├─ package.json
├─ tsconfig.json
├─ migrations/
│  ├─ 0001_init.sql            # schema from §7
│  └─ 0002_seed_dev.sql        # optional dev seed mirroring src/data/mockData.ts
├─ src/
│  ├─ index.ts                 # Worker entry: builds Hono app, exports { fetch }
│  ├─ env.ts                   # Env binding types
│  ├─ middleware/
│  │  ├─ cors.ts
│  │  ├─ auth.ts               # Firebase token verify + restaurant resolution
│  │  ├─ error.ts              # ApiError → JSON error body
│  │  └─ etag.ts               # If-Match / version concurrency
│  ├─ auth/
│  │  ├─ firebase.ts           # JWT verification against Google certs (+ KV cache)
│  │  └─ accessCodes.ts        # validate/consume access codes
│  ├─ routes/
│  │  ├─ auth.ts
│  │  ├─ bootstrap.ts
│  │  ├─ restaurant.ts
│  │  ├─ campaigns.ts
│  │  ├─ ads.ts
│  │  ├─ analytics.ts
│  │  ├─ events.ts             # consumer ingestion (§12)
│  │  └─ serving.ts            # consumer ad serving (§12)
│  ├─ db/
│  │  ├─ campaigns.ts          # query builders / repositories
│  │  ├─ ads.ts                # incl. targeting read/write helpers
│  │  ├─ events.ts
│  │  └─ analytics.ts          # the SQL in §11
│  ├─ dto.ts                   # wire types (mirror src/api/types.ts)
│  └─ lib/
│     ├─ ids.ts                # id generation
│     ├─ ctr.ts                # ctr(impressions, clicks)
│     └─ time.ts               # dow/hour bucketing in app timezone
└─ test/
   └─ *.test.ts
```

---

## 4. Configuration: wrangler, bindings, secrets

### `wrangler.toml`

```toml
name = "uplate-dashboard-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 database binding -> env.DB
[[d1_databases]]
binding = "DB"
database_name = "uplate-dashboard"
database_id = "<filled in by `wrangler d1 create`>"
migrations_dir = "migrations"

# KV namespace for cached Firebase public keys / rate limits -> env.CACHE
[[kv_namespaces]]
binding = "CACHE"
id = "<filled in by `wrangler kv namespace create CACHE`>"

# Non-secret vars
[vars]
FIREBASE_PROJECT_ID = "boilerfuel-hello-world"
APP_TIMEZONE       = "America/Indiana/Indianapolis"
ALLOWED_ORIGINS    = "https://restaurant.u-plate.com,http://localhost:5173"
```

> `FIREBASE_PROJECT_ID` must match the `projectId` in the frontend's
> `src/firebase/config.ts` (`boilerfuel-hello-world`). It is the `aud` claim
> every valid ID token must carry.

### Secrets (set with `wrangler secret put`)

| Secret | Purpose |
| --- | --- |
| `EVENT_INGEST_KEY` | Shared bearer key the consumer app/ingestion service uses to write `ad_events` (§12). |
| `ADMIN_API_KEY` | Privileged key for back-office tooling that mints access codes & restaurants. |

Firebase ID-token verification needs **no secret** — it uses Google's public
signing certificates, fetched and cached at runtime (§5).

### `env.ts`

```ts
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  FIREBASE_PROJECT_ID: string;
  APP_TIMEZONE: string;
  ALLOWED_ORIGINS: string;
  EVENT_INGEST_KEY: string;
  ADMIN_API_KEY: string;
}
```

---

## 5. Authentication & multi-tenancy

### 5.1 Primary credentials live in Firebase

The dashboard authenticates users with **Firebase Authentication** (email +
password) entirely on the client (`src/auth/AuthContext.tsx`,
`src/firebase/config.ts`). The backend never sees passwords. Every authenticated
request carries the user's Firebase **ID token** as:

```
Authorization: Bearer <firebase_id_token>
```

(See `src/api/http.ts` and `src/api/index.ts` — the token is attached via
`getAuthToken()` → `firebaseAuth.currentUser.getIdToken()`.)

### 5.2 Verifying the ID token inside the Worker

Do **not** pull in the Firebase Admin SDK (heavy, Node-oriented). Verify the JWT
directly with Web Crypto, which Workers support natively:

1. Split the JWT into `header.payload.signature`.
2. Read the `kid` from the header.
3. Fetch Google's public signing certs from
   `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`.
   - Cache the response in KV (`CACHE`) keyed by `firebase:certs`, honoring the
     `Cache-Control: max-age` header Google returns (typically a few hours).
4. Verify the RS256 signature against the cert matching `kid`.
5. Validate claims, rejecting with `401 unauthorized` if any fail:
   - `aud === FIREBASE_PROJECT_ID`
   - `iss === "https://securetoken.google.com/" + FIREBASE_PROJECT_ID`
   - `exp > now` and `iat <= now`
   - `sub` is non-empty (this is the Firebase **UID**)
6. Expose `uid = payload.sub` and `email = payload.email` to downstream handlers.

### 5.3 Resolving the restaurant (multi-tenancy)

A Firebase UID is bound to exactly one restaurant via the `restaurant_users`
table. After verifying the token, the auth middleware:

```sql
SELECT restaurant_id, role FROM restaurant_users WHERE firebase_uid = ?1;
```

- **Found** → attach `{ uid, email, restaurantId, role }` to the request context.
  All tenant-scoped queries filter on this `restaurantId`.
- **Not found** → respond `404 { error.code: "restaurant_not_found" }`. The
  client treats this as "account not linked," signs the user out, and returns to
  login (see `resolveSession` in `AuthContext.tsx`). This is expected for a
  freshly created Firebase user that has not completed `/auth/register` yet.

### 5.4 Access codes & registration

A restaurant is onboarded out-of-band (admin tooling using `ADMIN_API_KEY`),
which creates a `restaurants` row (with its `school_id`) and one or more
single-use rows in `access_codes` (each also carrying a `school_id`). The
account is scoped to exactly one school: every campaign it creates inherits that
school, and ad serving uses it to scope ads to a campus. The sign-up flow
(`SignUp.tsx` → `AuthContext.signUp`) is:

1. **Client** calls `POST /auth/validate-access-code` (debounced, as the user
   types) to preview which restaurant the code unlocks. Read-only; never
   consumes the code.
2. Client creates the Firebase user (`createUserWithEmailAndPassword`).
3. **Client** calls `POST /auth/register` with the same access code and the new
   user's ID token. The server **atomically** consumes the code and binds the
   UID to the restaurant.
4. If `register` fails (code already consumed, race, etc.), the client deletes
   the just-created Firebase user and surfaces the error. Your error codes must
   be precise so this path works (see §10.1).

**Atomic consume** (single `batch()` / conditional update to prevent double-use):

```sql
-- Succeeds only if still unconsumed; rowsAffected === 0 means already used.
UPDATE access_codes
   SET consumed_at = ?now, consumed_by_uid = ?uid
 WHERE code = ?code AND consumed_at IS NULL;
-- then, if the update affected a row:
INSERT INTO restaurant_users (firebase_uid, restaurant_id, role, created_at)
VALUES (?uid, (SELECT restaurant_id FROM access_codes WHERE code = ?code), 'member', ?now);
```

If the UID already has a binding, `register` is idempotent: return the existing
binding's restaurant rather than erroring (handles retry after a flaky network).

---

## 6. Global conventions

### 6.1 Base URL & paths

The frontend prepends `VITE_API_BASE_URL` to every path. All paths in this
document are written **relative to that base** exactly as they appear in
`src/api/http.ts` (e.g. `/bootstrap`, `/campaigns/:id`). If you deploy under a
prefix (e.g. `https://api.u-plate.com/v1`), set `VITE_API_BASE_URL` to include
it; the Worker routes should be mounted to match.

### 6.2 IDs

- `restaurant_id`, `campaign_id`, `ad_id`, `event_id`, `access_code` are all
  `TEXT`. Generate ULIDs or `crypto.randomUUID()` server-side for new entities.
- IDs are opaque to the client. The reference adapter uses `c1`, `a1`, etc.; the
  real backend should use unguessable IDs but the client treats them as strings.

### 6.3 Timestamps

- All stored and returned timestamps are ISO-8601 UTC strings with millisecond
  precision (`createdAt`, `updatedAt`, `occurredAt`, `serverTime`).
- `startDate` / `endDate` on campaigns are **date-only** strings (`YYYY-MM-DD`),
  matching the reference data.

### 6.4 Day-of-week & hour bucketing (critical for analytics)

The dashboard's heatmaps and click-signal arrays are **Monday-indexed**:
`day 0 = Monday … day 6 = Sunday`, matching `(jsDate.getDay() + 6) % 7` and the
`DAYS` order in `src/data/constants.ts` (`['mon','tue','wed','thu','fri','sat','sun']`).

Hour buckets are `0..23`. Because "peak hour" and the day/hour heatmaps are
meaningful only in **campus-local time**, compute `dow` and `hour` in
`APP_TIMEZONE` (default `America/Indiana/Indianapolis`), not UTC. Do this **once
at ingest time** and store `dow` and `hour` as columns on `ad_events` (§7) so
analytics queries are pure `GROUP BY` with no per-row timezone math.

### 6.5 Optimistic concurrency (ETags / `If-Match`)

`campaigns` and `ads` carry an integer `version` column, bumped on every write.

- Detail GETs (`/campaigns/:id`, `/ads/:id`) return an `ETag: "<version>"` header.
- Mutating requests **may** include `If-Match: "<version>"` (the client passes
  `ifMatch` through `http.ts`). When present, the write must `... WHERE id=? AND
  version=?`; if `rowsAffected === 0`, the entity was modified concurrently —
  respond `412 { error.code: "version_conflict" }`.
- When `If-Match` is absent, perform a last-writer-wins update (still bump
  `version`). The client currently calls most mutations without `ifMatch`, so
  absence must be tolerated.

### 6.6 CTR

`ctr = impressions === 0 ? 0 : clicks / impressions`. Always a raw ratio in
`[0,1]` (the frontend formats the percentage). Never pre-multiply by 100.

### 6.7 JSON, casing, nulls

- Request/response bodies are JSON, `Content-Type: application/json`.
- Field names are **camelCase** on the wire (DTOs in §9), even though D1 columns
  are snake_case. The repository layer maps between them.
- `PATCH` semantics: omitted fields are untouched; explicit `null` clears a
  nullable field (see `RestaurantPatch`, `AdPatch.iconUrl`).

### 6.8 CORS

Respond to `OPTIONS` preflight and set, on every response:

```
Access-Control-Allow-Origin: <echo request Origin if in ALLOWED_ORIGINS>
Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Authorization,Content-Type,If-Match
Access-Control-Expose-Headers: ETag
Access-Control-Max-Age: 86400
Vary: Origin
```

---

## 7. D1 database schema

`migrations/0001_init.sql`. Enable foreign keys and use `ON DELETE CASCADE` so
deleting a campaign or ad cascades to its children and events.

```sql
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────
-- Tenancy & auth
-- ─────────────────────────────────────────────────────────────
-- The `schools` table is owned by the live UPlate backend (campuses, e.g.
-- 'purdue'); this service only references `school_id`. One school per account.
CREATE TABLE restaurants (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL,  -- campus this account serves
  name            TEXT,
  icon_url        TEXT,
  contact_email   TEXT,
  notify_weekly   INTEGER NOT NULL DEFAULT 1,  -- bool
  notify_email    INTEGER NOT NULL DEFAULT 1,  -- bool (emailAlerts)
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE restaurant_users (
  firebase_uid    TEXT PRIMARY KEY,
  restaurant_id   TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  created_at      TEXT NOT NULL
);
CREATE INDEX idx_restaurant_users_rid ON restaurant_users(restaurant_id);

CREATE TABLE access_codes (
  code            TEXT PRIMARY KEY,         -- e.g. 'UPLATE-7Q2F'
  restaurant_id   TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL,  -- campus this code binds the account to
  consumed_at     TEXT,                     -- NULL = still valid
  consumed_by_uid TEXT,
  created_at      TEXT NOT NULL,
  expires_at      TEXT                      -- NULL = no expiry
);
CREATE INDEX idx_access_codes_rid ON access_codes(restaurant_id);

-- ─────────────────────────────────────────────────────────────
-- Campaigns
-- ─────────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  id              TEXT PRIMARY KEY,
  restaurant_id   TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL,  -- stamped from the account; ads serve only to this campus
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'paused',  -- 'active' | 'paused'
  start_date      TEXT NOT NULL,            -- 'YYYY-MM-DD'
  end_date        TEXT NOT NULL,            -- 'YYYY-MM-DD'
  sort_order      INTEGER NOT NULL,         -- drives campaignOrder (asc)
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_campaigns_rid_order  ON campaigns(restaurant_id, sort_order);
CREATE INDEX idx_campaigns_rid_status ON campaigns(restaurant_id, status);
CREATE INDEX idx_campaigns_school     ON campaigns(school_id);  -- ad serving filters by campus

-- ─────────────────────────────────────────────────────────────
-- Ads
-- ─────────────────────────────────────────────────────────────
CREATE TABLE ads (
  id                  TEXT PRIMARY KEY,
  restaurant_id       TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  redirect_url        TEXT NOT NULL DEFAULT '',
  icon_url            TEXT,
  status              TEXT NOT NULL DEFAULT 'paused',     -- 'active' | 'paused'
  location            TEXT NOT NULL DEFAULT 'homeScreen', -- 'homeScreen' | 'diningHallMenu'
  -- behavioral targeting
  recurring_customer  INTEGER NOT NULL DEFAULT 0,      -- bool
  recurring_priority  TEXT NOT NULL DEFAULT 'medium',  -- Priority
  -- time targeting window (NULL window = no time restriction)
  time_start_hour     INTEGER,                          -- 0..23 or NULL
  time_end_hour       INTEGER,                          -- 0..23 or NULL (may wrap < start)
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX idx_ads_rid_campaign ON ads(restaurant_id, campaign_id);
CREATE INDEX idx_ads_rid_status   ON ads(restaurant_id, status);
CREATE INDEX idx_ads_rid_updated  ON ads(restaurant_id, updated_at);

-- Targeting children (each row = one rule). Priority is one of
-- 'required' | 'high' | 'medium' | 'low'.
CREATE TABLE ad_audience_tags (
  ad_id     TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,    -- AudienceTag
  priority  TEXT NOT NULL,
  PRIMARY KEY (ad_id, tag)
);

CREATE TABLE ad_dietary (
  ad_id     TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  pref      TEXT NOT NULL,    -- DietaryPreference
  priority  TEXT NOT NULL,
  PRIMARY KEY (ad_id, pref)
);

CREATE TABLE ad_food_interests (
  ad_id     TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,    -- free-text food interest (store original case)
  priority  TEXT NOT NULL,
  PRIMARY KEY (ad_id, name)
);

CREATE TABLE ad_exclusions (
  ad_id     TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  allergy   TEXT NOT NULL,    -- Allergy
  PRIMARY KEY (ad_id, allergy)
);

CREATE TABLE ad_target_days (
  ad_id     TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  day       TEXT NOT NULL,    -- DayOfWeek 'mon'..'sun'
  PRIMARY KEY (ad_id, day)
);

-- ─────────────────────────────────────────────────────────────
-- Events (written by the consumer app, §12). One row per impression/click.
-- dow (0=Mon..6=Sun) and hour (0..23) are precomputed in APP_TIMEZONE.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE ad_events (
  id                 TEXT PRIMARY KEY,
  restaurant_id      TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ad_id              TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  type               TEXT NOT NULL,        -- 'impression' | 'click'
  occurred_at        TEXT NOT NULL,        -- ISO-8601 UTC
  occurred_date      TEXT NOT NULL,        -- 'YYYY-MM-DD' (UTC slice, for daily series)
  dow                INTEGER NOT NULL,     -- 0=Mon..6=Sun, APP_TIMEZONE
  hour               INTEGER NOT NULL,     -- 0..23, APP_TIMEZONE
  user_id            TEXT,                 -- opaque consumer user id (nullable)
  recurring_customer INTEGER NOT NULL DEFAULT 0  -- bool
);
CREATE INDEX idx_events_rid_date ON ad_events(restaurant_id, occurred_date);
CREATE INDEX idx_events_ad_type  ON ad_events(ad_id, type);
CREATE INDEX idx_events_ad_date  ON ad_events(ad_id, occurred_date);

-- Multi-valued audience signals snapshotted at event time. ad_id is
-- denormalized onto each so click-signal aggregation needs no join back to
-- ad_events. (Matches the shape documented in src/types/index.ts.)
CREATE TABLE ad_event_tags (
  event_id  TEXT NOT NULL REFERENCES ad_events(id) ON DELETE CASCADE,
  ad_id     TEXT NOT NULL,
  tag       TEXT NOT NULL,
  PRIMARY KEY (event_id, tag)
);
CREATE INDEX idx_event_tags_ad ON ad_event_tags(ad_id, tag);

CREATE TABLE ad_event_dietary (
  event_id  TEXT NOT NULL REFERENCES ad_events(id) ON DELETE CASCADE,
  ad_id     TEXT NOT NULL,
  pref      TEXT NOT NULL,
  PRIMARY KEY (event_id, pref)
);
CREATE INDEX idx_event_dietary_ad ON ad_event_dietary(ad_id, pref);

CREATE TABLE ad_event_food_interests (
  event_id  TEXT NOT NULL REFERENCES ad_events(id) ON DELETE CASCADE,
  ad_id     TEXT NOT NULL,
  name      TEXT NOT NULL,    -- store normalized lowercase for grouping
  PRIMARY KEY (event_id, name)
);
CREATE INDEX idx_event_food_ad ON ad_event_food_interests(ad_id, name);
```

### 7.1 Mapping a stored ad back to the `Targeting` DTO

When returning an `Ad`, assemble the nested `Targeting` object from the children:

```ts
targeting = {
  audienceTags:  ad_audience_tags rows  → [{ tag, priority }],
  dietary:       ad_dietary rows        → [{ pref, priority }],
  foodInterests: ad_food_interests rows → [{ name, priority }],
  exclusions:    ad_exclusions rows     → [allergy, ...],
  behavioral:    { recurringCustomer: !!ads.recurring_customer,
                   recurringPriority: ads.recurring_priority },
  time:          { range: ads.time_start_hour == null ? null
                          : { startHour: ads.time_start_hour, endHour: ads.time_end_hour },
                   days: ad_target_days rows → ['mon', ...] },
}
```

On writes that include `targeting`, replace the child rows wholesale inside the
mutation's `batch()` (delete-all-then-insert for that `ad_id`), and set the
behavioral/time columns on `ads`.

---

## 8. Request lifecycle & middleware

Order of middleware in the Hono app:

1. **CORS** (§6.8) — handles `OPTIONS`, sets headers on all responses.
2. **Error boundary** (§14) — wraps handlers; converts thrown `ApiError` (and
   unexpected errors) into the JSON error body, attaches a `requestId`
   (`crypto.randomUUID()`), logs server-side.
3. **Auth** — for all dashboard routes except the unauthenticated
   `POST /auth/validate-access-code`:
   - Verify Firebase token (§5.2) → `401 unauthorized` on failure.
   - For everything except `POST /auth/register`, resolve `restaurant_id`
     (§5.3) → `404 restaurant_not_found` if unbound.
   - `register` runs with a verified token but **without** a prior binding.
   - Consumer routes (§12) use their own key-based auth, not Firebase.
4. **Route handler** — validates input, runs queries/batches, returns DTO.

Every tenant-scoped query MUST include `restaurant_id = :rid`. Treat a missing
row under the caller's `restaurant_id` as `404 *_not_found` — never leak the
existence of another tenant's row.

---

## 9. Shared DTO types

The wire types are authoritative in `src/api/types.ts`. Mirror them in
`server/src/dto.ts`. The key shapes (abridged — see that file for the full set):

```ts
type Status   = 'active' | 'paused';
type Priority = 'required' | 'high' | 'medium' | 'low';
type AdLocation = 'homeScreen' | 'diningHallMenu';

interface AnalyticsPoint { date: string; impressions: number; clicks: number; }

interface AdMetrics { impressions: number; clicks: number; series: AnalyticsPoint[]; }

interface Targeting {
  audienceTags:  { tag: AudienceTag; priority: Priority }[];
  dietary:       { pref: DietaryPreference; priority: Priority }[];
  foodInterests: { name: string; priority: Priority }[];
  exclusions:    Allergy[];
  behavioral:    { recurringCustomer: boolean; recurringPriority: Priority };
  time:          { range: { startHour: number; endHour: number } | null; days: DayOfWeek[] };
}

interface Campaign {
  id: string; name: string; status: Status;
  startDate: string; endDate: string;
  adIds: string[];                 // ordered list of this campaign's ad ids
  createdAt: string; updatedAt: string;
}

interface Ad {
  id: string; campaignId: string;
  title: string; description: string; redirectUrl: string; iconUrl?: string;
  status: Status; location: AdLocation;
  targeting: Targeting; metrics: AdMetrics;     // metrics always server-computed
  createdAt: string; updatedAt: string;
}

interface RestaurantProfile {
  id: string; name?: string; iconUrl?: string; contactEmail?: string;
  notifications: { weekly: boolean; emailAlerts: boolean };
  createdAt: string; updatedAt: string;
}

interface GlobalStats {
  impressions: number; clicks: number; ctr: number;
  activeCampaigns: number; activeAds: number;
  totalCampaigns: number; totalAds: number;
}

interface CampaignStats {
  impressions: number; clicks: number; ctr: number;
  adCount: number; activeAdCount: number;
}
```

> **`Campaign.adIds`** is the ordered list of the campaign's ad ids. Derive it
> from `ads WHERE campaign_id=? ORDER BY updated_at DESC` (newest first, matching
> the reference adapter, which prepends new ads). **`Ad.metrics`** must always be
> populated from `ad_events`; a brand-new ad has `{ impressions:0, clicks:0,
> series:[] }`.

---

## 10. Dashboard endpoint reference

All routes below require a valid Firebase token and a resolved `restaurant_id`
unless noted. Request/response field names are exactly as in §9 / `types.ts`.

### 10.1 Auth

#### `POST /auth/validate-access-code` — *unauthenticated*
Read-only preview; does not consume the code.

Request:
```json
{ "accessCode": "UPLATE-7Q2F" }
```
Response `200`:
```json
{ "valid": true, "restaurant": { "id": "r_abc", "name": "Boiler Bowl Co." } }
```
If the code is unknown/expired/consumed: `{ "valid": false }` (still `200`).
Rate-limit aggressively (§15) since it's unauthenticated.

#### `POST /auth/register` — *authenticated, no binding required*
Consumes the access code and binds the caller's UID. Atomic (§5.4).

Request: `{ "accessCode": "UPLATE-7Q2F" }`
Response `200`:
```json
{ "restaurantId": "r_abc", "restaurant": { /* RestaurantProfile */ } }
```
Errors (the client branches on these exact codes/statuses):
| Status | `error.code` | Cause |
| --- | --- | --- |
| 404 | `access_code_not_found` | Code does not exist. |
| 410 | `access_code_consumed` | Code already used. |
| 403 | `access_code_forbidden` | Code disabled/expired, or other policy. |

If the UID is already bound, return its restaurant (idempotent success).

#### `GET /auth/session` — *authenticated*
Resolves the caller's binding.
Response `200`: `{ "restaurantId": "r_abc", "restaurant": { /* RestaurantProfile */ } }`
`404 restaurant_not_found` if unbound (client signs out — see §5.3).

### 10.2 Bootstrap

#### `GET /bootstrap`
The single first-load fetch. Returns the whole writable working set.
```json
{
  "restaurant": { /* RestaurantProfile */ },
  "campaigns":  [ /* Campaign[], ordered by sort_order asc */ ],
  "ads":        [ /* Ad[] with full targeting + metrics, every ad */ ],
  "campaignOrder": ["c_1", "c_2", "..."],
  "serverTime": "2026-05-29T14:03:00.000Z"
}
```
`campaignOrder` is the ordered campaign-id list (== `campaigns` order). Each `Ad`
includes computed `metrics` (impressions, clicks, daily `series`).

### 10.3 Restaurant

#### `GET /restaurant` → `RestaurantProfile`

#### `PATCH /restaurant` → `RestaurantProfile`
Request (`RestaurantPatch`; omitted = unchanged, `null` = clear):
```json
{
  "name": "Boiler Bowl Co.",
  "iconUrl": null,
  "contactEmail": "ops@boilerbowl.com",
  "notifications": { "weekly": false, "emailAlerts": true }
}
```
`notifications` is a partial merge over the stored object.

### 10.4 Campaigns

| Method & path | Body | Returns |
| --- | --- | --- |
| `GET /campaigns?status=` | — | `{ campaigns: CampaignListItem[] }` |
| `POST /campaigns` | `CampaignInput` | `{ campaign: Campaign }` |
| `GET /campaigns/:id` | — | `CampaignDetailResponse` |
| `PATCH /campaigns/:id` | `CampaignPatch` (+`If-Match`) | `{ campaign: Campaign }` |
| `DELETE /campaigns/:id` | (+`If-Match`) | `{ deletedCampaignId, deletedAdIds }` |
| `POST /campaigns/:id/duplicate` | `{ nameSuffix? }` | `{ campaign, ads }` |
| `POST /campaigns/:id/status` | `SetStatusRequest` | `{ campaign: Campaign }` |

- **`CampaignListItem`** = `Campaign` + `stats: CampaignStats` +
  `impressionsSpark: number[]` (last 30 days of daily impressions for the
  campaign's ads — see §11.2).
- **`CampaignInput`**: `{ name, status?, startDate, endDate }`. Default
  `status='paused'`. New campaigns go to the **front** of the order
  (`sort_order` lower than all existing) — the reference adapter prepends.
  `school_id` is **not** part of the input: stamp it server-side from the
  authenticated account's `restaurants.school_id` so every campaign inherits the
  account's campus. The returned `Campaign` includes `schoolId`.
- **`CampaignDetailResponse`**:
  ```ts
  { campaign: Campaign; ads: Ad[]; stats: CampaignStats;
    series: AnalyticsPoint[];
    best:  { adId; title; ctr }[];   // top 3 ads by CTR
    worst: { adId; title; ctr }[]; } // bottom 3 by CTR (reversed)
  ```
- **`DELETE`** cascades: remove the campaign, its ads, their targeting children,
  and their events — all in one `batch()`. Return the deleted ad ids.
- **`duplicate`** clones the campaign and **all its ads** (with targeting) in one
  `batch()`; the clone goes to the front of the order; cloned ads start with
  zero events/metrics. Append `nameSuffix` (default like `" (Copy)"`) to the name.
- **`SetStatusRequest`** = `{ status?: Status; toggle?: boolean }`. If
  `toggle`, flip current status; else set to `status`.

### 10.5 Ads

| Method & path | Body | Returns |
| --- | --- | --- |
| `GET /ads?status=&q=&campaignId=&limit=&cursor=` | — | `{ ads: AdListItem[], nextCursor }` |
| `POST /ads` | `AdInput` | `{ ad: Ad }` |
| `GET /ads/:id` | — | `{ ad: Ad, campaign: { id, name } }` |
| `PUT /ads/:id` | `UpdateAdRequest` (+`If-Match`) | `{ ad: Ad }` |
| `PATCH /ads/:id` | `AdPatch` (+`If-Match`) | `{ ad: Ad }` |
| `DELETE /ads/:id` | (+`If-Match`) | `{ deletedAdId, campaignId }` |
| `POST /ads/:id/duplicate` | `DuplicateAdRequest` | `{ ad: Ad }` |
| `POST /ads/:id/status` | `SetStatusRequest` | `{ ad: Ad }` |

- **`AdListItem`** = `Ad` + `campaignName: string`. List is sorted by
  `updated_at DESC`. Filters: `status`, `campaignId`, and `q` (case-insensitive
  substring match on `title`). `limit`/`cursor` reserved for pagination — v1 may
  return everything with `nextCursor: null` (the reference adapter does).
- **`AdInput`**: `{ campaignId, title, description?, redirectUrl?, iconUrl?,
  status?, location?, targeting? }`. Default `status='paused'`,
  `location='homeScreen'`, empty targeting. `campaignId` must belong to the
  caller's restaurant (`404 campaign_not_found` otherwise). New ad prepends to
  the campaign's ad list and bumps the campaign's `updated_at`.
- **`PUT` (`UpdateAdRequest`)** is a full replace of content + targeting:
  `{ title, description, redirectUrl, iconUrl?, location, status, targeting }`.
  Rewrite all targeting children in the batch.
- **`PATCH` (`AdPatch`)** is partial: any of `{ title, description, redirectUrl,
  iconUrl (null clears), location, status, campaignId }`. **Moving an ad**
  (`campaignId` changes) must update both the old and new campaign's ad lists /
  `updated_at` in one batch.
- **`DuplicateAdRequest`** = `{ targetCampaignId, titleSuffix? }`; clones content
  + targeting into the target campaign (must be same restaurant); clone starts
  with zero metrics.

### 10.6 Analytics

| Method & path | Query | Returns |
| --- | --- | --- |
| `GET /analytics/overview` | `range=7d\|30d\|90d\|all` | `AnalyticsOverviewResponse` |
| `GET /analytics/campaign-comparison` | — | `{ rows: [...] }` |
| `GET /analytics/series` | `from,to,campaignId` | `{ series, from, to }` |
| `GET /analytics/audience-insights` | — | `AudienceInsightsResponse` |
| `GET /analytics/ads/:adId/click-signals` | — | `ClickSignalsResponse` |

Exact response shapes and the SQL to produce them are in §11.

---

## 11. Analytics computation (SQL)

All queries are implicitly scoped to the caller's `restaurant_id` (`:rid`). These
mirror `src/api/local.ts` exactly; when in doubt, that file is the oracle.

### 11.1 Per-ad metrics (`AdMetrics`) — used everywhere an `Ad` is returned

```sql
-- totals
SELECT
  SUM(CASE WHEN type='impression' THEN 1 ELSE 0 END) AS impressions,
  SUM(CASE WHEN type='click'      THEN 1 ELSE 0 END) AS clicks
FROM ad_events WHERE ad_id = :adId;

-- daily series (ascending by date)
SELECT occurred_date AS date,
       SUM(CASE WHEN type='impression' THEN 1 ELSE 0 END) AS impressions,
       SUM(CASE WHEN type='click'      THEN 1 ELSE 0 END) AS clicks
FROM ad_events
WHERE ad_id = :adId
GROUP BY occurred_date
ORDER BY occurred_date ASC;
```
`metrics = { impressions, clicks, series }`. For bootstrap/list, batch this
across all ads with `GROUP BY ad_id, occurred_date` and fold in code (avoid N+1).

### 11.2 Campaign stats & spark

```sql
-- CampaignStats totals for one campaign
SELECT
  COALESCE(SUM(CASE WHEN e.type='impression' THEN 1 ELSE 0 END),0) AS impressions,
  COALESCE(SUM(CASE WHEN e.type='click'      THEN 1 ELSE 0 END),0) AS clicks
FROM ads a LEFT JOIN ad_events e ON e.ad_id = a.id
WHERE a.campaign_id = :cid;

-- adCount / activeAdCount
SELECT COUNT(*) AS adCount,
       SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS activeAdCount
FROM ads WHERE campaign_id = :cid;
```
`ctr = impressions==0 ? 0 : clicks/impressions`.

**`impressionsSpark`** (CampaignListItem): the last 30 entries of the campaign's
daily impressions series:
```sql
SELECT occurred_date AS date,
       SUM(CASE WHEN e.type='impression' THEN 1 ELSE 0 END) AS impressions
FROM ads a JOIN ad_events e ON e.ad_id = a.id
WHERE a.campaign_id = :cid
GROUP BY occurred_date
ORDER BY occurred_date ASC;
```
Take `.slice(-30)` and map to `impressions` only → `number[]`.

### 11.3 `GET /analytics/overview`

```ts
AnalyticsOverviewResponse {
  stats: GlobalStats;
  series: AnalyticsPoint[];          // daily, sliced to `range`
  topAds: { adId, title, campaignId, impressions, clicks, ctr }[];  // ≤6
  recentCampaigns: { id, name, status, adCount, updatedAt }[];      // ≤4
}
```
- **stats.impressions/clicks/ctr**: totals across all of the restaurant's events.
- **activeCampaigns / activeAds**: `COUNT WHERE status='active'`.
- **totalCampaigns / totalAds**: `COUNT(*)`.
- **series**: restaurant-wide daily series (`GROUP BY occurred_date`), then slice
  to the **last N days** where `range` → N: `7d`→7, `30d`→30, `90d`→90,
  `all`→entire series. Default `range='30d'`.
- **topAds**: per-ad totals where `impressions > 0`, ordered by **CTR desc**,
  top 6.
  ```sql
  SELECT a.id AS adId, a.title, a.campaign_id AS campaignId,
         SUM(CASE WHEN e.type='impression' THEN 1 ELSE 0 END) AS impressions,
         SUM(CASE WHEN e.type='click'      THEN 1 ELSE 0 END) AS clicks
  FROM ads a JOIN ad_events e ON e.ad_id = a.id
  WHERE a.restaurant_id = :rid
  GROUP BY a.id
  HAVING impressions > 0
  ORDER BY (CAST(clicks AS REAL)/impressions) DESC
  LIMIT 6;
  ```
- **recentCampaigns**: first 4 campaigns in `sort_order`, with `adCount` = number
  of ads in the campaign.

### 11.4 `GET /analytics/campaign-comparison`

One row per campaign **in campaign order** (`sort_order asc`):
```ts
{ rows: { campaignId, name, status, impressions, clicks, ctr, adCount }[] }
```
Reuse the §11.2 stats per campaign.

### 11.5 `GET /analytics/series`

```ts
{ series: AnalyticsPoint[]; from: string; to: string }
```
- Base series = restaurant-wide daily series, or filtered to a single
  `campaignId` (join ads on campaign) when provided.
- `from`/`to` default to the first/last date present; then filter
  `date >= from AND date <= to` (inclusive, string compare on `YYYY-MM-DD`).

### 11.6 `GET /analytics/audience-insights`

```ts
AudienceInsightsResponse {
  tagUsage:     { tag, count, pct }[];
  dietaryUsage: { pref, count, avgPriorityScore }[];
  engagement:   AudienceEngagement;      // cross-ad "who actually clicks" rollup
  heatmap:      { cells: number[/*7*24*/], perDayAdCount: number[/*7*/], max };
  impressionsHeatmap?: { cells: number[/*7*24*/], max, totalImpressions };
}

AudienceEngagement {
  totalClicks: number;
  topAudienceTags:  { key, label, pct, targeted }[];  // top 5 by pct
  topDietary:       { key, label, pct, targeted }[];   // top 5
  topFoodInterests: { key, label, pct, targeted }[];   // top 5 (key = lowercased name)
  recurringPct: number;
  contributingAdCount: number;            // # ads with >= 1 click
}
```

- **tagUsage**: count of **ads** that target each audience tag; `pct = count /
  (sum of all tag counts)`.
  ```sql
  SELECT tag, COUNT(*) AS count
  FROM ad_audience_tags t JOIN ads a ON a.id = t.ad_id
  WHERE a.restaurant_id = :rid
  GROUP BY tag;
  ```
- **dietaryUsage**: count of ads targeting each dietary pref + the **average
  priority score**, where `required=100, high=75, medium=50, low=25`.
  ```sql
  SELECT pref, COUNT(*) AS count,
         AVG(CASE priority WHEN 'required' THEN 100 WHEN 'high' THEN 75
                           WHEN 'medium' THEN 50 ELSE 25 END) AS avgPriorityScore
  FROM ad_dietary d JOIN ads a ON a.id = d.ad_id
  WHERE a.restaurant_id = :rid
  GROUP BY pref;
  ```
- **engagement** (cross-ad click rollup): the same per-signal math as the
  click-signals endpoint (§11.7), but over **every** ad's click events for the
  restaurant at once — so the Audience Insights screen reads it from this single
  call instead of issuing one `click-signals` request per ad. Operate only on
  `type='click'` events; `totalClicks` is their count.
  ```sql
  -- audience tags (analogous for dietary; food groups on lowercased name)
  SELECT t.tag, COUNT(*) AS count
  FROM ad_event_tags t JOIN ad_events e ON e.id = t.event_id
  WHERE e.restaurant_id = :rid AND e.type='click'
  GROUP BY t.tag ORDER BY count DESC LIMIT 5;
  ```
  Each row's `pct = count / totalClicks` (0 if no clicks); take top 5 by `pct`.
  `targeted` = whether **any** of the restaurant's ads target that signal
  (case-insensitive for foods). `label` from `AUDIENCE_LABEL`/`DIETARY_LABEL`,
  or the original-cased food name (else Title-Case). `recurringPct =
  recurringClicks / totalClicks`. `contributingAdCount =
  COUNT(DISTINCT ad_id)` among the click events.
- **heatmap** (targeting-based, config not events): a `7*24` array indexed
  `dow*24 + hour`. For each ad, for each targeted day (or **all 7** if no days
  set), increment every hour in the ad's `[startHour, endHour)` window (no window
  ⇒ full `0..24`; a wrap window where `end < start` covers `start..24` then
  `0..end`). `perDayAdCount[d]` = number of ads active on day `d`. `max =
  max(1, ...cells)`.
- **impressionsHeatmap** (real events): `7*24` counts of **impression** events by
  `dow, hour`. Omit the field entirely if there are zero impressions.
  ```sql
  SELECT dow, hour, COUNT(*) AS c
  FROM ad_events
  WHERE restaurant_id = :rid AND type='impression'
  GROUP BY dow, hour;
  ```
  Fill `cells[dow*24 + hour] = c`; `max = max(1, ...cells)`;
  `totalImpressions = SUM(c)`. (The reference adapter approximates this from
  config because it lacks per-impression timestamps; the real backend has them,
  so use the true aggregation.)

### 11.7 `GET /analytics/ads/:adId/click-signals`

Operates only on **click** events for the ad.
```ts
ClickSignalsResponse {
  totalClicks: number;
  topAudienceTags: { tag, label, pct, targeted }[];   // top 5 by pct
  topDietary:      { pref, label, pct, targeted }[];   // top 5
  topFoodInterests:{ name, pct, targeted }[];          // top 5
  recurringPct: number;
  clicksByDay:  number[/*7, normalized, Mon-indexed*/];
  clicksByHour: number[/*24, normalized*/];
  peakHour: number;
}
```
- `totalClicks = COUNT(*) FROM ad_events WHERE ad_id=:adId AND type='click'`.
- For each signal, count distinct click events carrying it; `pct = count /
  totalClicks` (0 if no clicks). Take top 5 by `pct`.
  ```sql
  SELECT t.tag, COUNT(*) AS count
  FROM ad_event_tags t JOIN ad_events e ON e.id = t.event_id
  WHERE t.ad_id = :adId AND e.type='click'
  GROUP BY t.tag ORDER BY count DESC LIMIT 5;
  -- analogous for ad_event_dietary (pref) and ad_event_food_interests (name)
  ```
- `label` comes from the constant maps (`AUDIENCE_LABEL`, `DIETARY_LABEL` in
  `src/data/constants.ts`); for foods use the ad's original-cased targeted name
  if it matches, else Title-Case the stored lowercase name.
- `targeted` = whether the ad's own targeting includes that tag/pref/food
  (case-insensitive for foods).
- `recurringPct` = `recurringClicks / totalClicks`.
- **clicksByDay** (length 7, Mon-indexed) and **clicksByHour** (length 24) are
  each **normalized to sum ≈ 1** (divide each bucket by the total clicks across
  buckets; if total is 0, all zeros):
  ```sql
  SELECT dow,  COUNT(*) c FROM ad_events WHERE ad_id=:adId AND type='click' GROUP BY dow;
  SELECT hour, COUNT(*) c FROM ad_events WHERE ad_id=:adId AND type='click' GROUP BY hour;
  ```
- `peakHour` = index of the max bucket in `clicksByHour` (0 if no clicks).

---

## 12. Consumer-facing endpoints: event ingestion & ad serving

These power the data the dashboard reads. They are used by the **UPlate consumer
app**, not the dashboard, and authenticate with `EVENT_INGEST_KEY` (an
`Authorization: Bearer <EVENT_INGEST_KEY>` shared secret) rather than Firebase.
They are tenant-scoped by the `adId` in the payload (the server derives
`restaurant_id` from the ad).

### 12.1 `POST /events` — record impressions & clicks

Accepts a batch so the app can flush queued events. The server precomputes
`occurred_date`, `dow`, `hour` (in `APP_TIMEZONE`, §6.4) and writes the event
plus its signal child rows in one `batch()`.

Request:
```json
{
  "events": [
    {
      "id": "evt_optional_client_id",
      "adId": "a_123",
      "type": "impression",
      "occurredAt": "2026-05-29T16:21:05.000Z",
      "userId": "u_789",
      "recurringCustomer": true,
      "tags": ["highProtein", "postWorkout"],
      "dietary": ["pescatarian"],
      "foodInterests": ["Quinoa Bowl"]
    }
  ]
}
```
Response `202`: `{ "accepted": 1, "rejected": 0 }`.
Rules:
- Resolve `restaurant_id` from `ad_id`; reject unknown ads.
- `type ∈ {impression, click}`; `occurredAt` required ISO; default
  `recurringCustomer=false`; arrays default empty.
- Store `foodInterests` lowercased in `ad_event_food_interests` (matches §11.7
  grouping); keep `tags`/`dietary` as their enum values.
- Idempotency: accept an optional client-supplied `id` per event and `INSERT OR
  IGNORE` so retries are safe.

### 12.2 `GET /serve?location=&userId=` — pick ads to show *(optional, app-side)*

Returns the active ads whose targeting matches a user context, ordered by a
priority score. Optional for v1 if the consumer app does its own matching, but
documented because targeting only has meaning when something consumes it.

Query: `location=homeScreen|diningHallMenu`, plus the user's signal context
(tags, dietary, allergies, foodInterests, recurringCustomer, current local
time). Matching mirrors the priority weights in `src/data/constants.ts`
(`required=4, high=3, medium=2, low=1`):
- **Hard filter**: ad `status='active'`; the user must not have any allergy in
  the ad's `exclusions`; if the ad has a time window/days, the current local
  time/day must fall inside it; any `required` rule must be satisfied.
- **Score**: sum the priority weights of all matched rules; higher = served
  first.
Response: ordered `Ad[]` (or a trimmed serving DTO) for that location.

---

## 13. Page → endpoint map

| Page (`src/pages/…`) | Endpoint(s) consumed |
| --- | --- |
| App shell / first load | `GET /auth/session`, `GET /bootstrap` |
| `SignIn`, `SignUp` | `POST /auth/validate-access-code`, `POST /auth/register` (+ Firebase client SDK) |
| `DashboardOverview` | `GET /analytics/overview?range=` |
| `Analytics` | `GET /analytics/overview`, `GET /analytics/campaign-comparison`, `GET /analytics/series` |
| `AudienceInsights` | `GET /analytics/audience-insights` |
| `Campaigns` | `GET /campaigns`, `POST /campaigns`, `POST /campaigns/:id/status`, `POST /campaigns/:id/duplicate`, `DELETE /campaigns/:id` |
| `CampaignDetail` | `GET /campaigns/:id`, `PATCH /campaigns/:id`, ad mutations |
| `AdsLibrary` | `GET /ads?status=&q=&campaignId=` |
| `AdDetail` | `GET /ads/:id`, `PUT /ads/:id`, `PATCH /ads/:id`, `DELETE /ads/:id`, `POST /ads/:id/duplicate`, `POST /ads/:id/status`, `GET /analytics/ads/:id/click-signals` |
| `AdCreate` | `POST /ads`, `GET /campaigns` (campaign picker) |
| `Settings` | `GET /restaurant`, `PATCH /restaurant` |

---

## 14. Error contract

Every non-2xx response is JSON (`src/api/types.ts` → `ApiErrorBody` / `ApiError`):

```json
{
  "error": {
    "code": "campaign_not_found",
    "message": "Campaign c_123 not found",
    "fieldErrors": { "name": "Name is required" },
    "requestId": "f1e2d3c4-..."
  }
}
```
- `code`: stable machine-readable string (the client branches on these).
- `message`: human-readable; the client may surface it directly.
- `fieldErrors`: optional per-field validation messages (forms read these).
- `requestId`: always present; also log it server-side for correlation.

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `bad_request` / `validation_error` | Malformed body / failed validation (use `fieldErrors`). |
| 401 | `unauthorized` | Missing/invalid/expired Firebase token. |
| 403 | `forbidden` / `access_code_forbidden` | Authenticated but not allowed. |
| 404 | `restaurant_not_found` | UID has no binding (client signs out). |
| 404 | `campaign_not_found` / `ad_not_found` / `access_code_not_found` | Entity missing under this tenant. |
| 410 | `access_code_consumed` | Access code already used. |
| 412 | `version_conflict` | `If-Match` version mismatch (§6.5). |
| 429 | `rate_limited` | Throttled (§15). Include `Retry-After`. |
| 500 | `internal` | Unexpected; log with `requestId`, don't leak internals. |

---

## 15. Security, rate limiting & abuse

- **Tenant isolation**: never trust an id from the URL/body alone — always
  `WHERE restaurant_id = :rid`. A cross-tenant id resolves to `404`, not `403`,
  to avoid confirming existence.
- **Token freshness**: reject expired tokens; the client refreshes ID tokens
  automatically (`getIdToken()` returns a fresh one).
- **Validation**: enum fields (`status`, `priority`, `location`, `tag`, `pref`,
  `allergy`, `day`) must be checked against the allowed sets from
  `src/data/constants.ts`. Clamp `time_*_hour` to `0..23`. Reject `redirectUrl`
  that isn't http(s).
- **Rate limiting** (KV counters or Cloudflare Rate Limiting rules):
  - `POST /auth/validate-access-code` and `/auth/register`: strict per-IP limits
    (these gate account creation and probe access codes).
  - `POST /events`: per-key/per-IP burst limits; cap batch size (e.g. ≤500).
- **Ingestion key hygiene**: `EVENT_INGEST_KEY` and `ADMIN_API_KEY` are Wrangler
  secrets, never in `vars` or client code. Rotate via `wrangler secret put`.
- **Access codes**: single-use, optional `expires_at`, unguessable. Consuming is
  atomic (§5.4) so two simultaneous sign-ups can't claim the same code.
- **CORS**: only echo origins in `ALLOWED_ORIGINS`.

---

## 16. Deployment & local development

### First-time setup

```bash
npm create cloudflare@latest uplate-dashboard-api   # or: npm i -D wrangler && wrangler init
cd uplate-dashboard-api
npm i hono

# Create resources (writes ids you paste into wrangler.toml)
wrangler d1 create uplate-dashboard
wrangler kv namespace create CACHE

# Secrets
wrangler secret put EVENT_INGEST_KEY
wrangler secret put ADMIN_API_KEY
```

### Migrations

```bash
# Apply schema (§7) locally then remotely
wrangler d1 migrations apply uplate-dashboard --local
wrangler d1 migrations apply uplate-dashboard --remote

# Ad-hoc query
wrangler d1 execute uplate-dashboard --command "SELECT COUNT(*) FROM ad_events;"
```

Put schema in `migrations/0001_init.sql`. For dev data, mirror
`src/data/mockData.ts` into `migrations/0002_seed_dev.sql` (apply with `--local`
only) so the dashboard renders the same demo campaigns/ads/events offline.

### Run & deploy

```bash
wrangler dev          # local Worker at http://localhost:8787
wrangler deploy       # publish to *.workers.dev or your route
```

### Wiring the frontend

In the dashboard repo, set `VITE_API_BASE_URL` to the deployed Worker URL (incl.
any prefix). With it set, `src/api/index.ts` swaps the localStorage adapter for
`createHttpClient`, and every request carries the Firebase ID token
automatically. Unset it → the app runs fully offline against `local.ts`.

```bash
# dashboard repo .env
VITE_API_BASE_URL=https://uplate-dashboard-api.<acct>.workers.dev
```

### Custom domain / routes

The dashboard is served from `restaurant.u-plate.com` (see `package.json`
`deploy`). Put the API on a sibling host (e.g. `api.u-plate.com`) via a Worker
route or custom domain, and include the dashboard origin in `ALLOWED_ORIGINS`.

---

## 17. Testing strategy

- **Contract tests**: run the same assertions against `createLocalClient()`
  (`src/api/local.ts`) and the deployed HTTP client. Identical inputs must yield
  structurally identical outputs — that's the definition of "the backend works."
- **Unit tests** (Vitest + `@cloudflare/vitest-pool-workers` or Miniflare):
  - Token verification: valid, expired, wrong `aud`/`iss`, bad signature.
  - Access-code consume race: two concurrent `register` calls, exactly one wins.
  - `If-Match`: stale version → `412`.
  - Cascade deletes: deleting a campaign removes its ads, targeting, events.
  - Aggregations: seed known events, assert CTR / series / heatmaps / click
    signals match the `local.ts` math (esp. Mon-indexed `dow`, normalized
    `clicksByDay`/`clicksByHour`, `peakHour`).
- **Tenant isolation**: a token for restaurant A must `404` on B's ids.
- Use a local D1 (`--local`) seeded from `0002_seed_dev.sql` for integration runs.

---

## 18. Implementation checklist

1. [ ] Scaffold Worker + Hono; add `Env` bindings; `wrangler.toml` (§4).
2. [ ] Write `migrations/0001_init.sql` (§7); apply locally.
3. [ ] Firebase JWT verification with KV-cached certs (§5.2); auth middleware
       resolving `restaurant_id` (§5.3).
4. [ ] CORS, error-boundary, ETag middleware (§6.5, §6.8, §8, §14).
5. [ ] Auth routes: `validate-access-code`, `register` (atomic consume),
       `session` (§10.1).
6. [ ] Repositories with snake↔camel mapping + targeting assemble/replace (§7.1).
7. [ ] `GET /bootstrap` (§10.2) with batched per-ad metrics (no N+1).
8. [ ] Restaurant get/patch (§10.3).
9. [ ] Campaign CRUD + duplicate/status, all composite writes via
       `batch()` (§10.4).
10. [ ] Ad CRUD + PUT/PATCH (incl. campaign move) + duplicate/status (§10.5).
11. [ ] Analytics endpoints with the SQL in §11.
12. [ ] Event ingestion `POST /events` with dow/hour bucketing (§12.1).
13. [ ] (Optional) `GET /serve` ad matching (§12.2).
14. [ ] Rate limiting + input validation against `constants.ts` enums (§15).
15. [ ] Contract + unit tests against `local.ts` (§17).
16. [ ] Deploy; set `VITE_API_BASE_URL` in the dashboard; verify end-to-end.
```
