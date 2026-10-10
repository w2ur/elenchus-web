// Turns an elenchus-proxy analysis result into a plain view model
// (analysisView — no DOM, so it also runs at Astro build time for a saved
// run in SampleResult.astro) and renders that view into DOM elements already
// present on the page (renderAnalysis). Ported from the rendering pattern in
// ~/Dev/elenchus/sidepanel/sidepanel.js (functions renderResult,
// createFlawCard, escapeHtml — cited by name, not line: that's a different
// repo, moving independently) — same posture, same reason:
//
// The analysed text is adversarial by construction: a visitor pastes text
// written by someone else, so the model's JSON output is attacker-influenced
// (a prompt injection embedded in the pasted text can choose these string
// values). This module enforces two independent defenses, matching the
// extension:
//
//   1. Enum fields (severity, score) are clamped via oneOf() from
//      src/lib/clamp.js BEFORE they touch a CSS class or a label lookup.
//      Escaping would not be enough here — an unclamped string could still
//      be a real-looking-but-wrong class name driving unintended styling.
//   2. Free-text fields (type/quote/explanation/summary/strengths) are
//      either set via `textContent` (never parsed as markup) or passed
//      through escapeHtml() before being interpolated into an innerHTML
//      template — never interpolated raw. At build time the same plain
//      strings go through Astro's auto-escaping `{}` expressions; never
//      `set:html` with model text.
//
// `flaws` and `strengths` are guarded with Array.isArray before iterating:
// a hostile or malformed response can send a string or an object instead of
// an array, and rendering must not throw.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { SCORES, SEVERITIES, oneOf } from './clamp.js';

/**
 * Escapes a value for safe interpolation into an HTML template string,
 * including inside an attribute value (`"` and `'` are encoded, not just
 * `& < >`). Uses the DOM's own text-node encoding for the base case rather
 * than a hand-rolled regex — same technique as the sidepanel's
 * escapeHtml() — then encodes the two quote characters textContent does
 * not touch, since `div.innerHTML` alone only makes a *text-node* position
 * safe, not an attribute position.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Free text for a view model: a plain string, never markup. `null`/
 * `undefined` become '' (same coercion escapeHtml() applies), anything else
 * goes through String(). The string is NOT escaped here — escaping belongs to
 * the sink: Astro's `{}` expressions escape it at build time, and the DOM
 * path below escapes it (escapeHtml) or writes it with textContent.
 *
 * @param {unknown} value
 * @returns {string}
 */
function plainText(value) {
  return value == null ? '' : String(value);
}

/**
 * @typedef {object} FlawView
 * @property {string} type         plain text
 * @property {string} quote        plain text
 * @property {string} explanation  plain text
 * @property {string} severity     clamped to SEVERITIES (safe as a class)
 * @property {string} severityLabel
 */

/**
 * @typedef {object} AnalysisView
 * @property {string} summary      plain text ('' unless the model sent a string)
 * @property {string} score        clamped to SCORES, or 'unknown'
 * @property {string} scoreLabel
 * @property {string} scoreClass   the badge's full class attribute
 * @property {FlawView[]} flaws
 * @property {string} flawsCount   '(n)', or '' when there are no flaws
 * @property {string[]} strengths  non-blank strings only
 */

/**
 * @param {unknown} flaw
 * @param {{ severities: Record<string, string> }} T
 * @returns {FlawView}
 */
export function flawView(flaw, T) {
  const f = /** @type {{ type?: unknown, quote?: unknown, explanation?: unknown, severity?: unknown } | null | undefined} */ (flaw);
  const severity = oneOf(f?.severity, SEVERITIES, 'minor');
  return {
    type: plainText(f?.type),
    quote: plainText(f?.quote),
    explanation: plainText(f?.explanation),
    severity,
    severityLabel: T.severities[severity],
  };
}

/**
 * The analysis as plain data: every enum clamped via oneOf(), every free-text
 * field a plain string, every array guarded with Array.isArray. No DOM, so it
 * runs at Astro build time — SampleResult.astro renders a saved run from it
 * with Astro's auto-escaping `{}` expressions (never `set:html`), and the
 * live renderAnalysis() below consumes the same object, so a saved run and a
 * live one cannot clamp or filter differently.
 *
 * @param {unknown} result
 * @param {{ scores: Record<string, string>, severities: Record<string, string> }} T
 * @returns {AnalysisView}
 */
export function analysisView(result, T) {
  const r = /** @type {{ summary?: unknown, score?: unknown, flaws?: unknown, strengths?: unknown } | null | undefined} */ (result);
  const score = oneOf(r?.score, SCORES, 'unknown');
  // Array.isArray guard: a hostile or malformed response can send a string
  // or an object here, and rendering must not throw.
  const flaws = Array.isArray(r?.flaws) ? r.flaws.map((f) => flawView(f, T)) : [];
  // Same guard, plus a filter for non-string/blank entries — the schema
  // allows an empty array, and a malformed response could send anything
  // inside it.
  const strengths = Array.isArray(r?.strengths)
    ? r.strengths.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];
  return {
    summary: typeof r?.summary === 'string' ? r.summary : '',
    score,
    scoreLabel: T.scores[score] || score,
    scoreClass: `score-badge ${score === 'unknown' ? '' : score}`.trim(),
    flaws,
    flawsCount: flaws.length === 0 ? '' : `(${flaws.length})`,
    strengths,
  };
}

