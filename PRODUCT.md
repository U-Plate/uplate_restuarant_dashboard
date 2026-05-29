# Product

## Register

product

## Users

Independent **restaurant owners** operating near a university campus (Purdue / Boiler Bowl Co. is the canonical tenant in `backend.md`). They sign up with a single-use access code issued by UPlate operators and run their own ads on the UPlate consumer app — both the home screen and dining-hall menu surface.

Operator context:

- **Time-poor, multi-tasking.** Checks the dashboard between services, often from a phone, sometimes outside in daylight.
- **Low marketing literacy.** Comfortable with "campaign", "ad", "active/paused". Less comfortable with "CTR", "impressions as a series", "audience cohort". Will not read tooltips.
- **Single primary question:** *"Is it working, and what do I do next?"* Every page should answer that before it answers anything else.
- **Trust is fragile.** They are spending money they could be spending on labor or food. Honest, plain numbers build trust; aspirational charts destroy it.

## Product Purpose

A self-serve console for restaurants advertising on UPlate. Operators use it to:

1. Create and schedule campaigns; group ads under them.
2. Target ads by audience tags (`highProtein`, `postWorkout`, etc.), dietary rules, food interests, allergen exclusions, time-of-day, and day-of-week.
3. Measure what happened: impressions, clicks, CTR, audience composition of clickers, time-of-day patterns.
4. Adjust — pause, duplicate, retarget — without a meeting with a UPlate rep.

Success looks like an owner opening the dashboard, getting their answer in ten seconds, and either closing the tab or making one confident edit. Not a session-length metric.

## Brand Personality

**Confident operator.** Plain-spoken, no jargon, no hype. The dashboard should read like a tool a small-business owner trusts — closer in spirit to Mercury or Linear than to a stock SaaS console, but warmer than either.

Three words: **plain, honest, calm.**

Voice rules:

- Speak like the operator speaks. "12 clicks yesterday" beats "Daily click volume: 12."
- Never sell. The owner already bought.
- No hype copy in empty states. "No ads in this campaign yet — add one when you're ready" is the right register; "Unleash your first campaign!" is not.
- Numbers are the headline. Labels are footnotes to numbers, never the other way around.

## Anti-references

Three patterns to refuse on sight. If a proposal looks like one of these, rebuild it.

1. **Generic SaaS dashboard.** Blue/grey sidebar, gradient hero-metric tiles, identical icon+heading+text card grids, Inter-everything, "Welcome back, {name}" hero. This is the dashboard's current risk and the thing the redesign exists to escape.
2. **Crypto / fintech overstimulation.** Animated gradients, neon glows, glassmorphism cards, aspirational big-number tickers. Wrong tone for an owner checking yesterday's 14 clicks; reads as untrustworthy.
3. **Stripped enterprise admin.** Pure greyscale, dense tables only, no personality, intimidating empty states. Owners will read it as "not for me" and bounce.

The dashboard sits in the negative space between these three: warmer than enterprise, quieter than crypto, more opinionated than generic SaaS.

## Design Principles

1. **The number is the headline.** Every screen leads with the answer to "is it working?" Chrome, navigation, filters, and decoration come after. If a screen has more than three pieces of chrome above its primary number, the screen is wrong.
2. **Plain words, not platform vocabulary.** Use language a restaurant owner uses. Expose jargon (CTR, impressions, cohort) only with a plain-language anchor the first time it appears on a page, never as the only label. Drop terms that don't earn their place.
3. **Quiet by default, warm at the seams.** The chrome stays restrained and trustworthy. Personality lives in copy, empty states, status badges, and small interaction moments — never in gradient backgrounds, neon accents, or decorative motion.
4. **Built for a phone in daylight.** Mobile is not a courtesy. Body text, numbers, and contrast must survive small screens, sunlight, and a one-handed glance. If a layout only works on a 27" monitor, it's a desktop feature, not the default.
5. **Honest or absent.** No placeholder metrics, no seeded PRNGs masquerading as audience data, no "AI insights" inferred from nothing. When there's no signal yet, the UI says so plainly. The backend contract (`backend.md`) already moved click-audience signals to real per-event aggregation; the front end must hold that line everywhere else.

## Accessibility & Inclusion

- **WCAG 2.2 AA across every screen.** Body text contrast ≥ 4.5:1, large text ≥ 3:1, non-text UI elements ≥ 3:1, visible focus on every interactive element, full keyboard reachability.
- **`prefers-reduced-motion` respected.** No motion that conveys information should be the only way to convey it; reduced-motion users see the same content statically.
- **Status is never color-only.** `active` vs `paused`, CTR up vs down, and any "alert" surface must carry a label, icon, or shape in addition to color. Treat this as a hard rule even though it isn't explicitly called out by WCAG AA — it's load-bearing for an analytics tool.
- **Touch targets ≥ 44×44 px.** Owners may interact one-handed on a phone between tickets.
- **Plain-language errors.** Error copy must tell the operator what to do next, in their words. "Couldn't save — your end date is before your start date. Pick an end date after {startDate}." not "422 validation_failed".
