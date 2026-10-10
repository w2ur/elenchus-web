// @vitest-environment node
//
// E3: the Examples page.
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
import { examplesCopy } from '../src/lib/pageCopy.js';
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

describe('the Examples page copy', () => {
  it.each(['en', 'fr'])('%s: carries no em dash', (lang) => {
    const E = examplesCopy[lang];
    const all = [E.title, E.description, E.heading, ...E.intro, E.empty, E.missing, E.textLabel, ...Object.values(E.kinds).flatMap((k) => [k.name, k.body])];
    for (const s of all) expect(s, s).not.toMatch(/—/);
  });
});
