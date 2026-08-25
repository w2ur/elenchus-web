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

/** @typedef {'ip' | 'service' | 'network' | 'forbidden' | 'generic' | 'invalid' | 'turnstileUnsolved' | 'turnstileBlocked'} FailureState */

/**
 * Every member of `FailureState`, as data. Exists so the tests can iterate
 * the enum instead of a hand-copied list: a hand-copied list is the shape
 * of coverage that silently shrinks — a state added here but forgotten
 * there produces zero findings and zero coverage, which look identical from
 * the outside. Adding a state without a rendered string, or without a FR
 * translation, now reds test/errorState.test.js by construction.
 *
 * @type {FailureState[]}
 */
export const FAILURE_STATES = [
  'ip',
  'service',
  'network',
  'forbidden',
  'generic',
  'invalid',
  'turnstileUnsolved',
  'turnstileBlocked',
];

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
 * Three members of `FailureState` are deliberately NOT produced here,
 * because none of them involves a status/reason pair — but all three are
 * still members, because `renderFailureState` below must render them:
 *
 *   - `'invalid'`: a 2xx response whose body could not be parsed, or whose
 *     shape is not an analysis. `callProxy` (src/lib/proxyClient.js)
 *     returns it directly.
 *   - `'turnstileUnsolved'` / `'turnstileBlocked'`: raised before any
 *     request is made at all, by the submit handler in
 *     src/components/Analyzer.astro — there is no Worker outcome yet.
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
 * PRESENTATION only. True for the two states that are the ordinary shape of
 * a good day on this free tier, not an error: a visitor (or the service)
 * has simply spent today's allowance. Those get no alarm-red box — see the
 * `.is-dry-state` CSS class applied alongside this flag, which trades the
 * red `.error-message` treatment for the same quiet, informational one
 * `.notice` already uses for the standing free-tier disclosure.
 *
 * Whether the Retry button is offered is a SEPARATE question, answered by
 * `canRetry()` below — the two sets used to be the same one and are not
 * any more (`turnstileBlocked` offers no retry but is a genuine problem
 * worth reporting in the alarm treatment).
 *
 * @param {FailureState} state
 * @returns {boolean}
 */
export function isDryState(state) {
  return state === 'ip' || state === 'service';
}

/**
 * True when the Retry button should be offered — i.e. when pressing it
 * could plausibly produce a different outcome. The three exceptions:
 *
 *   - `ip`: this visitor's own allowance is spent until the day rolls over.
 *   - `service`: the whole service's is.
 *   - `turnstileBlocked`: the Turnstile widget never loaded, so there is no
 *     challenge on the page to complete and nothing a retry can change —
 *     only unblocking challenges.cloudflare.com, or using the extension,
 *     gets this visitor through. Offering Retry here would name an action
 *     that cannot succeed, which is exactly what the rest of this repo's
 *     copy is written to avoid.
 *
 * `turnstileUnsolved` DOES keep Retry: the widget is right there, and
 * completing it then retrying is the actual path forward. So do `network`,
 * `generic`, `forbidden` and `invalid` — the last three are rare,
 * config-level problems, but a retry is not provably futile for any of them
 * (a 403 can be a transient origin hiccup; a malformed body can be a
 * one-off upstream glitch).
 *
 * @param {FailureState} state
 * @returns {boolean}
 */
export function canRetry(state) {
  return !(state === 'ip' || state === 'service' || state === 'turnstileBlocked');
}

/**
 * The states whose copy is a text/link/text sandwich around a real `<a>` to
 * the Chrome Web Store listing. Keyed by state, valued by the `strings.js`
 * keys to read — so adding a linked state is a table entry, not another
 * branch, and every one of them goes through the same
 * `document.createElement('a')` path.
 *
 * @type {Record<string, { text: string, link: string, end: string }>}
 */
const LINKED_COPY = {
  ip: { text: 'errIpText', link: 'errIpLink', end: 'errIpEnd' },
  service: { text: 'errServiceText', link: 'errServiceLink', end: 'errServiceEnd' },
  turnstileBlocked: {
    text: 'errTurnstileBlockedText',
    link: 'errTurnstileBlockedLink',
    end: 'errTurnstileBlockedEnd',
  },
};

/**
 * Renders one failure state into `element`, replacing whatever it held
 * before. The states in `LINKED_COPY` carry a real `<a>` to the Chrome Web
 * Store listing (built via DOM APIs, not string concatenation into
 * innerHTML, matching src/lib/render.js's posture); `ip`/`service` also get
 * the `.is-dry-state` class (see `isDryState`'s doc comment). The others
 * are plain text with no class added.
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
 *   errInvalidResponse: string, errTurnstileUnsolved: string,
 *   errTurnstileBlockedText: string, errTurnstileBlockedLink: string,
 *   errTurnstileBlockedEnd: string,
 * }} T
 * @param {string} extensionUrl Chrome Web Store listing URL, per-language.
 */
export function renderFailureState(state, element, T, extensionUrl) {
  element.textContent = '';
  element.classList.toggle('is-dry-state', isDryState(state));

  const linked = LINKED_COPY[state];
  if (linked) {
    element.append(document.createTextNode(T[linked.text]));
    const link = document.createElement('a');
    link.href = extensionUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = T[linked.link];
    element.append(link, document.createTextNode(T[linked.end]));
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

  if (state === 'turnstileUnsolved') {
    element.textContent = T.errTurnstileUnsolved;
    return;
  }

  element.textContent = state === 'forbidden' ? T.errForbidden : T.errGeneric;
}
