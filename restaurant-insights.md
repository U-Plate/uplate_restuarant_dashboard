# Restaurant Insights Tab — Data & Design Spec

Working doc for a new dashboard tab: **organic restaurant performance** on the
UPlate consumer app (discovery, menu browsing, meal logging, ratings) — as
opposed to the existing **Ads / Campaigns** analytics, which only measures
paid ad impressions and clicks (`backend.md` §11). An owner with zero ads
running should still be able to open this tab and learn something about how
students are finding and using their listing.

This doc is an input to page design, not an implementation spec. It follows
the conventions already established in `PRODUCT.md` (voice, "honest or
absent", number-is-the-headline) and `backend.md` (event-sourced analytics,
`GROUP BY` aggregation, Mon-indexed `dow` + `hour` bucketing in
`APP_TIMEZONE`) so this can be folded into `backend.md` later without a
redesign.

> **Status note (post-ship):** the shipped `/insights` tab deliberately
> **omits** the Conversion Funnel (§3C), Search & Demand (§3E), and the
> View Source Mix part of Traffic (§3A). Those sections narrate a
> *discovery* story (a student browsing to decide where to eat) — but most
> real traffic today is a student who already ate at the restaurant opening
> the app to log it. Presenting a discovery funnel/search-demand signal
> against that traffic would be honest-looking but substantively misleading.
> The spec below is kept as-is so these can be added back wholesale once
> discovery is a real product surface — nothing here was wrong, it was just
> premature. Shipped scope: hero (Views, Logged Meals, Average Rating, Repeat
> Visitors), Traffic (series + peak-hours heatmap only), Menu Performance,
> Ratings, and Customer Composition.

---

## 1. Relationship to existing Ads Analytics

| | Ads Analytics (existing) | Restaurant Insights (this doc) |
| --- | --- | --- |
| Source data | `ad_events` (impression/click) | new consumer-app event stream (view/search/log/rate) |
| Measures | paid reach the restaurant bought | organic behavior on the restaurant's real listing/menu |
| Exists without ads? | No — zero if no ads run | Yes — populates as soon as students visit the app |
| Pages | `Analytics.tsx`, `AudienceInsights.tsx` | new tab (name TBD — see §6) |

Architecturally, treat the new stream the same way `ad_events` is treated:
one append-only event table per event type (or one table + `type` column),
tenant-scoped by `restaurantId`, aggregated server-side, never summed
client-side.

---

## 2. Data Collected

### 2.1 User Profile

Lives on the **consumer app** side (not owned/edited by the restaurant
dashboard), but every event below carries a `userId` that joins back to it for
aggregate breakdowns. Reuse existing enums from `src/types/index.ts` wherever
they already exist — don't invent parallel ones.

| Field | Type | Notes |
| --- | --- | --- |
| `age` | number | e.g. `19` |
| `dietaryPreferences` | `DietaryPreference[]` | **reuse** existing enum (`vegan`, `vegetarian`, `pescatarian`, `halal`, `kosher`) |
| `allergies` | `Allergy[]` | **reuse** existing enum (12 values already defined) |
| `healthGoal` | `'cut' \| 'bulk' \| 'maintain' \| 'performance'` | new enum |
| `foodTags` | `string[]` | favorite foods — same free-text shape as `FOOD_INTEREST_SUGGESTIONS`, can literally reuse that list as autocomplete seed |
| `cuisines` | `string[]` | favorite cuisines — **reuse** `CUISINE_INTEREST_SUGGESTIONS` |

### 2.2 Restaurant Events

One row per event, parallel to `ad_events`. All timestamps ISO-8601 UTC;
`dow`/`hour` precomputed in `APP_TIMEZONE`, Mon-indexed, exactly like
`backend.md` §6.4.

