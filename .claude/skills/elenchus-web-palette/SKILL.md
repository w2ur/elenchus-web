---
name: elenchus-web-palette
description: Changing an accent, link or badge colour in elenchus-web, or adding a new filled control — the measured contrast ratios behind --accent/--link/--on-accent/--band, why the fill/text split exists, and the retired teal family a regression must not reintroduce. Also the house shell itself — the house.css/global.css split and the @geometry block, the contour bloom (.is-settled, vector-effect), the header's tool-chrome contract, the self-hosted @font-face rules and their public/_headers cache rule, and vite.build.cssTarget. Load before editing a colour token in src/styles/global.css or src/styles/house.css, before touching the bloom, HouseHeader.astro, ToolNav.astro, public/fonts/ or public/_headers, or before reading the numbers out of test/houseShell.test.js.
---

# The elenchus-web palette, and why each value is what it is

CLAUDE.md keeps the two rules a session must see unprompted (a fill takes
`--on-accent`; `--accent` as text is a bug). `test/houseShell.test.js` is the
source of truth for every number — what follows is why they are those numbers.

**Link/text contrast**: `--accent` moved to `#1E7A76` light / `#5FC2BC` dark
(pushed a step darker/further from the retired `#4F8A8B` family so a fill
carrying white clears 3:1 with margin), and every fill now pairs with a
scheme-paired ink token, `--on-accent` — white in light, `#0F1117` in dark —
instead of a bare `#fff`, because the dark accent goes pale enough that white
on it is only 2.12:1 (`.btn-primary`'s old dark-mode override existed for
exactly this and is gone now that `--on-accent` does it generically).
`--accent` is legal as a **fill**: white on it measures 5.12:1 in light,
`#0F1117` on it 8.92:1 in dark. As **text** it is not: 4.86:1 on the
page and 3.73:1 on its own `/20` tint, both under the 4.5:1 AA floor — so
text still takes `--link`, now `#176763` light / `#5FC2BC` dark, with
`--link-hover` at `#0F5552` light / `#7FD0CB` dark. `--accent-hover` also
moved to `#176763` light / `#7FD0CB` dark, doubling as `--band` (the
ToolHero fill, scheme-**invariant** — always `#176763` — so the shell's
`--hero-fg`/`--hero-muted` are legal on it in both schemes: 6.65:1 and
5.08:1). All of it is pinned in `test/houseShell.test.js`, including the
retired `#4F8A8B`/`#3D6D6E`/`#6FB3B4`/`#8EC4C5` family failing the same 4.5:1
sum, so a regression can't silently reintroduce it. Also applied to
`.btn-secondary`'s text (Retry/Analyze again), which sits transparent
directly on `--bg` — its border stays `--accent` (non-text UI outline, 3:1
floor, already cleared) — borders are not this rule's concern.

`.house-tool` (the "Elenchus" half of the header wordmark) follows the same
rule, and is the reason the rule needs restating: adopting the house `--bg`
`#F8F9FB` moves every `--accent`-on-background pair down a notch. **Any new
use of `--accent` as text is a bug** — it has never cleared AA in light mode
on any background this site uses. Reach for `--link`. The general ink rule
this section pins: **a fill takes `--on-accent`, never a bare white or a
bare ink** — the fill's own scheme decides which one is legal, and only
`--on-accent` tracks that automatically (status badges pair their own ink
per scheme, pinned in `houseShell.test.js`).

## The house shell: stylesheets, bloom, header, fonts

Moved from CLAUDE.md, which keeps the guards (read `house.css`'s header first,
the `@geometry` block is byte-identical, no shell token in `global.css`,
`.is-settled` unapplied and `vector-effect` load-bearing on purpose, a
replaced font gets a new filename). What follows is the detail behind them.

Two stylesheets, and the split is the point. `src/styles/house.css` is the
Untilt house shell — fonts, surfaces, the `.house` lockup and the contour
bloom — an **adapted copy** of `untilt/client/src/styles/house.css`. Read its
header before touching it: it names the two things that deliberately differ
(dark mode here is `prefers-color-scheme` for the system default, plus
`:root.light`/`:root.dark` classes set by the theme toggle for an explicit
choice — a third mechanism, distinct from untilt's `.dark`-only class; the
chapeau furniture is omitted) and records why there is no `sync-house.sh`.
One block breaks that "adapted, not verbatim" rule on purpose: the
`/* @geometry */` `:root` rule, declared after the lockup rules, holds the
shell-geometry tokens (see the block itself in `house.css` for the current
set — not restated here, because a token added or removed there would make
a hand-typed list here go stale silently) copied byte-identical from
untilt's `house.css`, because the numbers are the whole point and a
transform here would be the drift the rest of the file exists to avoid
(contract §8). `test/houseShell.test.js` derives each token's name from the
block itself and asserts it is actually referenced somewhere, rather than
hand-typing that list either. The header rule just above it is split in two:
`.house-bar` is the full-width sticky strip that paints the surface
and draws the hairline, and `.house` is its inner row — a `--col`-wide
flex line holding the lockup — so the wordmark lines up with the page
content instead of the viewport edge. `HouseHeader.astro` nests them
`<header class="house-bar"><div class="house">…`.
`src/styles/global.css` imports it and holds only what is Elenchus's own —
the teal accent and the severity/score scale. A shell token re-declared in
`global.css` would win on source order and diverge silently, so
`test/houseShell.test.js` fails if one appears there.

