import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { strings } from '../src/lib/strings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '../src/styles/global.css'), 'utf-8');
const layout = readFileSync(join(__dirname, '../src/layouts/Layout.astro'), 'utf-8');

// The shared shell is copied by hand from untilt/client/src/index.css, where
// src/lib/tokens.test.ts pins the same values. There is no cross-repo drift
// check — a silent divergence is the failure mode, so each copy pins itself.
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
  // the same analysis reads identically on both Elenchus surfaces.
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

  it('every language names the house and links to it', () => {
    for (const lang of ['en', 'fr']) {
      expect(strings[lang].houseLabel).toBeTruthy();
      expect(strings[lang].houseUrl).toMatch(/^https:\/\/untilt\.app\//);
    }
  });

  it('the header renders the house wordmark', () => {
    expect(layout).toMatch(/<header/);
    expect(layout).toMatch(/houseUrl/);
  });
});
