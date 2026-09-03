import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { toMarkdown, exportFilename } from '../src/lib/exportMarkdown.js';

const result = {
  summary: 'The piece argues X from Y.',
  score: 'moderate',
  flaws: [
    { type: 'Correlation as causation', quote: 'Sales rose after the ad, so the ad worked.', explanation: 'Timing alone does not establish cause.', severity: 'significant' },
    { type: 'Loaded framing', quote: '# not a heading\n---\n```js', explanation: 'Words doing the arguing.', severity: 'minor' },
  ],
  strengths: ['States its premises plainly.'],
};

describe('toMarkdown', () => {
  const md = toMarkdown(result, { lang: 'en', date: new Date(Date.UTC(2026, 8, 2)) });
  it('starts with the title line and the date, then summary and score', () => {
    expect(md.split('\n')[0]).toBe('# Elenchus reasoning analysis — 2026-09-02');
    expect(md).toMatch(/\n## Summary\nThe piece argues X from Y\.\n/);
    expect(md).toMatch(/\n## Reasoning score\nModerate\n/);
  });
  it('lists flaws in input order with type, severity, a blockquoted quote and the explanation', () => {
    const a = md.indexOf('Correlation as causation'), b = md.indexOf('Loaded framing');
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
    expect(md).toMatch(/### Correlation as causation \(significant\)\n> Sales rose after the ad, so the ad worked\.\n\nTiming alone/);
  });
  it('prefixes every quote line with "> " so a quote cannot leave its blockquote, and escapes structural starts', () => {
    expect(md).toMatch(/> \\# not a heading\n> \\---\n> \\```js/);
  });
  it('ends with the strengths and the caveat line', () => {
    expect(md).toMatch(/\n## Strengths\n- States its premises plainly\.\n/);
    expect(md.trimEnd().split('\n').pop()).toBe('_Elenchus checks reasoning, not facts — a tight argument on false premises scores well here._');
  });
  it('speaks French under lang fr', () => {
    const fr = toMarkdown(result, { lang: 'fr', date: new Date(Date.UTC(2026, 8, 2)) });
    expect(fr.split('\n')[0]).toBe('# Analyse du raisonnement par Elenchus — 2026-09-02');
    expect(fr).toMatch(/\n## Résumé\n/); expect(fr).toMatch(/\n## Score de raisonnement\nModéré\n/);
  });
  it('the filename is a constant plus the date', () => {
    expect(exportFilename(new Date(Date.UTC(2026, 8, 2)))).toBe('elenchus-analysis-2026-09-02.md');
  });
  it('a result with no flaws says so and has no flaw section', () => {
    const none = toMarkdown({ ...result, flaws: [] }, { lang: 'en', date: new Date(Date.UTC(2026, 8, 2)) });
    expect(none).toMatch(/\n## Flaws\nNone found\.\n/);
  });

  // Regression: a final `.replace(/\n{3,}/g, '\n\n')` used to run over the
  // WHOLE joined document, so any model field (summary/explanation/strength)
  // containing 3+ consecutive newlines was silently collapsed to 2 — directly
  // contradicting this file's own "every model string passes through
  // verbatim" guarantee. Quotes were never at risk (every line is `> `
  // -prefixed, so a blank line inside a quote can't produce a bare 3-newline
  // run), which is why this needs its own case rather than living inside the
  // blockquote test above.
  it('a summary/explanation/strength with 3+ consecutive newlines survives verbatim', () => {
    const explanation = 'line1\n\n\nline2';
    const withGap = { ...result, summary: explanation, flaws: [{ ...result.flaws[0], explanation }], strengths: [explanation] };
    const md = toMarkdown(withGap, { lang: 'en', date: new Date(Date.UTC(2026, 8, 2)) });
    expect(md).toContain(explanation);
    expect(md.match(/line1\n+line2/)?.[0]).toBe(explanation);
  });

  // Regression: exportMarkdown used to look severity/score up on a plain
  // object literal (`t.scores[result.score] ?? …`, `f.severity ?? 'minor'`),
  // so an attacker-influenced value could reach Object.prototype instead of
  // being clamped to a known category the way render.js already does for the
  // on-screen result — see src/lib/clamp.js.
  it('clamps a hostile score/severity to the safe fallback instead of reaching Object.prototype', () => {
    const hostile = {
      summary: 's', score: 'toString',
      flaws: [{ type: 'T', quote: 'q', explanation: 'e', severity: 'CRITICAL <ignore>' }],
      strengths: [],
    };
    const md = toMarkdown(hostile, { lang: 'en', date: new Date(Date.UTC(2026, 8, 2)) });
    expect(md).toMatch(/\n## Reasoning score\nUnknown\n/);
    expect(md).toContain('### T (minor)');
    expect(md).not.toContain('[native code]');
    expect(md).not.toContain('CRITICAL <ignore>');
  });
});

describe('toMarkdown properties', () => {
  // Regression: fast-check v4's `fc.string()` defaults to
  // `unit: 'grapheme-ascii'`, which emitted ZERO newlines across 5,000 sampled
  // strings (measured) — so a generator built from the bare default can never
  // exercise a multi-line field, and the "every quote line is blockquoted"
  // property below was silently only ever running on single-line input. An
  // explicit unit list that includes '\n' (and the Markdown structure
  // markers the escaping exists for) is what actually stresses the
  // line-splitting logic; it is what would have caught the \n{3,}-collapse
  // regression pinned by hand above, on the very first run.
  const text = fc.string({ unit: fc.constantFrom('a', 'b', ' ', '\n', '#', '-', '`'), minLength: 1, maxLength: 200 });
  const flaw = fc.record({ type: text, quote: text, explanation: text, severity: fc.constantFrom('minor', 'significant', 'critical') });
  const res = fc.record({ summary: text, score: fc.constantFrom('strong', 'moderate', 'weak'), flaws: fc.array(flaw, { maxLength: 6 }), strengths: fc.array(text, { maxLength: 4 }) });
  const date = new Date(Date.UTC(2026, 8, 2));
  it('every quote and explanation appears verbatim (modulo the line-start escape) and every quote line is blockquoted', () => {
    fc.assert(fc.property(res, (r) => {
      const md = toMarkdown(r, { lang: 'en', date });
      for (const f of r.flaws) {
        for (const line of f.quote.split('\n')) expect(md).toContain('> ' + line.replace(/^(#|---|```)/, '\\$1'));
        // Escaping is per LINE (para() splits, escapes, rejoins), not just
        // at the start of the whole string — a newline-bearing explanation
        // needs the same per-line treatment here or this assertion fails on
        // its own wrong expectation, not on a real defect (see the newline
        // generator regression comment above this describe block).
        expect(md).toContain(f.explanation.split('\n').map((l) => l.replace(/^(#|---|```)/, '\\$1')).join('\n'));
      }
      return true;
    }), { numRuns: 300 });
  });
  // The tag-matching regex below is deliberately loose (any `<word …>`
  // shape) — the claim under test is narrow: toMarkdown() itself never
  // MANUFACTURES a tag that was not already present, character for character,
  // somewhere in the input. It generates no HTML at all; anything tag-shaped
  // in the output can only be a model string (summary/type/quote/explanation/
  // strength) that toMarkdown passed through, per this file's own "no HTML is
  // ever generated here" guarantee.
  const HTML_TAG = /<[a-zA-Z][^<>]*>/g;
  it('never throws and never emits a raw HTML tag it did not receive', () => {
    fc.assert(fc.property(res, (r) => {
      expect(() => toMarkdown(r, { lang: 'fr', date })).not.toThrow();
      const md = toMarkdown(r, { lang: 'fr', date });
      const inputText = [r.summary, ...r.flaws.flatMap((f) => [f.type, f.quote, f.explanation]), ...r.strengths].join('\n');
      const inputTags = inputText.match(HTML_TAG) ?? [];
      const outputTags = md.match(HTML_TAG) ?? [];
      for (const tag of outputTags) expect(inputTags).toContain(tag);
      return true;
    }), { numRuns: 300 });
  });
});
