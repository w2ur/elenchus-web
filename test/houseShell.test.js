import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'fs';
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

// Negative guards below must read the RULES, not the prose. house.css's header
// names the rules it deliberately omits, so a guard run over the raw file
// matches its own explanation and fails on a correct file — which is exactly
// what happened the first time this suite ran.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const houseRules = stripComments(houseCss);

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
// Mirror of explicitDark, bounded at the next real rule ('.house {') so it
// does not run to EOF either.
const explicitLight = houseCss.slice(houseCss.indexOf(':root.light {'), houseCss.indexOf('.house {'));
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
    expect(css).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom/);
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
  const lum = (h) => { const c = [1,3,5].map((i) => parseInt(h.slice(i,i+2),16)/255).map((v) => v<=.03928? v/12.92 : ((v+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x+.05)/(y+.05); };
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

describe('fills carry the paired ink, never a bare white', () => {
  it('.btn-primary uses --on-accent', () => {
    expect(css).toMatch(/\.btn-primary\s*\{[^}]*background:\s*var\(--accent\);[^}]*color:\s*var\(--on-accent\);/s);
    expect(css).not.toMatch(/\.btn-primary\s*\{[^}]*color:\s*(#fff|#ffffff|white)\b/is);
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
