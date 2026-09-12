---
name: elenchus-web-lighthouse
description: Running or interpreting a Lighthouse or axe audit on elenchus-web — the scores already measured, the CLS history, the colour-scheme and Turnstile pins that decide whether the run measures the real page, and the font experiments already tried and reverted. Load before running an audit here, before quoting a score, or before proposing a font-loading change on the strength of a calculation.
---

# Auditing elenchus-web with Lighthouse

CLAUDE.md keeps only the two setup pins and the reverted-experiment guard. The
run transcript, the scores and the reasoning live here.

Measured with Lighthouse against the local preview build: SEO,
accessibility and best-practices all **100** on `/` and `/fr/`. The run was
made to fail first — the same command scored 47 accessibility / 82 SEO on a
deliberately broken control page (no `lang`, no meta description, an
unlabelled link, an image with no alt, 1.1:1 text contrast) — so those
hundreds are a measurement rather than a tool that always says yes.

**Pin the colour scheme, or the accessibility score is about a page you did
not test.** Headless Chrome inherits macOS's appearance, and dark mode here
is 2–4 points clear of AA everywhere while light mode is where every
contrast defect this repo has ever had actually lived — so a run made in
inherited dark mode scores 100 without ever rendering the failing colours.
Pass `--chrome-flags="--blink-settings=preferredColorScheme=1"` (1 = light,
0 = dark) and confirm it took by decoding the report's `final-screenshot`:
its top-left pixel must be the light `--bg`, not `#0F1117`.

**Also pin `PUBLIC_TURNSTILE_SITE_KEY` to one of Cloudflare's published test
keys for a local Lighthouse run, not `.env.example`'s `replace-me`.** The
placeholder isn't a valid key shape, so the widget throws
`TurnstileError 400020` into the console on every load — a real error, but
one about the placeholder, not the page — which costs best-practices a
point (`errors-in-console`) and would silently mis-measure any future
Turnstile-adjacent regression as a Lighthouse false negative on this one
audit. `1x00000000000000000000AA` (Cloudflare's documented
always-passes-visible test key) renders and solves like production without
touching a real siteverify call. `.env` is gitignored, so this is a
local-only substitution, never committed.

A run of `--only-categories=performance,accessibility,best-practices,seo
--preset=desktop` against `astro preview` scores, in light mode with a
working Turnstile key: `/fr/` **100/100/100/100** (CLS ~0.006); `/`
**95/100/100/100** across three consecutive runs (CLS ~0.139) — since
sub-project 2c put the analyzer directly on `/`, that page now carries more
font-dependent content above the fold (the hero band, the notice, the form)
than `/analyze` or `/fr/` ever did, and the self-hosted fonts' `swap`
display was reflowing that stack on load. `#turnstile-container` reserves
its own box (`min-height: 65px`, Turnstile's own default "normal" size) so
the widget mounting doesn't add to that; `'DM Sans'`/`'Instrument Sans'`
moved from `font-display: swap` to `font-display: optional` in
`house.css` so neither can swap into a rendered layout after the fact
(`'Instrument Serif'` keeps `swap`, since it already carries a
metric-matched `size-adjust`/`ascent-override` fallback face for exactly
this — see that `@font-face` block's own comment). A metric-matched
fallback was tried for the two sans faces too, sized against Arial with
fontTools — it made both perf and CLS measurably *worse* (92/100, CLS
0.179) rather than better, so it was reverted rather than shipped on the
strength of the calculation alone; `font-display: optional` is the change
that was actually verified to move the score, not the one that looked
more principled on paper. axe-core reports zero violations on `/` and
`/fr/` in both colour schemes.
