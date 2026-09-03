// Regression test for Task 3 fix round 1: the "Three ways to use it" card's
// "Paste it" / "Collez le texte" CTA used to href `/analyze/` (`/fr/analyze/`
// in French). Since Task 3 folded the analyzer into the front page and made
// `/analyze` a forced 301 back to `/`, that href sent a visitor away from
// the paste box the card is advertising — which sits ABOVE this card on the
// very same page — and straight back to the top of it. See
// src/lib/pageCopy.js's comment on `ways[0]` for the fix: an in-page anchor
// to the textarea instead of a route.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { landingCopy } from '../src/lib/pageCopy.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('landingCopy.ways — the "paste it" CTA', () => {
  it.each(['en', 'fr'])('%s: points at the on-page paste box, not a route', (lang) => {
    const pasteWay = landingCopy[lang].ways[0];
    expect(pasteWay.name).toMatch(/paste|collez/i);
    expect(pasteWay.href).toBe('#text-input');
  });

  // Falsifying twin: this is the exact regression. If either language's
  // href drifted back to a real /analyze path — which now 301s straight
  // back to this same page — this must fail.
  it.each(['en', 'fr'])('%s: never regresses to an /analyze route (the self-referential loop)', (lang) => {
    const pasteWay = landingCopy[lang].ways[0];
    expect(pasteWay.href).not.toBe('/analyze/');
    expect(pasteWay.href).not.toBe('/fr/analyze/');
    expect(pasteWay.href.startsWith('/')).toBe(false);
  });

  it('the anchor target actually exists: Analyzer.astro declares id="text-input" on the textarea', () => {
    // Pins the coupling this fix relies on — a future rename of the
    // textarea's id in Analyzer.astro without updating pageCopy.js (or
    // vice versa) must fail this test rather than ship a dead anchor.
    const source = readFileSync(join(REPO_ROOT, 'src/components/Analyzer.astro'), 'utf-8');
    expect(source).toMatch(/<textarea[\s\S]*?id="text-input"/);
  });

  it('the other two cards keep real routes (this fix only touches the paste-it card)', () => {
    for (const lang of ['en', 'fr']) {
      const [, bookmarklet, extension] = landingCopy[lang].ways;
      expect(bookmarklet.href).toBe(lang === 'fr' ? '/fr/bookmarklet/' : '/bookmarklet/');
      expect(extension.href).toBeNull();
    }
  });
});
