// Selects and renders the honest failure-state copy shown after a call to
// the elenchus-proxy Worker fails.
//
// The free web allowance is small by construction (150 requests/day
// service-wide, 2 per IP), so a dry bucket is the NORMAL state of this
// service on a good day, not an edge case — this is a first-impression
// surface for most visitors, not an error path most of them will never
// see. The copy in src/lib/strings.js is written that way: honest, not
// apologetic, and pointing at the real next step (the Chrome extension —
// its own separate 21/day allowance, and the bring-your-own-key path — or
// waiting for the daily reset). No percentage, no step count, no claimed
// wait that cannot be measured; "resets at 00:00 UTC" is stated only
// because it is true (currentDay() in elenchus-proxy/src/rate-limiter.js is
// `new Date().toISOString().slice(0, 10)`, which is UTC).
//
// Kept separate from the DOM wiring in src/components/Analyzer.astro so the
// mapping from a Worker HTTP outcome to a failure state is unit-testable
// without a browser — see the C4 brief's explicit test list: a 429 with
// each `reason`, an unknown `reason`, a 403, and a network throw.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { REASONS, oneOf } from './clamp.js';

/** @typedef {'ip' | 'service' | 'network' | 'forbidden' | 'generic' | 'invalid'} FailureState */

/**
 * Picks which failure state to show from one attempt to call the Worker.
 *
 * `networkError` wins outright: if `fetch()` itself threw, there is no
 * response to read a status or reason from, and no promise from here about
 * whether a retry will succeed. A 429's `reason` is clamped through
 * `oneOf()`/`REASONS` (the same enum-clamp discipline as every other field
 * the Worker returns) with fallback `'service'` — the safe direction,
 * because telling a visitor "you personally are out" when the *service* is
 * out sends an innocent person away for the day for no reason, where the
 * reverse mistake only costs one visitor a slightly-too-generous message. A
 * 5xx (the Worker's own fixed-string upstream failure) gets the same
 * honest-retry copy as a network error: from here, the two are
 * indistinguishable in what they let a caller promise.
 *
 * `'invalid'` (a 200 response whose body is not the expected shape) is
 * deliberately NOT produced here — it never involves a status/reason pair,
 * only a successful response with an unusable body, so the caller
 * (Analyzer.astro) returns it directly rather than routing it through this
 * function. It is still a member of `FailureState` because
 * `renderFailureState` below must render it.
 *
 * @param {{ networkError?: boolean, status?: number, reason?: unknown }} [outcome]
 * @returns {FailureState}
 */
export function selectFailureState(outcome) {
  const { networkError = false, status, reason } = outcome || {};

  if (networkError) {
    return 'network';
  }
  if (status === 429) {
    return oneOf(reason, REASONS, 'service');
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'network';
  }
  return 'generic';
}

/**
 * True for the two states that are the ordinary shape of a good day on this
 * free tier, not an error: a visitor (or the service) has simply spent
 * today's allowance. Two consequences follow from that, both applied by the
 * caller (src/components/Analyzer.astro) using this flag:
 *
 *   1. Presentation: no alarm-red box — see the `.is-dry-state` CSS class
 *      applied alongside this flag, which trades the red `.error-message`
 *      treatment for the same quiet, informational one `.notice` already
 *      uses for the standing free-tier disclosure.
 *   2. No Retry button: retrying provably cannot succeed for 'ip' (this
 *      visitor's own allowance is spent) or 'service' (the whole service's
 *      is) until the day rolls over — offering it would repeat the same
 *      unmeasurable promise the copy itself is written to avoid.
 *
 * `network` and `generic` keep Retry, because a retry might actually work
 * there. `forbidden` and `invalid` are rare, config-level problems no
 * retry fixes either, but they are not "the ordinary shape of a good day"
 * — they stay in the alarm/Retry-offered treatment, same as `network`.
 *
 * @param {FailureState} state
 * @returns {boolean}
 */
export function isDryState(state) {
  return state === 'ip' || state === 'service';
}

/**
 * Renders one failure state into `element`, replacing whatever it held
 * before. The 'ip' and 'service' states carry a real `<a>` to the Chrome
 * Web Store listing (built via DOM APIs, not string concatenation into
 * innerHTML, matching src/lib/render.js's posture) and get the
 * `.is-dry-state` class (see `isDryState`'s doc comment); the others are
 * plain text with no class added.
 *
 * There is deliberately no way to override the rendered copy with a
 * Worker-supplied `error` string. Every non-429 Worker error body is a
 * fixed ENGLISH string (`'Forbidden.'`, `'Invalid JSON body.'`, etc. — see
 * elenchus-proxy/src/index.js) and is always present, so an
 * `serverMessage || fallback` pattern here would make `T.errForbidden` and
 * `T.errGeneric` unreachable whenever the Worker answers at all — an
 * English-only page for every French visitor who hits either state. This
 * repo's own CLAUDE.md is unambiguous that user-facing content follows the
 * page's language, and the Worker's prose adds nothing an English visitor
 * couldn't already get from the localized fallback, so there is no
 * language it would be worth showing raw. Log it for developers instead,
 * at the call site in Analyzer.astro, and never render it.
 *
 * @param {FailureState} state
 * @param {HTMLElement} element
 * @param {{
 *   errIpText: string, errIpLink: string, errIpEnd: string,
 *   errServiceText: string, errServiceLink: string, errServiceEnd: string,
 *   errNetworkText: string, errForbidden: string, errGeneric: string,
 *   errInvalidResponse: string,
 * }} T
 * @param {string} extensionUrl Chrome Web Store listing URL, per-language.
 */
export function renderFailureState(state, element, T, extensionUrl) {
  element.textContent = '';
  element.classList.toggle('is-dry-state', isDryState(state));

  if (state === 'ip' || state === 'service') {
    const prefix = state === 'ip' ? T.errIpText : T.errServiceText;
    const linkText = state === 'ip' ? T.errIpLink : T.errServiceLink;
    const suffix = state === 'ip' ? T.errIpEnd : T.errServiceEnd;

    element.append(document.createTextNode(prefix));
    const link = document.createElement('a');
    link.href = extensionUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = linkText;
    element.append(link, document.createTextNode(suffix));
    return;
  }

  if (state === 'network') {
    element.textContent = T.errNetworkText;
    return;
  }

  if (state === 'invalid') {
    element.textContent = T.errInvalidResponse;
    return;
  }

  element.textContent = state === 'forbidden' ? T.errForbidden : T.errGeneric;
}
