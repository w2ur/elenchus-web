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
import { SCORES, SEVERITIES } from './clamp.js';

/**
 * Every sample file on disk, keyed by its glob path
 * ('../data/samples/2-mixed.en.json'). Empty when none has been frozen yet.
 * `import: 'default'` gives the parsed JSON itself.
 *
 * Vite (astro build, vitest) rewrites the glob call at transform time and
 * defines import.meta.env. Plain Node does neither: scripts/freeze-sample.mjs
 * imports this module for validateSampleFile(), and there the call would
 * throw at module scope, so it gets no files instead.
 */
const FILES = import.meta.env
  ? import.meta.glob('../data/samples/*.json', { eager: true, import: 'default' })
  : {};

/** The testbed ids a sample can be frozen from (scripts/freeze-sample.mjs). */
export const SAMPLE_IDS = ['1-sound', '2-mixed', '3-short'];

/** The languages a sample exists in. */
export const SAMPLE_LANGS = ['en', 'fr'];

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
 * Full shape check of a sample record: every key, in order, with its type and
 * its invariants. Returns the list of problems, empty when the record is
 * acceptable. One check, two callers: scripts/freeze-sample.mjs runs it
 * before writing a file, and loadSample() below runs it on every file the
 * build ships, so a file edited by hand after the freeze fails the build.
 *
 * @param {unknown} s
 * @returns {string[]}
 */
export function validateSampleFile(s) {
  const KEYS = ['id', 'lang', 'title', 'text', 'translated', 'result', 'servedBy',
    'requestedModels', 'promptVersion', 'date', 'attempt', 'rerunReason'];
  if (typeof s !== 'object' || s === null || Array.isArray(s)) return ['not an object'];
  const rec = /** @type {Record<string, any>} */ (s);
  const p = [];
  if (JSON.stringify(Object.keys(rec)) !== JSON.stringify(KEYS)) p.push('keys differ from the expected shape or order');
  if (!SAMPLE_IDS.includes(rec.id)) p.push('id is not a testbed id');
  if (!SAMPLE_LANGS.includes(rec.lang)) p.push('lang is not en|fr');
  for (const k of ['title', 'text', 'servedBy']) {
    if (typeof rec[k] !== 'string' || !rec[k].trim()) p.push(`${k} must be a non-empty string`);
  }
  if (rec.translated !== (rec.lang === 'fr')) p.push('translated must be true exactly for fr');
  if (!Array.isArray(rec.requestedModels) || rec.requestedModels.length === 0
    || !rec.requestedModels.every((m) => typeof m === 'string' && m)) p.push('requestedModels must be a non-empty string array');
  if (typeof rec.promptVersion !== 'string' || !/^v\d+$/.test(rec.promptVersion)) p.push('promptVersion must match ^v\\d+$');
  if (typeof rec.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) p.push('date must be YYYY-MM-DD');
  if (!Number.isInteger(rec.attempt) || rec.attempt < 1) p.push('attempt must be an integer >= 1');
  else if (rec.attempt === 1 && rec.rerunReason !== null) p.push('attempt 1 must have rerunReason null');
  else if (rec.attempt > 1 && (typeof rec.rerunReason !== 'string' || !rec.rerunReason.trim())) p.push('attempt > 1 needs a rerunReason');
  if (!looksLikeAnalysis(rec.result)) p.push('result fails looksLikeAnalysis');
  else {
    // The render clamps an unknown enum to 'unknown' / 'minor' without a word;
    // on a frozen file that would show a label the model never gave, so the
    // build refuses it instead.
    if (!SCORES.includes(rec.result.score)) p.push('result.score is not one of SCORES');
    const flaws = Array.isArray(rec.result.flaws) ? rec.result.flaws : [];
    if (flaws.some((f) => !SEVERITIES.includes(f?.severity))) p.push('a flaw severity is not one of SEVERITIES');
  }
  return p;
}

/**
 * The problems that stop the file `<id>.<lang>.json` from being shown: the
 * full validateSampleFile() check, plus the record naming the same id and
 * language as its file name.
 *
 * @param {unknown} s
 * @param {string} id
 * @param {string} lang
 * @returns {string[]}
 */
export function sampleProblems(s, id, lang) {
  const p = validateSampleFile(s);
  if (typeof s !== 'object' || s === null || Array.isArray(s)) return p;
  const rec = /** @type {Record<string, unknown>} */ (s);
  if (rec.id !== id) p.push(`id is not ${id}`);
  if (rec.lang !== lang) p.push(`lang is not ${lang}`);
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

/**
 * Whether this language has at least one saved run to show. The Examples nav
 * item (ToolNav.astro) is rendered only when it does: before the owner
 * freezes any sample, the item would lead every visitor to a page that says
 * the runs are being prepared. Same one-language lookup and the same
 * fail-on-malformed rule as loadSample(), and no build note: the pages that
 * render samples already print one.
 *
 * @param {string} lang
 * @param {Record<string, unknown>} [files]
 * @returns {boolean}
 */
export function hasSamples(lang, files = FILES) {
  const l = /** @type {'en' | 'fr'} */ (lang);
  return EXAMPLE_IDS.some((id) => loadSample(id, l, files) !== null);
}

/**
 * What the Examples page renders for one language: every example id in
 * EXAMPLE_IDS order, each paired with its run or null, so the page can keep
 * a section (and its anchor) for a run that is not frozen yet. Same
 * one-language lookup, same fail-on-malformed rule, and the same single
 * build note when this language has no run at all.
 *
 * @param {'en' | 'fr'} lang
 * @param {Record<string, unknown>} [files]
 * @param {(msg: string) => void} [note]
 * @returns {{ ids: string[], samples: (Sample | null)[] }}
 */
export function examplesPageSamples(lang, files = FILES, note = (msg) => console.info(msg)) {
  const samples = EXAMPLE_IDS.map((id) => loadSample(id, lang, files));
  if (samples.every((s) => s === null)) {
    note(`\n[samples] no saved sample for "${lang}" under src/data/samples/: the Examples page renders its empty state. Run scripts/freeze-sample.mjs to create them.`);
  }
  return { ids: [...EXAMPLE_IDS], samples };
}
