// The bookmarklet → /analyze handoff protocol, owned in one file because
// both ends of it ship separately: this module is imported by the client
// script of src/components/Analyzer.astro (the receiving end, bundled by
// Vite) AND by src/lib/bookmarkletSource.js (the sending end, bundled by
// esbuild into the `javascript:` URL). A param name or message type that
// drifted between the two would fail silently, on someone else's page,
// where nothing can report it.
//
// Transport decision (plan 2026-08-24, task M3, from the COOP measurement
// in M1): `window.open` + `postMessage` is primary, a URL fragment is the
// fallback. postMessage keeps the reader's text out of the address bar,
// history and any link they might share, and has no length ceiling. The
// fragment is what still works when the opener link is severed — a
// `Cross-Origin-Opener-Policy: same-origin` page (measured absent from
// every news and opinion site sampled, so this is the cold path) or a
// popup blocker.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { MAX_TEXT_LENGTH } from './limits.js';

/** Marks a page load as coming from the bookmarklet. */
export const LAUNCH_PARAM = 'src';
export const LAUNCH_VALUE = 'bm';

/** Fragment parameter names (see `buildFragmentUrl`). */
export const FRAGMENT_TEXT_PARAM = 't';
export const FRAGMENT_TRUNCATED_PARAM = 'tr';

/** postMessage types. `v` guards against a future protocol change. */
export const READY_TYPE = 'elenchus-ready';
export const TEXT_TYPE = 'elenchus-text';
export const PROTOCOL_VERSION = 1;

/**
 * Whether this page load was started by the bookmarklet.
 *
 * The ready ping is sent only when this is true, so the ordinary paste page
 * never talks to an opener it did not expect.
 *
 * @param {string} search `location.search`
 * @returns {boolean}
 */
export function isBookmarkletLaunch(search) {
  if (typeof search !== 'string') return false;
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return query.get(LAUNCH_PARAM) === LAUNCH_VALUE;
}

/**
 * The fallback URL: the analyzer with the text in the fragment.
 *
 * A fragment is never sent to the server, which is the only reason this
 * fallback is acceptable at all. It is still visible in the address bar and
 * in history, so the receiving page erases it on arrival (`history.replaceState`).
 *
 * Truncation here is at `MAX_TEXT_LENGTH` — the Worker's own ceiling, not a
 * URL-length guess — and is **flagged in the URL** so the page can say so.
 * A worst-case 15,000-character fragment is roughly 45 KB percent-encoded,
 * inside every current browser's URL limit.
 *
 * @param {string} analyzeUrl absolute URL of the analyzer page
 * @param {string} text
 * @returns {string}
 */
export function buildFragmentUrl(analyzeUrl, text) {
  const full = typeof text === 'string' ? text : '';
  const truncated = full.length > MAX_TEXT_LENGTH;
  const params = new URLSearchParams();
  params.set(FRAGMENT_TEXT_PARAM, truncated ? full.slice(0, MAX_TEXT_LENGTH) : full);
  if (truncated) params.set(FRAGMENT_TRUNCATED_PARAM, '1');
  return `${analyzeUrl}#${params.toString()}`;
}

/**
 * Reads a handoff out of `location.hash`.
 *
 * @param {string} hash `location.hash`, with or without its leading '#'
 * @returns {{ text: string, truncated: boolean } | null} null when the
 *   fragment carries no handoff — an ordinary `#anchor` included
 */
export function readFragment(hash) {
  if (typeof hash !== 'string' || hash.length === 0) return null;
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const text = params.get(FRAGMENT_TEXT_PARAM);
  if (typeof text !== 'string' || text.length === 0) return null;
  return {
    text: text.slice(0, MAX_TEXT_LENGTH),
    truncated: params.get(FRAGMENT_TRUNCATED_PARAM) === '1' || text.length > MAX_TEXT_LENGTH,
  };
}

/**
 * Validates a `message` event payload from the opener.
 *
 * **The sender's origin is deliberately not checked.** The opener is
 * whatever site the reader was on — lemonde.fr, a blog, anything — so there
 * is no origin to allowlist. What *is* checked is that the message came
 * from the window that opened this one (`event.source === window.opener`,
 * asserted by the caller) and that its shape matches this protocol. The
 * text itself is untrusted either way: it takes the same escaped,
 * enum-clamped path through `render.js` as anything pasted by hand, because
 * an analysed text is adversarial by construction.
 *
 * @param {unknown} data
 * @returns {string | null} the text, or null when this is not our message
 */
export function parseTextMessage(data) {
  if (!data || typeof data !== 'object') return null;
  const message = /** @type {{ type?: unknown, v?: unknown, text?: unknown }} */ (data);
  if (message.type !== TEXT_TYPE || message.v !== PROTOCOL_VERSION) return null;
  if (typeof message.text !== 'string' || message.text.length === 0) return null;
  return message.text;
}
