// @vitest-environment node
//
// SampleResult.astro rendered through Astro's container API
// (experimental_AstroContainer, Astro 7) — the same compiler and the same
// `{}` auto-escaping the static build uses, so this is the build-time path a
// saved run takes into the HTML, not a reimplementation of it. Node
// environment: the container renders server-side; the output string is then
// parsed with JSDOM so the hostile-input checks can be live-element checks
// (querySelector('img') is null) as well as escaped-markup ones (the HTML
// carries `&lt;img`, never `<img`) — never a textContent read, which reads
// back the same whether a field was escaped or not (see CLAUDE.md, Testing).
//
// Fixtures are synthetic and live here, never under src/data/samples/: a
// sample there is a real model run written by scripts/freeze-sample.mjs.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import SampleResult from '../src/components/SampleResult.astro';
import { strings } from '../src/lib/strings.js';

const HOSTILE = '<img src=x onerror=alert(1)>';

/** Synthetic sample, same keys and order as validateSampleFile() expects. */
function sample(overrides = {}) {
  return {
    id: '2-mixed',
    lang: 'en',
    title: 'Synthetic title',
    text: 'Synthetic analysed text.',
    translated: false,
    result: {
      summary: 'Synthetic summary: the argument leans on one anecdote.',
      score: 'moderate',
      flaws: [
        {
          type: 'Hasty generalization',
          quote: 'everyone agrees',
          explanation: 'One anecdote does not establish consensus.',
          severity: 'significant',
        },
      ],
      strengths: ['Names its source.'],
    },
    servedBy: 'example/model-a:free',
    requestedModels: ['example/model-a:free', 'example/model-b:free'],
    promptVersion: 'v2',
    date: '2026-10-10',
    attempt: 1,
    rerunReason: null,
    ...overrides,
  };
}

let container;
beforeAll(async () => {
  container = await AstroContainer.create();
});

/** @returns {Promise<{ html: string, doc: Document, frame: Element }>} */
async function render(s, extra = {}) {
  const html = await container.renderToString(SampleResult, { props: { sample: s, ...extra } });
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
  return { html, doc, frame: doc.querySelector('.house-sample') };
}

