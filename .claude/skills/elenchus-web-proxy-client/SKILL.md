---
name: elenchus-web-proxy-client
description: Editing src/lib/proxyClient.js in elenchus-web, or judging which of its two 2xx guards can be simplified away — the incident where an empty object reached the success path and the page asserted "No reasoning flaws detected", and the measurement showing which guard actually carries the guarantee. Also the failure states — errorState.js's mappings, the numbers the ip/service copy states, the dry-state presentation and Retry split, the two Turnstile failure modes, and why the three state panels are polite live regions. Load before touching the success path, looksLikeAnalysis, or the JSON parse branch, and before editing errorState.js, failure-state copy in strings.js, or the state panels in Analyzer.astro.
---

# Why an unparseable 2xx is a failure here

CLAUDE.md carries the rule. This file carries the incident it came from and the
measurement that says which of the two guards is load-bearing.

**`src/lib/proxyClient.js`: an unparseable or wrong-shaped 2xx is a
failure, never a result.** This is the highest-stakes branch in the repo.
It once did `let data = {}` before `await response.json()` and swallowed
the parse error, so `{}` reached the success path (`response.ok` passed,
`typeof {} === 'object'` passed) and the page rendered an empty summary, an
"unknown" badge and the `#no-flaws` block — green text reading "No
reasoning flaws detected." A Cloudflare interstitial or any CDN error page
therefore made a reasoning-analysis tool **assert the opposite of the
truth**, confidently. Two guards stand there now, but only one is
load-bearing: the shape check (`looksLikeAnalysis`, checking `summary` a
string and `flaws` an array — `{}`, `null` and `[]` all pass a bare
`typeof === 'object'`) is what actually carries the guarantee. The parse
branch on a 2xx is defense in depth, not a second independent guard —
measured by deleting it (keeping `let data;` and an empty catch): the suite
still passes clean, because a caught parse leaves `data === undefined`, which
`looksLikeAnalysis` rejects just the same. Removing `looksLikeAnalysis`
alone, by contrast, reds 3 tests. It stays in the code anyway — it costs
nothing and a future contributor should not have to prove the shape check
is sufficient before trusting it. A parse failure on a **non**-2xx keeps
selecting from the status instead, so a 503 interstitial still reads as
`network` rather than the vaguer "unexpected response" — that half of the
branch is not redundant, since `looksLikeAnalysis` never runs on that
path.

## Failure states: mappings, presentation, Turnstile, live regions

Moved from CLAUDE.md, which keeps the guards (a dry bucket is the normal
state, never render the Worker's prose, `isDryState()`/`canRetry()` stay
apart, the two Turnstile modes never share copy, polite live regions).
`src/lib/errorState.js`'s `FAILURE_STATES` is the enumeration; this is why
each state behaves as it does.

A dry per-IP bucket is the **normal** state of this service on a good day
(150 requests/day service-wide, 2 per IP) — this is a first-impression
surface for most visitors, not a rare error path. `src/lib/errorState.js`
selects and renders the failure states, enumerated once in
`FAILURE_STATES` so tests iterate the enum rather than a hand-copied list —
read it there. Only the non-obvious mappings need stating here: an unknown
429 `reason` falls to `'service'`, the safe direction, since it never tells
one visitor "you're out" when the whole service is; `network` covers both a
fetch throw and a 5xx the Worker itself couldn't resolve, which cannot be
told apart from here; `invalid` is returned by `proxyClient.js` directly,
never by `selectFailureState()`; and two states are raised before any
request is made — see "The Turnstile challenge has two failure modes"
below.
The `ip`/`service` copy in `src/lib/strings.js` states the real numbers (2
here, 21 in the extension) and links to the Chrome Web Store listing
(`https://chromewebstore.google.com/detail/elenchus/bodfmokjnmkkdobfcnfbplnbplgdbfgl`
— never `github.com/w2ur/elenchus`, which is private and 404s for visitors).
No percentage, no step count, no claimed wait that cannot be measured; the
"resets at 00:00 UTC" claim is stated because it is true — `currentDay()` in
`elenchus-proxy/src/rate-limiter.js` is `new Date().toISOString().slice(0,
10)`, which is UTC — not because it sounds reassuring.

Presentation follows the copy's own claim. `ip`/`service` are the
ordinary shape of a good day, not an error, so they render with the
`.is-dry-state` CSS class — the same quiet, informational treatment
`.notice` already gives the standing free-tier disclosure, not the
alarm-red `.error-message` box — and the Retry button is hidden for both:
retrying provably cannot succeed until the day rolls over (`ip`/`service`)
or the visitor's own allowance frees up, neither of which this page
controls. `network`/`generic`/`forbidden`/`invalid` keep the alarm
treatment and Retry.

**Presentation and Retry are two separate questions**, answered by
`isDryState()` and `canRetry()` respectively. They used to be one function,
and `turnstileBlocked` is what pulled them apart: a genuine problem that
belongs in the alarm treatment, but one no retry can fix. Do not fold them
back together.

**The Turnstile challenge has two failure modes and they must not share
copy.** If `challenges.cloudflare.com` is blocked (uBlock Origin, Firefox
strict mode, a corporate proxy), no widget renders — so "please complete
the verification challenge", plus a Retry button, names an action the
visitor cannot take and a retry that cannot work. That was the one piece
of copy here promising the unmeasurable, which is the rule the rest of the
copy obeys. The two are told apart by Turnstile's own hidden
`cf-turnstile-response` input, which exists only once the widget has
rendered: **`null` → `turnstileBlocked`** (no challenge on the page; honest
copy naming the blocker, a link to the extension, no Retry) and **`''` →
`turnstileUnsolved`** (the widget is there and unsolved; the original copy,
Retry offered). The claim that the extension needs no challenge is a fact,
not reassurance — the Worker makes zero siteverify calls on the extension's
path, an invariant pinned by a call counter in
`elenchus-proxy/test/turnstile.test.js`.

**The three state panels are live regions.** `#loading-state` and
`#error-state` carry `role="status"`, `#result-state` carries
`aria-live="polite" aria-atomic="false"`. Without them a screen-reader user
gets silence on every outcome — including the dry-state message, which is
the ordinary result here, not an edge case. Polite and not `role="alert"`
on purpose: an assertive interruption for `ip`/`service` would contradict
the deliberately quiet visual treatment in the one channel that cannot see
it. `aria-atomic="false"` on the result panel because an analysis can be
long, and atomic would re-read the whole thing as one block.
