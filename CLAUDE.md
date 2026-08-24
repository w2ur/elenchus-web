# CLAUDE.md — elenchus-web

## Project Overview

Static Astro site at `elenchus.untilt.app` — a paste-text version of the
[Elenchus Chrome extension](https://chromewebstore.google.com/detail/elenchus/bodfmokjnmkkdobfcnfbplnbplgdbfgl): paste any text,
get a structured analysis of its logical flaws, an overall reasoning score,
and its strengths. No backend of its own — it calls the `elenchus-proxy`
Cloudflare Worker (separate repo) over a `web` surface added specifically for
this client.

## Tech Stack

- [Astro](https://astro.build), `output: 'static'` in `astro.config.mjs` — no
  server-side runtime, no framework UI library
- Deployed on Netlify (free tier); `netlify.toml` builds with `npm run build`
  and publishes `dist/`
- Node 24 max — Netlify's build image caps there. **Never pin `.nvmrc` or
  `engines` to a newer local Node than that.**
- **Vanilla JS with JSDoc, not TypeScript.** `tsconfig.json` exists for
  editor intellisense only — there is no `typescript` package installed
  (`npm ls typescript` is empty) and `npm run build` runs `astro build`
  alone, with no `astro check` or `tsc` step. Astro's `[types] Generated`
  build line only syncs `.astro/types.d.ts` for the editor; it does not
  type-check anything. A `.ts` file in this repo would read as type-safe
  and enforce nothing — verified by injecting a type error into a `.ts`
  module and watching `npm run build` pass clean. Source files use `.js`
  with JSDoc annotations (`@param`, `@returns`, `@type`) where types add
  clarity; `src/env.d.ts` is the one exception (it must be `.d.ts` to
  augment `ImportMetaEnv`) and is itself editor-only, enforced by nothing.

## User-Facing Language

English.

## Visibility

**The owner is recommended to make this repo public.** Discoverability is the
product here — a tool nobody can find is not distributed — and on this
account branch protection is only enforceable on a public repo (private repos
403 on the branch-protection API regardless of plan). **If this repo ends up
private, every CI gate on it is advisory only, and the README must not claim
enforcement.** See the `ci-and-branch-protection` skill in `~/.claude/` for
why, before adding or changing a gate here.

## The web key is friction, not an auth boundary

`PUBLIC_ELENCHUS_WEB_KEY` (the client-side value of the Worker's
`PROXY_SHARED_SECRET_WEB`) is read into a **static** build. A static Astro
site has no server-side hiding place: whatever value this repo is given ends
up baked into public JS, readable by anyone who opens dev tools. That is
expected, not a bug to fix later.

**Nothing may be built here that assumes this key proves the caller is
Elenchus.** It only lets the Worker's rate limiter distinguish the web
surface from the extension surface for accounting — it is not
authentication and never will be, no matter how it's obfuscated, minified or
split. The actual defences against abuse of the web surface are Cloudflare
Turnstile (verified server-side, in `elenchus-proxy`) and the split
per-surface daily budget (`MAX_DAILY_REQUESTS_WEB`, also enforced server-side
in `elenchus-proxy`). Treat any design that leans on the web key for more
than that as a defect, not a hardening opportunity.

This also means: **never treat this repo's env vars as secrets.** Everything
under `PUBLIC_` in `.env.example` is meant to be public — see the comment
there before adding a new one.

`.env.example` carries exactly the two vars Netlify actually provisions for
this build: `PUBLIC_ELENCHUS_WEB_KEY` and `PUBLIC_TURNSTILE_SITE_KEY`. The
Worker endpoint (`ELENCHUS_PROXY_URL`) is deliberately **not** one of them —
it is a constant in `src/lib/config.js`, because it is public and stable and
an unprovisioned required env var is a silent production failure, not a
convenience. `src/lib/config.js` is also where the two real env vars are
read and validated — a missing one throws immediately with the name of the
variable and how to set it, rather than letting an empty `X-Elenchus-Key`
header reach the Worker and come back as an opaque 403.

## Visual identity

Mirrors `~/Dev/elenchus/sidepanel/sidepanel.css`: the same token structure
(light values on `:root`, dark values under `@media (prefers-color-scheme:
dark)`, no separate dark-mode toggle), the same font stack, the same card/
button shapes. The one deliberate difference is the accent color — the
portfolio hub assigns Elenchus the teal accent `#4F8A8B` (`src/styles/
global.css`), not the side panel's blue. Stay in that teal family; never
default to purple/violet/indigo (portfolio-wide rule).

Dark + light mode is `prefers-color-scheme` only — no toggle, matching the
extension. Footer signature "Made with care by William" →
`https://william.revah.paris` is in `src/layouts/Layout.astro`; do not
duplicate it elsewhere.

The analyzer UI (paste box, Turnstile widget, results panel, the enum clamp
on model output) lives at `src/pages/analyze.astro` and
`src/pages/fr/analyze.astro`, sharing markup and client wiring via
`src/components/Analyzer.astro`. `src/lib/clamp.js`, `src/lib/render.js` and
`src/lib/strings.js` hold the testable logic; `src/pages/index.astro`
remains a placeholder (the analyzer's own landing/home treatment is a later
task).

## Development

    npm install
    cp .env.example .env
    npm run dev

## Testing

    npm test

Vitest + jsdom, `test/*.test.js`, covering `src/lib/clamp.js`,
`src/lib/render.js` and `src/lib/errorState.js`. **The renderer never passes
model text to innerHTML unescaped** — the analysed text is adversarial by
construction (a visitor pastes text written by someone else), so the
model's JSON output is attacker-influenced. `oneOf()` clamps enum fields
(severity/score) before they reach a CSS class or a label lookup; free-text
fields are escaped or set via `textContent`, never interpolated raw.
`test/render.test.js` includes a hostile-input fixture asserting this on the
rendered DOM output, not on internal calls. There is no test runner for the
Astro pages or the client wiring in `src/components/Analyzer.astro`
themselves — `npm run build` and manual verification cover those.

### Failure-state copy

A dry per-IP bucket is the **normal** state of this service on a good day
(150 requests/day service-wide, 2 per IP) — this is a first-impression
surface for most visitors, not a rare error path. `src/lib/errorState.js`
selects and renders one of six states from the elenchus-proxy Worker's HTTP
outcome: `ip` and `service` (from the 429 body's `reason` enum, clamped
through `oneOf()`/`REASONS` with unknown values falling to `'service'` — the
safe direction, since it never tells an individual visitor "you're out" when
the whole service is), `network` (a fetch throw, or a 5xx the Worker itself
couldn't resolve — same honest-retry copy either way, since neither can be
distinguished from here), `forbidden` (403), `generic` (any other non-2xx
status) and `invalid` (a 2xx response whose body isn't the expected shape).
The `ip`/`service` copy in `src/lib/strings.js` states the real numbers (2
here, 21 in the extension) and links to the Chrome Web Store listing
(`https://chromewebstore.google.com/detail/elenchus/bodfmokjnmkkdobfcnfbplnbplgdbfgl`
— never `github.com/w2ur/elenchus`, which is private and 404s for visitors).
No percentage, no step count, no claimed wait that cannot be measured; the
"resets at 00:00 UTC" claim is stated because it is true — `currentDay()` in
`elenchus-proxy/src/rate-limiter.js` is `new Date().toISOString().slice(0,
10)`, which is UTC — not because it sounds reassuring.

**`renderFailureState()` never renders the Worker's own `error` prose.**
Every non-429 Worker error body is a fixed, always-present ENGLISH string
(`'Forbidden.'`, `'Invalid JSON body.'`, etc. — `elenchus-proxy/src/
index.js`), so a `serverMessage || T.errForbidden` pattern would make the
localized fallback unreachable whenever the Worker answers at all — an
English-only page for every French visitor who hits `forbidden` or
`generic`. `Analyzer.astro`'s `callProxy()` logs that string to the console
for developers (`console.error('[elenchus] proxy error:', ...)`) and never
passes it to `renderFailureState()`.

**Presentation follows the copy's own claim.** `ip`/`service` are the
ordinary shape of a good day, not an error, so they render with the
`.is-dry-state` CSS class — the same quiet, informational treatment
`.notice` already gives the standing free-tier disclosure, not the
alarm-red `.error-message` box — and the Retry button is hidden for both:
retrying provably cannot succeed until the day rolls over (`ip`/`service`)
or the visitor's own allowance frees up, neither of which this page
controls. `network`/`generic`/`forbidden`/`invalid` keep the alarm
treatment and Retry. See `isDryState()` in `src/lib/errorState.js` for the
full reasoning per state.

**Link/text contrast**: `--accent` (`#4F8A8B`) stays the portfolio's teal
identity, used for backgrounds/borders/buttons. Body text and links use a
separate `--link` token (`#3D6D6E` in light mode, reusing the existing
`--accent-hover` value — measured 5.82:1 on white, clearing the 4.5:1 AA
floor for 13px text; `#4F8A8B` alone measured 3.93:1, which is why it was
split out) so the extension link inside the `ip`/`service` block — the
primary call to action of the state most visitors will see — is legible.
Also applied to .btn-secondary's text (Retry/Analyze again): same 3.93:1
defect, same --link fix, since that button sits transparent directly on
--bg. Its border stays --accent (non-text UI outline, 3:1 floor, already
cleared) -- borders are not this rule's concern. Dark mode was already well
past AA/AAA throughout and is unchanged.

### Label drift-check

    npm run check:labels-sync

`scripts/check-labels-sync.sh` exits 1 when the severity/score label tables
in `src/lib/strings.js` drift from the extension's `~/Dev/elenchus/i18n/
strings.js`, and exits 2 when either file is missing or unreadable. It
compares only `severities`/`scores` in both languages — never
`freeTierNoticeText`/`freeTierNoticeLink`/`freeTierNoticeEnd`, which
deliberately diverge from the extension's wording (this site has no settings
page for the extension's link to point at) and would red on every run if
compared. **This check is advisory**: this repo has no CI yet, and per
"Visibility" above, a private GitHub repo would make any gate here advisory
regardless (branch protection 403s on private repos on this account — see
the `ci-and-branch-protection` skill).

## Build

    npm run build

Must produce **zero warnings** — no documented exceptions yet. If one becomes
necessary, it goes here with its justification, same as every other repo in
the portfolio.

## Deployment

Netlify builds and deploys automatically on push to `main`. Netlify project
creation, environment variable configuration in the Netlify dashboard, DNS
for `elenchus.untilt.app`, and the Turnstile widget setup are all the
owner's job — not something this repo's tooling does for itself.

## Secrets

No real secret has ever been committed here. `.env.example` carries
placeholders only, and per "the web key is friction, not an auth boundary"
above, none of this repo's env vars are actually secret in the first place —
they are all `PUBLIC_`-prefixed by design.
