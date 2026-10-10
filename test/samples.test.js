// src/lib/samples.js (build-time loader) and the client half of "Try an
// example" in src/lib/render.js (pickSample/renderSample).
//
// Fixtures are synthetic and live here, never under src/data/samples/: a
// file there is a real model run written by scripts/freeze-sample.mjs. Every
// call below passes its own `files` map, so these tests do not depend on
// whether the owner has frozen any sample yet.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAnalysis, renderSample, pickSample } from '../src/lib/render.js';
import {
  EXAMPLE_IDS,
  SHARED_SAMPLE_ID,
  clientSample,
  frontPageSamples,
  loadSample,
  sampleProblems,
} from '../src/lib/samples.js';
import { strings } from '../src/lib/strings.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOSTILE = '<img src=x onerror=alert(1)>';

/** Synthetic sample, same keys and order as validateSampleFile() expects. */
function sample(id, lang, overrides = {}) {
  return {
    id,
    lang,
    title: `Synthetic ${id} ${lang}`,
    text: `Synthetic text for ${id} in ${lang}, long enough to analyze in the box.`,
    translated: lang === 'fr',
    result: {
      summary: `Synthetic summary ${id} ${lang}.`,
      score: 'moderate',
      flaws: [{ type: 'Hasty generalization', quote: 'everyone', explanation: 'One case.', severity: 'significant' }],
      strengths: ['Names its source.'],
    },
    servedBy: 'example/model-a:free',
    requestedModels: ['example/model-a:free'],
    promptVersion: 'v2',
    date: '2026-10-10',
    attempt: 1,
    rerunReason: null,
    ...overrides,
  };
}

/** A glob-shaped map, keyed the way import.meta.glob keys it. */
function files(...records) {
  return Object.fromEntries(records.map((r) => [`../data/samples/${r.id}.${r.lang}.json`, r]));
}

const ALL = files(
  ...['1-sound', '2-mixed', '3-short'].flatMap((id) => [sample(id, 'en'), sample(id, 'fr')]),
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSample', () => {
  it("returns the page language's own file and never the other language's", () => {
    expect(loadSample('2-mixed', 'fr', ALL).lang).toBe('fr');
    expect(loadSample('2-mixed', 'en', ALL).lang).toBe('en');
    // Only the English file exists: the French page gets nothing, not a fallback.
    expect(loadSample('2-mixed', 'fr', files(sample('2-mixed', 'en')))).toBeNull();
  });

  it('returns null when no file exists (the state before any sample is frozen)', () => {
    expect(loadSample('2-mixed', 'en', {})).toBeNull();
  });

  it('fails the build on a present but malformed file, naming it', () => {
    const broken = files(sample('2-mixed', 'en', { result: {} }));
    expect(() => loadSample('2-mixed', 'en', broken)).toThrow(/2-mixed\.en\.json.*looksLikeAnalysis/);
    // A file whose content claims another language is not shown under this one.
    const mislabelled = { '../data/samples/2-mixed.en.json': sample('2-mixed', 'fr') };
    expect(() => loadSample('2-mixed', 'en', mislabelled)).toThrow(/lang is not en/);
  });

  it('makes zero network calls', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('no fetch expected');
    });
    for (const id of EXAMPLE_IDS) for (const lang of ['en', 'fr']) loadSample(id, lang, ALL);
    frontPageSamples('fr', ALL, () => {});
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('sampleProblems', () => {
  it('accepts the synthetic fixture and rejects a hollow one', () => {
    expect(sampleProblems(sample('3-short', 'en'), '3-short', 'en')).toEqual([]);
    expect(sampleProblems(null, '3-short', 'en')).toEqual(['not an object']);
    expect(sampleProblems({ id: '3-short', lang: 'en' }, '3-short', 'en').length).toBeGreaterThan(3);
  });
});

describe('frontPageSamples', () => {
  it('gives the shared run and the chips in toolbar order', () => {
    const { shared, examples } = frontPageSamples('en', ALL, () => {});
    expect(shared.id).toBe(SHARED_SAMPLE_ID);
    expect(examples.map((s) => s.id)).toEqual(EXAMPLE_IDS);
    expect(examples.every((s) => s.lang === 'en')).toBe(true);
  });

  it('with no file at all, renders nothing and says so once on the build console', () => {
    const note = vi.fn();
    expect(frontPageSamples('fr', {}, note)).toEqual({ shared: null, examples: [] });
    expect(note).toHaveBeenCalledTimes(1);
    expect(note.mock.calls[0][0]).toMatch(/no saved sample for "fr".*not rendered/);
  });

  it('with some files, renders what exists and stays quiet', () => {
    const note = vi.fn();
    const { shared, examples } = frontPageSamples('en', files(sample('3-short', 'en')), note);
    expect(shared).toBeNull();
    expect(examples.map((s) => s.id)).toEqual(['3-short']);
    expect(note).not.toHaveBeenCalled();
  });
});

