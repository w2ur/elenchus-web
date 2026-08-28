// The bookmarklet itself: the code that becomes the `javascript:` URL a
// reader drags to their bookmarks bar. It runs on someone else's page, so
// every line here is defensive and nothing here may throw into their
// console or leave a listener behind.
//
// It is NOT loaded by this site — src/lib/buildBookmarklet.js bundles it
// with esbuild at build time and the install page renders the result as a
// link href. `__ELENCHUS_ANALYZE_URL__` is replaced with a real URL at that
// point (esbuild `define`), which is what lets the EN and FR install pages
// hand out bookmarklets pointing at their own analyzer.
//
// **This code silently does nothing on sites whose Content-Security-Policy
// has no `'unsafe-inline'` in `script-src` — github.com among them.** The
// body never executes, so no error handling here can report it; that
// failure is addressed by saying so on the install page, which is the only
// mitigation available for it.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { extractText } from './extract.js';
import {
  LAUNCH_PARAM,
  LAUNCH_VALUE,
  PROTOCOL_VERSION,
  READY_TYPE,
  TEXT_TYPE,
  buildFragmentUrl,
} from './handoff.js';

/**
 * Replaced at build time by src/lib/buildBookmarklet.js. Declared here so
 * this module still parses (and tests still import it) outside that build.
 */
const ANALYZE_URL = typeof __ELENCHUS_ANALYZE_URL__ === 'string' ? __ELENCHUS_ANALYZE_URL__ : '';

/** How long to wait for the analyzer's ready ping before falling back. */
const HANDSHAKE_TIMEOUT_MS = 2500;

const origin = new URL(ANALYZE_URL).origin;
const launchUrl = `${ANALYZE_URL}?${LAUNCH_PARAM}=${LAUNCH_VALUE}`;
const selection = typeof window.getSelection === 'function' ? String(window.getSelection()) : '';
const text = extractText(document, selection);

// Nothing worth handing over: open the analyzer plain, with no handshake to
// wait for, so the reader lands on a paste box instead of an empty page
// that appears to be loading something.
if (!text) {
  window.open(ANALYZE_URL, '_blank', 'noopener');
} else {
  let settled = false;
  let timer = 0;
  /** @type {Window | null} */
  let popup = null;

  /** @param {MessageEvent} event */
  const onMessage = (event) => {
    if (settled || !popup || event.source !== popup) return;
    const data = /** @type {{ type?: unknown, v?: unknown }} */ (event.data);
    if (!data || data.type !== READY_TYPE || data.v !== PROTOCOL_VERSION) return;
    settled = true;
    clearTimeout(timer);
    window.removeEventListener('message', onMessage);
    // Exact target origin, never '*': this leg carries the reader's text.
    popup.postMessage({ type: TEXT_TYPE, v: PROTOCOL_VERSION, text }, origin);
  };

  window.addEventListener('message', onMessage);

  // Opened after the listener exists, so a popup that loads and pings
  // instantly cannot arrive before anything is listening.
  popup = window.open(launchUrl, '_blank');

  if (!popup) {
    // Either a popup blocker, or a `Cross-Origin-Opener-Policy: same-origin`
    // page — under COOP the tab still opens, the handle is just severed, so
    // the fragment URL is the one thing that survives either way.
    settled = true;
    window.removeEventListener('message', onMessage);
    window.open(buildFragmentUrl(ANALYZE_URL, text), '_blank', 'noopener');
  } else {
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      const fragmentUrl = buildFragmentUrl(ANALYZE_URL, text);
      try {
        popup.location.href = fragmentUrl;
      } catch {
        window.open(fragmentUrl, '_blank', 'noopener');
      }
    }, HANDSHAKE_TIMEOUT_MS);
  }
}
