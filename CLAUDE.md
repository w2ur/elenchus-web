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

Two stylesheets, and the split is the point. `src/styles/house.css` is the
Untilt house shell, an **adapted copy** of
`untilt/client/src/styles/house.css` — read its header before touching it.
Its `/* @geometry */` `:root` block is the one exception: copied
byte-identical from untilt, never transformed. `src/styles/global.css` holds
only what is Elenchus's own — the teal accent and the severity/score scale;
a shell token re-declared there fails `test/houseShell.test.js`.

**The house shell's measured details live in the `elenchus-web-palette`
skill: load it before touching `house.css`'s contour bloom or `@font-face`
rules, `public/_headers`, the header's tool-chrome contract, or
`vite.build.cssTarget`.** Two of them look like oversights and are not:
`.is-settled` is defined and deliberately never applied here, and
`vector-effect: non-scaling-stroke` on the bloom rings is load-bearing.

The surface tokens carry both the **names and the values** of the Untilt
house shell in `untilt/client/src/styles/house.css`, so the two files can be
read against each other by eye. `test/houseShell.test.js` pins them, so that
`elenchus.untilt.app` reads as one product with `untilt.app`; there is no
cross-repo drift check, so a rename on either side is invisible to the other
suite and each copy pins itself. The
severity/score scale is copied verbatim from `~/Dev/elenchus/sidepanel/
sidepanel.css` instead, and must not be folded into the house surface
tokens — they are semantic status colours, not the house shell. The one
deliberate difference from the house is the accent colour — the portfolio
hub assigns Elenchus the teal accent `#1E7A76` (`src/styles/global.css`),
not `untilt.app`'s blue-grey. Stay in that teal family.

The header follows the suite's tool-chrome contract (lockup · nav · theme ·
language, in that fixed order). The self-hosted fonts are hand-copied from
untilt with no cross-repo drift check. **Replacing a font means a new
filename, not new bytes at the old one**, and the `/fonts/*` cache header
exists only at the Netlify edge — verify it after a deploy, never locally.

Dark/light/system is a three-state toggle (`src/lib/theme.js`, mounted via
`src/components/ThemeToggle.astro`): 'system' is the absence of a class on
`<html>` and falls through to `prefers-color-scheme`; an explicit 'light' or
'dark' choice sets that class, persisted under the `elenchus:theme`
localStorage key and applied by an `is:inline` script that must stay the
first child of `<head>` in `Layout.astro`, before the `global.css` import's
output, so the stored choice never flashes the wrong scheme (pinned by
`test/houseShell.test.js`). Footer signature "Made with care by William" →
`https://william.revah.paris` is in `src/layouts/Layout.astro`; do not
duplicate it elsewhere.

The front page (`src/pages/index.astro` + `src/pages/fr/index.astro`) IS the
analyzer: `<ToolHero>` (band, title, the "does not
fact-check" lede, chips), then `<Analyzer>` (paste box, Turnstile widget,
results panel, the enum clamp on model output), then `<Landing>` (the
remaining ways-to-use-it / what-you-get / limits / privacy content).
`src/pages/analyze.astro` and `src/pages/fr/analyze.astro` still exist —
`test/configFailLoud.test.js` hard-codes them as the build-time env gate —
but now carry a `noindex` meta and a forced Netlify 301 to the front page
(`netlify.toml`); they compose the same `Analyzer` component with no
`ToolHero` above it. The bookmarklet install page is
`src/pages/bookmarklet.astro` + `src/pages/fr/bookmarklet.astro` over
`src/components/BookmarkletInstall.astro`, and its built `javascript:` URL
now targets the front page, not `/analyze`. `src/lib/clamp.js`,
`src/lib/render.js`, `src/lib/strings.js` and `src/lib/emTitle.js` (the hero
title's one-emphasised-word marker) hold the testable logic. **A hero band
goes in `Layout.astro`'s `<slot name="band" />`** (`<ToolHero slot="band">`),
which renders between the header bar and `<main>` so the band bleeds to the
viewport edge and carries the `--col` column inside itself — rendered in
`<main>` instead it is boxed at the column's width with the page's own top
padding above it.

**The front page says "it does not fact-check" before it says anything
about how to use the tool.** Every reasoning tool gets mistaken for a
fact-checker, and a visitor holding that expectation reads a good score on a
well-argued falsehood as a defect rather than as the tool doing its job.
That claim is `ToolHero`'s lede (`pageCopy.js`'s `heroLede`) — it is the
page's load-bearing claim and sits above the paste box, before any call to
action; do not demote it below one. `Analyzer.astro`'s own `<h1>`/subtitle
are suppressed on the front page (`showHeading={false}`) precisely so this
lede is the thing a visitor reads first, not a second heading repeating the
same claim in shorter form right below it.

