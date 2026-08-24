// Unit tests for src/lib/errorState.js — written before the implementation
// (test-first), per the C4 brief.
//
// selectFailureState() is the state-selection logic that decides which of
// the honest failure-state copy blocks to show, from the elenchus-proxy
// Worker's HTTP outcome. It must be exercised for: a 429 with each `reason`
// value, an unknown/garbage `reason`, a 403, and a network throw — per the
// brief's explicit test list. The unknown-reason case is the one with a
// safety direction: it must clamp to 'service', because telling a visitor
// "you personally are out" when the *service* is out sends an innocent
// person away for the day for no reason.
import { describe, expect, it } from 'vitest';
import { isDryState, renderFailureState, selectFailureState } from '../src/lib/errorState.js';
import { strings } from '../src/lib/strings.js';

const T = strings.en;

describe('selectFailureState', () => {
  it('a 429 with reason "ip" selects the ip state', () => {
    expect(selectFailureState({ status: 429, reason: 'ip' })).toBe('ip');
  });

  it('a 429 with reason "service" selects the service state', () => {
    expect(selectFailureState({ status: 429, reason: 'service' })).toBe('service');
  });

  it('a 429 with an unknown reason clamps to "service" (the safe direction)', () => {
    expect(selectFailureState({ status: 429, reason: 'quota-exceeded' })).toBe('service');
  });

  it('a 429 with no reason at all clamps to "service"', () => {
    expect(selectFailureState({ status: 429 })).toBe('service');
  });

  it('a 403 selects the forbidden state', () => {
    expect(selectFailureState({ status: 403 })).toBe('forbidden');
  });

  it('a network throw (fetch itself rejected) selects the network state', () => {
    expect(selectFailureState({ networkError: true })).toBe('network');
  });

  it('a network throw takes precedence over any stray status/reason value', () => {
    expect(selectFailureState({ networkError: true, status: 429, reason: 'ip' })).toBe('network');
  });

  it('a 5xx upstream failure selects the network state — the same honest-retry copy applies', () => {
    expect(selectFailureState({ status: 502 })).toBe('network');
  });

  it('any other status falls back to the generic state', () => {
    expect(selectFailureState({ status: 400 })).toBe('generic');
  });

  it('no arguments at all falls back to the generic state, never throws', () => {
    expect(() => selectFailureState()).not.toThrow();
    expect(selectFailureState()).toBe('generic');
  });
});

