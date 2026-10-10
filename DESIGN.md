# DESIGN.md — Elenchus web (elenchus.untilt.app)

This file records the house's identity and the direction chosen on 2026-10-10.
It does not replace `~/Dev/untilt/docs/house-contract.md`: the contract owns
the shell (header, hero band, `@geometry`, type roles, colour by role), and
where this file and the contract disagree, the contract wins and this file is
the bug. `untilt/DESIGN.md` carries the same **House** sections word for word;
only the **Tool** sections differ.

## Read

Reading this as: a paste-and-read instrument that checks whether an
argument's conclusions follow from what came before, for people reading an
argument they are unsure of, with a calm, exact, instrument-like language.

## Domain

- an argument: claim, what supports it, the conclusion it reaches
- a flaw, quoted from the text it was found in, with its severity
- a score that judges structure, not truth ("does not check facts")
- the pasted text, and the box it is pasted into
- elenchus: Socratic cross-examination, the question that exposes the gap
- contour lines: a survey of terrain, read without walking it

## Colour world

The house palette predates this file (contract v2). The list records the
subject's own colours and which token answers to each; it does not claim the
tokens were derived from it.

Found in the subject:

- tide-chart teal — the reading instrument; answered by `--accent #1E7A76` and the band `#176763`
- survey-sheet white line — contour lines on a dark map; answered by the white rings at 20%
- printed-page grey — the cool page the text is pasted onto; answered by `--bg #F8F9FB`
- proof-mark red, amber, green — the severity of a flaw and the score's three levels; answered by the severity/score scale in `global.css`
- night-desk dark — the hour arguments get re-read; answered by the dark ground `#0F1117`

Tokens (shell tokens from `src/styles/house.css`, accents from `src/styles/global.css`):

| token | role | light | dark |
|---|---|---|---|
| `--bg` | page ground | `#F8F9FB` | `#0F1117` |
| `--text` | body text | `#1A1D23` | `#ECEEF2` |
| `--muted` | secondary text (full strength, not opacity) | `#5C6370` | `#94A3B8` |
| `--line` | borders, rules | `#D2D7DF` | `#2F333D` |
| `--accent` | Analyze's fill, the active nav, the sample's top bar | `#1E7A76` | `#5FC2BC` |
| `--band` | the front-page hero band, scheme-invariant | `#176763` | `#176763` |
| `--link` | links and the lockup's tool name; never `--accent` as text | `#176763` | `#5FC2BC` |

Dark is obtained by a near-black ground and lighter accent fills with ink on
them (`--on-accent`). The band is the same in both schemes. Light is the
default for the use scene (reading at a desk); the toggle cycles system →
light → dark.

## Type

| role | family | why it fits the Read |
|---|---|---|
| display | Instrument Serif (`--face-display`) | a quiet editorial voice for the one question the page asks |
| UI | Instrument Sans | lockup, nav, eyebrows, chips, buttons |
| body | DM Sans | the pasted text, the analysis, both languages |

Scale (px): 11 eyebrow · 12–13 meta and counters · 14 UI · 15–16 body ·
hero title `clamp(2.5rem, 7vw, 4.5rem)`.

Tracking: eyebrow `0.05em` uppercase; everything else the font's default.

## Space & shape

Spacing scale (px): 4-step scale. 20 card padding (`--space-card`), 40
between the analyzer and the landing sections.

| role | radius |
|---|---|
| controls | 8 (`--radius-control`) |
| surfaces / cards, textarea, primary buttons | 12 (`--radius-card`) |
| media | 12 |

## Motion

| motion | how often a visitor sees it | duration | easing |
|---|---|---|---|
| contour bloom (waiting for an analysis) | every analysis | 3s loop | ease-in-out |
| control hover | every hover | short, browser default curve | default |

Reduced motion: the bloom shows its full drawing without looping.
`.is-settled` is defined and deliberately never applied here (see the
`elenchus-web-palette` skill).

## Signature