**Running Lighthouse here: load the `elenchus-web-lighthouse` skill** — it
holds the scores, the CLS history and the experiments already tried. Two
things that will silently mis-measure the page if skipped: pin the colour
scheme with `--chrome-flags="--blink-settings=preferredColorScheme=1"`
(headless Chrome otherwise inherits macOS's appearance, and light mode is
where every contrast defect here has lived), and set
`PUBLIC_TURNSTILE_SITE_KEY` to Cloudflare's `1x00000000000000000000AA` test
key, never `.env.example`'s `replace-me`, which throws `TurnstileError
400020` and costs a best-practices point. `'DM Sans'`/`'Instrument Sans'` use
`font-display: optional`, not `swap` — a metric-matched fallback was measured
worse and must not be re-proposed on the strength of the calculation alone.

Two copy files, two jobs. `src/lib/strings.js` is the analyzer UI's
strings — labels, failure states, and the severity/score tables a
drift-check compares against the extension. `src/lib/pageCopy.js` is prose
for content pages, both languages side by side so a paragraph cannot be
rewritten in one and forgotten in the other. Page prose has none of
`strings.js`'s obligations and does not belong there.

**Every claim on the install page about where the bookmarklet runs is a
measured claim.** Ran on github.com, lemonde.fr and
chromewebstore.google.com; did nothing on `chrome://settings`. Firefox,
Safari and Chrome's PDF viewer were not tested, and the page says so rather
than guessing. Do not add a failure case to that list without measuring it,
and do not remove the untested disclaimer without testing.

**Canonical and hreflang come from one `path` prop** on `Layout.astro`: pass
the page's ENGLISH path with its trailing slash (`/`, `/analyze/`,
`/bookmarklet/`) and the French twin is derived as `/fr` + that. Deriving it
is what stops the two languages disagreeing about each other's URL, the usual
way hreflang goes wrong. Omitting `path` skips the whole block rather than
emitting a wrong one. English is `x-default`.

## The bookmarklet handoff

The bookmarklet is not a file that ships: `src/lib/buildBookmarklet.js`
bundles `src/lib/bookmarkletSource.js` with esbuild **at build time** and the
install page renders the result as a `javascript:` link. That is what keeps
one source of truth — `src/lib/extract.js` (what text to send) and
`src/lib/handoff.js` (the protocol) are imported by both the bookmarklet and
this site's own client script. A hand-minified literal would drift the first
time either changed, silently, on someone else's page.

**A Content-Security-Policy does not block it — that was measured, and it
overturned the design's original premise.** On 2026-08-28 a real bookmark
ran on github.com, whose `script-src` carries no `'unsafe-inline'`. Chrome
implements the CSP 1.0 carve-out for user-supplied scripts: a bookmarklet
body executes with CSP ignored. **CSP still governs anything a bookmarklet
injects** — a created `<script>`, an `eval`, a remote resource. That is the
live constraint on `src/lib/bookmarkletSource.js`: it injects nothing and
evals nothing, and adding either would reintroduce a silent, unreportable
failure on exactly the strict sites it now reaches.

CSP 1.1 made that carve-out optional rather than required, so it is a
per-browser fact and not a guarantee — Firefox carried a long-standing bug
where CSP did break bookmarklets, and Safari is unverified here. Claim on
the install page only what has been measured.

**Transport: `window.open` + `postMessage` primary, URL fragment fallback** —
no `Cross-Origin-Opener-Policy` was found on any news or opinion site
sampled, nor on this site. postMessage keeps the reader's text out of the address bar, history
and any link they might share, and has no length ceiling. The fragment is
what survives a severed opener (COOP) or a popup blocker; it is capped at
`MAX_TEXT_LENGTH` and **flags its own truncation in the URL**, because on
that path the box arrives exactly at the cap and the character counter alone
would read as a coincidence rather than a cut.

Two rules in `src/lib/handoff.js` that look like oversights and are not:

- The text leg posts to an **exact target origin**, never `'*'` — it carries
  the reader's content.