| Event | Fields | Notes |
| --- | --- | --- |
| **RestaurantViewed** | `userId`, `restaurantId`, `occurredAt`, `source: 'search' \| 'retailPage' \| 'ad'` | top of funnel |
| **MenuViewed** | `userId`, `restaurantId`, `occurredAt` | opened the menu from the restaurant page |
| **MenuItemViewed** | `userId`, `restaurantId`, `menuItemId`, `occurredAt` | opened/expanded a specific item |
| **Search** | `userId`, `query`, `filters`, `occurredAt`, `resultRestaurantIds` | `resultRestaurantIds` makes results restaurant-scoped — see decision in §4 |
| **MealLogged** | `userId`, `restaurantId`, `menuItemId`, `occurredAt` | self-reported "I ate this" — **not** a verified POS transaction |
| **Rating** | `userId`, `restaurantId`, `menuItemId`, `rating`, `occurredAt` | `rating`: integer 1–5 |

---

## 3. Derived Metrics

The stats the user already listed (Menu Views, Popular Items, Most Clicked
Items, Peak Hours, Customer Types, Average Rating, Top Searches, Repeat
Visitors, Conversion Rate, Trending Foods, Favorite Foods) are folded in below
under a category structure, alongside additional derivable metrics. Every stat
must degrade to an honest empty state per `PRODUCT.md` §"Honest or absent" —
no synthetic numbers when an event stream is empty.

### A. Discovery & Traffic
- **Restaurant Views** — count + trend (`RestaurantViewed`)
- **View Source Mix** *(new)* — % from search vs. retail-page browse vs. ad tap. Tells an owner whether their traffic is earned or bought.
- **Peak Hours** — `dow` × `hour` heatmap of views/menu opens, reusing the exact heatmap shape already built for Audience Insights (`backend.md` §11.6)
- **New vs. Returning Visitors** — this is what "Customer Types" means concretely: first-ever `RestaurantViewed` per user vs. subsequent
- **Repeat Visitors** — % of viewers with `RestaurantViewed` on ≥2 distinct days

### B. Menu & Item Performance
- **Menu Views** — `MenuViewed` count + **view-through rate** = `MenuViewed / RestaurantViewed`
- **Popular / Most-Viewed Items** — ranked `MenuItemViewed` counts
- **Trending Foods** — week-over-week % change in item views/logs
- **Favorite Foods** — item views/logs bucketed against the viewer's own `foodTags`, i.e. "which of your dishes match what students already say they love"
- **Underperforming Items** *(new)* — items with meaningful views but near-zero `MealLogged` — the flip side of "popular," and the more actionable one ("people look, don't commit")

### C. Conversion Funnel
Formalizes "Conversion Rate" into a real funnel instead of one number:

```
RestaurantViewed → MenuViewed → MenuItemViewed → MealLogged
```

Report the drop-off % at each stage plus one headline **Conversion Rate** =
`MealLogged / RestaurantViewed`. This is the single most useful "is it
working" number for this tab, per `PRODUCT.md`'s "the number is the headline"
rule — it should anchor the top of the page.

### D. Ratings & Quality
- **Average Rating** — overall and per item (`Rating`)
- **Rating Trend** *(new)* — rolling average over time, so a menu change's effect is visible
- **Lowest-Rated Items** *(new)* — surfaces exactly what needs attention, mirrors the existing ads "worst 3 by CTR" pattern (`backend.md` §10.4 `CampaignDetailResponse.worst`)

### E. Search & Demand Signals
- **Top Searches** — queries where this restaurant appeared in `resultRestaurantIds`, ranked by frequency (see §4 for the scoping design)
- **Search Filters Used** *(new)* — which filters (dietary, allergy, price) co-occur with searches that surface this restaurant; flags whether menu tagging is discoverable
- **Search Impression → View Rate** *(new)* — of the searches this restaurant appeared in, what % led to a `RestaurantViewed(source='search')` by the same user shortly after. Direct search-discoverability signal, parallel to ad CTR.
- **Missed Demand** *(new)* — searches this restaurant appeared in that did *not* convert to a view — the non-converting half of the stat above. No longer a stretch goal now that `resultRestaurantIds` exists; still worth a plain-language framing ("appeared in 40 searches for 'vegan,' clicked 6 times") rather than a raw percentage, since a low rate could just as easily be an app UI/ranking issue as a menu issue.

