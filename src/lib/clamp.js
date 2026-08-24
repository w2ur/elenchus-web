// Port of the enum-clamp pattern in ~/Dev/elenchus/sidepanel/sidepanel.js.
//
// The analysed text is adversarial by construction: a visitor pastes text
// written by someone else, and the model's JSON output is therefore
// attacker-influenced (prompt injection can choose these string values).
// Anything that reaches a CSS class or gets treated as a known category is
// constrained to one of a fixed set of values BEFORE it is used — escaping
// alone is not the design, because escaping still lets arbitrary text
// masquerade as a real severity/score/reason and drive styling or logic.
//
// SEVERITIES and SCORES are copied verbatim from the SEVERITIES/SCORES
// constants in ~/Dev/elenchus/sidepanel/sidepanel.js — cited by name and
// file, never by line: that's a different repo, moving independently, and
// that file is the source of truth, not the plan snippet that proposed
// this one.
// REASONS mirrors the elenchus-proxy Worker's 429 `reason` enum
// ('ip' | 'service').
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md, "vanilla JS with
// JSDoc": this repo has no type-checker in its build.

/** @type {readonly string[]} */
export const SEVERITIES = ['minor', 'significant', 'critical'];

/** @type {readonly string[]} */
export const SCORES = ['strong', 'moderate', 'weak'];

/** @type {readonly string[]} */
export const REASONS = ['ip', 'service'];

/**
 * Returns `value` if it is a member of `allowed`, otherwise `fallback`.
 * The only function in this file that should ever decide what an
 * attacker-influenced enum field renders as.
 *
 * @param {unknown} value
 * @param {readonly string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
export function oneOf(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}