- The receiving page checks `event.source === window.opener` and
  **deliberately does not check the sender's origin**: the opener is
  whatever site the reader was on, so there is no origin to allowlist. The
  text is adversarial by construction on both paths and takes the same
  escaped, enum-clamped route through `render.js` as anything pasted by hand.

The fragment is erased with `history.replaceState` the moment it is read. A
fragment never reaches a server, but it is shareable, and the reader did not
choose to put an article into a link.

`src/lib/limits.js` holds `MAX_TEXT_LENGTH`/`MIN_TEXT_LENGTH` — the mirror of
the Worker's own two constants — because the paste box, the bookmarklet and
the fragment now all enforce the same cap. Three hand-copied caps would be
three chances to drift.

**Both transports are verified in a real browser, because vitest cannot reach
either of them** — the receiving code lives in `Analyzer.astro`'s client
`<script>`, which no test in `test/` imports. Verified against the local
`astro preview` build in Chrome: the fragment path fills the box and leaves
`location.hash` empty (`history.replaceState` ran), a plain `#section-2`
anchor fills nothing, the postMessage handshake completes cross-tab from an
opener page, and a well-formed `elenchus-text` message posted from a source
that is **not** the opener is ignored. Repeat that shape after any change to
`handoff.js` or the component's client script; a green `npm test` says
nothing about it.

`buildBookmarklet()` resolves its entry file from `process.cwd()`, **not**
from `import.meta.url`. Astro bundles page frontmatter into
`dist/.prerender/chunks/` before running it, so `import.meta.url` points into
the build output where the source does not exist — the build fails with
"Could not resolve dist/.prerender/chunks/bookmarkletSource.js". Consequence:
the build must run from the project root, which `npm run build` and Netlify
both do; there is an `existsSync` check that says so if it ever does not.

`buildBookmarklet()` **fails the build** if the encoded URL passes
`MAX_BOOKMARKLET_LENGTH` (`src/lib/buildBookmarklet.js` owns the number, and
the error prints both it and the actual length). That budget is
deliberately far below any browser's real bookmark limit — raise it only
against a measurement, never to make a bigger bookmarklet fit. It is also why
Readability.js is not inlined: 43 KB encoded, in a disputed band for Firefox.
That size argument is the whole case: CSP does not block the bookmarklet on
those sites, as measured above.

## Development

    npm install
    cp .env.example .env
    npm run dev

## Testing

    npm test

Vitest + jsdom, `test/*.test.js` — `ls test/` is the inventory; most files
pin one `src/lib/` module, the rest (`configFailLoud`, `houseShell`,
`analyzerLiveRegions`) pin structure. `test/buildBookmarklet.test.js` carries
`// @vitest-environment node` at the top: esbuild's own entry point does not
run under jsdom.

`test/extract.test.js` runs against real DOM trees built in jsdom, never
against stubbed queries: the extraction heuristic **is** its interaction
with a document, and a test that mocked `querySelectorAll` would stay green
on a heuristic that returns the navigation bar.
**The renderer never passes model text to innerHTML unescaped** — the
analysed text is adversarial by construction (a visitor pastes text written
by someone else), so the model's JSON output is attacker-influenced.
`oneOf()` clamps enum fields (severity/score) before they reach a CSS class
or a label lookup; free-text fields are escaped or set via `textContent`,
never interpolated raw. `test/render.test.js` asserts this on the rendered
DOM output, not on internal calls, for **every** free-text field —
`type`, `quote`, `explanation`, `strengths` and `summary`.

**Never prove escaping with a `textContent` read.** `textContent` reads
back identically whether a field was written with `textContent` or with
`innerHTML`, so an assertion like `expect(summaryEl.textContent).toBe(prose)`
passes on both — which is how `summary` reached a final review as the one
free-text field with no hostile-input test, on a suite that was green with
`render.js` mutated to `innerHTML` and a live `<img onerror>` in the DOM.
Assert on a **live-element** check (`querySelector('img')` is null) and on
the escaped markup (`innerHTML` contains `&lt;img`, not `<img`). The same
rule killed an earlier assertion: `not.toContain('onerror')` is worthless,
because the word `onerror` survives escaping legitimately.

There is no test runner for the Astro pages themselves, so anything in
`src/components/Analyzer.astro`'s client `<script>` is unreachable by
`npx vitest run` — which is why the Worker call lives in
`src/lib/proxyClient.js` and not inline in the component. Keep logic on
that side of the line.