/**
 * The provenance line over a saved run. Every value comes from the sample
 * file (scripts/freeze-sample.mjs writes it); the caller escapes it (Astro
 * `{}` or textContent). `translated` is the second line FR samples carry.
 *
 * @param {{ date?: unknown, servedBy?: unknown, promptVersion?: unknown, translated?: unknown }} sample
 * @param {{ sampleLabel: (date: string, model: string, prompt: string) => string, sampleTranslated: string }} T
 * @returns {{ label: string, translated: string | null }}
 */
export function sampleProvenance(sample, T) {
  return {
    label: T.sampleLabel(plainText(sample?.date), plainText(sample?.servedBy), plainText(sample?.promptVersion)),
    translated: sample?.translated === true ? T.sampleTranslated : null,
  };
}

/**
 * Builds one flaw card from an already-clamped FlawView.
 *
 * @param {FlawView} view
 * @returns {HTMLElement}
 */
function flawCardFromView(view) {
  const card = document.createElement('div');
  card.className = 'flaw-card';
  // Every value interpolated below is either the clamped `severity` enum
  // (never the raw model string) or has passed through escapeHtml().
  card.innerHTML = `
    <div class="flaw-type">${escapeHtml(view.type)}</div>
    <span class="flaw-severity ${view.severity}">${escapeHtml(view.severityLabel)}</span>
    <blockquote class="flaw-quote">&ldquo;${escapeHtml(view.quote)}&rdquo;</blockquote>
    <p class="flaw-explanation">${escapeHtml(view.explanation)}</p>
  `;
  return card;
}

/**
 * @param {unknown} flaw
 * @param {{ severities: Record<string, string> }} T
 * @returns {HTMLElement}
 */
export function renderFlawCard(flaw, T) {
  return flawCardFromView(flawView(flaw, T));
}

/**
 * @typedef {object} ResultElements
 * @property {HTMLElement} summaryEl
 * @property {HTMLElement} scoreBadgeEl
 * @property {HTMLElement} flawsCountEl
 * @property {HTMLElement} noFlawsEl
 * @property {HTMLElement} flawsListEl
 * @property {HTMLElement} strengthsSectionEl
 * @property {HTMLElement} strengthsListEl
 * @property {HTMLElement} [provenanceEl] the "Saved run · …" line over a
 *   loaded sample (Analyzer.astro's #result-provenance); renderAnalysis()
 *   clears it, renderSample() sets it
 */

/**
 * Renders an elenchus-proxy analysis result into the given elements.
 * Pure with respect to everything except the DOM nodes it is handed —
 * no fetch, no global state — so it can be unit tested directly.
 *
 * @param {{ summary?: unknown, score?: unknown, flaws?: unknown, strengths?: unknown }} result
 * @param {ResultElements} elements
 * @param {{ scores: Record<string, string>, severities: Record<string, string> }} T
 */
export function renderAnalysis(result, elements, T) {
  const view = analysisView(result, T);

  // A live result is not a saved run: whatever provenance line a loaded
  // sample left on the panel goes before anything else is drawn, so a live
  // analysis can never sit under "Saved run · … · AI-generated" naming a
  // model and a date it did not come from.
  if (elements.provenanceEl) {
    elements.provenanceEl.textContent = '';
    elements.provenanceEl.hidden = true;
  }

  // `summary` is set via textContent — it is prose, never markup, and never
  // needs to reach innerHTML at all.
  elements.summaryEl.textContent = view.summary;

  elements.scoreBadgeEl.textContent = view.scoreLabel;
  elements.scoreBadgeEl.className = view.scoreClass;

  elements.flawsListEl.innerHTML = '';
  elements.flawsCountEl.textContent = view.flawsCount;
  elements.noFlawsEl.hidden = view.flaws.length > 0;
  for (const flaw of view.flaws) {
    elements.flawsListEl.appendChild(flawCardFromView(flaw));
  }

  elements.strengthsListEl.innerHTML = '';
  elements.strengthsSectionEl.hidden = view.strengths.length === 0;
  for (const s of view.strengths) {
    const li = document.createElement('li');
    // textContent, never innerHTML: strengths are plain prose strings.
    li.textContent = s;
    elements.strengthsListEl.appendChild(li);
  }
}

/**
 * Renders a saved sample into the live result panel: the same
 * renderAnalysis() a live result takes (same clamps, same escaping), then
 * the provenance line SampleResult.astro prints over the static frame, from
 * the same sampleProvenance(). Owner decision 8: saved output is shown only
 * labelled AI-generated and naming its model, wherever it is shown. Written
 * with textContent and a <br> element, never innerHTML: every value comes
 * from the sample file, which holds model output.
 *
 * @param {{ result?: unknown, date?: unknown, servedBy?: unknown, promptVersion?: unknown, translated?: unknown }} sample
 * @param {ResultElements & { provenanceEl: HTMLElement }} elements
 * @param {Parameters<typeof renderAnalysis>[2] & Parameters<typeof sampleProvenance>[1]} T
 */
export function renderSample(sample, elements, T) {
  renderAnalysis(/** @type {any} */ (sample?.result), elements, T);
  const { label, translated } = sampleProvenance(sample, T);
  const el = elements.provenanceEl;
  el.textContent = label;
  if (translated) {
    el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(translated));
  }
  el.hidden = false;
}

/**
 * Finds one sample in the JSON the page embedded at build time
 * (Analyzer.astro's #sample-data, written from src/lib/samples.js). No
 * fetch: the page already holds its own language's samples, and only those.
 * Malformed JSON or an unknown id gives null, never a throw.
 *
 * @param {string | undefined} json
 * @param {string} id
 * @returns {Record<string, unknown> | null}
 */
export function pickSample(json, id) {
  let list;
  try {
    list = JSON.parse(json ?? '');
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  return list.find((s) => s && typeof s === 'object' && s.id === id) ?? null;
}
