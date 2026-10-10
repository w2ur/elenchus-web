// @vitest-environment node
//
// The front page's first screen (house direction B, task E2), rendered
// through Astro's container API: Analyzer.astro's server-rendered markup with
// and without saved samples. Same approach as test/sampleResult.test.js; the
// client <script> is not run here (see CLAUDE.md, Testing). Synthetic
// fixtures only, never under src/data/samples/.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import Analyzer from '../src/components/Analyzer.astro';
import { strings } from '../src/lib/strings.js';
import { toMarkdown } from '../src/lib/exportMarkdown.js';
import { landingCopy } from '../src/lib/pageCopy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function sample(id, lang) {
  return {
    id,
    lang,
    title: `Synthetic title ${id} ${lang}`,
    text: `Synthetic text ${id} ${lang} </script><img src=x onerror=alert(1)>`,
    translated: lang === 'fr',
    result: { summary: `Synthetic summary ${id}`, score: 'weak', flaws: [], strengths: [] },
    servedBy: 'example/model-a:free',
    requestedModels: ['example/model-a:free'],
    promptVersion: 'v2',
    date: '2026-10-10',
    attempt: 1,
    rerunReason: null,
  };
}

const BASE_PROPS = { proxyUrl: 'https://proxy.example', webKey: 'k', turnstileSiteKey: 's', showHeading: false };

let container;
beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(props) {
  const html = await container.renderToString(Analyzer, { props: { ...BASE_PROPS, ...props } });
  return { html, doc: new JSDOM(`<!doctype html><body>${html}</body>`).window.document };
}

describe('Analyzer first screen, no sample frozen yet', () => {
  it('renders the card with no toolbar, no sample slot and no embedded samples', async () => {
    const { doc } = await render({ lang: 'en' });
    expect(doc.querySelector('.input-card #text-input')).not.toBeNull();
    expect(doc.querySelector('.input-toolbar')).toBeNull();
    expect(doc.querySelector('.first-screen-sample')).toBeNull();
    expect(doc.querySelector('#sample-data')).toBeNull();
    expect(doc.querySelector('.first-screen').classList.contains('has-sample')).toBe(false);
  });
});