describe('SampleResult.astro', () => {
  it('renders the saved summary, score, flaws and strengths into the static HTML', async () => {
    const { html, frame } = await render(sample());
    expect(frame).not.toBeNull();
    expect(html).toContain('Synthetic summary: the argument leans on one anecdote.');
    expect(frame.querySelector('.score-badge').className).toBe('score-badge moderate');
    expect(frame.querySelectorAll('.flaw-card')).toHaveLength(1);
    expect(frame.querySelector('.flaw-severity').className).toBe('flaw-severity significant');
    expect(frame.querySelectorAll('.strengths-list li')).toHaveLength(1);
    // No ids: the frame may share a page with the live result panel.
    expect(frame.querySelectorAll('[id]')).toHaveLength(0);
  });

  it('labels the run with its date, model, prompt version and "AI-generated"', async () => {
    const { frame } = await render(sample());
    const label = frame.querySelector('.house-sample-label').textContent.trim();
    expect(label).toBe('Saved run · 2026-10-10 · example/model-a:free · prompt v2 · AI-generated');
    expect(label).not.toContain(strings.en.sampleTranslated);
  });

  it('labels a French translated run in French and says it was translated', async () => {
    const { frame } = await render(sample({ lang: 'fr', translated: true }));
    const label = frame.querySelector('.house-sample-label').textContent;
    expect(label).toContain('Analyse enregistrée · 2026-10-10 · example/model-a:free · prompt v2 · générée par IA');
    expect(label).toContain("Texte traduit de l'original anglais");
    expect(frame.getAttribute('lang')).toBe('fr');
    expect(frame.querySelector('h3').textContent).toBe(strings.fr.summaryHeading);
  });

  it('carries the false-premises caveat next to the score', async () => {
    const { frame } = await render(sample());
    expect(frame.querySelector('.result-summary-card .score-caveat').textContent).toBe(strings.en.scoreCaveat);
  });

  // Beside the input card the frame sits directly under the page's h1, where
  // h3s broke the heading order (axe heading-order, Lighthouse on / with a
  // sample present, task E2).
  it('takes h2 headings when asked, h3 by default', async () => {
    const two = (await render(sample(), { headingLevel: 2 })).frame;
    expect(two.querySelectorAll('h2.result-heading').length).toBeGreaterThan(0);
    expect(two.querySelector('h3')).toBeNull();
    const three = (await render(sample())).frame;
    expect(three.querySelector('h2')).toBeNull();
  });

  // Regression: 8541afa — Astro dropped the space before the count span, so
  // the saved run read "FLAWS(3)".
  it('separates the Flaws heading from its count', async () => {
    const { frame } = await render(sample());
    const heading = [...frame.querySelectorAll('.result-heading')].find((h) => h.querySelector('.count-badge'));
    expect(heading.textContent).toBe(`${strings.en.flawsHeading} (1)`);
  });

  it('shows the no-flaws line when the saved run has none', async () => {
    const { frame } = await render(sample({ result: { summary: 's', score: 'strong', flaws: [], strengths: [] } }));
    expect(frame.querySelector('.no-flaws').textContent).toBe(strings.en.noFlaws);
    expect(frame.querySelector('.strengths-list')).toBeNull();
  });

  describe('hostile fixture — the build-time path escapes and clamps like the live one', () => {
    it('renders every hostile free-text field escaped, never as a live element', async () => {
      const { html, frame } = await render(
        sample({
          result: {
            summary: HOSTILE,
            score: 'weak',
            flaws: [{ type: HOSTILE, quote: HOSTILE, explanation: HOSTILE, severity: 'critical' }],
            strengths: [HOSTILE],
          },
        }),
      );
      expect(frame.querySelector('img')).toBeNull();
      expect(html).not.toContain('<img');
      for (const sel of ['.result-summary', '.flaw-type', '.flaw-quote', '.flaw-explanation', '.strengths-list li']) {
        const el = frame.querySelector(sel);
        expect(el.children, sel).toHaveLength(0);
        expect(el.innerHTML, sel).toContain('&lt;img');
      }
    });

    it('clamps a hostile score and severity to the fallback, never into a class', async () => {
      const { html, frame } = await render(
        sample({
          result: {
            summary: 's',
            score: 'x" onclick="alert(1)',
            flaws: [{ type: 't', quote: 'q', explanation: 'e', severity: '"><img src=x onerror=alert(1)>' }],
            strengths: [],
          },
        }),
      );
      expect(frame.querySelector('.score-badge').className).toBe('score-badge');
      expect(frame.querySelector('.score-badge').textContent).toBe(strings.en.scores.unknown);
      expect(frame.querySelector('.flaw-severity').className).toBe('flaw-severity minor');
      expect(frame.querySelector('[onclick]')).toBeNull();
      expect(frame.querySelector('img')).toBeNull();
      expect(html).not.toContain('<img');
    });

    it('escapes hostile provenance fields from the sample file', async () => {
      const { frame } = await render(sample({ servedBy: HOSTILE, date: HOSTILE, promptVersion: HOSTILE }));
      const label = frame.querySelector('.house-sample-label');
      expect(label.querySelector('img')).toBeNull();
      expect(label.innerHTML).toContain('&lt;img');
    });

    it('survives a malformed result (non-array flaws/strengths, missing summary)', async () => {
      const { frame } = await render(sample({ result: { flaws: 'nope', strengths: { a: 1 } } }));
      expect(frame.querySelector('.result-summary').textContent).toBe('');
      expect(frame.querySelector('.no-flaws')).not.toBeNull();
      expect(frame.querySelector('.strengths-list')).toBeNull();
    });
  });
});
