import { describe, it, expect } from 'vitest';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { strings } from '../src/lib/strings.js';
import { THEME_KEY } from '../src/lib/theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '../src/styles/global.css'), 'utf-8');
const houseCss = readFileSync(join(__dirname, '../src/styles/house.css'), 'utf-8');
const layout = readFileSync(join(__dirname, '../src/layouts/Layout.astro'), 'utf-8');
const analyzer = readFileSync(join(__dirname, '../src/components/Analyzer.astro'), 'utf-8');
// The header moved out of Layout.astro and into its own component in Task 4
// (contract header + mobile bottom bar) — see 'the header renders the house
// wordmark' below, and the 'the contract header' describe block further
// down, which reads this same file under its own local name.
const houseHeader = readFileSync(join(__dirname, '../src/components/HouseHeader.astro'), 'utf-8');
// Task 3: the front page composes the hero band + analyzer + landing.
const indexPage = readFileSync(join(__dirname, '../src/pages/index.astro'), 'utf-8');
const frIndexPage = readFileSync(join(__dirname, '../src/pages/fr/index.astro'), 'utf-8');
const bookmarkletInstall = readFileSync(
  join(__dirname, '../src/components/BookmarkletInstall.astro'),
  'utf-8',
);
const landing = readFileSync(join(__dirname, '../src/components/Landing.astro'), 'utf-8');
const toolNav = readFileSync(join(__dirname, '../src/components/ToolNav.astro'), 'utf-8');
const netlifyToml = readFileSync(join(__dirname, '../netlify.toml'), 'utf-8');

// Negative guards below must read the RULES, not the prose. house.css's header
// names the rules it deliberately omits, so a guard run over the raw file
// matches its own explanation and fails on a correct file — which is exactly
// what happened the first time this suite ran.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const houseRules = stripComments(houseCss);