`astro.config.mjs` pins `vite.build.cssTarget` to Tailwind v4's browser floor
(Safari 16.4 / Chrome 111 / Firefox 128) — the same target untilt sets, for
the same reason (an old target makes Lightning CSS fold a modern color
function into an opaque pre-target fallback), even though nothing here
triggers it yet, since `--tint`'s `color-mix()` wraps a `var()` Lightning CSS
can't fold regardless of target.

The wait is the contour bloom, not a spinner. `#loading-state` in
`Analyzer.astro` carries five `.house-bloom-ring` paths, byte-identical to
untilt's `ContourBloom.tsx` and the extension's `sidepanel.html`. It loops and
never fills — no percentage, no bar, no step count, because nothing about this
wait is measurable. Two things about it that look like oversights:

- **`.is-settled` is defined and never applied here.** Wiring it would put a
  700ms gate on the result path — the highest-stakes branch in this repo and
  the one with no automated coverage — to delay a result the visitor waited a
  minute for. The rules stay in the copy because divergence between the three
  copies is the failure mode this arrangement guards against.
- **`vector-effect: non-scaling-stroke` is load-bearing.** `stroke-width`
  otherwise resolves in viewBox user units and scales down with the SVG — a
  400-unit viewBox at 64px turned 1.5 into a 0.24px haze upstream. Removing it
  here reproduces that: 2012 painted pixels against the real 4818.

The header (`.house-bar > .house` — the full-width sticky bar wrapping the
`--col` inner row, rendered by `src/components/HouseHeader.astro`, not
`Layout.astro` — the layout only mounts it) follows the suite's tool-chrome
contract (`docs/house-contract.md` in the untilt repo, §1): lockup · nav ·
theme · language, in that fixed order, with the language toggle living in
the header itself rather than only in the footer. The wordmark links to
`houseUrl` in `src/lib/strings.js` (`https://untilt.app/` for English,
`https://untilt.app/fr/` for French — a real prerendered page on the
chapeau, not a language guess); the other-language link (header and footer
both) is derived by `src/lib/twin.js`'s `twinFor(lang, path)`, so the two
can't disagree about where it points. `src/components/ToolNav.astro` is the
three-item nav — Analyse, Bookmarklet, Extension — and doubles as the
mobile bottom bar (§6): one `<nav>` carries both `.tool-nav` and
`.tool-nav-bar`, and CSS alone decides which look applies at a given width
(see that file's comment for why, and `test/houseShell.test.js`'s "the
contract header" for the pin). Instrument Sans (headings, the header) and
DM Sans (body) are self-hosted from `public/fonts/` rather than linked from
fonts.googleapis.com — a render-blocking Google Fonts request measured
Lighthouse performance at 94/100, against a >=95 gate; self-hosting with
`font-display: swap` restored 100/100. The three `@font-face` rules live in
`src/styles/house.css`, since untilt self-hosts the same files
under the same names and they are part of the shared shell. **They are
byte-identical across the two repos today** — verified by md5 against
`untilt/client/public/fonts/` — but like the surface tokens above they are
hand-copied with no cross-repo drift check, so a re-subset on either side is
invisible to the other.

**Self-hosting also moved the caching onto us.** Astro fingerprints
`_astro/*`, but `public/fonts/*.woff2` are copied through unhashed, so under
Netlify's default `cache-control: public,max-age=0,must-revalidate` all
three files revalidated on every navigation — where fonts.gstatic.com had
served them `immutable` for a year. `public/_headers` sets `/fonts/*` to
`max-age=31536000, immutable`; because the filenames are not fingerprinted,
**replacing a font means a new filename, not new bytes at the old one**.
That header only exists at the Netlify edge — `astro preview` does not apply
`_headers`, so verify it after a deploy with `curl -I
https://elenchus.untilt.app/fonts/dm-sans-latin.woff2`, never locally.
