# UPlate Restaurant Dashboard — Backend Contract

This document specifies the backend a single restaurant dashboard talks to. It
is the wire contract: tables, columns, foreign keys, indexes, every endpoint,
every request/response shape, and which page consumes it.

The schema mirrors the in-app `AppState` model (`src/types/index.ts`). The
endpoint surface is deliberately denormalized at the page boundary so each
screen renders from **one** round-trip — multiple queries fan out on the server,
not the client.

---

## Table of contents

1. [Design principles](#design-principles)
2. [Authentication & multi-tenancy](#authentication--multi-tenancy)
3. [Conventions](#conventions)
4. [SQL schema](#sql-schema)
5. [Shared DTO types](#shared-dto-types)
6. [Endpoints](#endpoints)
7. [Page → endpoint map](#page--endpoint-map)
8. [Error contract](#error-contract)
9. [Migration notes](#migration-notes)

---

## Design principles

1. **One screen → one fetch.** Every page-level component reads from exactly
   one GET endpoint. The server pre-joins, pre-aggregates, and returns a
   tailored DTO instead of forcing the client to fan out N requests.
2. **Bootstrap once.** The dashboard ships an `/api/bootstrap` endpoint that
   returns the entire writable working set (campaigns, ads with targeting,
   restaurant profile) on first load. Subsequent navigation reuses cached
   client state; analytics pages refetch only their derived rollups.
3. **Mutations return the full updated entity.** No follow-up GETs after a
   POST/PATCH/DELETE — the response is sufficient to update local state.
4. **Composite mutations are atomic.** Operations like "duplicate campaign
   with its ads" are a single endpoint that runs in one DB transaction; the
   client never orchestrates multi-step writes.
5. **Server-computed aggregates.** Impressions, clicks, CTR, daily series,
   heatmaps, tag usage, dietary mix, etc., are all computed in SQL — the
   client never sums series client-side.
6. **Cursor-friendly but page-stable.** Lists return enough metadata to
   render without follow-ups (campaign count, ad count, latest updatedAt).

## Authentication & multi-tenancy

The dashboard authenticates users with **Firebase Authentication** (email +
password). The client signs in via the Firebase Web SDK, then attaches the
short-lived Firebase ID token to every backend request as
`Authorization: Bearer <idToken>`.

### Trust boundary

The backend **must** verify the Firebase ID token on every request using the
Firebase Admin SDK (or by validating the JWT against Firebase's published
JWKS at `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`).
Tokens are short-lived (~1 hour) and re-issued by the SDK; the server **never**
issues its own JWTs.

From the verified token the server extracts the user's Firebase **UID** and
**email**. It then looks up `restaurant_users` to resolve the
`restaurant_id` bound to that UID — `restaurant_id` is **never** accepted as
a request parameter. All schema tables that hold restaurant-owned data carry
`restaurant_id` as a NOT NULL FK and are filtered on every query.

### Account lifecycle

1. **Onboarding.** UPlate operators generate an **access code** for a new
   restaurant (see [`access_codes`](#access_codes)). The code is shared with
   the restaurant out-of-band (email, phone).
2. **Sign up.** A new operator visits the dashboard, enters email +
   password + access code. The client:
   1. Calls `POST /auth/validate-access-code` (read-only check) to surface
      a UX-friendly error before creating a Firebase account.
   2. Creates the Firebase account via the SDK.
   3. Calls `POST /auth/register` with the same access code; the server
      consumes the code and inserts a `restaurant_users` row binding the
      Firebase UID to the restaurant.
3. **Sign in.** Existing users sign in via the Firebase SDK directly. The
   client then calls `GET /auth/session` to resolve the restaurant
   binding. **If the response is `404 restaurant_not_found`, the client
   MUST sign the user out of Firebase and return to the sign-in screen
   with an error.** This protects against orphaned Firebase accounts and
   against users whose binding has been revoked.
4. **Sign out.** Client-side `signOut()` on the Firebase SDK; the backend
   has no session to terminate.

### Why two endpoints for sign-up

`validate-access-code` is **read-only** so the UX can show "Code looks
good — joining: Boiler Bowl Co." before the user submits a password. The
actual consumption and binding happens atomically in `register` so a
mistyped password (which fails before Firebase creates the user) never
burns a code, and a successful registration is one DB transaction.

### 401 vs 403 vs 404

- `401 unauthorized` — token missing, expired, or signature invalid.
- `403 forbidden` — token valid but the user is bound to a different
  restaurant than the requested resource.
- `404 restaurant_not_found` — token valid, no `restaurant_users` row exists
  for this UID. **The only response that triggers an automatic client-side
  Firebase sign-out.**

All error responses follow the [error contract](#error-contract).

## Conventions

- **Base URL**: `/api/v1` (e.g. `https://api.uplate.app/api/v1`).
- **Content type**: `application/json; charset=utf-8` for all bodies.
- **IDs**: ULIDs encoded as strings (e.g. `01J7Z8R6XK6PYJ2H6Q1RKWNYG3`).
  Server generates IDs; clients never send IDs on create.
- **Dates**:
  - Calendar dates (campaign start/end, metric day): ISO-8601 `YYYY-MM-DD`.
  - Timestamps (`createdAt`, `updatedAt`): RFC 3339 in UTC (e.g.
    `2026-05-25T14:32:01Z`).
- **Hours**: integers `0`–`23` (`endHour` may equal `startHour` to mean
  24-hour coverage; `endHour < startHour` means the window wraps midnight).
- **Enums**: lowercase strings, exact spellings listed under [Shared DTO
  types](#shared-dto-types). Server rejects unknown values with `422`.
- **Soft-delete**: not used. Deletes are hard but the server emits a
  `deleted_at` audit row (out of scope here).
- **Idempotency**: `POST` endpoints that create resources accept an optional
  `Idempotency-Key` header; repeated calls with the same key within 24h
  return the original response.
- **Concurrency**: every mutable entity carries `updatedAt`. Clients echo it
  back via `If-Match: <updatedAt>` on `PATCH`/`PUT`/`DELETE` to opt into
  optimistic concurrency. Mismatch returns `409`.
- **Pagination**: only used on `/api/v1/ads` (the library can grow long).
  All other list endpoints are bounded by a small per-restaurant cap and
  return the full collection.

---

## SQL schema

The schema targets PostgreSQL 15+. It is portable to MySQL 8 / SQL Server
with trivial dialect changes (replace `TIMESTAMPTZ` with `TIMESTAMP WITH TIME
ZONE`, use generated columns instead of triggers, etc.).

### Enums

```sql
CREATE TYPE status_enum         AS ENUM ('active', 'paused');
CREATE TYPE priority_enum       AS ENUM ('required', 'high', 'medium', 'low');
CREATE TYPE ad_location_enum    AS ENUM ('homeScreen', 'diningHallMenu');
CREATE TYPE audience_tag_enum   AS ENUM (
  'highProtein', 'highCarb', 'postWorkout', 'lowCalorie', 'macroFriendly'
);
CREATE TYPE dietary_pref_enum   AS ENUM (
  'vegetarian', 'vegan', 'glutenFree', 'dairyFree',
  'kosher', 'halal', 'pescatarian'
);
CREATE TYPE allergy_enum        AS ENUM (
  'peanuts', 'treeNuts', 'shellfish', 'eggs', 'soy', 'dairy', 'wheat'
);
CREATE TYPE day_of_week_enum    AS ENUM (
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
);
CREATE TYPE ad_event_type_enum  AS ENUM ('impression', 'click');
```

### `restaurant_users`

Binds a Firebase UID to a restaurant. One restaurant can have many users;
one user (UID) maps to exactly one restaurant.

| Column          | Type           | Constraints                                            |
|-----------------|----------------|--------------------------------------------------------|
| `firebase_uid`  | `TEXT`         | PK — exact value from the verified Firebase token      |
| `restaurant_id` | `TEXT`         | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE     |
| `email`         | `TEXT`         | NOT NULL — denormalized from Firebase for ops queries  |
| `created_at`    | `TIMESTAMPTZ`  | NOT NULL DEFAULT `now()`                               |

Indexes:

```sql
CREATE INDEX restaurant_users_by_restaurant
  ON restaurant_users (restaurant_id);
CREATE UNIQUE INDEX restaurant_users_email_unique
  ON restaurant_users (lower(email));
```

A `404 restaurant_not_found` from `GET /auth/session` literally means "no
row in this table for the verified UID."

### `access_codes`

Single-use codes minted by UPlate operators to onboard a restaurant. Each
code redeems into a `restaurant_users` row.

| Column          | Type           | Constraints                                                 |
|-----------------|----------------|-------------------------------------------------------------|
| `code`          | `TEXT`         | PK — case-insensitive (store uppercased); format `UPLATE-XXXX` |
| `restaurant_id` | `TEXT`         | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE          |
| `created_by`    | `TEXT`         | nullable — operator identifier, for audit                   |
| `created_at`    | `TIMESTAMPTZ`  | NOT NULL DEFAULT `now()`                                    |
| `expires_at`    | `TIMESTAMPTZ`  | nullable — `NULL` ⇒ no expiry                               |
| `consumed_at`   | `TIMESTAMPTZ`  | nullable — set on successful `POST /auth/register`          |
| `consumed_by_uid` | `TEXT`       | nullable — Firebase UID that consumed it                    |

Indexes:

```sql
CREATE INDEX access_codes_by_restaurant ON access_codes (restaurant_id);
```

A code is **valid for redemption** iff `consumed_at IS NULL` AND
(`expires_at IS NULL` OR `expires_at > now()`).

### `restaurants`

One row per tenant. Owns every other entity.

| Column           | Type           | Constraints                                      |
|------------------|----------------|--------------------------------------------------|
| `id`             | `TEXT`         | PK                                               |
| `name`           | `TEXT`         | nullable                                         |
| `icon_url`       | `TEXT`         | nullable                                         |
| `contact_email`  | `TEXT`         | nullable, used by notifications                  |
| `email_weekly`   | `BOOLEAN`      | NOT NULL DEFAULT TRUE                            |
| `email_alerts`   | `BOOLEAN`      | NOT NULL DEFAULT TRUE                            |
| `sms_alerts`     | `BOOLEAN`      | NOT NULL DEFAULT FALSE                           |
| `created_at`     | `TIMESTAMPTZ`  | NOT NULL DEFAULT `now()`                         |
| `updated_at`     | `TIMESTAMPTZ`  | NOT NULL DEFAULT `now()`, trigger-bumped on row update |

### `campaigns`

| Column          | Type          | Constraints                                                       |
|-----------------|---------------|-------------------------------------------------------------------|
| `id`            | `TEXT`        | PK                                                                |
| `restaurant_id` | `TEXT`        | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE                |
| `name`          | `TEXT`        | NOT NULL                                                          |
| `status`        | `status_enum` | NOT NULL DEFAULT `'paused'`                                       |
| `start_date`    | `DATE`        | NOT NULL                                                          |
| `end_date`      | `DATE`        | NOT NULL                                                          |
| `sort_order`    | `INTEGER`     | NOT NULL — newest-first ordering; lower = earlier in list         |
| `created_at`    | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()`                                          |
| `updated_at`    | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()`, trigger-bumped                          |

Indexes:

```sql
CREATE INDEX campaigns_by_restaurant_order
  ON campaigns (restaurant_id, sort_order ASC);
CREATE INDEX campaigns_by_restaurant_updated
  ON campaigns (restaurant_id, updated_at DESC);
```

`sort_order` replaces the client-side `campaignOrder: string[]`. The server
keeps it dense (no gaps); on create it shifts existing rows down with a
single `UPDATE … SET sort_order = sort_order + 1`.

### `ads`

| Column                | Type                | Constraints                                                  |
|-----------------------|---------------------|--------------------------------------------------------------|
| `id`                  | `TEXT`              | PK                                                           |
| `restaurant_id`       | `TEXT`              | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE           |
| `campaign_id`         | `TEXT`              | NOT NULL, FK → `campaigns(id)` ON DELETE CASCADE             |
| `title`               | `TEXT`              | NOT NULL                                                     |
| `description`         | `TEXT`              | NOT NULL DEFAULT `''`                                        |
| `redirect_url`        | `TEXT`              | NOT NULL DEFAULT `''`                                        |
| `creative_url`        | `TEXT`              | nullable                                                     |
| `icon_url`            | `TEXT`              | nullable                                                     |
| `status`              | `status_enum`       | NOT NULL DEFAULT `'paused'`                                  |
| `location`            | `ad_location_enum`  | NOT NULL DEFAULT `'homeScreen'`                              |
| `recurring_customer`  | `BOOLEAN`           | NOT NULL DEFAULT FALSE                                       |
| `recurring_priority`  | `priority_enum`     | NOT NULL DEFAULT `'medium'`                                  |
| `time_start_hour`     | `SMALLINT`          | nullable, 0–23, NULL ⇒ no time window                        |
| `time_end_hour`       | `SMALLINT`          | nullable, 0–23, NOT NULL when `time_start_hour` is NOT NULL  |
| `created_at`          | `TIMESTAMPTZ`       | NOT NULL DEFAULT `now()`                                     |
| `updated_at`          | `TIMESTAMPTZ`       | NOT NULL DEFAULT `now()`, trigger-bumped                     |

Indexes:

```sql
CREATE INDEX ads_by_campaign        ON ads (campaign_id);
CREATE INDEX ads_by_restaurant_upd  ON ads (restaurant_id, updated_at DESC);
CREATE INDEX ads_by_status          ON ads (restaurant_id, status);
CREATE INDEX ads_title_trgm         ON ads USING gin (lower(title) gin_trgm_ops);
```

The trigram index supports server-side title search for the Ads Library.

### `ad_audience_tags`

Composite-key child table. One row per (ad, tag).

| Column     | Type                | Constraints                          |
|------------|---------------------|--------------------------------------|
| `ad_id`    | `TEXT`              | PK part 1, FK → `ads(id)` CASCADE    |
| `tag`      | `audience_tag_enum` | PK part 2                            |
| `priority` | `priority_enum`     | NOT NULL                             |

### `ad_dietary_rules`

| Column     | Type                | Constraints                          |
|------------|---------------------|--------------------------------------|
| `ad_id`    | `TEXT`              | PK part 1, FK → `ads(id)` CASCADE    |
| `pref`     | `dietary_pref_enum` | PK part 2                            |
| `priority` | `priority_enum`     | NOT NULL                             |

### `ad_food_interests`

Free-text food interests. Names are case-insensitive unique per ad.

| Column     | Type            | Constraints                          |
|------------|-----------------|--------------------------------------|
| `ad_id`    | `TEXT`          | PK part 1, FK → `ads(id)` CASCADE    |
| `name`     | `TEXT`          | PK part 2 (UNIQUE lower(name) per ad) |
| `priority` | `priority_enum` | NOT NULL                             |

### `ad_exclusions`

| Column    | Type           | Constraints                          |
|-----------|----------------|--------------------------------------|
| `ad_id`   | `TEXT`         | PK part 1, FK → `ads(id)` CASCADE    |
| `allergy` | `allergy_enum` | PK part 2                            |

### `ad_time_days`

| Column  | Type               | Constraints                          |
|---------|--------------------|--------------------------------------|
| `ad_id` | `TEXT`             | PK part 1, FK → `ads(id)` CASCADE    |
| `day`   | `day_of_week_enum` | PK part 2                            |

### `ad_events`

Per-event analytics rows. **One row per impression or click**, with a snapshot
of the viewer's audience signals at the moment the event happened. This is
the single source of truth for everything in [Analytics](#analytics) —
including the wire-format `AnalyticsPoint` series, which is derived by
bucketing on `occurred_at::date`.

Each event captures only the **scalar** viewer attributes (recurring vs new,
optional `user_id`). Multi-valued signals (audience tags, dietary
preferences, food interests) live in child tables below — a single click
that matched three audience tags writes one `ad_events` row plus three
`ad_event_tags` rows.

| Column                | Type             | Constraints                                          |
|-----------------------|------------------|------------------------------------------------------|
| `id`                  | `TEXT`           | PK (ULID)                                            |
| `restaurant_id`       | `TEXT`           | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE   |
| `ad_id`               | `TEXT`           | NOT NULL, FK → `ads(id)` ON DELETE CASCADE           |
| `event_type`          | `ad_event_type_enum` | NOT NULL — `'impression'` or `'click'`          |
| `occurred_at`         | `TIMESTAMPTZ`    | NOT NULL — true wall-clock time of the event         |
| `user_id`             | `TEXT`           | nullable — UPlate end-user id (anonymous OK)         |
| `recurring_customer`  | `BOOLEAN`        | NOT NULL — was the viewer a repeat customer?         |

`ad_event_type_enum` is created alongside the other enums in
[Enums](#enums):

```sql
CREATE TYPE ad_event_type_enum AS ENUM ('impression', 'click');
```

Indexes:

```sql
CREATE INDEX ad_events_by_ad_time
  ON ad_events (ad_id, occurred_at DESC);
CREATE INDEX ad_events_by_ad_type_time
  ON ad_events (ad_id, event_type, occurred_at);
CREATE INDEX ad_events_by_restaurant_time
  ON ad_events (restaurant_id, occurred_at DESC);
```

The dashboard never paginates this table directly. All reads go through
aggregation queries — see [Endpoints](#endpoints).

#### Derived daily series

The previous schema stored a separate `ad_daily_metrics(ad_id, metric_date,
impressions, clicks)` table. That has been removed: with audience signals
attached to each event, daily aggregates fall out of a single GROUP BY:

```sql
SELECT
  date_trunc('day', occurred_at)::date AS metric_date,
  count(*) FILTER (WHERE event_type = 'impression') AS impressions,
  count(*) FILTER (WHERE event_type = 'click')      AS clicks
FROM ad_events
WHERE ad_id = $1 AND occurred_at >= $2 AND occurred_at < $3
GROUP BY 1
ORDER BY 1;
```

Volume forecast: a busy restaurant tops out around ~10⁵ impressions/day
across all ads. The `(ad_id, occurred_at DESC)` index keeps the daily/90-day
queries in milliseconds even at 100×. If a deployment outgrows that, the
recommended next step is a materialized view refreshed nightly — **not** a
second canonical table.

### `ad_event_tags`

Audience tags the viewer matched at event time. A click can write multiple
rows (e.g. a user tagged `highProtein` AND `postWorkout` writes two).

| Column      | Type                | Constraints                              |
|-------------|---------------------|------------------------------------------|
| `event_id`  | `TEXT`              | PK part 1, FK → `ad_events(id)` CASCADE  |
| `tag`       | `audience_tag_enum` | PK part 2                                |

Indexes:

```sql
CREATE INDEX ad_event_tags_by_tag ON ad_event_tags (tag);
```

### `ad_event_dietary`

Dietary preferences the viewer carried at event time.

| Column      | Type                | Constraints                              |
|-------------|---------------------|------------------------------------------|
| `event_id`  | `TEXT`              | PK part 1, FK → `ad_events(id)` CASCADE  |
| `pref`      | `dietary_pref_enum` | PK part 2                                |

Indexes:

```sql
CREATE INDEX ad_event_dietary_by_pref ON ad_event_dietary (pref);
```

### `ad_event_food_interests`

Free-text food interests the viewer had marked at event time. Lower-cased
unique per event.

| Column      | Type    | Constraints                                          |
|-------------|---------|------------------------------------------------------|
| `event_id`  | `TEXT`  | PK part 1, FK → `ad_events(id)` CASCADE              |
| `name`      | `TEXT`  | PK part 2 (UNIQUE lower(name) per event)             |

Indexes:

```sql
CREATE INDEX ad_event_food_interests_by_name
  ON ad_event_food_interests (lower(name));
```

### Triggers

```sql
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_campaigns_updated   BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_ads_updated         BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

When child tables of an ad change (targeting), application code should
`UPDATE ads SET updated_at = now()` for the parent so the client's
`If-Match` continues to work.

---

## Shared DTO types

These TypeScript declarations are the canonical wire shapes. They are
**deliberately** the same as the in-app types in `src/types/index.ts` plus a
small set of analytics-only shapes — the client should be able to import
them directly from `src/api/types.ts`.

### Auth DTOs

```ts
export interface ValidateAccessCodeRequest { accessCode: string }
export interface ValidateAccessCodeResponse {
  valid: boolean;
  /** Lightweight preview shown on the sign-up screen. Present only when valid. */
  restaurant?: { id: string; name: string };
}

export interface RegisterRequest { accessCode: string }
export interface RegisterResponse {
  restaurantId: string;
  restaurant: RestaurantProfile;
}

export interface AuthSessionResponse {
  restaurantId: string;
  restaurant: RestaurantProfile;
}
```

```ts
// Enum primitives (match the SQL enums above byte-for-byte)
export type Status         = 'active' | 'paused';
export type Priority       = 'required' | 'high' | 'medium' | 'low';
export type AdLocation     = 'homeScreen' | 'diningHallMenu';
export type DayOfWeek      = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type AudienceTag    =
  | 'highProtein' | 'highCarb' | 'postWorkout' | 'lowCalorie' | 'macroFriendly';
export type DietaryPreference =
  | 'vegetarian' | 'vegan' | 'glutenFree' | 'dairyFree'
  | 'kosher' | 'halal' | 'pescatarian';
export type Allergy =
  | 'peanuts' | 'treeNuts' | 'shellfish' | 'eggs' | 'soy' | 'dairy' | 'wheat';

// Targeting building blocks
export interface AudienceTagRule  { tag: AudienceTag;        priority: Priority }
export interface DietaryRule      { pref: DietaryPreference; priority: Priority }
export interface FoodInterestRule { name: string;            priority: Priority }
export interface TimeRange        { startHour: number;       endHour: number }
export interface BehavioralTargeting {
  recurringCustomer: boolean;
  recurringPriority: Priority;
}
export interface TimeTargeting {
  range: TimeRange | null;
  days: DayOfWeek[];
}
export interface Targeting {
  audienceTags: AudienceTagRule[];
  dietary:      DietaryRule[];
  foodInterests: FoodInterestRule[];
  exclusions:   Allergy[];
  behavioral:   BehavioralTargeting;
  time:         TimeTargeting;
}

// Analytics
export interface AnalyticsPoint { date: string; impressions: number; clicks: number }
export interface AdMetrics {
  impressions: number;   // SUM over series
  clicks: number;        // SUM over series
  series: AnalyticsPoint[];
}

// Aggregates returned by /campaigns and /ads list endpoints
export interface CampaignStats {
  impressions: number;
  clicks: number;
  ctr: number;          // 0..1
  adCount: number;
  activeAdCount: number;
}
export interface GlobalStats {
  impressions: number;
  clicks: number;
  ctr: number;
  activeCampaigns: number;
  activeAds: number;
  totalCampaigns: number;
  totalAds: number;
}

// Entities
export interface RestaurantProfile {
  id: string;
  name?: string;
  iconUrl?: string;
  contactEmail?: string;
  notifications: {
    weekly: boolean;
    emailAlerts: boolean;
    smsAlerts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: Status;
  startDate: string;   // YYYY-MM-DD
  endDate:   string;   // YYYY-MM-DD
  adIds: string[];     // server-supplied so the client's reducer keeps working
  createdAt: string;
  updatedAt: string;
}

export interface Ad {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  redirectUrl: string;
  creativeUrl?: string;
  iconUrl?: string;
  status: Status;
  location: AdLocation;
  targeting: Targeting;
  metrics: AdMetrics;
  createdAt: string;
  updatedAt: string;
}

// Inputs (server generates id, createdAt, updatedAt, metrics)
export interface CampaignInput {
  name: string;
  status?: Status;
  startDate: string;
  endDate: string;
}
export interface AdInput {
  campaignId: string;
  title: string;
  description?: string;
  redirectUrl?: string;
  creativeUrl?: string;
  iconUrl?: string;
  status?: Status;
  location?: AdLocation;
  targeting?: Targeting;
}
```

---

## Endpoints

Every endpoint lives under `/api/v1`. Path params use `:name`. Authentication
is required everywhere except `/health` and `POST /auth/validate-access-code`.

### Auth

#### `POST /auth/validate-access-code`

**Description.** Read-only check that an access code is valid. Does **not**
consume the code. Used by the sign-up screen to surface a friendly error
before creating a Firebase account. Unauthenticated — anyone can probe a
code; rate-limit by IP and accept fewer than 10 requests per minute to
mitigate brute-force enumeration.

**Auth.** None.

**Request body.** `ValidateAccessCodeRequest`.

**Response 200.** `ValidateAccessCodeResponse`. `valid` is `false` for any
of the following (no further detail is leaked):

- code does not exist
- code has been consumed (`consumed_at IS NOT NULL`)
- code has expired (`expires_at < now()`)

When `valid` is `true`, `restaurant` is populated with the bound restaurant's
public name so the client can render "Joining: Boiler Bowl Co."

**Errors.** `429 rate_limited`; `400 bad_request` on a malformed body.

#### `POST /auth/register`

**Description.** Consumes the access code and binds the authenticated
Firebase user to the code's restaurant. Idempotent per `Idempotency-Key`,
but **only one successful registration per code**: a second call with the
same valid code returns `410 gone`.

**Auth.** Firebase ID token (Bearer). The server uses the verified UID and
email to insert into `restaurant_users`.

**Request body.** `RegisterRequest`.

**Server behavior (single transaction).**

```sql
BEGIN;
SELECT restaurant_id FROM access_codes
  WHERE upper(code) = upper($1)
    AND consumed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;
-- if no row: ROLLBACK and return 404 access_code_not_found
INSERT INTO restaurant_users (firebase_uid, restaurant_id, email)
  VALUES ($uid, $restaurant_id, $email)
  ON CONFLICT (firebase_uid) DO NOTHING;
-- if zero rows inserted: ROLLBACK and return 409 already_registered
UPDATE access_codes
  SET consumed_at = now(), consumed_by_uid = $uid
  WHERE upper(code) = upper($1);
COMMIT;
```

**Response 201.** `RegisterResponse`.

**Errors.**

| HTTP | `code`                    | When                                              |
|------|---------------------------|---------------------------------------------------|
| 401  | `unauthorized`            | No / expired Firebase token.                      |
| 404  | `access_code_not_found`   | Unknown, expired, or never-existed code.          |
| 409  | `already_registered`      | This UID is already bound to a restaurant.        |
| 410  | `access_code_consumed`    | Code exists but `consumed_at IS NOT NULL`.        |
| 422  | `validation_failed`       | Empty / malformed accessCode.                     |

When the client receives any of `404 / 410 / 409`, the sign-up flow
**deletes the just-created Firebase user** (`deleteUser()` in the Web SDK)
and surfaces the error on the sign-up screen so the same email can be
retried with a correct code.

#### `GET /auth/session`

**Description.** Resolve the authenticated user's restaurant binding.
This is the **first** authenticated call the client makes after a Firebase
sign-in completes; it determines whether to load the dashboard or send the
user back to the sign-in screen.

**Auth.** Firebase ID token.

**Response 200.** `AuthSessionResponse`.

**Errors.**

| HTTP | `code`                     | Client behavior |
|------|----------------------------|-----------------|
| 401  | `unauthorized`             | Token problem — re-fetch token or send back to sign-in. |
| 404  | `restaurant_not_found`     | **No `restaurant_users` row for this UID.** Client signs the Firebase user out and returns to the sign-in screen with the message "Your account is not linked to a restaurant." |

### Bootstrap

#### `GET /bootstrap`

**Description.** Returns the entire writable working set for the dashboard in
one call. The client uses this in place of multiple list endpoints on first
load (and after `RESET`/sign-in). Replaces the current `loadState()` from
`localStorage`.

This endpoint is what makes the dashboard feel instant. The server runs a
small set of joined queries in a single transaction:

- one row from `restaurants`,
- all `campaigns` for the restaurant ordered by `sort_order`,
- all `ads` plus their targeting child rows,
- a per-ad 90-day daily series, aggregated on the server from
  [`ad_events`](#ad_events) (this populates each `Ad.metrics`).

The server returns 90 days of derived series because that is the maximum
the Analytics page shows. Older points come from `GET /analytics/series`
with a date range, which re-aggregates from `ad_events`.

**Request.** No body, no query params.

**Response 200.**

```ts
interface BootstrapResponse {
  restaurant: RestaurantProfile;
  campaigns: Campaign[];   // ordered as the user expects them
  ads: Ad[];               // each ad's `metrics.series` is last 90 days
  // Echoed-back ordering for the client reducer
  campaignOrder: string[];
  serverTime: string;      // RFC 3339, used to align relative timestamps
}
```

**Failure modes.** `401` if unauthenticated.

---

### Restaurant profile

#### `GET /restaurant`

**Description.** Returns the authenticated restaurant. Rarely called
directly because `/bootstrap` already provides this; useful if the Settings
page is opened with stale data and the client wants to revalidate.

**Response 200.** `RestaurantProfile`.

#### `PATCH /restaurant`

**Description.** Partial update of restaurant profile fields. Send only the
fields you want to change. Setting `null` clears an optional field.

**Request body.**

```ts
interface RestaurantPatch {
  name?: string | null;
  iconUrl?: string | null;
  contactEmail?: string | null;
  notifications?: Partial<RestaurantProfile['notifications']>;
}
```

**Response 200.** Full `RestaurantProfile` (updated row).

**Errors.** `422` invalid URL/email; `401`.

---

### Campaigns

#### `GET /campaigns`

**Description.** Returns every campaign for the restaurant **with rolled-up
stats and ad counts attached** — the Campaigns page needs no follow-up
queries. Ordered by `sort_order` (newest first, just like the legacy client
reducer prepended to `campaignOrder`).

**Query params.**

| Name      | Type    | Default | Notes                            |
|-----------|---------|---------|----------------------------------|
| `status`  | `'active'\|'paused'` | (all) | Filter by status.        |

**Response 200.**

```ts
interface CampaignListItem extends Campaign {
  stats: CampaignStats;
  // 30-day impressions sparkline pre-aggregated server-side
  impressionsSpark: number[];
}
interface CampaignListResponse {
  campaigns: CampaignListItem[];
}
```

#### `POST /campaigns`

**Description.** Create a campaign. The new row is prepended (lowest
`sort_order`).

**Request body.**

```ts
type CreateCampaignRequest = CampaignInput;
```

**Response 201.**

```ts
interface CreateCampaignResponse { campaign: Campaign }
```

**Errors.** `422` `endDate < startDate` or empty name.

#### `GET /campaigns/:id`

**Description.** Returns a single campaign together with **all of its ads,
the campaign rollups, the 90-day aggregate series, and best/worst ad
breakdowns**. This is the only call CampaignDetail makes — both the Ads tab
and the Analytics tab render from it.

**Response 200.**

```ts
interface CampaignDetailResponse {
  campaign: Campaign;
  ads: Ad[];                          // includes metrics.series (90d)
  stats: CampaignStats;
  series: AnalyticsPoint[];           // 90 days aggregated across ads
  best:  Array<{ adId: string; title: string; ctr: number }>;  // top 3 by CTR
  worst: Array<{ adId: string; title: string; ctr: number }>;  // bottom 3 by CTR
}
```

**Errors.** `404` if not found / not owned.

#### `PATCH /campaigns/:id`

**Description.** Partial update of campaign fields (name, status, dates).

**Request body.**

```ts
interface CampaignPatch {
  name?: string;
  status?: Status;
  startDate?: string;
  endDate?: string;
}
```

**Headers.** `If-Match: <updatedAt>` (optional but recommended).

**Response 200.** `{ campaign: Campaign }`.

**Errors.** `404`, `409` stale, `422`.

#### `DELETE /campaigns/:id`

**Description.** Hard-deletes a campaign and all of its ads (cascade). Use
`If-Match` to prevent racing another tab.

**Response 200.**

```ts
interface DeleteCampaignResponse {
  deletedCampaignId: string;
  deletedAdIds: string[];   // so the client reducer can drop the ads in one update
}
```

**Errors.** `404`, `409`.

#### `POST /campaigns/:id/duplicate`

**Description.** Atomically clones a campaign and every one of its ads
(targeting is deep-copied; metrics are reset; status set to `paused`; the
copy is prepended in `sort_order`). One round-trip; one DB transaction.

**Request body.**

```ts
interface DuplicateCampaignRequest {
  nameSuffix?: string;  // defaults to ' (Copy)'
}
```

**Response 201.**

```ts
interface DuplicateCampaignResponse {
  campaign: Campaign;
  ads: Ad[];
}
```

#### `POST /campaigns/:id/status`

**Description.** Toggles or sets the campaign's status. Convenience for the
header toggle and the card row toggle.

**Request body.**

```ts
interface SetStatusRequest { status?: Status; toggle?: boolean }
// Exactly one of `status` or `toggle: true` must be present.
```

**Response 200.** `{ campaign: Campaign }`.

#### `POST /campaigns/reorder`

**Description.** Persist a new ordering after a drag-and-drop reshuffle.
Single round-trip even for N campaigns.

**Request body.**

```ts
interface ReorderCampaignsRequest { orderedIds: string[] }
```

**Response 200.** `{ campaignOrder: string[] }` — the canonical order from
the server.

**Errors.** `422` if `orderedIds` does not exactly match the set of
campaigns owned by the restaurant.

---

### Ads

#### `GET /ads`

**Description.** Ads Library list. Server applies the status filter and the
title search so big libraries do not ship the full table to the client.

**Query params.**

| Name        | Type                       | Default | Notes |
|-------------|----------------------------|---------|-------|
| `status`    | `'active'\|'paused'`       | (all)   |       |
| `q`         | `string`                   | —       | Trigram match on `title`. |
| `campaignId`| `string`                   | —       | Scope to one campaign. |
| `limit`     | `number` (1–200)           | `50`    |       |
| `cursor`    | `string` (opaque)          | —       | Server-issued; from prior response. |

**Response 200.**

```ts
interface AdListItem extends Ad {
  campaignName: string;       // pre-joined for the "show campaign" badge
}
interface AdListResponse {
  ads: AdListItem[];
  nextCursor: string | null;
}
```

#### `POST /ads`

**Description.** Create an ad inside a campaign. Targeting is optional and
defaults to the empty targeting object.

**Request body.**

```ts
type CreateAdRequest = AdInput;
```

**Response 201.**

```ts
interface CreateAdResponse { ad: Ad }
```

**Errors.** `404` campaign not found, `422` invalid targeting.

#### `GET /ads/:id`

**Description.** Single ad with full targeting, full 90-day series, and the
parent campaign name pre-joined for the breadcrumb. AdDetail uses this for
the non-edit view.

**Response 200.**

```ts
interface AdDetailResponse {
  ad: Ad;
  campaign: { id: string; name: string };
}
```

#### `PUT /ads/:id`

**Description.** Full replace of the ad's editable fields **including
targeting**. The client's Edit view bundles everything into one save, so
this endpoint replaces the previous two-dispatch flow (`AD_UPDATE` +
`TARGETING_UPDATE`). One round-trip, one transaction.

**Request body.**

```ts
interface UpdateAdRequest {
  title: string;
  description: string;
  redirectUrl: string;
  creativeUrl?: string | null;
  iconUrl?: string | null;
  location: AdLocation;
  status: Status;
  targeting: Targeting;
}
```

**Headers.** `If-Match: <updatedAt>` recommended.

**Response 200.** `{ ad: Ad }` (with refreshed `updatedAt`).

**Errors.** `404`, `409`, `422` (e.g. unknown enum value, `endHour` out of
range, duplicate `foodInterests.name`).

#### `PATCH /ads/:id`

**Description.** Partial update for cases where the client only needs to
touch a few fields (e.g. AdCreateDialog's optimistic edits, drag-to-status).
Distinct from `PUT` because the latter is the full-edit save.

**Request body.**

```ts
interface AdPatch {
  title?: string;
  description?: string;
  redirectUrl?: string;
  creativeUrl?: string | null;
  iconUrl?: string | null;
  location?: AdLocation;
  status?: Status;
  campaignId?: string;     // move ad to another campaign (server validates)
}
```

**Response 200.** `{ ad: Ad }`.

#### `DELETE /ads/:id`

**Description.** Hard-deletes an ad and removes it from the parent
campaign's `adIds` projection.

**Response 200.**

```ts
interface DeleteAdResponse { deletedAdId: string; campaignId: string }
```

#### `POST /ads/:id/duplicate`

**Description.** Clones an ad into a target campaign. Targeting deep-copies;
metrics reset; status forced to `paused`. Replaces the client's
`cloneAd()` + `AD_DUPLICATE` dispatch with one round-trip.

**Request body.**

```ts
interface DuplicateAdRequest {
  targetCampaignId: string;
  titleSuffix?: string;     // default ' (Copy)' if the target campaign is the same; '' otherwise
}
```

**Response 201.** `{ ad: Ad }`.

**Errors.** `404` target campaign missing.

#### `POST /ads/:id/status`

**Description.** Toggle or set ad status. Same shape as the campaign
counterpart.

**Request body.** `SetStatusRequest`.

**Response 200.** `{ ad: Ad }`.

---

### Analytics

These endpoints exist so the analytics screens never run aggregation on the
client. They are read-only and cache-friendly (`Cache-Control: max-age=60`).
Every numeric series below is a GROUP BY over [`ad_events`](#ad_events);
totals are `count(*) FILTER (...)` partitions of the same scan.

#### `GET /analytics/overview`

**Description.** Powers the Dashboard Overview page and the top section of
the Analytics page. One call returns global rollups, the aggregate impression
& click series, the top performing ads, and the four most recently updated
campaigns.

**Query params.**

| Name    | Type                              | Default |
|---------|-----------------------------------|---------|
| `range` | `'7d' \| '30d' \| '90d' \| 'all'` | `'30d'` |

**Response 200.**

```ts
interface AnalyticsOverviewResponse {
  stats: GlobalStats;
  series: AnalyticsPoint[];                        // aggregate across all ads
  topAds: Array<{
    adId: string;
    title: string;
    campaignId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: Status;
    adCount: number;
    updatedAt: string;
  }>;
}
```

#### `GET /analytics/campaign-comparison`

**Description.** Table data for the Analytics page "Campaign comparison"
card. Pre-joined and pre-aggregated.

**Response 200.**

```ts
interface CampaignComparisonResponse {
  rows: Array<{
    campaignId: string;
    name: string;
    status: Status;
    impressions: number;
    clicks: number;
    ctr: number;
    adCount: number;
  }>;
}
```

#### `GET /analytics/series`

**Description.** Aggregate impressions/clicks series for a custom window.
Used when the Analytics page picks `'7d'`, `'90d'`, `'all'`, or when the
client zooms past the 90 days returned by `/bootstrap`. The client can also
filter by a campaign or a single ad.

**Query params.**

| Name        | Type                              | Default  | Notes |
|-------------|-----------------------------------|----------|-------|
| `from`      | `YYYY-MM-DD`                      | —        | Inclusive. Required if `range` not given. |
| `to`        | `YYYY-MM-DD`                      | today    | Inclusive. |
| `range`     | `'7d' \| '30d' \| '90d' \| 'all'` | —        | Mutually exclusive with `from`/`to`. |
| `campaignId`| `string`                          | —        | Restrict to one campaign. |
| `adId`      | `string`                          | —        | Restrict to one ad. |

**Response 200.**

```ts
interface AnalyticsSeriesResponse {
  series: AnalyticsPoint[];
  from: string;
  to: string;
}
```

#### `GET /analytics/audience-insights`

**Description.** Powers the Audience Insights page. Tag usage, dietary
preference weights, and the 7×24 time coverage heatmap — all computed in
SQL. The heatmap is returned as a flat array so the client can index it
cheaply.

**Response 200.**

```ts
interface AudienceInsightsResponse {
  tagUsage: Array<{
    tag: AudienceTag;
    count: number;        // ads using the tag
    pct: number;          // share of all targeted-tag occurrences (0..1)
  }>;
  dietaryUsage: Array<{
    pref: DietaryPreference;
    count: number;
    avgPriorityScore: number;   // 0..100 (required=100, low=25)
  }>;
  heatmap: {
    // 168 cells, indexed as day*24 + hour. day=0 is Monday.
    cells: number[];
    perDayAdCount: number[];    // length 7, Mon..Sun
    max: number;
  };
}
```

#### `GET /analytics/ads/:id/click-signals`

**Description.** Powers the ClickAudienceSignals card on AdDetail. The
server aggregates the audience snapshots recorded on each click event in
[`ad_events`](#ad_events) and its three signal child tables. **All
percentages and counts here are real groupings, not modeled
distributions** — the earlier design had no event-level data and the
client filled the gap with a seeded PRNG; that hack is gone.

**Query semantics.**

- `totalClicks` = `count(*)` over `ad_events WHERE ad_id = :id AND event_type = 'click'`.
- `topAudienceTags[i].pct` = `count(distinct event_id)` in
  `ad_event_tags` for `tag = $tag` joined to click events on this ad,
  divided by `totalClicks`. `targeted` is true when the tag appears in
  this ad's `ad_audience_tags`.
- `topDietary` and `topFoodInterests` are computed the same way against
  their respective child tables.
- `recurringPct` = share of click events whose
  `ad_events.recurring_customer = TRUE`.
- `clicksByDay[i]` = share of click events whose `occurred_at` falls on
  day i (Monday = 0) of the user's reporting timezone.
- `clicksByHour[i]` = share of click events whose `occurred_at` falls in
  hour i (0..23) of the same timezone.
- `peakHour` = `argmax(clicksByHour)`.

The shape returned is unchanged from the previous spec, only the source
data is now real per-event rows instead of derived heuristics.

**Response 200.**

```ts
interface ClickSignalsResponse {
  totalClicks: number;
  topAudienceTags: Array<{
    tag: AudienceTag; label: string; pct: number; targeted: boolean;
  }>;
  topDietary: Array<{
    pref: DietaryPreference; label: string; pct: number; targeted: boolean;
  }>;
  topFoodInterests: Array<{
    name: string; pct: number; targeted: boolean;
  }>;
  recurringPct: number;          // 0..1, recurring-customer share
  clicksByDay: number[];         // length 7, Mon..Sun
  clicksByHour: number[];        // length 24
  peakHour: number;              // 0..23
}
```

---

### Reference data

Static enums and helper labels do not require their own endpoints — the
client ships them in `src/data/constants.ts`. If product later wants
restaurant-defined `foodInterests` (autocomplete), an endpoint can be added:

#### `GET /reference/food-interests`  *(future)*

Returns the union of (a) globally suggested foods and (b) names the
restaurant has used historically.

---

### Health

#### `GET /health`

Unauthenticated liveness check. Returns `{ ok: true, version: '...' }`.

---

## Page → endpoint map

This is the round-trip budget per screen. **Never exceed it.**

| Page / component             | Endpoint(s) used                                                              | Calls |
|------------------------------|-------------------------------------------------------------------------------|-------|
| Sign-in (existing user)      | Firebase SDK `signInWithEmailAndPassword`, then `GET /auth/session`           | 1     |
| Sign-up (new user)           | `POST /auth/validate-access-code`, then Firebase SDK `createUser…`, then `POST /auth/register` | 2 |
| App boot (after auth)        | `GET /bootstrap`                                                              | 1     |
| DashboardOverview            | `GET /analytics/overview?range=30d`                                           | 1     |
| Campaigns (list)             | `GET /campaigns`                                                              | 1     |
| CampaignDetail (Ads tab)     | `GET /campaigns/:id`                                                          | 1     |
| CampaignDetail (Analytics)   | (reuses the same response — `series` + `best`/`worst` already there)          | 0     |
| AdsLibrary                   | `GET /ads?status=…&q=…`                                                       | 1     |
| AdDetail (read)              | `GET /ads/:id`                                                                | 1     |
| AdDetail + ClickAudienceCard | `GET /analytics/ads/:id/click-signals`                                        | 1     |
| Analytics                    | `GET /analytics/overview` + `GET /analytics/campaign-comparison` + (optional) `GET /analytics/series` | 2–3 |
| AudienceInsights             | `GET /analytics/audience-insights`                                            | 1     |
| Settings                     | (none — uses `/bootstrap` cache) + `PATCH /restaurant` on save                | 0     |

Mutation flows are likewise single-call:

| User action                         | Endpoint                                  |
|-------------------------------------|-------------------------------------------|
| Create campaign                     | `POST /campaigns`                         |
| Edit campaign (header form)         | `PATCH /campaigns/:id`                    |
| Toggle campaign status              | `POST /campaigns/:id/status`              |
| Duplicate campaign (+ all ads)      | `POST /campaigns/:id/duplicate`           |
| Delete campaign (+ cascade ads)     | `DELETE /campaigns/:id`                   |
| Drag-reorder campaigns              | `POST /campaigns/reorder`                 |
| Create ad                           | `POST /ads`                               |
| Edit ad + targeting (Save button)   | `PUT /ads/:id`                            |
| Toggle ad status                    | `POST /ads/:id/status`                    |
| Move ad to another campaign         | `PATCH /ads/:id` with `{ campaignId }`    |
| Duplicate ad into target campaign   | `POST /ads/:id/duplicate`                 |
| Delete ad                           | `DELETE /ads/:id`                         |
| Update restaurant profile / notifs  | `PATCH /restaurant`                       |

---

## Error contract

Every non-2xx response is JSON of this shape:

```ts
interface ApiError {
  error: {
    code: string;            // stable machine-readable, e.g. 'campaign_not_found'
    message: string;         // human-readable, safe to display
    fieldErrors?: Record<string, string>;  // per-field validation messages
    requestId: string;       // for log correlation
  };
}
```

Standard codes:

| HTTP | `code`                  | Meaning                                            |
|------|-------------------------|----------------------------------------------------|
| 400  | `bad_request`           | Malformed JSON / missing required field.           |
| 401  | `unauthorized`          | Missing/expired token.                             |
| 403  | `forbidden`             | Authenticated but resource not owned.              |
| 404  | `not_found`             | Path/ID does not resolve.                          |
| 409  | `conflict`              | `If-Match` mismatch; concurrent edit.              |
| 422  | `validation_failed`     | Field-level validation errors in `fieldErrors`.    |
| 429  | `rate_limited`          | Standard `Retry-After` header included.            |
| 500  | `internal`              | Unexpected server failure; log `requestId`.        |

Resource-specific codes (non-exhaustive): `campaign_not_found`,
`ad_not_found`, `campaign_dates_invalid`, `food_interest_duplicate`,
`reorder_set_mismatch`, `access_code_not_found`, `access_code_consumed`,
`already_registered`, `restaurant_not_found`.

### Codes that drive automatic client-side sign-out

The client's `AuthContext` watches for these codes specifically and, when
returned from an authenticated endpoint, signs the Firebase user out and
returns to the sign-in screen with the contextual error:

| HTTP | `code`                  | Trigger                                                |
|------|-------------------------|--------------------------------------------------------|
| 404  | `restaurant_not_found`  | Returned from `GET /auth/session` (or `GET /bootstrap`) when the verified Firebase UID has no `restaurant_users` row. |

---

## Migration notes

How to wire the existing client to this backend with minimum churn:

1. **Drop in the client.** `src/api/types.ts` (DTO types) and
   `src/api/client.ts` (`ApiClient` interface) already exist. They expose
   `bootstrap()`, `campaigns.*`, `ads.*`, `analytics.*`, `restaurant.*` —
   one method per endpoint above.
2. **Flip the persistence layer.** `src/store/persistence.ts` currently
   serializes `AppState` to `localStorage`. Replace `loadState()` with
   `await api.bootstrap()` and remove `saveState()` — every mutation now
   round-trips through `api.*` and the reducer applies the server's response.
3. **Move dispatches to thunks.** The reducer stays as the single source of
   truth for client cache. Each existing dispatch site (`AD_CREATE`,
   `CAMPAIGN_DUPLICATE`, etc.) becomes `await api.x(); dispatch(action)` so
   the optimistic-then-correct dance is local to that handler.
4. **Replace selectors that aggregate.** `globalAnalytics`,
   `campaignAnalytics`, `aggregateSeries`, and `topPerformingAds` move
   server-side. The client retains them only as type-safe accessors over
   server-supplied numbers (no math).
5. **Remove `ClickAudienceSignals` PRNG.** The seeded random generation in
   that component is replaced with `GET /analytics/ads/:id/click-signals`.
   This endpoint now returns honest counts because the server has
   per-event audience snapshots in [`ad_events`](#ad_events) — there is
   no equivalent in the legacy schema. Ingestion of new events is
   out-of-scope for this dashboard contract; the assumption is that the
   UPlate consumer app writes one `ad_events` row (plus tag/dietary/food
   child rows) per impression and per click.
6. **Reset-to-seed.** The Settings "Reset demo data" button should call a
   dev-only `POST /admin/reset` (out of scope for this contract); in
   production it disappears.

Estimated migration: one focused phase per resource family (restaurant,
campaigns, ads, analytics). Each phase is a contained PR; the reducer
shape does not change.
