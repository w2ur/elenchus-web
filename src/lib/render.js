// Renders an elenchus-proxy analysis result into DOM elements already
// present on the page. Ported from the rendering pattern in
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
//      template — never interpolated raw.
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
 * @param {{ type?: unknown, quote?: unknown, explanation?: unknown, severity?: unknown }} flaw
 * @param {{ severities: Record<string, string> }} T
 * @returns {HTMLElement}
 */
export function renderFlawCard(flaw, T) {
  const severity = oneOf(flaw?.severity, SEVERITIES, 'minor');
  const card = document.createElement('div');
  card.className = 'flaw-card';
  // Every value interpolated below is either the clamped `severity` enum
  // (never the raw model string) or has passed through escapeHtml().
  card.innerHTML = `
    <div class="flaw-type">${escapeHtml(flaw?.type)}</div>
    <span class="flaw-severity ${severity}">${escapeHtml(T.severities[severity])}</span>
    <blockquote class="flaw-quote">&ldquo;${escapeHtml(flaw?.quote)}&rdquo;</blockquote>
    <p class="flaw-explanation">${escapeHtml(flaw?.explanation)}</p>
  `;
  return card;
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
  // `summary` is set via textContent — it is prose, never markup, and never
  // needs to reach innerHTML at all.
  elements.summaryEl.textContent = typeof result?.summary === 'string' ? result.summary : '';

  const score = oneOf(result?.score, SCORES, 'unknown');
  elements.scoreBadgeEl.textContent = T.scores[score] || score;
  elements.scoreBadgeEl.className = `score-badge ${score === 'unknown' ? '' : score}`.trim();

  elements.flawsListEl.innerHTML = '';
  // Array.isArray guard: a hostile or malformed response can send a string
  // or an object here, and rendering must not throw.
  const flaws = Array.isArray(result?.flaws) ? result.flaws : [];

  if (flaws.length === 0) {
    elements.noFlawsEl.hidden = false;
    elements.flawsCountEl.textContent = '';
  } else {
    elements.noFlawsEl.hidden = true;
    elements.flawsCountEl.textContent = `(${flaws.length})`;
    for (const flaw of flaws) {
      elements.flawsListEl.appendChild(renderFlawCard(flaw, T));
    }
  }

  elements.strengthsListEl.innerHTML = '';
  // Same Array.isArray guard, plus a filter for non-string/blank entries —
  // the schema allows an empty array, and a malformed response could send
  // anything inside it.
  const strengths = Array.isArray(result?.strengths)
    ? result.strengths.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];

  if (strengths.length > 0) {
    elements.strengthsSectionEl.hidden = false;
    for (const s of strengths) {
      const li = document.createElement('li');
      // textContent, never innerHTML: strengths are plain prose strings.
      li.textContent = s;
      elements.strengthsListEl.appendChild(li);
    }
  } else {
    elements.strengthsSectionEl.hidden = true;
  }
}
