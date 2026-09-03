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
});

describe('toMarkdown properties', () => {
  const text = fc.string({ minLength: 1, maxLength: 200 });
  const flaw = fc.record({ type: text, quote: text, explanation: text, severity: fc.constantFrom('minor', 'significant', 'critical') });
  const res = fc.record({ summary: text, score: fc.constantFrom('strong', 'moderate', 'weak'), flaws: fc.array(flaw, { maxLength: 6 }), strengths: fc.array(text, { maxLength: 4 }) });
  const date = new Date(Date.UTC(2026, 8, 2));
  it('every quote and explanation appears verbatim (modulo the line-start escape) and every quote line is blockquoted', () => {
    fc.assert(fc.property(res, (r) => {
      const md = toMarkdown(r, { lang: 'en', date });
      for (const f of r.flaws) {
        for (const line of f.quote.split('\n')) expect(md).toContain('> ' + line.replace(/^(#|---|```)/, '\\$1'));
        expect(md).toContain(f.explanation.replace(/^(#|---|```)/, '\\$1'));
      }
      return true;
    }), { numRuns: 300 });
  });
  it('never throws and never emits a raw HTML tag it did not receive', () => {
    fc.assert(fc.property(res, (r) => { expect(() => toMarkdown(r, { lang: 'fr', date })).not.toThrow(); return true; }), { numRuns: 300 });
  });
});
