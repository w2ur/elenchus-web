// The "ways to use it" cards under the analyzer.
//
// History, because both regressions below are real:
// 1. Task 3 fix round 1: a "Paste it" card linked `/analyze/` — a forced 301
//    back to `/` — sending a visitor away from the paste box it advertised.
//    It became an in-page anchor to #text-input.
// 2. Design audit 2026-10-09: that card still pointed at the box directly
//    above it, the way in a visitor has already found. It was dropped; the
//    list holds the two ways that are NOT on this page.
import { describe, expect, it } from 'vitest';
import { landingCopy } from '../src/lib/pageCopy.js';

describe('landingCopy.ways', () => {
  it.each(['en', 'fr'])('%s: bookmarklet then extension, nothing else', (lang) => {
    const ways = landingCopy[lang].ways;
    expect(ways).toHaveLength(2);
    const [bookmarklet, extension] = ways;
    expect(bookmarklet.href).toBe(lang === 'fr' ? '/fr/bookmarklet/' : '/bookmarklet/');
    expect(extension.href).toBeNull();
  });

  it.each(['en', 'fr'])('%s: no card points back at this page (paste box anchor or /analyze)', (lang) => {
    for (const way of landingCopy[lang].ways) {
      expect(way.href).not.toBe('#text-input');
      expect(way.href).not.toBe('/analyze/');
      expect(way.href).not.toBe('/fr/analyze/');
    }
  });

  it.each(['en', 'fr'])('%s: the heading counts what the list holds', (lang) => {
    expect(landingCopy[lang].waysHeading).toMatch(/^(Two|Deux) /);
  });
});

// Regression (design audit 2026-10-09): em-dash bursts across the front
// page — two in the bookmarklet card, one each in the lede, a "What you get"
// item and the limits paragraph. At most one per block, and none in the
// blocks the audit named. The "What you get" list became the method band and
// the example cards in E3; their lines are covered here and, with no em dash
// at all, in test/examplesPage.test.js.
describe('front-page copy: em-dashes', () => {
  const blocks = (C) => [C.heroLede, ...C.method.map((m) => m.line), ...C.ways.map((w) => w.body), C.limitsText];
  const dashes = (s) => (s.match(/—/g) ?? []).length;

  it.each(['en', 'fr'])('%s: no visible block carries more than one em-dash', (lang) => {
    for (const b of blocks(landingCopy[lang])) expect(dashes(b), b).toBeLessThanOrEqual(1);
  });

  it.each(['en', 'fr'])('%s: the blocks the audit named carry none', (lang) => {
    const C = landingCopy[lang];
    for (const b of [C.heroLede, C.ways[0].body, C.limitsText]) {
      expect(dashes(b), b).toBe(0);
    }
  });
});
