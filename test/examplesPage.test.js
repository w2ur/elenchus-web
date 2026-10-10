// @vitest-environment node
//
// E3: the Examples page, the front page's example cards and the method band.
// The components are rendered through Astro's container API (same compiler
// and escaping as the build; see test/sampleResult.test.js) and parsed with
// JSDOM, so the assertions read the markup a visitor gets.
//
// Fixtures are synthetic and live here, never under src/data/samples/: a
// sample there is a real model run written by scripts/freeze-sample.mjs.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import ExamplesPage from '../src/components/ExamplesPage.astro';
import Landing from '../src/components/Landing.astro';
import MethodBand from '../src/components/MethodBand.astro';
import { examplesCopy, landingCopy } from '../src/lib/pageCopy.js';
import { EXAMPLE_IDS } from '../src/lib/samples.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');
const HOSTILE = '<img src=x onerror=alert(1)>';

function sample(id, lang, overrides = {}) {
  return {
    id,
    lang,
    title: `Synthetic ${id} ${lang}`,
    text: `First synthetic paragraph for ${id}.\n\nSecond synthetic paragraph.`,
    translated: lang === 'fr',
    result: {
      summary: `Synthetic summary ${id}.`,
      score: 'weak',
      flaws: [{ type: 'Hasty generalization', quote: 'everyone', explanation: 'One case.', severity: 'significant' }],
      strengths: [],
    },
    servedBy: 'example/model-a:free',
    promptVersion: 'v2',
    date: '2026-10-10',
    ...overrides,
  };
}

let container;
beforeAll(async () => {
  container = await AstroContainer.create();
});

async function doc(Component, props) {
  const html = await container.renderToString(Component, { props });
  return { html, doc: new JSDOM(`<body>${html}</body>`).window.document };
}

describe('the Examples page', () => {
  it.each(['en', 'fr'])('%s: with no run, says so once and keeps every anchor', async (lang) => {
    const { doc: d } = await doc(ExamplesPage, { lang, ids: EXAMPLE_IDS, samples: [null, null, null] });
    expect(d.querySelector('h1').textContent).toBe(examplesCopy[lang].heading);
    expect(d.querySelector('.notice').textContent).toContain(examplesCopy[lang].empty);
    for (const id of EXAMPLE_IDS) expect(d.getElementById(id)).not.toBeNull();
    expect(d.querySelectorAll('.house-sample')).toHaveLength(0);
    // The page-level note stands for all three; no per-section repeat.
    expect(d.querySelectorAll('.example-missing')).toHaveLength(0);
  });

  it('with some runs, shows each in full and names the missing one', async () => {
    const samples = [sample('2-mixed', 'en'), null, sample('1-sound', 'en')];
    const { doc: d } = await doc(ExamplesPage, { lang: 'en', ids: EXAMPLE_IDS, samples });
    expect(d.querySelector('.notice')).toBeNull();
    expect(d.querySelectorAll('.house-sample')).toHaveLength(2);
    const mixed = d.getElementById('2-mixed');
    expect(mixed.querySelector('.example-text-title').textContent).toBe('Synthetic 2-mixed en');
    // Paragraph breaks survive: two <p> in the text, not one run-on block.
    expect(mixed.querySelectorAll('.example-text > p:not(.example-text-label)')).toHaveLength(2);
    expect(mixed.querySelector('.house-sample-label').textContent).toMatch(/AI-generated/);
    expect(d.getElementById('3-short').querySelector('.example-missing').textContent).toBe(examplesCopy.en.missing);
  });

  it('escapes the saved text: a hostile title or paragraph stays text', async () => {
    const s = sample('3-short', 'en', { title: HOSTILE, text: HOSTILE });
    const { html, doc: d } = await doc(ExamplesPage, { lang: 'en', ids: EXAMPLE_IDS, samples: [null, s, null] });
    expect(d.querySelector('img')).toBeNull();
    expect(html).toContain('&lt;img');
  });

  // Owner decision 8 (2026-10-10): saved output is labelled AI-generated and
  // names its model wherever it is shown. The label does it per run; the
  // intro says so for the page, and says the French texts are translations.
  it.each([
    ['en', /AI-generated/, /names the model/, /translations of these English originals/],
    ['fr', /générée par IA/, /nomme le modèle/, /traductions des originaux anglais/],
  ])('%s: the intro states provenance', (lang, ai, model, translated) => {
    const intro = examplesCopy[lang].intro.join(' ');
    expect(intro).toMatch(ai);
    expect(intro).toMatch(/date/);
    expect(intro).toMatch(model);
    expect(intro).toMatch(translated);
  });

  it('both pages pass /examples/ to Layout, so canonical and hreflang are emitted', () => {
    for (const p of ['src/pages/examples.astro', 'src/pages/fr/examples.astro']) {
      expect(src(p)).toMatch(/<Layout [^>]*path="\/examples\/"/);
    }
  });
});