// WCAG relative-luminance / contrast-ratio helpers, module-scoped so both
// 'every text token clears 4.5:1...' and the score-badge ink pins below can
// share one definition rather than two copies drifting apart.
const lum = (h) => { const c = [1,3,5].map((i) => parseInt(h.slice(i,i+2),16)/255).map((v) => v<=.03928? v/12.92 : ((v+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x+.05)/(y+.05); };

// One definition of the term, shared with untilt/client/src/lib/tokens.test.ts:
// the SHARED SHELL is the surfaces (background, card, text, muted text,
// border) and nothing else; `--accent` AND `--link` are both PER-TOOL, set
// independently by every tool under the chapeau. Values below are copied by
// hand from untilt/client/src/styles/house.css, under the same names it uses
// — `--muted` and `--line` were `--text-muted` and `--border` here until the
// v0.2 rename. There is no cross-repo drift check and no sync script; a silent
// divergence is the failure mode, so each copy pins itself.
const HOUSE_LIGHT = {
  '--bg': '#F8F9FB',
  '--bg-card': '#FFFFFF',
  '--text': '#1A1D23',
  '--muted': '#5C6370',
  '--line': '#D2D7DF',
};
const HOUSE_DARK = {
  '--bg': '#0F1117',
  '--bg-card': '#1A1D25',
  '--text': '#ECEEF2',
  '--muted': '#94A3B8',
  '--line': '#2F333D',
};

// The shell lives in house.css; global.css keeps only Elenchus's own accent
// and status scale. Slicing the wrong file is the mistake these two pairs of
// bounds exist to make impossible. Module-scoped (not just inside 'house
// shell' below) so the token/contrast describes further down can reuse them.
const light = houseCss.slice(houseCss.indexOf(':root {'), houseCss.indexOf('@media (prefers'));
const dark = houseCss.slice(houseCss.indexOf('@media (prefers'), houseCss.indexOf(':root.light {'));
// Bounded at ':root.light {' (item 12): unbounded, explicitDark ran to EOF
// and would have silently swallowed every rule after it, including
// :root.light itself, into "the dark block".
const explicitDark = houseCss.slice(houseCss.indexOf(':root.dark {'), houseCss.indexOf(':root.light {'));
// Mirror of explicitDark, bounded at the next real rule. That rule is
// '.house-bar {', not '.house {' — Sub-project A split the header rule in
// two and .house-bar now sits between :root.light and .house — so the bound
// is here, tightened to match, rather than at '.house {' where it would
// swallow .house-bar's whole body into "the light block" too. (.house-bar is
// asserted to declare no custom property below, precisely so nothing here
// depends on that swallow being harmless.)
const explicitLight = houseCss.slice(houseCss.indexOf(':root.light {'), houseCss.indexOf('.house-bar {'));
const toolLight = css.slice(css.indexOf(':root {'), css.indexOf('@media'));
const toolDark = css.slice(css.indexOf('@media'));

describe('house shell', () => {
  it('global.css imports the shell rather than restating it', () => {
    expect(css).toMatch(/@import\s+'\.\/house\.css';/);
    // The whole point of the extraction: one definition per token. A shell
    // token re-declared here would win on source order and diverge silently.
    for (const k of Object.keys(HOUSE_LIGHT)) {
      expect(css).not.toMatch(new RegExp(`\\n\\s*${k}:`));
    }
  });

  it('the shell carries no per-tool accent', () => {
    // --accent and --link are per-tool. Upstream untilt sets #627D98/#587089;
    // if either leaked into the shared file, adopting it would repaint every
    // Elenchus link blue-grey.
    expect(houseRules).not.toMatch(/^\s*--accent:/m);
    expect(houseRules).not.toMatch(/^\s*--link:/m);
  });

  it('the chapeau furniture is omitted, not copied in dead', () => {
    // [ADAPTED] 2 in house.css's header. There is no hero on this site.
    expect(houseRules).not.toMatch(/\.house-cover|\.house-settle|\.house-field|house-drift/);
    // ...and the file really was read: the lockup it DOES carry is present.
    expect(houseRules).toMatch(/\.house-tool\s*\{/);
  });

  it('uses the house surface values in light mode', () => {
    for (const [k, v] of Object.entries(HOUSE_LIGHT)) {
      expect(light).toMatch(new RegExp(`${k}:\\s*${v};`, 'i'));
    }
  });

  it('uses the house surface values in dark mode', () => {
    for (const [k, v] of Object.entries(HOUSE_DARK)) {
      expect(dark).toMatch(new RegExp(`${k}:\\s*${v};`, 'i'));
    }
  });

  // The brief's original version of this guard sliced `light` to end at the
  // first `@media`, then asserted `light` doesn't match `/@media/` — which
  // cannot fail regardless of file content, since the slice bound already
  // guarantees it. Assert on values instead of on the slice's own boundary:
  // `light` must carry the light --bg and must NOT carry the dark --bg, and
  // `dark` must carry both the media query and the dark --bg. If the slicing
  // ever breaks (e.g. the dark block moves above `light`'s end index, or
  // `:root {`/`@media` stop appearing where expected), these values-based
  // assertions can and do go red — proven below by breaking the slice bounds
  // on purpose (see the fix report for the before/after run).
  it('the two blocks are actually separated — the guard is not vacuous', () => {
    expect(light).toMatch(/--bg:\s*#f8f9fb;/i);
    expect(light).not.toMatch(/--bg:\s*#0f1117;/i);
    expect(dark).toMatch(/prefers-color-scheme:\s*dark/);
    expect(dark).toMatch(/--bg:\s*#0f1117;/i);
  });

  // Assert the EXACT url per language, not a prefix. The prefix version of
  // this guard could not fail: pointing the French houseUrl at
  // `https://untilt.app/` — precisely the "language guess" that Layout.astro
  // and CLAUDE.md claim is prevented — left the suite green, as did
  // `https://untilt.app/no-such-page/`. Both are real prerendered pages on
  // the chapeau — untilt's client/scripts/prerender.js writes every route
  // twice, `/` and `/fr/` (the French basename), each to its own index.html.
  // If either ever moves, this is the pin that says so.
  const HOUSE_URLS = {
    en: 'https://untilt.app/',
    fr: 'https://untilt.app/fr/',
  };

  it('every language names the house', () => {
    for (const lang of Object.keys(HOUSE_URLS)) {
      expect(strings[lang].houseLabel).toBeTruthy();
    }
  });

  it('every language links to the house page in its own language', () => {
    for (const [lang, url] of Object.entries(HOUSE_URLS)) {
      expect(strings[lang].houseUrl).toBe(url);
    }
  });

  // The header tool name is the first place --accent would be used as TEXT,
  // and --accent has never cleared AA in light mode as text (v2's #1E7A76 on
  // the house --bg #F8F9FB is 4.86:1 on the page but 3.73:1 on its own /20
  // tint, against a 4.5:1 floor at the 1rem/600 the header inherits).
  // axe-core on the built page caught the original defect; this is the pin
  // that stops it coming back.
  it('the header tool name uses --link, never --accent', () => {
    const rule = houseCss.slice(houseCss.indexOf('.house-tool {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toMatch(/color:\s*var\(--link\)/);
    expect(body).not.toMatch(/color:\s*var\(--accent\)/);
  });

  it('the header renders the house wordmark', () => {
    // Moved from Layout.astro to HouseHeader.astro in Task 4 (see the
    // 'Layout renders the header component, not an inline header' guard in
    // 'the contract header' below, which pins the other side of this move).
    expect(houseHeader).toMatch(/<header/);
    expect(houseHeader).toMatch(/houseUrl/);
  });

  // Regression: the theme toggle (test/theme.test.js) applies a stored
  // light/dark class before house.css's --bg/--text tokens are even parsed.
  // Astro emits the bundled stylesheet's <link> at the end of <head>, so
  // first-child placement is what guarantees the class lands before any CSS
  // applies; verified on dist/index.html of both import styles. A plain
  // frontmatter `import '../styles/global.css'` is fine because of that —
  // the import style was never the load-bearing part, the script's position
  // inside <head> is.
  it('the theme script is the first child of <head>', () => {
    expect(layout).toMatch(/<head>\s*<script is:inline>[^<]*elenchus:theme/);
    // Non-vacuity: the same literal script text is not merely present
    // somewhere in the file (e.g. duplicated in <body>), which would let
    // the regex above match on a coincidence rather than actual placement.
    const body = layout.slice(layout.indexOf('<body>'));
    expect(body).not.toMatch(/elenchus:theme/);
  });

  it('the inline script duplicates THEME_KEY exactly, not a hand-typed guess', () => {
    // is:inline cannot import src/lib/theme.js (it must run before any
    // bundled JS), so the key is duplicated as a literal on purpose — this
    // pin is what stops that literal drifting from THEME_KEY silently.
    expect(layout).toContain(THEME_KEY);
  });
});

describe('the contract header', () => {
  const layout = readFileSync('src/layouts/Layout.astro', 'utf-8');
  const header = readFileSync('src/components/HouseHeader.astro', 'utf-8');
  it('orders lockup · nav · theme · language', () => {
    const i = (s) => header.indexOf(s);
    expect(i('class="house-mark"')).toBeLessThan(i('<ToolNav'));
    expect(i('<ToolNav')).toBeLessThan(i('<ThemeToggle'));
    expect(i('<ThemeToggle')).toBeLessThan(i('data-lang-toggle'));
  });
  it('the language toggle is in the header and points at the twin page', () => {
    expect(header).toMatch(/data-lang-toggle[^>]*href=\{otherHref\}/);
    expect(header).toMatch(/hreflang=\{otherLang\}/);
  });
  it('nav has exactly three items and the extension one opens the store', () => {
    const nav = readFileSync('src/components/ToolNav.astro', 'utf-8');
    expect(nav.match(/<a /g)?.length).toBe(3);
    expect(nav).toMatch(/chromewebstore\.google\.com/);
    expect(nav).toMatch(/hl=\$\{lang\}|hl=\{lang\}/);
  });
  it('the mobile bar exists, is the same three items, and is hidden on desktop', () => {
    expect(css).toMatch(/\.tool-nav-bar\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0/s);
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{[^}]*\.tool-nav-bar\s*\{[^}]*display:\s*none/s);
    // Item 4: the bar's own padding is 0.5rem, and only the BOTTOM edge adds
    // the safe-area inset on top of that — a bare `env(...)` alone (the
    // pre-fix shape) throws away the 0.5rem the top/left/right edges keep,
    // leaving a notched phone with less bottom padding than every other
    // edge of the same bar.
    expect(css).toMatch(/padding-bottom:\s*calc\(0\.5rem \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  });
  it('the viewport meta opts into safe-area insets (viewport-fit=cover)', () => {
    // env(safe-area-inset-*) resolves to 0 without this — the calc() above
    // would silently collapse to a plain 0.5rem on a notched phone.
    expect(layout).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*"/);
  });
  // Item 6 originally asked only that hover recolour the text (to --text).
  // Sub-project A moves the whole nav onto the shell control treatment, where
  // hover paints the SURFACE as well — that is the drift the spec measured
  // between the two tools ("hover recolours text only" here against Doxa's
  // "hover paints the same tint"). The intent Item 6 pinned is unchanged: a
  // hovered item must still read clearly, now at --link on --tint.
  it('a hovered or focused nav item still reads clearly (Item 6)', () => {
    expect(css).toMatch(/\.tool-nav a:hover,\s*\n?\s*\.tool-nav a:focus-visible\s*\{[^}]*color:\s*var\(--link\)/s);
    expect(css).toMatch(/\.tool-nav a:hover,\s*\n?\s*\.tool-nav a:focus-visible\s*\{[^}]*background:\s*var\(--tint\)/s);
  });
  it('the desktop pill nav resets the bar-only treatment it shares the element with (Item 7)', () => {
    const desktopBlock = css.slice(css.indexOf('@media (min-width: 768px)'));
    const toolNavBlock = desktopBlock.slice(desktopBlock.indexOf('.tool-nav {'), desktopBlock.indexOf('.tool-nav svg'));
    expect(toolNavBlock).toMatch(/padding:\s*0;/);
    expect(toolNavBlock).toMatch(/background:\s*transparent;/);
    expect(toolNavBlock).toMatch(/justify-content:\s*flex-start;/);
    expect(toolNavBlock).toMatch(/z-index:\s*auto;/);
  });
  it('the mobile bar carries an icon above each label, hidden at >=768px (Item 9)', () => {
    const nav = readFileSync('src/components/ToolNav.astro', 'utf-8');
    expect(nav.match(/<svg /g)?.length).toBe(3);
    for (const svg of nav.match(/<svg [^>]*>/g) ?? []) {
      expect(svg).toMatch(/aria-hidden="true"/);
      expect(svg).toMatch(/stroke="currentColor"/);
    }
    const desktopBlock = css.slice(css.indexOf('@media (min-width: 768px)'));
    expect(desktopBlock).toMatch(/\.tool-nav svg\s*\{[^}]*display:\s*none/s);
  });
  it('Layout renders the header component, not an inline header', () => {
    expect(layout).toMatch(/<HouseHeader /); expect(layout).not.toMatch(/<header class="house">/);
  });
});

describe('the v2 shell', () => {
  it('declares the three invariant tokens once and never under any dark block', () => {
    for (const [t, v] of [['--face-display', "'Instrument Serif', 'Instrument Serif Fallback', Georgia, serif"], ['--hero-fg', '#FFFFFF'], ['--hero-muted', 'rgba\\(255, 255, 255, 0\\.82\\)']]) {
      expect(light).toMatch(new RegExp(`${t}:\\s*${v};`));
      expect(dark).not.toMatch(new RegExp(`${t}:`));
    }
  });
  it('ships Instrument Serif with the metric fallback, under budget', () => {
    const a = statSync('public/fonts/instrument-serif-latin.woff2').size, b = statSync('public/fonts/instrument-serif-italic-latin.woff2').size;
    expect(a + b).toBeLessThan(60_000);
    expect(houseCss).toMatch(/font-family:\s*'Instrument Serif';\s*font-style:\s*normal;[^}]*instrument-serif-latin\.woff2/);
    expect(houseCss).toMatch(/font-family:\s*'Instrument Serif Fallback';[^}]*local\('Georgia'\);[^}]*size-adjust:/);
    expect(readFileSync('public/fonts/OFL.txt', 'utf-8')).toMatch(/Copyright 2022 The Instrument Serif Project Authors/);
  });
  it('explicit theme classes override the media query in both directions', () => {
    expect(houseCss).toMatch(/:root\.dark\s*\{[^}]*--bg:\s*#0F1117;/i);
    expect(houseCss).toMatch(/:root\.light\s*\{[^}]*--bg:\s*#F8F9FB;/i);
    // the class blocks come AFTER the media query, so order never decides
    expect(houseCss.indexOf(':root.dark {')).toBeGreaterThan(houseCss.indexOf('@media (prefers-color-scheme: dark)'));
  });
  it('the explicit dark class carries the same surface values as the media query', () => {
    // explicitDark is bounded at ':root.light {'; it must restate the same
    // five values the media query declares, never drift from them.
    for (const [k, v] of Object.entries(HOUSE_DARK)) {
      expect(explicitDark).toMatch(new RegExp(`${k}:\\s*${v};`, 'i'));
    }
  });

  it('the explicit light class carries the same surface values as the top-level :root', () => {
    // Mirror of the dark assertion above (item 12): explicitLight is bounded
    // at '.house {' so it does not run to EOF either.
    for (const [k, v] of Object.entries(HOUSE_LIGHT)) {
      expect(explicitLight).toMatch(new RegExp(`${k}:\\s*${v};`, 'i'));
    }
  });
  it('the shell still carries no per-tool token', () => {
    for (const t of ['--accent', '--on-accent', '--accent-hover', '--band', '--link', '--link-hover']) expect(houseCss).not.toMatch(new RegExp(`${t}:`));
  });
});

// Derived set-equality guard (item 2): rather than hand-listing which tokens
// the explicit :root.dark / :root.light blocks must restate — the kind of
// list that silently goes stale the next time a token is added — parse the
// actual `--name:` declarations out of each block and compare the SETS.
// `declaredTokens` and `setsEqual` are exported from nowhere on purpose:
// this file is their only caller, so proving them on a fixture right here is
// the whole test for them.
function declaredTokens(cssBlockText) {
  const tokens = new Set();
  const re = /--([\w-]+)\s*:/g;
  let m;
  while ((m = re.exec(cssBlockText))) tokens.add(`--${m[1]}`);
  return tokens;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function minus(set, names) {
  const out = new Set(set);
  for (const n of names) out.delete(n);
  return out;
}

describe('declaredTokens/setsEqual: the comparison helper itself', () => {
  it('parses every --name: out of a CSS block', () => {
    const s = declaredTokens('--foo: 1px; --bar-baz: 2px; color: red;');
    expect(s).toEqual(new Set(['--foo', '--bar-baz']));
  });

  it('non-vacuity: a fixture with one token missing fails the comparison', () => {
    const complete = declaredTokens('--foo: 1; --bar: 2;');
    const missingOne = declaredTokens('--foo: 1;');
    expect(setsEqual(complete, missingOne)).toBe(false);
    expect(setsEqual(complete, declaredTokens('--foo: 1; --bar: 2;'))).toBe(true);
  });
});

describe('explicit theme classes restate every media-query token (derived, not hand-listed)', () => {
  // global.css: bounded the same way the module-scope toolLight/toolDark
  // slices are, but tightened at both ends so declaredTokens() only ever
  // sees the one block each name claims to.
  const gExplicitDark = css.slice(css.indexOf(':root.dark {'), css.indexOf(':root.light {'));
  const gExplicitLight = css.slice(css.indexOf(':root.light {'), css.indexOf('* {'));
  const gDarkMedia = css.slice(css.indexOf('@media'), css.indexOf(':root.dark {'));
  const gRoot = css.slice(css.indexOf(':root {'), css.indexOf('@media'));

  it('global.css :root.dark declares exactly the tokens the dark media block declares', () => {
    expect(setsEqual(declaredTokens(gExplicitDark), declaredTokens(gDarkMedia))).toBe(true);
  });

  it('global.css :root.light declares exactly the top-level :root tokens, minus --band', () => {
    // --band is scheme-invariant by design (declared once, never
    // overridden) and is deliberately absent from :root.light too.
    const rootMinusBand = minus(declaredTokens(gRoot), ['--band']);
    expect(setsEqual(declaredTokens(gExplicitLight), rootMinusBand)).toBe(true);
  });

  it('house.css :root.dark declares exactly the tokens the dark media block declares', () => {
    expect(setsEqual(declaredTokens(explicitDark), declaredTokens(dark))).toBe(true);
  });

  it('house.css :root.light declares exactly the top-level :root tokens, minus the three invariants', () => {
    // --face-display / --hero-fg / --hero-muted are scheme-invariant (see
    // 'the v2 shell' above) and deliberately absent from :root.light too.
    const rootMinusInvariants = minus(declaredTokens(light), ['--face-display', '--hero-fg', '--hero-muted']);
    expect(setsEqual(declaredTokens(explicitLight), rootMinusInvariants)).toBe(true);
  });
});

// Restores the pin on the six status-scale VALUES (both schemes) that the
// branch deleted. Semantic status colours, not house-shell or per-tool
// accent tokens — see global.css's file header.
const STATUS = {
  '--severity-minor': ['#d97706', '#fbbf24'],
  '--severity-significant': ['#dc2626', '#f87171'],
  '--severity-critical': ['#7c2d12', '#fca5a5'],
  '--score-strong': ['#16a34a', '#4ade80'],
  '--score-moderate': ['#d97706', '#fbbf24'],
  '--score-weak': ['#dc2626', '#f87171'],
};
describe('status scale tokens, both schemes', () => {
  for (const [t, [l, d]] of Object.entries(STATUS)) {
    it(`${t} is ${l} light / ${d} dark`, () => {
      expect(toolLight).toMatch(new RegExp(`${t}:\\s*${l};`, 'i'));
      expect(toolDark).toMatch(new RegExp(`${t}:\\s*${d};`, 'i'));
    });
  }
});

const TOOL = {
  '--accent': ['#1E7A76', '#5FC2BC'],
  '--on-accent': ['#FFFFFF', '#0F1117'],
  '--accent-hover': ['#176763', '#7FD0CB'],
  '--link': ['#176763', '#5FC2BC'],
  '--link-hover': ['#0F5552', '#7FD0CB'],
};

describe('Elenchus tokens, both schemes', () => {
  for (const [t, [l, d]] of Object.entries(TOOL)) {
    it(`${t} is ${l} light / ${d} dark`, () => {
      expect(toolLight).toMatch(new RegExp(`${t}:\\s*${l};`, 'i'));
      expect(toolDark).toMatch(new RegExp(`${t}:\\s*${d};`, 'i'));
    });
  }
  it('--band is declared once and never overridden', () => {
    expect(toolLight).toMatch(/--band:\s*#176763;/i);
    expect(toolDark).not.toMatch(/--band:/);
  });
  it('the retired teal is gone from every stylesheet and the favicon', () => {
    for (const src of [css, houseCss, readFileSync('public/favicon.svg', 'utf-8')]) expect(src).not.toMatch(/4F8A8B|3D6D6E|6FB3B4|8EC4C5/i);
  });
});

describe('every text token clears 4.5:1 on its darkest surface, both schemes', () => {
  const tint = (fg, bg, a) => '#' + [1,3,5].map((i) => Math.round(a*parseInt(fg.slice(i,i+2),16) + (1-a)*parseInt(bg.slice(i,i+2),16)).toString(16).padStart(2,'0')).join('');
  const ROWS = [
    ['--link light on its /20 over the page', '#176763', tint('#1E7A76', '#F8F9FB', .2)],
    ['--link light on a card', '#176763', '#FFFFFF'],
    ['--link dark on its /20 over a card', '#5FC2BC', tint('#5FC2BC', '#1A1D25', .2)],
    ['--link-hover light on a card', '#0F5552', '#FFFFFF'],
    ['--link-hover dark on the page', '#7FD0CB', '#0F1117'],
    ['--on-accent light on --accent', '#FFFFFF', '#1E7A76'],
    ['--on-accent light on --accent-hover', '#FFFFFF', '#176763'],
    ['--on-accent dark on --accent', '#0F1117', '#5FC2BC'],
    ['--on-accent dark on --accent-hover', '#0F1117', '#7FD0CB'],
    ['--hero-fg on --band', '#FFFFFF', '#176763'],
    ['--hero-muted on --band', tint('#FFFFFF', '#176763', .82), '#176763'],
  ];
  for (const [name, fg, bg] of ROWS) it(name, () => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  it('the retired values fail the same sum — not vacuous', () => {
    expect(ratio('#FFFFFF', '#4F8A8B')).toBeLessThan(4.5);
    expect(ratio('#1E7A76', tint('#1E7A76', '#F8F9FB', .2))).toBeLessThan(4.5);
    expect(ratio('#FFFFFF', '#5FC2BC')).toBeLessThan(4.5);
  });
});

// A rule's body, from its selector's opening '{' to its matching '}'. Used
// below for selector-scoped assertions the same way '.house-tool {' and
// '.house-bloom-ring {' are already sliced elsewhere in this file.
function ruleBody(text, selectorStart) {
  const i = text.indexOf(selectorStart);
  if (i === -1) throw new Error(`selector not found: ${selectorStart}`);
  const braceStart = text.indexOf('{', i);
  const braceEnd = text.indexOf('}', braceStart);
  return text.slice(braceStart, braceEnd);
}
const BARE_WHITE = /color:\s*(#fff\b|#ffffff\b|white\b)/i;

describe('fills carry the paired ink, never a bare white (item 3, widened)', () => {
  it('.btn-primary uses --on-accent', () => {
    expect(css).toMatch(/\.btn-primary\s*\{[^}]*background:\s*var\(--accent\);[^}]*color:\s*var\(--on-accent\);/s);
    expect(ruleBody(css, '.btn-primary {')).not.toMatch(BARE_WHITE);
  });

  it('.bookmarklet-link never sets a bare white (regression: it overrode --on-accent, 2.12:1 in dark)', () => {
    expect(ruleBody(css, '.bookmarklet-link {')).not.toMatch(BARE_WHITE);
  });

  // .score-badge and its .strong/.moderate variants never set a bare white.
  // .weak is the one deliberate exception — its light-mode white is legal
  // (4.83:1 on --score-weak's light value) and is verified by exact ratio,
  // not by this blanket ban, in 'score-badge ink pairs per scheme' below.
  it('.score-badge (the base rule) never sets a bare white', () => {
    expect(ruleBody(css, '.score-badge {')).not.toMatch(BARE_WHITE);
  });
  it('.score-badge.strong never sets a bare white', () => {
    expect(ruleBody(css, '.score-badge.strong {')).not.toMatch(BARE_WHITE);
  });
  it('.score-badge.moderate never sets a bare white', () => {
    expect(ruleBody(css, '.score-badge.moderate {')).not.toMatch(BARE_WHITE);
  });
});

// Item 5: .score-badge.strong/.moderate/.weak carried a bare `color: #fff`
// each, which measured 1.67-1.74:1 in dark (the dark fills are pale:
// #4ade80/#fbbf24/#f87171). Ink is per scheme, not per variant, because the
// light fills split two ways: --score-weak (#dc2626) clears 4.5:1 with
// white, but --score-strong (#16a34a, white 3.30:1) and --score-moderate
// (#d97706, white 3.19:1) do not and need ink instead.
describe('score-badge ink pairs per scheme, both directions verified by ratio', () => {
  const ROWS = [
    ['light .strong: ink on --score-strong', '#0F1117', '#16a34a'],
    ['light .moderate: ink on --score-moderate', '#0F1117', '#d97706'],
    ['light .weak: white on --score-weak', '#FFFFFF', '#dc2626'],
    ['dark .strong: ink on --score-strong', '#0F1117', '#4ade80'],
    ['dark .moderate: ink on --score-moderate', '#0F1117', '#fbbf24'],
    ['dark .weak: ink on --score-weak', '#0F1117', '#f87171'],
  ];
  for (const [name, fg, bg] of ROWS) {
    it(name, () => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  }

  it('the must-fail twin: white on light --score-strong is not vacuous', () => {
    expect(ratio('#FFFFFF', '#16a34a')).toBeLessThan(4.5);
  });

  it('the base rule sets the ink default, .weak overrides to white in light and back to ink in dark', () => {
    expect(ruleBody(css, '.score-badge {')).toMatch(/color:\s*#0F1117/i);
    expect(ruleBody(css, '.score-badge.weak {')).toMatch(/color:\s*#fff\b/i);
    // The dark override lives inside the prefers-color-scheme media block
    // and the explicit :root.dark class, mirroring how every other
    // scheme-dependent value in this file is doubled (theme.js's file
    // header explains why an explicit choice needs its own copy).
    const darkSection = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(darkSection).toMatch(/\.score-badge\.weak\s*\{[^}]*color:\s*#0F1117/is);
    const explicitDarkSection = css.slice(css.indexOf(':root.dark {'));
    expect(explicitDarkSection).toMatch(/\.score-badge\.weak\s*\{[^}]*color:\s*#0F1117/is);
  });
});


// Regression: the wait used to be a generic border spinner, shared with
// nothing. It is now the house contour bloom — the same five paths untilt's
// ContourBloom.tsx and the extension's sidepanel.html carry, so the suite
// looks like one product while it waits.
describe('the wait is the contour bloom', () => {
  it('renders five rings inside the loading block', () => {
    const block = analyzer.slice(
      analyzer.indexOf('<div id="loading-state"'),
      analyzer.indexOf('<div id="error-state"'),
    );
    expect(block).toMatch(/class="house-bloom"/);
    expect(block.match(/class="house-bloom-ring"/g) ?? []).toHaveLength(5);
  });

  it('the bloom is decorative — the status announcement is the wrapper', () => {
    // Same split the extension sidepanel uses: one stable role="status"
    // sentence, and the drawing aria-hidden so it is not announced twice.
    const block = analyzer.slice(
      analyzer.indexOf('<div id="loading-state"'),
      analyzer.indexOf('<div id="error-state"'),
    );
    expect(block).toMatch(/<div id="loading-state" role="status"/);
    expect(block).toMatch(/<svg class="house-bloom"[^>]*aria-hidden="true"/);
  });

  it('the spinner is gone from the stylesheet, not just from the markup', () => {
    expect(stripComments(css)).not.toMatch(/\.spinner|@keyframes\s+spin\b/);
    expect(analyzer).not.toMatch(/class="spinner"/);
  });

  it('the ring stroke is pinned to device pixels', () => {
    // A 400-unit viewBox rendered at 64px scales stroke-width down by 6.25x:
    // 1.5 user units became a 0.24px haze upstream before this was added.
    const rule = houseRules.slice(houseRules.indexOf('.house-bloom-ring {'));
    expect(rule.slice(0, rule.indexOf('}'))).toMatch(/vector-effect:\s*non-scaling-stroke/);
  });

  it('it loops and never fills — no progress vocabulary', () => {
    // The Elenchus principle, held by every surface: name the method, never
    // progress. A determinate indicator here would claim a measurement that
    // does not exist.
    expect(houseRules).toMatch(/animation:\s*bloom-draw 3s ease-in-out infinite/);
    expect(houseRules).not.toMatch(/<progress|role="progressbar"/);
  });

  it('reduced motion stops the loop and leaves the drawing complete', () => {
    const rm = houseRules.slice(houseRules.lastIndexOf('@media (prefers-reduced-motion'));
    expect(rm).toMatch(/\.house-bloom-ring\s*\{\s*animation:\s*none/);
    // dashoffset 0 is the RESTING value, so the clamp leaves full rings
    // rather than a blank box.
    const ring = houseRules.slice(houseRules.indexOf('.house-bloom-ring {'));
    expect(ring.slice(0, ring.indexOf('}'))).toMatch(/stroke-dashoffset:\s*0;/);
  });
});


// Regression: public/favicon.svg was the Astro starter's rocket logo, shipped
// untouched from `npm create astro` until v0.2 — the one surface in the suite
// still wearing another product's mark. It is now the house contour in
// Elenchus teal, the same drawing as untilt's favicon and the extension's icon.
describe('regression: the favicon is the house contour, not the Astro logo', () => {
  const favicon = readFileSync(join(__dirname, '../public/favicon.svg'), 'utf-8');

  it('is not the Astro starter logo', () => {
    // The rocket's own path data. Present verbatim in the file this replaced.
    expect(favicon).not.toMatch(/M50\.4 78\.5/);
  });

  it('carries the house rounded rect and two teal contours', () => {
    expect(favicon).toMatch(/<rect width="512" height="512" rx="108" fill="#0F1117"\/>/);
    expect(favicon.match(/<path d="M256 /g) ?? []).toHaveLength(2);
    expect(favicon).toMatch(/stroke="#1E7A76"/);
    expect(favicon).toMatch(/stroke="#5FC2BC"/);
  });

  it('both icon files are declared, so neither is left to a browser probe', () => {
    expect(layout).toMatch(/rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
    expect(layout).toMatch(/rel="icon" type="image\/png" sizes="32x32" href="\/favicon\.ico"/);
  });
});

// Task 2 of sub-project 2c: copy/download/print an analysis as Markdown.
// The .tool-hero neutralise rule is Task 3's (that component doesn't exist
// yet) — this describe block deliberately does not assert it; Task 3 adds
// both the rule and the assertion.
describe('export row and print', () => {
  it('renders three export controls inside the result state', () => {
    const rs = analyzer.slice(analyzer.indexOf('id="result-state"'));
    for (const id of ['export-copy', 'export-download', 'export-print']) expect(rs).toContain(`id="${id}"`);
    expect(analyzer).toMatch(/import \{ toMarkdown, exportFilename \} from '\.\.\/lib\/exportMarkdown\.js'/);
  });
  it('downloads through a Blob and a constant filename', () => {
    expect(analyzer).toMatch(/new Blob\(\[/); expect(analyzer).toMatch(/exportFilename\(/); expect(analyzer).not.toMatch(/download=\{?`?\$\{result/);
  });
  it('print hides chrome, Turnstile and the paste box', () => {
    const print = css.slice(css.indexOf('@media print'));
    for (const sel of ['.house', '.tool-nav-bar', '#turnstile-container', '#analyze-form', '.export-row']) expect(print).toMatch(new RegExp(`${sel.replace(/[.#]/g, '\\$&')}[^}]*display:\\s*none`));
  });
  // Task 3: ToolHero.astro now exists, so the print sheet must neutralise its
  // band — otherwise a printed page burns the hero's dark fill (and the
  // white-on-band text riding on it) straight onto paper.
  it('print neutralises the hero band to plain text on white', () => {
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/\.tool-hero\s*\{[^}]*background:\s*none[^}]*color:\s*var\(--text\)/);
  });
});

describe('the front page is the analyzer', () => {
  it('composes ToolHero then Analyzer then the landing sections, in both languages', () => {
    for (const src of [indexPage, frIndexPage]) {
      const i = (s) => src.indexOf(s);
      expect(i('<ToolHero')).toBeGreaterThan(0);
      expect(i('<ToolHero')).toBeLessThan(i('<Analyzer'));
      expect(i('<Analyzer')).toBeLessThan(i('<Landing'));
    }
  });

  it('the fact-check claim is the hero lede — above the textarea', () => {
    const hero = readFileSync(join(__dirname, '../src/components/ToolHero.astro'), 'utf-8');
    expect(hero).toMatch(/lede/);
    const copy = readFileSync(join(__dirname, '../src/lib/pageCopy.js'), 'utf-8');
    expect(copy).toMatch(/heroLede:\s*'Elenchus does not check facts/);
    expect(copy).toMatch(/heroLede:\s*'Elenchus ne vérifie pas les faits/);
  });

  it('the hero title carries one emphasised word per language', () => {
    const copy = readFileSync(join(__dirname, '../src/lib/pageCopy.js'), 'utf-8');
    const matches = [...copy.matchAll(/heroTitle:\s*'([^']+)'/g)];
    expect(matches.length).toBe(2);
    for (const m of matches) expect((m[1].match(/\*/g) ?? []).length).toBe(2);
  });

  it('/analyze is a forced 301 to the root in both languages, query preserved (no explicit query in the rule)', () => {
    expect(netlifyToml).toMatch(
      /from = "\/analyze"\s*\n\s*to = "\/"\s*\n\s*status = 301\s*\n\s*force = true/,
    );
    expect(netlifyToml).toMatch(
      /from = "\/fr\/analyze"\s*\n\s*to = "\/fr\/"\s*\n\s*status = 301\s*\n\s*force = true/,
    );
    expect(netlifyToml).not.toMatch(/query\s*=/);
  });

  // The plan names a `scripts/build-bookmarklet.mjs` file that does not
  // exist in this repo (no such npm script either — see package.json). The
  // real build is src/lib/buildBookmarklet.js, an esbuild wrapper
  // parametrised by whatever URL its caller passes in — there is no
  // hardcoded analyzer URL inside it to grep for. The actual call site,
  // and the thing that must change so the bookmarklet targets the root, is
  // BookmarkletInstall.astro's `analyzePath` constant.
  it('new bookmarklets target the root and the nav says so', () => {
    expect(strings.en.navAnalyseHref).toBe('/');
    expect(strings.fr.navAnalyseHref).toBe('/fr/');
    expect(bookmarkletInstall).toMatch(/analyzePath\s*=\s*lang === 'fr' \? '\/fr\/' : '\/'/);
  });

  it('the analyze pages carry a noindex meta now that they only exist to redirect', () => {
    const analyze = readFileSync(join(__dirname, '../src/pages/analyze.astro'), 'utf-8');
    const frAnalyze = readFileSync(join(__dirname, '../src/pages/fr/analyze.astro'), 'utf-8');
    for (const src of [analyze, frAnalyze]) expect(src).toMatch(/noindex/);
    expect(layout).toMatch(/noindex/);
  });

  // Regression: composing ToolHero (its own <h1>) with Analyzer's UNCHANGED
  // <h1>{T.heading}</h1> would put two <h1>s on the front page — a real
  // heading-hierarchy defect, caught by actually building the page (RED:
  // `grep -c '<h1' dist/index.html` was 2) rather than by any of the
  // source-level checks above, none of which look at heading count. Fixed
  // with an opt-out prop rather than deleting Analyzer's own heading,
  // because /analyze and /fr/analyze still compose Analyzer with no
  // ToolHero above it and still need exactly one heading of their own.
  it('the front page renders exactly one <h1> (ToolHero\'s), not a second one from Analyzer', () => {
    expect(analyzer).toMatch(/showHeading\s*&&/);
    for (const src of [indexPage, frIndexPage]) expect(src).toMatch(/showHeading=\{false\}/);
    const analyze = readFileSync(join(__dirname, '../src/pages/analyze.astro'), 'utf-8');
    const frAnalyze = readFileSync(join(__dirname, '../src/pages/fr/analyze.astro'), 'utf-8');
    // /analyze and /fr/analyze carry no ToolHero, so they must keep
    // Analyzer's default (showHeading unset -> true) rather than also
    // passing showHeading={false}, which would leave them with none.
    for (const src of [analyze, frAnalyze]) expect(src).not.toMatch(/showHeading/);
  });

  it('the fact-check claim is ACTUALLY RENDERED as the hero lede (not just the word "lede" somewhere in a comment)', () => {
    const hero = readFileSync(join(__dirname, '../src/components/ToolHero.astro'), 'utf-8');
    expect(hero).toMatch(/<p class="lede">\{lede\}<\/p>/);
  });

  it('the analyze pages omit `path` entirely rather than a wrong one', () => {
    const analyze = readFileSync(join(__dirname, '../src/pages/analyze.astro'), 'utf-8');
    const frAnalyze = readFileSync(join(__dirname, '../src/pages/fr/analyze.astro'), 'utf-8');
    // noindex + force-redirected: this page must not emit a self-canonical
    // or a hreflang set for a URL nothing should index or link to.
    // Layout.astro skips the whole block when `path` is omitted.
    for (const src of [analyze, frAnalyze]) expect(src).not.toMatch(/path=/);
  });

  it('both trailing-slash forms of /analyze redirect, not just the bare path', () => {
    expect(netlifyToml).toMatch(
      /from = "\/analyze\/"\s*\n\s*to = "\/"\s*\n\s*status = 301\s*\n\s*force = true/,
    );
    expect(netlifyToml).toMatch(
      /from = "\/fr\/analyze\/"\s*\n\s*to = "\/fr\/"\s*\n\s*status = 301\s*\n\s*force = true/,
    );
  });
});

// Regression: composing ToolHero + the notice + the form directly on `/`
// (sub-project 2c) put more font-dependent height above the fold than
// `/analyze` ever carried, and these self-hosted faces swapping in after
// first paint reflowed that whole stack — Lighthouse measured CLS ~0.14 and
// desktop performance 94/95/94 across three runs, against the plan's own
// >=95 gate. See CLAUDE.md's Lighthouse note and house.css's @font-face
// comment for the numbers and the (rejected) metric-matched-fallback
// alternative.
describe('the front page does not reflow its own form when fonts finish loading', () => {
  it('DM Sans and Instrument Sans are font-display: optional, so neither can swap in after first paint', () => {
    // Every @font-face block for these two families (DM Sans has one for
    // normal, one for italic) — indexOf-then-slice on the first occurrence
    // alone would leave the italic rule uncovered.
    for (const family of ["'DM Sans'", "'Instrument Sans'"]) {
      const blocks = [...houseCss.matchAll(new RegExp(`font-family: ${family};[\\s\\S]*?\\}`, 'g'))];
      expect(blocks.length).toBeGreaterThan(0);
      for (const [face] of blocks) expect(face).toMatch(/font-display:\s*optional/);
    }
  });

  it("Instrument Serif keeps font-display: swap — it already carries a metric-matched fallback face", () => {
    const block = houseCss.slice(houseCss.indexOf("font-family: 'Instrument Serif';"));
    const face = block.slice(0, block.indexOf('}'));
    expect(face).toMatch(/font-display:\s*swap/);
    expect(houseCss).toMatch(/font-family:\s*'Instrument Serif Fallback'/);
  });

  it('the Turnstile widget reserves its own box so mounting cannot push the Landing block down', () => {
    const block = css.slice(css.indexOf('#turnstile-container {'));
    const rule = block.slice(0, block.indexOf('}'));
    expect(rule).toMatch(/min-height:\s*65px/);
  });
});

// Task 2/3 follow-up: the print sheet was written before Task 3 moved the
// landing content below the analyzer and before a printed RESULT existed to
// look at, so neither had ever been checked against it.
describe('print: a printed RESULT carries the analysis, not the whole site', () => {
  const print = css.slice(css.indexOf('@media print'));

  it('hides the landing sections and the "analyze again" button, not just the chrome/form', () => {
    for (const sel of ['#landing-content', '#new-analysis-btn']) {
      expect(print).toMatch(new RegExp(`${sel.replace(/[.#]/g, '\\$&')}[^}]*display:\\s*none`));
    }
  });

  it('pins a light palette for print regardless of the viewer\'s dark-mode choice', () => {
    // Regression: :root.dark survives onto the printed page (the browser's
    // print dialog does not re-decide prefers-color-scheme against the
    // page's own explicit-choice class), so without this a dark-mode
    // reader printed ~#ECEEF2 text on an unprinted dark background — ~1.1:1.
    // Lives in house.css, not global.css's print block: --text/--bg/etc. are
    // shell tokens, and only house.css may declare them (see the "no shell
    // token re-declared in global.css" guard elsewhere in this file).
    const housePrint = houseCss.slice(houseCss.indexOf('@media print'));
    expect(housePrint).toMatch(/:root[^{]*:root\.dark[^{]*:root\.light[^{]*\{[^}]*--text:\s*#1A1D23/);
  });

  it('the score-badge/flaw-severity print ink rule outranks the modifier classes it must override', () => {
    // Regression: `.score-badge, .flaw-severity { color:#000 }` alone is
    // specificity (0,1,0), lower than `.score-badge.weak`'s (0,2,0) — so the
    // modifier's own white-on-red kept winning and a WEAK badge printed
    // invisible white-on-(dropped)red. The fix repeats the modifier classes
    // in the print selector list itself, matching their specificity — so
    // this checks that the exact modifier class string is part of that
    // selector list (the text before the rule's opening `{`), not just
    // present somewhere in the print block.
    const inkRule = print.slice(print.indexOf('.score-badge'));
    const selectorList = inkRule.slice(0, inkRule.indexOf('{'));
    for (const sel of ['.score-badge.weak', '.flaw-severity.critical']) {
      expect(selectorList).toContain(sel);
    }
  });
});

// Sub-project A (spec §6): ONE eyebrow, not two. The hero's own copy of the
// type treatment folded into the shared `.eyebrow` rule; what stays scoped to
// the band is the tint (--hero-muted), which is the only part of it that is
// about riding on a dark fill.
describe('the eyebrow follows the house contract (§2: Instrument Sans, uppercase)', () => {
  it('is declared once, and reads its size from the geometry token', () => {
    expect(css.match(/\.eyebrow\s*\{/g) ?? []).toHaveLength(1);
    const rule = ruleBody(css, '.eyebrow {');
    expect(rule).toMatch(/font-family:\s*'Instrument Sans'/);
    expect(rule).toMatch(/font-size:\s*var\(--text-eyebrow\)/);
    expect(rule).toMatch(/text-transform:\s*uppercase/);
    expect(rule).toMatch(/letter-spacing:\s*0\.05em/);
    expect(rule).toMatch(/color:\s*var\(--muted\)/);
  });

  it('the hero keeps only the tint, not a second type treatment', () => {
    expect(css).not.toMatch(/\.tool-hero \.eyebrow\s*\{/);
    expect(css).toMatch(/\.tool-hero \.eyebrow,\s*\.tool-hero \.lede\s*\{[^}]*var\(--hero-muted\)/s);
  });

  it('every section heading carries it — Landing, the install page and the results', () => {
    for (const [name, src] of [
      ['Landing.astro', landing],
      ['BookmarkletInstall.astro', bookmarkletInstall],
      ['Analyzer.astro', analyzer],
    ]) {
      const h2s = src.match(/<h2[^>]*>/g) ?? [];
      expect(h2s.length, name).toBeGreaterThan(0);
      for (const h of h2s) expect(h, `${name}: ${h}`).toMatch(/class="eyebrow"/);
    }
  });
});

// Sub-project A (spec §3/§4): the shell geometry tokens, and the two rules
// the header bar is now made of. The declarations below are hand-copied
// literals — the same "each copy pins itself" arrangement HOUSE_LIGHT and
// HOUSE_DARK use at the top of this file. There is no cross-repo read and no
// CI in this repo, so a check that read untilt's own house.css would only
// ever skip here, and skipping is what a drift guard must never do. How many
// there are is not typed here or in CLAUDE.md — see 'every geometry-block
// custom property is referenced' below, which derives the names from the
// block itself rather than counting them by hand.
//
// The block sits AFTER the lockup rules on purpose: both surface slices at
// the top cut before it (`light` ends at the dark media query, `explicitLight`
// at the inner-row rule), so the derived set-equality guard further up still
// compares exactly the sets it compared before this block existed. The two
// assertions below that name `light` and `explicitLight` are what prove that
// rather than assume it.
const GEOMETRY = {
  '--col': '48rem',
  '--bar-pad': '0.75rem 1rem',
  '--control-h': '2rem',
  '--radius-card': '0.75rem',
  '--radius-control': '0.5rem',
  '--text-ui': '0.875rem',
  '--text-eyebrow': '0.6875rem',
  '--space-card': '1.25rem',
  '--tint': 'color-mix(in srgb, var(--text) 6%, transparent)',
  '--tint-strong': 'color-mix(in srgb, var(--text) 12%, transparent)',
};

describe('the shell geometry', () => {
  // Bounded at the rule's own closing brace, so "the value is in the
  // @geometry block" cannot be satisfied by the same string appearing
  // anywhere else in the file.
  const afterMarker = houseCss.slice(houseCss.indexOf('/* @geometry */'));
  const geometry = afterMarker.slice(0, afterMarker.indexOf('}'));

  it('declares the block exactly once, found by its marker', () => {
    expect(houseCss.match(/\/\* @geometry \*\//g) ?? []).toHaveLength(1);
  });

  for (const [k, v] of Object.entries(GEOMETRY)) {
    it(`${k} is ${v}`, () => {
      expect(geometry).toContain(`${k}: ${v};`);
    });
  }

  it('sits outside the two surface slices, so the set-equality guard is untouched', () => {
    expect(light).not.toMatch(/--col:/);
    expect(explicitLight).not.toMatch(/--col:/);
  });

  // The GEOMETRY pin above hand-types names AND values on purpose (the
  // comment at the top of this describe block explains why: a check that
  // read the values back off the block itself would be vacuous). This test
  // is the different thing CLAUDE.md's "never hand-type a count or
  // inventory" rule actually asks for here: which tokens EXIST is derived by
  // parsing the @geometry block's own declarations, not retyped as a name
  // list, so adding or removing a token needs no matching edit here — only
  // that every token the block declares is consumed somewhere.
  it('every geometry-block custom property is referenced at least once', () => {
    const names = [...geometry.matchAll(/(--[a-z-]+):/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    const consumers = css + houseCss;
    for (const name of names) {
      expect(consumers, `${name} is declared but never consumed via var(${name})`).toMatch(
        new RegExp(`var\\(${name}\\)`),
      );
    }
  });

  it('the bar is the full-width shell rule, sticky over the page', () => {
    const bar = ruleBody(houseCss, '.house-bar {');
    expect(bar).toMatch(/position:\s*sticky/);
    expect(bar).toMatch(/background:\s*var\(--bg\)/);
    expect(bar).toMatch(/border-bottom:\s*1px solid var\(--line\)/);
  });

  // The module-scope explicitLight slice above stops right before this rule
  // rather than swallowing it, so this is now the thing that has to hold for
  // that boundary to be correct rather than merely convenient: if .house-bar
  // ever gained a custom property, it would be declared inside :root.light's
  // scope visually but outside the slice that checks :root.light's token
  // set, and would go completely unchecked. Named and isolated (ruleBody, not
  // the multi-hundred-line houseCss) so a failure here reads as "a custom
  // property landed on .house-bar", not as an unrelated :root.light mismatch.
  it('.house-bar declares no custom property of its own', () => {
    const bar = ruleBody(houseCss, '.house-bar {');
    expect(bar).not.toMatch(/--[\w-]+\s*:/);
  });

  it('the lockup row is a --col column and no longer draws the bar itself', () => {
    const row = ruleBody(houseCss, '.house {');
    expect(row).toMatch(/max-width:\s*var\(--col\)/);
    expect(row).toMatch(/padding:\s*var\(--bar-pad\)/);
    // The border moved up to .house-bar; left here it would draw a second
    // hairline across the middle of the bar, at the column's width.
    expect(row).not.toMatch(/border-bottom:/);
  });

  it('the header markup is the bar wrapping the row', () => {
    expect(houseHeader).toMatch(/<header class="house-bar">/);
    expect(houseHeader).toMatch(/<div class="house">/);
    expect(houseHeader.indexOf('class="house-bar"')).toBeLessThan(houseHeader.indexOf('class="house"'));
  });

  it('the print sheet hides the bar, not only the row inside it', () => {
    const print = css.slice(css.indexOf('@media print'));
    const selectorList = print.slice(0, print.indexOf('{', print.indexOf('.house')));
    expect(selectorList).toContain('.house-bar');
  });

  it('the chrome button is borderless and card-less, with no phantom hit area', () => {
    const btn = ruleBody(css, '.chrome-btn {');
    expect(btn).not.toMatch(/border:/);
    expect(btn).not.toMatch(/background:\s*var\(--bg-card\)/);
    expect(btn).toMatch(/height:\s*var\(--control-h\)/);
    expect(btn).toMatch(/border-radius:\s*var\(--radius-control\)/);
    // 32px already clears WCAG 2.5.8 (24px, AA); the 44px ::after pad was
    // the only reason these were boxes.
    expect(css).not.toMatch(/\.chrome-btn::after/);
  });

  it('the nav pill is the shell control, tinted from --text rather than from the accent', () => {
    const item = ruleBody(css, '.tool-nav a {');
    expect(item).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(item).toMatch(/font-size:\s*var\(--text-ui\)/);
    // The tokens are silent on weight, so Doxa's pill decides it: font-medium.
    expect(item).toMatch(/font-weight:\s*500/);
    expect(item).not.toMatch(/border-radius:\s*999px/);
    expect(ruleBody(css, ".tool-nav a[aria-current='page'] {")).toMatch(/background:\s*var\(--tint\)/);
    // The 12% teal surface is the drift this replaces: one neutral tint in
    // both tools, not one tinted by each tool's own accent.
    const nav = css.slice(css.indexOf('.tool-nav {'), css.indexOf('.house-controls {'));
    expect(nav).not.toMatch(/color-mix\([^)]*--accent/);
  });

  it('the mobile bar keeps the 10px label floor at a 4rem height', () => {
    expect(ruleBody(css, '.tool-nav-bar {')).toMatch(/height:\s*4rem/);
    expect(ruleBody(css, '.tool-nav-bar a {')).toMatch(/font-size:\s*10px/);
  });

  it('the language toggle is a pill showing the destination code, drawn in the inline-SVG convention', () => {
    expect(houseHeader).toMatch(/class="lang-toggle"/);
    expect(houseHeader).toMatch(/otherCode/);
    // Same convention as ThemeToggle.astro and ToolNav.astro: 24-unit
    // viewBox, currentColor stroke, decorative.
    const glyph = houseHeader.match(/<svg [^>]*>/)?.[0] ?? '';
    expect(glyph).toMatch(/viewBox="0 0 24 24"/);
    expect(glyph).toMatch(/stroke="currentColor"/);
    expect(glyph).toMatch(/aria-hidden="true"/);
    // The full word stays in the footer; the header shows the code.
    expect(houseHeader).not.toMatch(/\{otherLabel\}/);
  });
});

// The tints are translucent, so what a hovered control actually paints is a
// composite — and the worst case flips by scheme (light is worst over --bg,
// dark over --bg-card). Percentages are parsed out of house.css rather than
// retyped, so lowering or raising --tint-strong moves these numbers instead
// of leaving them describing a value the file no longer has.
describe('--link stays legible on the tint a hovered control paints', () => {
  const pct = (name) => {
    const m = houseCss.match(new RegExp(`${name}:\\s*color-mix\\(in srgb, var\\(--text\\) (\\d+)%`));
    if (!m) throw new Error(`no color-mix percentage for ${name}`);
    return Number(m[1]) / 100;
  };
  const over = (fg, bg, a) => '#' + [1,3,5].map((i) => Math.round(a*parseInt(fg.slice(i,i+2),16) + (1-a)*parseInt(bg.slice(i,i+2),16)).toString(16).padStart(2,'0')).join('');
  // Deferred to test-run time, not computed while the suite is being
  // collected: a missing block must fail these nine tests by name, not crash
  // the whole file before a single one of them is registered.
  const lightTint = (bg) => over(HOUSE_LIGHT['--text'], bg, pct('--tint-strong'));
  const darkTint = (bg) => over(HOUSE_DARK['--text'], bg, pct('--tint-strong'));
  const ROWS = [
    ['--link light over the page', () => TOOL['--link'][0], () => lightTint(HOUSE_LIGHT['--bg'])],
    ['--link light over a card', () => TOOL['--link'][0], () => lightTint(HOUSE_LIGHT['--bg-card'])],
    ['--link-hover light over the page', () => TOOL['--link-hover'][0], () => lightTint(HOUSE_LIGHT['--bg'])],
    ['--link-hover light over a card', () => TOOL['--link-hover'][0], () => lightTint(HOUSE_LIGHT['--bg-card'])],
    ['--link dark over the page', () => TOOL['--link'][1], () => darkTint(HOUSE_DARK['--bg'])],
    ['--link dark over a card', () => TOOL['--link'][1], () => darkTint(HOUSE_DARK['--bg-card'])],
    ['--link-hover dark over the page', () => TOOL['--link-hover'][1], () => darkTint(HOUSE_DARK['--bg'])],
    ['--link-hover dark over a card', () => TOOL['--link-hover'][1], () => darkTint(HOUSE_DARK['--bg-card'])],
  ];
  for (const [name, fg, bg] of ROWS) it(name, () => expect(ratio(fg(), bg())).toBeGreaterThanOrEqual(4.5));

  it('the must-fail twin: --accent as text on the same tint does not clear it', () => {
    // Which is why the nav pill, the lockup tool name and .btn-secondary all
    // take --link and not --accent.
    expect(ratio(TOOL['--accent'][0], lightTint(HOUSE_LIGHT['--bg']))).toBeLessThan(4.5);
  });
});

// Sub-project A (spec §5 hero, §6 page components). The band is no longer a
// boxed element inside <main>: it is a sibling of it, full-bleed, with its own
// --col column inside — which is what makes it flush under the header bar the
// way Doxa's is.
describe('the hero band is a full-bleed sibling of main', () => {
  it('Layout renders a band slot between the header and main', () => {
    const i = (s) => layout.indexOf(s);
    expect(i('<slot name="band" />')).toBeGreaterThan(i('<HouseHeader '));
    expect(i('<slot name="band" />')).toBeLessThan(i('<main>'));
  });

  it('both index pages put the hero in that slot, not in the page body', () => {
    for (const src of [indexPage, frIndexPage]) {
      expect(src).toMatch(/<ToolHero\s+slot="band"/);
    }
  });

  it('the outer element bleeds — the -1rem gutter cancel is gone', () => {
    const hero = ruleBody(css, '.tool-hero {');
    expect(hero).not.toMatch(/margin:\s*0 -1rem/);
    expect(hero).toMatch(/margin-bottom:\s*2rem/);
    expect(hero).toMatch(/background:\s*var\(--band\)/);
  });

  // Regression, measured in the browser at 1280x700: with `html, body {
  // height: 100% }` the body box was exactly one viewport tall, and a sticky
  // element is constrained by its containing block — so .house-bar stopped
  // sticking the moment the page scrolled past the first screen (top: -358px
  // at scrollY 1000). The same one-viewport body is what made the band shrink
  // to 0 and need `flex-shrink: 0`: measured with the old rule and the
  // workaround removed, the hero is 0px tall; with the rule below and the
  // workaround removed it is its full 353px, so the workaround is gone too.
  // html keeps a definite height on purpose — with min-height on both, body's
  // percentage resolves against an auto-height parent and collapses to its
  // content, un-pinning the footer on a short page (measured: footer bottom
  // 1259px in a 1600px viewport).
  it('body is at least a viewport tall, never exactly one, so the bar keeps sticking', () => {
    expect(ruleBody(css, '\nhtml {')).toMatch(/height:\s*100%/);
    const b = ruleBody(css, '\nbody {');
    expect(b).toMatch(/min-height:\s*100%/);
    expect(b).not.toMatch(/(?<!-)height:\s*100%/);
  });

  it('the inner content is the --col column, padded 2.5rem and 3.5rem on desktop', () => {
    const inner = ruleBody(css, '.tool-hero-inner {');
    expect(inner).toMatch(/max-width:\s*var\(--col\)/);
    expect(inner).toMatch(/margin:\s*0 auto/);
    expect(inner).toMatch(/padding:\s*2\.5rem 1rem/);
    const wide = css.slice(css.indexOf('.tool-hero {'));
    expect(wide).toMatch(
      /@media \(min-width: 768px\)\s*\{[^}]*\.tool-hero-inner\s*\{[^}]*padding:\s*3\.5rem 1rem/s,
    );
  });

  // The tokens are silent on the eyebrow-to-title gap, so Doxa's hero decides
  // it: its <h1> takes `mt-3`, three times the 0.25rem this had.
  it('the title sits 0.75rem under the eyebrow, as Doxa does', () => {
    expect(ruleBody(css, '.tool-hero h1 {')).toMatch(/margin:\s*0\.75rem 0 1rem/);
  });

  it('main is the same column, and yields its top padding to a band when there is one', () => {
    const m = ruleBody(css, '\nmain {');
    expect(m).toMatch(/max-width:\s*var\(--col\)/);
    expect(m).toMatch(/padding:\s*2rem 1rem/);
    // A band-less page (/bookmarklet/, 404) keeps the 2rem; the front page's
    // band supplies its own bottom margin instead, so main must not add a
    // second gap under it. The band is main's immediate previous sibling, so
    // the adjacency selector says it with no :has() dependency.
    expect(css).toMatch(/\.tool-hero \+ main\s*\{[^}]*padding-top:\s*0/s);
    expect(css).not.toMatch(/body:has\(/);
  });

  // Measured at 390x844, scrolled to the bottom: 64px of the footer sat under
  // the fixed .tool-nav-bar. main's own bottom padding cannot help — the
  // footer is main's SIBLING, below it — so the clearance is the footer's,
  // the way Doxa gives it to its own footer (Layout.tsx's `mb-[calc(4rem+…)]
  // md:mb-0`).
  it('the footer clears the fixed mobile bar, and gives the clearance back at 768px', () => {
    const barH = ruleBody(css, '.tool-nav-bar {').match(/height:\s*([\d.]+rem)/)[1];
    expect(ruleBody(css, '\nfooter {')).toContain(
      `margin-bottom: calc(${barH} + env(safe-area-inset-bottom, 0px))`,
    );
    const i = css.indexOf('@media (min-width: 768px)');
    const wide = css.slice(i, css.indexOf('@media', i + 10));
    expect(wide).toMatch(/footer\s*\{[^}]*margin-bottom:\s*0/);
  });
});

describe('page components take the house geometry (spec §6)', () => {
  it('links are chrome by default and prose restores the underline', () => {
    expect(css).toMatch(/\na\s*\{[^}]*text-decoration:\s*none/s);
    const prose = ruleBody(css, 'main p a,');
    expect(prose).toMatch(/text-decoration:\s*underline/);
    expect(css).toMatch(/main p a,\s*\n\s*main li a:not\(\.card\),\s*\n\s*\.notice a\s*\{/);
  });

  // Measured in the browser: a bare `a:hover` (0,1,1) matched both the way
  // card and the language pill, so hovering a card underlined title, body and
  // CTA at once and repainted the title over `.way-card { color: var(--text) }`
  // (0,1,0), and hovering the pill underlined it. The exclusion is written on
  // the rule that decides the underline rather than as two later resets: a
  // reset pair has to stay ahead of every future hover declaration, while the
  // exclusion cannot be outrun by one. The exclusion sits inside :where() so
  // the rule keeps the (0,1,1) of the `a:hover` it replaces: bare :not()s
  // score (0,3,1), which outranks `.tool-nav a` and put the underline back on
  // every nav pill — measured in the browser on the first attempt.
  // The selector string itself is asserted literally (not via a regex spanning
  // its nested parens — `[^)]*` cannot cross the `)` inside `:not(.card)`),
  // then its body is read with ruleBody like every other rule in this file.
  const PROSE_HOVER_SELECTOR = 'a:where(:not(.card):not(.lang-toggle):not(.btn-primary)):hover';

  it('the prose hover does not reach a card or the language pill', () => {
    expect(css).toContain(PROSE_HOVER_SELECTOR);
    expect(ruleBody(css, PROSE_HOVER_SELECTOR)).toMatch(/text-decoration:\s*underline/);
    expect(css).not.toMatch(/\na:hover\s*\{/);
    expect(css).not.toMatch(/\na:not\(/);
  });

  // Regression: the bookmarklet CTA is `<a class="btn-primary bookmarklet-link">`
  // (BookmarkletInstall.astro) — an anchor, so it was still caught by the
  // prose-hover rule above before .btn-primary joined the exclusion list.
  // .btn-primary:hover repaints the fill to --accent-hover but sets no
  // `color`, so the prose rule's `color: var(--accent-hover)` painted the
  // text the same colour as the fill underneath it (1:1) and underlined it —
  // measured in the browser, not just read off the cascade.
  it('the prose hover does not reach the primary button', () => {
    expect(PROSE_HOVER_SELECTOR).toContain(':not(.btn-primary)');
    expect(ruleBody(css, PROSE_HOVER_SELECTOR)).toMatch(/text-decoration:\s*underline/);
  });

  it('one card rule, and the two blocks render.js writes for itself share it', () => {
    const card = ruleBody(css, '.card,');
    expect(card).toMatch(/background:\s*var\(--bg-card\)/);
    expect(card).toMatch(/border:\s*1px solid var\(--line\)/);
    expect(card).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(card).toMatch(/padding:\s*var\(--space-card\)/);
    // render.js is untouched by this change — it writes `flaw-card` and the
    // strengths <li>s itself — so those two join the selector list instead of
    // gaining a class.
    const selectors = css.slice(css.indexOf('.card,'), css.indexOf('{', css.indexOf('.card,')));
    expect(selectors).toContain('.flaw-card');
    expect(selectors).toContain('#strengths-list li');
    // Scoped to the anchor: the summary block is a `.card` <div> nobody can
    // click, and an unscoped .card:hover lit its border and shadow under the
    // pointer as if it were a target.
    expect(ruleBody(css, 'a.card:hover {')).toMatch(/box-shadow:\s*0 1px 3px rgba\(0, 0, 0, 0\.04\)/);
    expect(css).not.toMatch(/\n\.card:hover\s*\{/);
  });

  it('the ways are a list of card links with an icon tile', () => {
    expect(landing).toMatch(/<ul class="ways">/);
    expect(landing).toMatch(/<li class="way">/);
    expect(landing).toMatch(/<a\s+class="card way-card"/);
    const tile = ruleBody(css, '.way-icon {');
    expect(tile).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(tile).toMatch(/background:\s*var\(--tint\)/);
    // 3rem, not 2.5rem: the geometry tokens are silent on the tile, so the
    // contract's card tile is 3rem; Doxa's other tiles are per-context.
    expect(tile).toMatch(/width:\s*3rem/);
    expect(tile).toMatch(/height:\s*3rem/);
  });

  it("the way icons are ToolNav's own paths, repeated inline rather than factored out", () => {
    // The Item 9 guard above counts three <svg in ToolNav.astro's SOURCE, so
    // the icons cannot move into a shared component. They are repeated here
    // instead — and pinned equal, so the copy cannot drift.
    const dOf = (src) => [...src.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
    const start = landing.indexOf('class="way-icon"');
    expect(start).toBeGreaterThan(0);
    const tile = landing.slice(start, landing.indexOf('</span>', start));
    expect(dOf(toolNav)).toHaveLength(3);
    expect(dOf(tile)).toEqual(dOf(toolNav));
  });

  it('the summary block is a card too, and the badges keep their colours', () => {
    expect(analyzer).toMatch(/<div class="card" id="result-summary-card">/);
    // Colours are pinned by the score-badge/flaw-severity describes above and
    // are untouched here: only the radius moves onto the token.
    expect(ruleBody(css, '.score-badge {')).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(ruleBody(css, '.flaw-severity {')).toMatch(/border-radius:\s*var\(--radius-control\)/);
  });

  it('the notice is a quiet lined box on the control radius', () => {
    const notice = ruleBody(css, '.notice {');
    expect(notice).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(notice).toMatch(/border:\s*1px solid var\(--line\)/);
    expect(notice).toMatch(/color:\s*var\(--muted\)/);
    expect(notice).toMatch(/font-size:\s*13px/);
  });

  it('the primary button dims when disabled instead of turning grey', () => {
    const btn = ruleBody(css, '.btn-primary {');
    expect(btn).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(btn).toMatch(/padding:\s*0\.875rem 1\.5rem/);
    const off = ruleBody(css, '.btn-primary:disabled {');
    expect(off).toMatch(/opacity:\s*0?\.5/);
    expect(off).not.toMatch(/background:/);
    expect(css).toMatch(/@media \(max-width: 767px\)\s*\{[^}]*\.btn-primary\s*\{[^}]*width:\s*100%/s);
  });

  // Regression, measured in the browser rather than read off the source: with
  // .chrome-btn's own `border`/`background: var(--bg-card)` removed (spec §5),
  // nothing was left to cancel the UA button defaults, so the theme toggle
  // rendered `2px outset rgb(0,0,0)` on `rgb(239,239,239)` — the boxed square
  // the whole change exists to remove, restored by the browser. The reset
  // belongs on `button`, not back on .chrome-btn, whose own guard above
  // forbids a `border:` declaration there.
  it('the button element reset cancels the UA border and fill', () => {
    const b = ruleBody(css, '\nbutton {');
    expect(b).toMatch(/border:\s*0/);
    expect(b).toMatch(/background:\s*none/);
  });

  it('the secondary button is the tinted control, not an outlined one', () => {
    const btn = ruleBody(css, '.btn-secondary {');
    expect(btn).toMatch(/background:\s*var\(--tint\)/);
    expect(btn).toMatch(/color:\s*var\(--link\)/);
    expect(btn).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(btn).toMatch(/min-height:\s*var\(--control-h\)/);
    expect(ruleBody(css, '.btn-secondary:hover {')).toMatch(/background:\s*var\(--tint-strong\)/);
  });

  it("a band-less page's H1 is the display serif, not a 22px sans line", () => {
    // /bookmarklet/ and /analyze/ carry no hero, so their <h1> takes the type
    // scale's "page H1" role rather than the band's oversized one
    // (.tool-hero h1 overrides this further down the file).
    const h1 = ruleBody(css, '\nh1 {');
    expect(h1).toMatch(/font-family:\s*var\(--face-display\)/);
    expect(h1).toMatch(/font-size:\s*clamp\(2rem, 5vw, 3rem\)/);
  });

  it('the textarea takes the card radius', () => {
    expect(ruleBody(css, 'textarea#text-input {')).toMatch(/border-radius:\s*var\(--radius-card\)/);
  });

  it('the footer is two lines, policy first and the credit under it', () => {
    const foot = layout.slice(layout.indexOf('<footer>'));
    expect(foot.indexOf('footer-links')).toBeLessThan(foot.indexOf('footer-credit'));
    // The privacy <a> moved verbatim: scripts/check-privacy-sync.sh in the
    // elenchus repo greps strings.js, but this link is what it exists for.
    expect(foot).toMatch(/<a href=\{t\.privacyUrl\}>\{t\.privacyLabel\}<\/a>/);
    expect(foot.indexOf('t.privacyUrl')).toBeLessThan(foot.indexOf('Made with care by'));
    expect(ruleBody(css, '.footer-credit {')).toMatch(/font-size:\s*13px/);
  });
});

describe('the pinned Vite CSS target (astro.config.mjs) leaves no opaque fallback in the built CSS', () => {
  // astro.config.mjs pins build.cssTarget to Tailwind v4's browser floor
  // (Safari 16.4 / Chrome 111 / Firefox 128) rather than trusting Vite's own
  // undocumented default. This repo carries no oklab/relative-color syntax
  // today, so Lightning CSS has nothing to fold: `--tint`'s definition
  // (`color-mix(in srgb, var(--text) 6%, transparent)`, house.css) mixes a
  // var(), not a constant, and lightningcss's transform() leaves such a
  // declaration untouched under any target — verified directly against the
  // library and by building under a deliberately ancient target first. The
  // config claim is pinned below the same way untilt's tokens.test.ts pins
  // vite.config.ts's cssTarget; the rest of this block reads `dist/`, not
  // `src/`, so it needs a build to have run — it skips loudly (not silently
  // green) when dist is missing rather than pass on nothing checked.
  const astroConfig = readFileSync(join(__dirname, '../astro.config.mjs'), 'utf-8');

  it("states Tailwind v4's own browser floor as the build's CSS target", () => {
    const target = astroConfig.match(/cssTarget:\s*\[([^\]]*)\]/)?.[1] ?? '';
    for (const browser of ['chrome111', 'safari16.4', 'firefox128']) expect(target).toContain(browser);
  });

  const distDir = join(__dirname, '../dist');
  const distExists = statSync(distDir, { throwIfNoEntry: false })?.isDirectory() ?? false;
  const astroDir = join(distDir, '_astro');
  // A build that crashed mid-way (or was interrupted) can leave dist/ present
  // with no dist/_astro inside it — readdirSync on a missing directory throws
  // at describe-time collection, which takes every assertion in this file
  // down with it, not just this block's. Guarded the same way as dist/ itself.
  const astroExists = distExists && (statSync(astroDir, { throwIfNoEntry: false })?.isDirectory() ?? false);
  const OPAQUE_FALLBACK = /--tint:var\(--text\)/;

  if (!astroExists) {
    // A skipped test with no message is silent in vitest's default reporter
    // (measured: a describe-time console.warn never reached the output
    // either — vitest drops console calls made outside a running test body).
    // So this stays a real, running `it` whose own name carries the reason
    // and whose body throws with the same reason, landing as a named FAIL —
    // not a silently-green skip and not a suite failure anyone hits by
    // running `npm test` after a build (only when dist/_astro is stale/absent
    // or the build produced dist/ without ever reaching dist/_astro).
    it('SKIPPED — run `npm run build` first: dist/_astro not found, the opaque-fallback check has nothing to read', () => {
      throw new Error('dist/_astro not found — this check verified nothing; run `npm run build` first.');
    });
  } else {
    const cssFiles = readdirSync(astroDir).filter((f) => f.endsWith('.css'));
    it('at least one built CSS file exists to check', () => {
      expect(cssFiles.length).toBeGreaterThan(0);
    });
    it('no built CSS file carries the opaque --tint:var(--text) fallback', () => {
      for (const file of cssFiles) {
        const built = readFileSync(join(astroDir, file), 'utf-8');
        expect(built).not.toMatch(OPAQUE_FALLBACK);
      }
    });
    // A stale dist/ (built before the last source edit) passes every check
    // above on the OLD bundle, silently — the failure this guards against is
    // a green suite that verified yesterday's CSS. house.css and global.css
    // are the only sources this describe block draws conclusions about.
    it('the built CSS is newer than src/styles/house.css and src/styles/global.css — not a stale bundle', () => {
      const newestSource = Math.max(
        statSync(join(__dirname, '../src/styles/house.css')).mtimeMs,
        statSync(join(__dirname, '../src/styles/global.css')).mtimeMs,
      );
      const staleFiles = cssFiles.filter((f) => statSync(join(astroDir, f)).mtimeMs < newestSource);
      if (staleFiles.length > 0) {
        throw new Error(
          `dist/_astro CSS is older than src/styles/{house,global}.css — stale build (${staleFiles.join(', ')}). Run \`npm run build\` again.`,
        );
      }
    });
  }
});