describe('renderFailureState', () => {
  /** @returns {HTMLElement} */
  function buildElement() {
    document.body.innerHTML = '<p id="error-message"></p>';
    return document.getElementById('error-message');
  }

  it('the ip state renders the real numbers and a real link to the extension', () => {
    const el = buildElement();
    renderFailureState('ip', el, T, 'https://chromewebstore.google.com/detail/elenchus/x?hl=en');

    expect(el.textContent).toContain('2');
    expect(el.textContent).toContain('21');
    const link = el.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://chromewebstore.google.com/detail/elenchus/x?hl=en');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('the service state renders a link to the extension and mentions the UTC reset', () => {
    const el = buildElement();
    renderFailureState('service', el, T, 'https://chromewebstore.google.com/detail/elenchus/x?hl=en');

    expect(el.textContent).toMatch(/00:00 UTC/);
    const link = el.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://chromewebstore.google.com/detail/elenchus/x?hl=en');
  });

  // Precedence regression (C4 review, round 1): C3 left Analyzer.astro
  // reading `data?.error || (reason === 'ip' ? T.errDailyLimitIp : …)`,
  // where the Worker's 429 body ALWAYS carries an `error` string, so that
  // expression never fell through to the localised copy at all — a web
  // visitor at their 2/day cap saw the Worker's own extension-oriented
  // prose instead of this site's honest copy. `renderFailureState` no
  // longer accepts a server-message argument at all for 'ip'/'service' (the
  // structural fix, round 2 of review — see its doc comment), so passing
  // one through is a no-op; these tests keep asserting the localized copy
  // wins even if a future caller mistakenly passes a 5th argument anyway.
  it('the ip state renders the localized copy — a stray 5th argument is ignored, not read as a server override', () => {
    const el = buildElement();
    const serverProse = 'Daily limit reached (21 analyses per day). Try again tomorrow, or add your own API key in settings.';
    renderFailureState('ip', el, T, 'https://chromewebstore.google.com/detail/elenchus/x?hl=en', serverProse);

    expect(el.textContent).not.toContain(serverProse);
    expect(el.textContent).toBe(`${T.errIpText}${T.errIpLink}${T.errIpEnd}`);
  });

  it('the service state renders the localized copy — a stray 5th argument is ignored, not read as a server override', () => {
    const el = buildElement();
    const serverProse = 'Daily limit reached (21 analyses per day). Try again tomorrow, or add your own API key in settings.';
    renderFailureState('service', el, T, 'https://chromewebstore.google.com/detail/elenchus/x?hl=en', serverProse);

    expect(el.textContent).not.toContain(serverProse);
    expect(el.textContent).toBe(`${T.errServiceText}${T.errServiceLink}${T.errServiceEnd}`);
  });

  it('the French ip state renders French copy, not the (English, unlocalized) server prose', () => {
    const el = buildElement();
    const TFR = strings.fr;
    const serverProse = 'Daily limit reached (21 analyses per day). Try again tomorrow, or add your own API key in settings.';
    renderFailureState('ip', el, TFR, 'https://chromewebstore.google.com/detail/elenchus/x?hl=fr', serverProse);

    expect(el.textContent).not.toContain(serverProse);
    expect(el.textContent).toBe(`${TFR.errIpText}${TFR.errIpLink}${TFR.errIpEnd}`);
    expect(el.textContent).toContain('épuisées');
  });

  it('the network state has no link and does not promise a retry will succeed', () => {
    const el = buildElement();
    renderFailureState('network', el, T, 'https://chromewebstore.google.com/detail/elenchus/x?hl=en');

    expect(el.querySelector('a')).toBeNull();
    expect(el.textContent.length).toBeGreaterThan(0);
    // No unmeasurable promise like "will work" / "shortly" / a bare "few
    // minutes" claim — the copy names what is unknown instead of asserting it.
    expect(el.textContent.toLowerCase()).not.toContain('will work');
  });

  it('the forbidden state renders the default English copy on the English page', () => {
    const el = buildElement();
    renderFailureState('forbidden', el, T, 'https://example.test/');
    expect(el.textContent).toBe(T.errForbidden);
  });

  // Precedence regression (C4 review, round 2): the same bug as the ip/
  // service one above, in a smaller radius. Every non-429 Worker error body
  // is a FIXED, ALWAYS-PRESENT English string (elenchus-proxy/src/index.js:
  // 'Forbidden.', 'Invalid JSON body.', 'Not enough text to analyze.',
  // 'Method not allowed') — so a `serverMessage || T.errForbidden` pattern
  // would make the French fallback unreachable whenever the Worker answers
  // at all, and a French visitor who hits a 403 would read "Forbidden."
  // renderFailureState no longer accepts a server-message argument, so this
  // cannot happen structurally; this test pins the FRENCH half specifically,
  // since that is the half the old code never even had a chance to render.
  it('a 403 on the French page renders French copy — never the Worker\'s fixed English "Forbidden." string, even if a caller mistakenly passes one through', () => {
    const el = buildElement();
    const TFR = strings.fr;
    renderFailureState('forbidden', el, TFR, 'https://example.test/', 'Forbidden.');

    expect(el.textContent).toBe(TFR.errForbidden);
    expect(el.textContent).not.toBe('Forbidden.');
  });

  it('the generic state renders the default copy', () => {
    const el = buildElement();
    renderFailureState('generic', el, T, 'https://example.test/');
    expect(el.textContent).toBe(T.errGeneric);
  });

  it('the invalid state (a 200 response with an unusable body) renders the default copy', () => {
    const el = buildElement();
    renderFailureState('invalid', el, T, 'https://example.test/');
    expect(el.textContent).toBe(T.errInvalidResponse);
  });

  it('clears any previously rendered state before rendering the next one', () => {
    const el = buildElement();
    renderFailureState('ip', el, T, 'https://example.test/');
    expect(el.querySelector('a')).not.toBeNull();
    renderFailureState('network', el, T, 'https://example.test/');
    expect(el.querySelector('a')).toBeNull();
  });

  // Presentation (C4 review): 'ip'/'service' are the ordinary shape of a
  // good day on this free tier, not an error — see isDryState()'s doc
  // comment — and must not render inside the alarm-red box. The other
  // states keep it; there was, and is, something to actually report there.
  describe('the is-dry-state class (drives the non-alarm presentation)', () => {
    it.each(['ip', 'service'])('is present for the %s state', (state) => {
      const el = buildElement();
      renderFailureState(state, el, T, 'https://example.test/');
      expect(el.classList.contains('is-dry-state')).toBe(true);
    });

    it.each(['network', 'forbidden', 'generic', 'invalid'])('is absent for the %s state', (state) => {
      const el = buildElement();
      renderFailureState(state, el, T, 'https://example.test/');
      expect(el.classList.contains('is-dry-state')).toBe(false);
    });

    it('is removed when a later render moves from a dry state to an alarm state', () => {
      const el = buildElement();
      renderFailureState('ip', el, T, 'https://example.test/');
      expect(el.classList.contains('is-dry-state')).toBe(true);
      renderFailureState('network', el, T, 'https://example.test/');
      expect(el.classList.contains('is-dry-state')).toBe(false);
    });
  });
});

describe('isDryState', () => {
  it('is true for ip and service — the two states where a retry provably cannot succeed', () => {
    expect(isDryState('ip')).toBe(true);
    expect(isDryState('service')).toBe(true);
  });

  it('is false for network, forbidden, generic and invalid — states where Retry stays offered or is a judgement call', () => {
    expect(isDryState('network')).toBe(false);
    expect(isDryState('forbidden')).toBe(false);
    expect(isDryState('generic')).toBe(false);
    expect(isDryState('invalid')).toBe(false);
  });
});
