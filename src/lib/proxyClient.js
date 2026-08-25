// One call to the elenchus-proxy Worker, turned into a discriminated
// outcome the caller can render without a try/catch of its own.
//
// This lived inline in src/components/Analyzer.astro until a review found
// the failure below. It is a module now for one reason: nothing inside an
// Astro component's client `<script>` can be reached by `npx vitest run`
// (the suite imports src/lib/*.js directly, never through the component),
// so the single most dangerous branch in this repo had no test and could
// not have one. See test/proxyClient.test.js.
//
// **An unparseable body is never a success.** The previous version did
// `let data = {}` before `await response.json()` and swallowed the parse
// error, so `{}` survived into the success path: `response.ok` passed,
// `typeof {} === 'object'` passed, and the caller rendered `{}` as a
// finished analysis — empty summary, "unknown" score, and the `#no-flaws`
// block reading "No reasoning flaws detected." in green. A Cloudflare
// interstitial, a truncated response or any CDN error page therefore made a
// reasoning-analysis tool assert the OPPOSITE of the truth, confidently.
// For this product that is the worst reachable failure, so the shape of a
// 2xx body is now checked before it can be called a result.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { selectFailureState } from './errorState.js';

/**
 * @typedef {{ ok: true, data: object } | { ok: false, state: import('./errorState.js').FailureState }} ProxyOutcome
 */

/**
 * True only for a body that is actually an analysis.
 *
 * `typeof data === 'object'` alone is not that check: `{}`, `null` and `[]`
 * all pass it, and `renderAnalysis({})` renders a flawless-looking result
 * (see this file's header). The elenchus-proxy Worker returns the analysis
 * object itself on 200, under a strict `json_schema` whose `required` list
 * is `['summary', 'score', 'flaws', 'strengths']` and whose
 * `additionalProperties` is false (`ANALYSIS_SCHEMA` in
 * elenchus-proxy/src/index.js — cited by name, not line). The two fields
 * asserted here are the two that drive the dangerous claim: `summary` is
 * the verdict prose, and `flaws` is what "No reasoning flaws detected."
 * being shown depends on. `score` is deliberately not asserted — it is
 * clamped through `oneOf()` downstream and a missing one degrades to
 * "unknown", visibly.
 *
 * @param {unknown} data
 * @returns {boolean}
 */
function looksLikeAnalysis(data) {
  return (
    typeof data === 'object'
    && data !== null
    && !Array.isArray(data)
    && typeof (/** @type {{ summary?: unknown }} */ (data).summary) === 'string'
    && Array.isArray(/** @type {{ flaws?: unknown }} */ (data).flaws)
  );
}

/**
 * Calls the Worker. Never throws for an ordinary failure — returns a
 * discriminated result instead, so the caller can pick one of the honest
 * failure states (src/lib/errorState.js) rather than leaning on a generic
 * thrown-Error message. The Worker's `error` prose (a fixed ENGLISH string
 * — see renderFailureState's doc comment for why) is logged for developers,
 * never returned for rendering: this repo's CLAUDE.md requires user-facing
 * content to follow the page's language, and there is no state where the
 * Worker's prose is more specific than this repo's own localized copy.
 *
 * @param {{
 *   text: string,
 *   lang: string,
 *   turnstileToken: string,
 *   proxyUrl: string,
 *   webKey: string,
 *   fetchImpl?: typeof fetch,
 * }} params `fetchImpl` exists for tests; production passes nothing.
 * @returns {Promise<ProxyOutcome>}
 */
export async function callProxy({ text, lang, turnstileToken, proxyUrl, webKey, fetchImpl }) {
  const doFetch = fetchImpl || globalThis.fetch;

  let response;
  try {
    response = await doFetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Elenchus-Key': webKey,
      },
      body: JSON.stringify({ text, lang, turnstileToken }),
    });
  } catch {
    return { ok: false, state: selectFailureState({ networkError: true }) };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    // No body to read a `reason` out of. On a 2xx that is the silent-lie
    // case this module's header describes, and it is a failure — never a
    // result. On a non-2xx it is an ordinary CDN/interstitial error page,
    // and the status alone still selects the honest state (a 503 stays
    // `network`, a 403 stays `forbidden`) — strictly more informative than
    // calling every unparseable body 'invalid', and it loses nothing,
    // since selectFailureState only reads a body for a 429's `reason`,
    // which already clamps to 'service' when absent.
    return response.ok
      ? { ok: false, state: 'invalid' }
      : { ok: false, state: selectFailureState({ status: response.status }) };
  }

  if (!response.ok) {
    if (typeof data?.error === 'string') {
      console.error('[elenchus] proxy error:', data.error);
    }
    return { ok: false, state: selectFailureState({ status: response.status, reason: data?.reason }) };
  }

  if (!looksLikeAnalysis(data)) {
    return { ok: false, state: 'invalid' };
  }

  return { ok: true, data };
}