**`src/lib/proxyClient.js`: an unparseable or wrong-shaped 2xx is a
failure, never a result.** This is the highest-stakes branch in the repo — a
Cloudflare interstitial or any CDN error page reaching the success path makes
a reasoning-analysis tool **assert the opposite of the truth**, confidently.
`looksLikeAnalysis` (summary a string, flaws an array — `{}`, `null` and `[]`
all pass a bare `typeof === 'object'`) is the load-bearing guard; the parse
branch on a 2xx is defence in depth, not a second independent one. A parse
failure on a **non**-2xx keeps selecting from the status, so a 503
interstitial still reads as `network`. The incident behind the rule and the
measurement of which guard actually carries it are in the
`elenchus-web-proxy-client` skill — load it before simplifying either guard.

### Failure-state copy

**The build-time fail-loud gate is the frontmatter imports of
`src/lib/config.js` and nothing else.** `config.js` throws at module scope
for a missing `PUBLIC_` var, and that fails `astro build` only because the
index and `/analyze` pages in both languages import it in **frontmatter**
(which runs in Node at build time). The client gets config through
`data-*` attributes, so nothing else imports the module — remove those
imports and the build goes green with the env completely unset, shipping a
site broken for every visitor. `npm run build` cannot catch that by
construction, and there is no type-checker here.
`test/configFailLoud.test.js` is the pin: it asserts each import is a real
`import` statement **inside the frontmatter fence** (not in a client
script, not in a comment), and that importing `config.js` with a var unset
actually throws and names it.

**A dry per-IP bucket is the normal state of this service, not a rare error
path.** `src/lib/errorState.js` enumerates the failure states once in
`FAILURE_STATES` — read them there. **Editing `errorState.js`, the
failure-state copy in `strings.js`, or the three state panels in
`Analyzer.astro`: load the `elenchus-web-proxy-client` skill** — it holds
the non-obvious state mappings, the numbers the copy states, the dry-state
presentation, the Turnstile split and the live-region choices.

**`renderFailureState()` never renders the Worker's own `error` prose.**
Every non-429 Worker error body is a fixed, always-present ENGLISH string
(`'Forbidden.'`, `'Invalid JSON body.'`, etc. — `elenchus-proxy/src/
index.js`), so a `serverMessage || T.errForbidden` pattern would make the
localized fallback unreachable whenever the Worker answers at all — an
English-only page for every French visitor who hits `forbidden` or
`generic`. `Analyzer.astro`'s `callProxy()` logs that string to the console
for developers (`console.error('[elenchus] proxy error:', ...)`) and never
passes it to `renderFailureState()`.

Guards from that skill a session must see unprompted: `isDryState()` and
`canRetry()` answer two separate questions — do not fold them back
together; the two Turnstile failure modes (`turnstileBlocked`,
`turnstileUnsolved`) must not share copy; the three state panels are polite
live regions, never `role="alert"`.

**A fill takes `--on-accent`, never a bare white or a bare ink** — the fill's
own scheme decides which is legal, and only `--on-accent` tracks that
automatically (status badges pair their own ink per scheme). **Any new use of
`--accent` as text is a bug**: it has never cleared AA in light mode on any
background this site uses — reach for `--link`. Borders are not this rule's
concern (3:1 non-text floor, already cleared). Every value and every retired
colour is pinned in `test/houseShell.test.js`; read the numbers there, and
load the `elenchus-web-palette` skill before changing one.

### Label drift-check

    npm run check:labels-sync

`scripts/check-labels-sync.sh` exits 1 when the severity/score label tables
in `src/lib/strings.js` drift from the extension's `~/Dev/elenchus/i18n/
strings.js`, and exits 2 when either file is missing or unreadable. It
compares only `severities`/`scores` in both languages — never
`freeTierNoticeText`/`freeTierNoticeLink`/`freeTierNoticeEnd`, which
deliberately diverge from the extension's wording (this site has no settings
page for the extension's link to point at) and would red on every run if
compared. **This check is advisory** — this repo has no CI yet, and see
"Visibility" above before adding a gate.

## Build

    npm run build

## Deployment

Netlify builds and deploys automatically on push to `main`. Netlify project
creation, environment variable configuration in the Netlify dashboard, DNS
for `elenchus.untilt.app`, and the Turnstile widget setup are all the
owner's job — not something this repo's tooling does for itself.
