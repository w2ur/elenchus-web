---
name: elenchus-web-proxy-client
description: Editing src/lib/proxyClient.js in elenchus-web, or judging which of its two 2xx guards can be simplified away — the incident where an empty object reached the success path and the page asserted "No reasoning flaws detected", and the measurement showing which guard actually carries the guarantee. Load before touching the success path, looksLikeAnalysis, or the JSON parse branch.
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