The contour rings — used at the tool band (each tool's front page), white at
20%, `aria-hidden`; and in motion as the bloom while an analysis runs. Never
as decoration elsewhere.

## Refused defaults

- A2 (purple / indigo accents) — refused; each tool owns one accent family, blue-grey or teal
- G1 (warm cream ground) — refused; the cool grey `--bg` and the teal band
- B9 (gradient text) — refused; ink only, colour never carries a word
- Pill primary buttons — refused; primaries take `--radius-card`, only chips are pills (contract §2)
- Section kickers over every section — refused; one eyebrow per hero, sentence-case headings below

Sanctioned by the contract and exempt from the avoid-list: the one italic
hero word and the white pill chips (contract §2).

## House direction: B, a sample result (2026-10-10)

Shared by both repos, word for word.

- **The first screen proves, then the claim.** Each tool's front page shows a
  real, saved result of that tool within the first scroll. Never a
  hand-written result: a sample is a frozen output of a real run, labelled
  with what it is, its date and the model and prompt version that produced it.
- **One sample frame, defined in `house.css`** (`.house-sample`): a card on
  `--bg-card`, `--line` hairline, `--radius-card`, a 4px top bar in the tool's
  own accent (the only colour it carries), a label row in `--muted`
  ("Saved run · <date> · <model> · prompt <version> · AI-generated"), and the result below. The shell owns the
  frame; each tool owns what goes inside it.
- **The same Elenchus run appears on both sites.** A visitor who opens the
  house front door and then Elenchus sees the same result, not two.
- **The theme button matches the language pill.** Both header controls are
  bordered boxes and both reach a 44px touch target, in the shell, on every
  page of both tools (`house.css`, contract §2b).
- **The mobile tab-bar label floor is 12px** (contract §2b, raised from 10px).
- **Kept by owner decision:** footer links in `--link`; the title settle with
  its overshoot.

## Tool: Elenchus web

- **Band:** eyebrow, title, a two-line lede that still says "does not check
  facts" first, the chips. The false-premises caveat moves next to the score.
- **First screen:** one input card. Its toolbar holds "Try an example" chips
  (saved texts from the owner's testbed); its footer row holds the counter, a
  one-line free-tier note with a Details link, and Analyze at full strength.
  Turnstile sits under that row.
- **Beside the card at 1440, under it at 390:** the shared saved run, drawn by
  the same `renderAnalysis()` that draws a live result, in the house sample
  frame.
- **Below:** sentence-case section headings, no kickers; "What you get back"
  becomes example cards linking to the Examples page; a four-panel method band
  in the contour line style ("Finds the conclusion · Traces what supports it ·
  Flags the gap · Scores the whole").
- **Nav:** a fourth destination, Examples.

## References

Studied in the 2026-10-10 design audit (captures under
`~/.claude/state/design-audit/2026-10-10/elenchus.untilt.app/`):

| site | taken | refused |
|---|---|---|
| https://hemingwayapp.com | the first screen is a pre-analysed sample | its editor-as-page layout (direction C, set aside) |
| https://gptzero.me | example chips inside the input card; counter and full-strength action in one footer row | its marketing density around the card |
| https://languagetool.org | a sample-text button on the input | its cookie modal over the fold |
| https://rulebase.co | the method in four panels | its single-accent, no-band first screen |

## Differs from

| neighbour | its direction in one line | axis this one differs on |
|---|---|---|
| william-revah-paris | warm paper ground, bistre accent | ground (cool grey + teal band) |
| my-tsundoku | warm off-white paper, forest green and amber | ground |
| pogofish | warm paper, vermilion, Instrument Serif + Newsreader + mono | ground; type family (DM Sans body, no mono) |
| ecritoire | "Encre": warm paper, oxblood, Inter + Newsreader | ground; type family |
| bas-de-laine | warm cream, sage, terracotta | ground |
| untilt | the same house | none on purpose: one house, one shell; it differs only in its accent family |