describe('the front page below the fold', () => {
  it.each(['en', 'fr'])('%s: three example cards link to their Examples anchors', async (lang) => {
    const { doc: d } = await doc(Landing, { lang, examples: [] });
    const base = lang === 'fr' ? '/fr/examples/' : '/examples/';
    const hrefs = [...d.querySelectorAll('.example-cards a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(EXAMPLE_IDS.map((id) => `${base}#${id}`));
  });

  it('a card carries its run title and score once the run exists', async () => {
    const { doc: d } = await doc(Landing, { lang: 'en', examples: [sample('3-short', 'en')] });
    const card = d.querySelector('.example-cards a[href="/examples/#3-short"]');
    expect(card.querySelector('.example-card-title').textContent).toContain('Synthetic 3-short en');
    expect(card.querySelector('.score-badge.weak')).not.toBeNull();
  });

  // Owner decision 18 (2026-10-10): sentence-case headings, no kickers.
  it.each(['en', 'fr'])('%s: every landing heading is a sentence-case h2, not an eyebrow', async (lang) => {
    const { doc: d } = await doc(Landing, { lang, examples: [] });
    const h2s = [...d.querySelectorAll('h2')];
    expect(h2s.length).toBe(4);
    for (const h of h2s) {
      expect(h.className).toBe('section-heading');
      const t = h.textContent.trim();
      expect(t[0]).toBe(t[0].toUpperCase());
      expect(t.slice(1)).not.toBe(t.slice(1).toUpperCase());
    }
  });

  it.each(['en', 'fr'])('%s: copy carries no em dash', (lang) => {
    const C = landingCopy[lang];
    const E = examplesCopy[lang];
    const all = [
      C.methodHeading, C.getHeading, C.getCta, ...C.method.flatMap((m) => [m.caption, m.line]),
      E.title, E.description, E.heading, ...E.intro, E.empty, E.missing, E.textLabel,
      ...Object.values(E.kinds).flatMap((k) => [k.name, k.body]),
    ];
    for (const s of all) expect(s, s).not.toMatch(/—/);
  });
});

describe('the method band', () => {
  it('EN captions are the four agreed ones, FR has four too', () => {
    expect(landingCopy.en.method.map((m) => m.caption)).toEqual([
      'Finds the conclusion', 'Traces what supports it', 'Flags the gap', 'Scores the whole',
    ]);
    expect(landingCopy.fr.method).toHaveLength(4);
  });

  it('four inline contour drawings, currentColor, decorative, no raster', async () => {
    const { doc: d } = await doc(MethodBand, { lang: 'en' });
    const svgs = [...d.querySelectorAll('.method-panel svg')];
    expect(svgs).toHaveLength(4);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
      // Only currentColor fills: a hex here would be one scheme's colour.
      for (const el of svg.querySelectorAll('[fill], [stroke]')) {
        for (const a of ['fill', 'stroke']) {
          const v = el.getAttribute(a);
          if (v !== null) expect(['none', 'currentColor']).toContain(v);
        }
      }
    }
    expect(d.querySelector('img, image')).toBeNull();
  });
});
