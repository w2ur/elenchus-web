import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { strings } from '../src/lib/strings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '../src/styles/global.css'), 'utf-8');
const layout = readFileSync(join(__dirname, '../src/layouts/Layout.astro'), 'utf-8');

// One definition of the term, shared with untilt/client/src/lib/tokens.test.ts:
// the SHARED SHELL is the surfaces (background, card, text, muted text,
// border) and nothing else; `--accent` AND `--link` are both PER-TOOL, set
// independently by every tool under the chapeau. Values below are copied by
// hand from untilt/client/src/index.css (whose names for the last two are
// `--muted` and `--line`); there is no cross-repo drift check — a silent
// divergence is the failure mode, so each copy pins itself.
const HOUSE_LIGHT = {
  '--bg': '#F8F9FB',
  '--bg-card': '#FFFFFF',
  '--text': '#1A1D23',
  '--text-muted': '#5C6370',
  '--border': '#D2D7DF',
};
const HOUSE_DARK = {
  '--bg': '#0F1117',
  '--bg-card': '#1A1D25',
  '--text': '#ECEEF2',
  '--text-muted': '#94A3B8',
  '--border': '#2F333D',
};

describe('house shell', () => {
  const light = css.slice(css.indexOf(':root {'), css.indexOf('@media'));
  const dark = css.slice(css.indexOf('@media'));

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

  // The Elenchus accent and the status colours are NOT house tokens: the
  // severity/score scale is copied verbatim from the extension's sidepanel so
  // the same analysis reads identically on both Elenchus surfaces. `--link`
  // is per-tool for the same reason and is deliberately not pinned here —
  // untilt's is #587089/#7B8FA4, this one is #3D6D6E/#6FB3B4.
  it('keeps the Elenchus accent and the extension status scale', () => {
    expect(light).toMatch(/--accent:\s*#4f8a8b;/i);
    expect(light).toMatch(/--severity-critical:\s*#7c2d12;/i);
    expect(dark).toMatch(/--accent:\s*#6fb3b4;/i);
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
  // and --accent has never cleared AA in light mode as text (#4F8A8B on the
  // house --bg #F8F9FB is 3.73:1 against a 4.5:1 floor at the 1rem/600 the
  // header inherits). axe-core on the built page caught it; this is the pin
  // that stops it coming back.
  it('the header tool name uses --link, never --accent', () => {
    const rule = css.slice(css.indexOf('.house-tool {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toMatch(/color:\s*var\(--link\)/);
    expect(body).not.toMatch(/color:\s*var\(--accent\)/);
  });

  it('the header renders the house wordmark', () => {
    expect(layout).toMatch(/<header/);
    expect(layout).toMatch(/houseUrl/);
  });
});

// Regression: .btn-primary painted white on var(--accent) (#4F8A8B), which
// measures 3.93:1 at the 14px/600 it carries — under the 4.5:1 AA floor. The
// same 3.93:1 defect the C4 review found on the extension link. --accent keeps
// its value (it is a background/border colour elsewhere); only this button
// darkens to --accent-hover #3D6D6E, which measures 5.81:1 on white.
describe('regression: .btn-primary clears AA', () => {
  it('does not use the bare --accent as its background', () => {
    const rule = css.match(/\.btn-primary\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).not.toMatch(/background:\s*var\(--accent\)\s*;/);
  });

  it('the rule was actually found — the guard is not vacuous', () => {
    const rule = css.match(/\.btn-primary\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/color:\s*#fff/);
  });
});