### F. Customer Composition
Same shape as the existing `AudienceInsights` "who's engaging" breakdowns, applied to viewers instead of ad-clickers:
- Demographic mix (age buckets)
- Dietary & allergy mix of viewers
- **Health-goal mix** *(new)* — cut/bulk/maintain/performance split tells an owner who they're actually attracting
- **Cuisine & food-tag affinity** *(new)* — "62% of your viewers list Italian as a favorite cuisine" — direct menu-idea signal

### G. Loyalty & Retention *(new category)*
- **Repeat Visit Rate** — % of viewers with >1 distinct-day view (formalizes "Repeat Visitors" as a rate, not just a count)
- **Median Days Between Visits**
- Keep everything here aggregate-only — never a per-student drill-down (see privacy note in §4)

---

## 4. Data Gaps & Open Questions

1. **No real "order/purchase" event.** `MealLogged` is the closest proxy but is self-reported and may not correspond to an actual transaction at this restaurant. UI copy must call it "Logged Meals," never "Orders" or "Sales" — matches `PRODUCT.md`'s honesty rule.
2. **Search-scoping decision: `resultRestaurantIds`, not a session link.** Recommend logging every `Search` event with the full list of restaurants returned in its results (`resultRestaurantIds`) — a child table keyed `search_id, restaurant_id`, the same shape as `ad_event_tags` in `backend.md`. This is a "search impression" log, directly parallel to how `ad_events` already separates impressions from clicks.
   - **Why this over a session link:** a session/`sessionId` link between `Search` and a later `RestaurantViewed(source='search')` only captures searches that *converted*. It can't tell you a restaurant appeared in a search and was ignored — which is exactly what "Missed Demand" needs. `resultRestaurantIds` is a superset: session-style attribution ("did this search lead to a view") is still derivable from it by joining on `userId` + a short time window after the search, with no extra field required.
   - **Cost is small**: campus-scoped search results are dozens of rows, not thousands, so the child table stays cheap — same order of magnitude as `ad_event_tags`.
   - This also unlocks **Search Impression → View Rate**, a direct discoverability metric with no ads-analytics equivalent gap.
3. **Rating scale: decided — integer 1–5.** Schema field `rating: number` constrained to whole numbers 1 through 5. Reflected in §2.2 and §3D above.
4. **Privacy**: all demographic/dietary/health-goal breakdowns are aggregate-only, same tenant-isolation posture as `backend.md` §15 — a restaurant can see "62% vegetarian" but never which student.

---

## 5. Proposed Page Structure

Following `PRODUCT.md` design principles (number-first, plain language,
mobile-first, honest-or-absent) and the layout precedent already set by
`DashboardOverview.tsx` (hero stats) and `AudienceInsights.tsx` (breakdown
sections):

1. **Hero row** — 3–4 headline numbers with trend deltas: Restaurant Views, Conversion Rate, Avg Rating, Repeat Visitor %.
2. **Traffic** — views trend chart + source mix + peak-hours heatmap (reuse the existing heatmap component).
3. **Menu Performance** — ranked table of top/bottom items by views, logs, rating (reuse `AdsTable.tsx`'s table pattern).
4. **Funnel** — 4-stage visualization with plain-language drop-off callouts ("of the students who viewed your menu, 1 in 3 opened an item").
5. **Customer Composition** — demographic / dietary / cuisine / health-goal breakdowns, reusing `AudienceInsights`' tag-bar components.
6. **Search & Demand** — top search terms, filters-used breakdown.
7. **Empty states** everywhere: e.g. *"No restaurant views yet — insights will show up once students start finding you."*

**Open naming question**: this shouldn't be called "Analytics" again since
that name is already taken by the ads tab — "Insights" is used as a working
name throughout this doc but the final label is a product call.