describe('clientSample', () => {
  it('keeps what the page needs and leaves the request metadata out', () => {
    const c = clientSample(sample('2-mixed', 'fr', { attempt: 2, rerunReason: 'owner rejected' }));
    expect(Object.keys(c).sort()).toEqual(
      ['date', 'id', 'lang', 'promptVersion', 'result', 'servedBy', 'text', 'title', 'translated'].sort(),
    );
  });
});

/** The live result panel's elements, provenance line included. */
function panel() {
  document.body.innerHTML = `
    <p id="result-provenance" hidden></p>
    <p id="result-summary"></p>
    <span id="result-score"></span>
    <span id="flaws-count"></span>
    <p id="no-flaws" hidden></p>
    <div id="flaws-list"></div>
    <div id="strengths-section" hidden><ul id="strengths-list"></ul></div>
  `;
  const $ = (id) => document.getElementById(id);
  return {
    provenanceEl: $('result-provenance'),
    summaryEl: $('result-summary'),
    scoreBadgeEl: $('result-score'),
    flawsCountEl: $('flaws-count'),
    noFlawsEl: $('no-flaws'),
    flawsListEl: $('flaws-list'),
    strengthsSectionEl: $('strengths-section'),
    strengthsListEl: $('strengths-list'),
  };
}

describe('loading an example into the live panel', () => {
  it('sets the provenance line on load and a live renderAnalysis() clears it', () => {
    const el = panel();
    renderSample(clientSample(sample('2-mixed', 'en')), el, strings.en);
    expect(el.provenanceEl.hidden).toBe(false);
    expect(el.provenanceEl.textContent).toBe(
      'Saved run · 2026-10-10 · example/model-a:free · prompt v2 · AI-generated',
    );
    expect(el.summaryEl.textContent).toBe('Synthetic summary 2-mixed en.');

    renderAnalysis({ summary: 'A live run.', score: 'strong', flaws: [], strengths: [] }, el, strings.en);
    expect(el.provenanceEl.hidden).toBe(true);
    expect(el.provenanceEl.textContent).toBe('');
    expect(el.summaryEl.textContent).toBe('A live run.');
  });

  it('carries the translated line for a French sample, in French', () => {
    const el = panel();
    renderSample(clientSample(sample('3-short', 'fr')), el, strings.fr);
    expect(el.provenanceEl.textContent).toContain('générée par IA');
    expect(el.provenanceEl.textContent).toContain("Texte traduit de l'original anglais");
    expect(el.provenanceEl.querySelector('br')).not.toBeNull();
  });

  it('writes hostile provenance values as text, never as a live element', () => {
    const el = panel();
    renderSample(clientSample(sample('2-mixed', 'en', { servedBy: HOSTILE, date: HOSTILE })), el, strings.en);
    expect(el.provenanceEl.querySelector('img')).toBeNull();
    expect(el.provenanceEl.innerHTML).toContain('&lt;img');
  });

  it('finds a sample in the embedded JSON and makes zero network calls doing it', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('no fetch expected');
    });
    const json = JSON.stringify(EXAMPLE_IDS.map((id) => clientSample(sample(id, 'fr'))));
    const found = pickSample(json, '3-short');
    expect(found.id).toBe('3-short');
    renderSample(found, panel(), strings.fr);
    expect(spy).not.toHaveBeenCalled();
  });

  it('gives null, never a throw, for malformed JSON or an unknown id', () => {
    expect(pickSample('{not json', '2-mixed')).toBeNull();
    expect(pickSample(undefined, '2-mixed')).toBeNull();
    expect(pickSample('{"id":"2-mixed"}', '2-mixed')).toBeNull();
    expect(pickSample('[]', '2-mixed')).toBeNull();
  });
});

// The FR page must carry no English sample: the glob in samples.js bundles
// every file it matches into whatever imports it, so it must never reach a
// client <script>. The pages read it in frontmatter (build time) and pass
// Analyzer only their own language's samples.
describe('the sample files stay out of the client bundle', () => {
  const analyzer = readFileSync(join(ROOT, 'src/components/Analyzer.astro'), 'utf8');
  const clientScript = analyzer.slice(analyzer.indexOf('<script type="module">'));

  it("Analyzer's client script never imports samples.js", () => {
    expect(clientScript).toContain("from '../lib/render.js'");
    expect(clientScript).not.toMatch(/samples\.js/);
    expect(clientScript).not.toMatch(/import\.meta\.glob/);
  });

  it.each([
    ['src/pages/index.astro', 'en'],
    ['src/pages/fr/index.astro', 'fr'],
  ])('%s loads its own language in frontmatter', (file, lang) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const frontmatter = src.split('---')[1];
    expect(frontmatter).toMatch(/import \{ frontPageSamples \} from '[./]+lib\/samples\.js'/);
    expect(frontmatter).toContain(`frontPageSamples('${lang}')`);
  });
});
