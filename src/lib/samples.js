// Saved samples for the front page, read at BUILD time only.
//
// src/data/samples/<id>.<lang>.json is written by scripts/freeze-sample.mjs
// (a real model run, committed as-is; see README "Saved samples"). This
// module is imported from page frontmatter, which runs in Node during
// `astro build`, and never from a client <script>: the eager glob below
// would otherwise put every file, both languages, into one shared client
// bundle. The page hands the client only its own language's samples, as a
// data-* attribute (Analyzer.astro), so the French page carries no English
// sample and loading one makes no network call.
//
// The files may be absent: the directory is empty until the owner runs the
// freeze script. That is an explicit state, not an accident: the glob then
// returns no modules, frontPageSamples() reports it once on the build
// console, and the page renders neither the sample slot nor the example
// chips. A file that IS present but malformed fails the build instead of
// being dropped quietly: a sample on the page is a public claim about what a
// model said.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { looksLikeAnalysis } from './proxyClient.js';

/**
 * Every sample file on disk, keyed by its glob path
 * ('../data/samples/2-mixed.en.json'). Empty when none has been frozen yet.
 * `import: 'default'` gives the parsed JSON itself.
 */
const FILES = import.meta.glob('../data/samples/*.json', { eager: true, import: 'default' });

/** The run both Untilt sites show (owner decision 7, 2026-10-10). */
export const SHARED_SAMPLE_ID = '2-mixed';

/** The "Try an example" chips, in toolbar order (owner decision 7). */
export const EXAMPLE_IDS = ['2-mixed', '3-short', '1-sound'];

/**
 * @typedef {object} Sample
 * @property {string} id
 * @property {'en' | 'fr'} lang
 * @property {string} title
 * @property {string} text
 * @property {boolean} translated
 * @property {unknown} result
 * @property {string} servedBy
 * @property {string[]} requestedModels
 * @property {string} promptVersion
 * @property {string} date
 * @property {number} attempt
 * @property {string | null} rerunReason
 */

/**
 * The problems that stop a file from being shown. A subset of
 * scripts/freeze-sample.mjs's validateSampleFile(), which cannot be imported
 * here: it pulls the sibling elenchus-proxy repo and jsdom, neither of which
 * exists in the Netlify build. The fields checked are the ones the page
 * reads; the full record shape is the script's own pin.
 *
 * @param {unknown} s
 * @param {string} id
 * @param {string} lang
 * @returns {string[]}
 */
export function sampleProblems(s, id, lang) {
  if (typeof s !== 'object' || s === null || Array.isArray(s)) return ['not an object'];
  const rec = /** @type {Record<string, unknown>} */ (s);
  const p = [];
  if (rec.id !== id) p.push(`id is not ${id}`);
  if (rec.lang !== lang) p.push(`lang is not ${lang}`);
  for (const k of ['title', 'text', 'servedBy', 'promptVersion', 'date']) {
    if (typeof rec[k] !== 'string' || !rec[k].trim()) p.push(`${k} must be a non-empty string`);
  }
  if (typeof rec.translated !== 'boolean') p.push('translated must be a boolean');
  if (!looksLikeAnalysis(rec.result)) p.push('result fails looksLikeAnalysis');
  return p;
}

/**
 * One sample, from the page language's own file only: the lookup is by the
 * exact `<id>.<lang>.json` name, so no other language's file is read.
 * Returns null when that file does not exist; throws when it exists and is
 * malformed. Pure: no fetch, no filesystem call, only a lookup in `files`.
 *
 * @param {string} id
 * @param {'en' | 'fr'} lang
 * @param {Record<string, unknown>} [files] glob result (injectable for tests)
 * @returns {Sample | null}
 */
export function loadSample(id, lang, files = FILES) {
  const name = `${id}.${lang}.json`;
  const key = Object.keys(files).find((k) => k.split('/').pop() === name);
  if (key === undefined) return null;
  const sample = files[key];
  const problems = sampleProblems(sample, id, lang);
  if (problems.length > 0) {
    throw new Error(`src/data/samples/${name} cannot be shown: ${problems.join('; ')}`);
  }
  return /** @type {Sample} */ (sample);
}

/**
 * What the front page renders for one language: the shared run for the slot
 * beside the input card, and the example chips (present files only, in
 * EXAMPLE_IDS order). With no file for this language at all, says so once on
 * the build console and returns nothing to render.
 *
 * @param {'en' | 'fr'} lang
 * @param {Record<string, unknown>} [files]
 * @param {(msg: string) => void} [note]
 * @returns {{ shared: Sample | null, examples: Sample[] }}
 */
export function frontPageSamples(lang, files = FILES, note = (msg) => console.info(msg)) {
  const shared = loadSample(SHARED_SAMPLE_ID, lang, files);
  const examples = EXAMPLE_IDS.map((id) => loadSample(id, lang, files)).filter((s) => s !== null);
  if (shared === null && examples.length === 0) {
    note(`\n[samples] no saved sample for "${lang}" under src/data/samples/: the sample slot and the example chips are not rendered. Run scripts/freeze-sample.mjs to create them.`);
  }
  return { shared, examples };
}

/**
 * The slice of a sample the client needs to load it into the analyzer: the
 * text for the box, the result and the provenance fields for the label. The
 * request metadata (requestedModels, attempt, rerunReason) stays out of the
 * page.
 *
 * @param {Sample} s
 */
export function clientSample(s) {
  return {
    id: s.id,
    lang: s.lang,
    title: s.title,
    text: s.text,
    translated: s.translated,
    result: s.result,
    servedBy: s.servedBy,
    promptVersion: s.promptVersion,
    date: s.date,
  };
}
