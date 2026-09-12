---
name: elenchus-web-palette
description: Changing an accent, link or badge colour in elenchus-web, or adding a new filled control — the measured contrast ratios behind --accent/--link/--on-accent/--band, why the fill/text split exists, and the retired teal family a regression must not reintroduce. Load before editing a colour token in src/styles/global.css or src/styles/house.css, or before reading the numbers out of test/houseShell.test.js.
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