describe('Analyzer first screen, with samples', () => {
  const examples = ['2-mixed', '3-short', '1-sound'].map((id) => sample(id, 'fr'));

  it('labels each "Try an example" chip with its sample title, in order', async () => {
    const { doc } = await render({ lang: 'fr', shared: examples[0], examples });
    const toolbar = doc.querySelector('.input-toolbar');
    expect(toolbar.textContent).toContain(strings.fr.examplesLabel);
    const chips = [...toolbar.querySelectorAll('button.example-chip')];
    expect(chips.map((c) => c.textContent)).toEqual(examples.map((s) => s.title));
    expect(chips.map((c) => c.dataset.sampleId)).toEqual(['2-mixed', '3-short', '1-sound']);
    for (const c of chips) expect(c.getAttribute('type')).toBe('button');
  });

  it('puts the shared run beside the card, in the sample frame, with h2 headings', async () => {
    const { doc } = await render({ lang: 'fr', shared: examples[0], examples });
    expect(doc.querySelector('.first-screen').classList.contains('has-sample')).toBe(true);
    const slot = doc.querySelector('.first-screen > .first-screen-sample .house-sample');
    expect(slot).not.toBeNull();
    expect(slot.querySelector('h3')).toBeNull();
    expect(slot.querySelector('h2.eyebrow')).not.toBeNull();
  });

  it('embeds the samples as an escaped data attribute, never as markup', async () => {
    const { html, doc } = await render({ lang: 'fr', shared: examples[0], examples });
    const data = JSON.parse(doc.querySelector('#sample-data').dataset.samples);
    expect(data.map((s) => s.id)).toEqual(['2-mixed', '3-short', '1-sound']);
    expect(data.every((s) => s.lang === 'fr')).toBe(true);
    expect(data[0]).not.toHaveProperty('requestedModels');
    // The hostile text stays inside the quoted attribute (where "<" is inert
    // and Astro escapes the quote) and round-trips exactly: no live <img>.
    expect(doc.querySelector('img')).toBeNull();
    expect(data[0].text).toBe(examples[0].text);
    expect(html).toMatch(/data-samples="\[\{&quot;id&quot;/);
  });
});

describe('Analyzer footer row and result card', () => {
  it.each(['en', 'fr'])('%s: the free-tier line links to the privacy section built from privacyUrl', async (lang) => {
    const { doc } = await render({ lang });
    const line = doc.querySelector('.input-footer .free-tier-line');
    expect(line.textContent).toContain(strings[lang].freeTierLine);
    expect(line.querySelector('a').getAttribute('href')).toBe(`${strings[lang].privacyUrl}#elenchus-web`);
    // Counter, line and Analyze share the one footer row.
    const footer = doc.querySelector('.input-footer');
    expect(footer.querySelector('#char-count')).not.toBeNull();
    expect(footer.querySelector('#analyze-btn')).not.toBeNull();
    // Turnstile sits under the row, still inside the form (its token input
    // must land in the FormData the submit handler reads).
    const turnstile = doc.querySelector('#analyze-form > #turnstile-container');
    expect(turnstile).not.toBeNull();
    expect(footer.compareDocumentPosition(turnstile) & 4).toBe(4);
  });

  it('the bordered free-tier box is gone', async () => {
    const { doc } = await render({ lang: 'en' });
    expect(doc.querySelector('#free-tier-notice')).toBeNull();
  });

  it.each(['en', 'fr'])('%s: the false-premises caveat sits in the live summary card', async (lang) => {
    const { doc } = await render({ lang });
    expect(doc.querySelector('#result-summary-card .score-caveat').textContent).toBe(strings[lang].scoreCaveat);
    expect(doc.querySelector('#result-state > #result-provenance[hidden]')).not.toBeNull();
  });

  it('the Details link is never a second privacy literal in the component', () => {
    const src = readFileSync(join(ROOT, 'src/components/Analyzer.astro'), 'utf8');
    expect(src).not.toMatch(/untilt\.app\/(fr\/)?privacy/);
    expect(src).toContain('`${T.privacyUrl}#elenchus-web`');
  });
});

// Regression (task E2): a comment in strings.js naming the key put a third
// "privacyUrl" line in the file, and elenchus/scripts/check-privacy-sync.sh
// (assertion 5, which greps line numbers) reported the two real entries as
// "not one per language block". Exactly two lines may name it.
describe('strings.js names privacyUrl on exactly two lines', () => {
  it('one per language block, nothing else', () => {
    const src = readFileSync(join(ROOT, 'src/lib/strings.js'), 'utf8');
    const lines = src.split('\n').filter((l) => l.includes('privacyUrl'));
    expect(lines).toHaveLength(2);
    for (const l of lines) expect(l).toMatch(/^\s*privacyUrl: '/);
  });
});

describe('first-screen copy', () => {
  // The caveat is the export's own claim, minus its em dash.
  it.each(['en', 'fr'])('%s: scoreCaveat says what the Markdown export says', (lang) => {
    const md = toMarkdown({ summary: '', score: 'strong', flaws: [], strengths: [] }, { lang, date: new Date(0) });
    const exportCaveat = md.trimEnd().split('\n').pop().replace(/^_|_$/g, '');
    expect(strings[lang].scoreCaveat).toBe(exportCaveat.replace(/ — /, lang === 'fr' ? ' : ' : ': '));
  });

  it.each(['en', 'fr'])('%s: no em dash in the new first-screen copy', (lang) => {
    const T = strings[lang];
    for (const s of [T.freeTierLine, T.freeTierDetails, T.examplesLabel, T.scoreCaveat, landingCopy[lang].heroLede]) {
      expect(s).not.toContain('—');
    }
  });

  it.each(['en', 'fr'])('%s: the lede still opens on the fact-check claim and drops the caveat', (lang) => {
    const lede = landingCopy[lang].heroLede;
    expect(lede).toMatch(lang === 'en' ? /^Elenchus does not check facts\./ : /^Elenchus ne vérifie pas les faits\./);
    expect(lede).not.toMatch(/premises|prémisses/);
  });
});
