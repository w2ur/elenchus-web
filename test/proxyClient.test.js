// Unit tests for src/lib/callProxy — and specifically for the one branch
// that made this repo's whole premise unsafe.
//
// Regression (final review): a 200 whose body is NOT JSON rendered as a
// successful, flawless analysis. `callProxy` did `let data = {}` before
// `await response.json()` and swallowed the parse error, so `{}` survived:
// `response.ok` passed, `typeof {} === 'object'` passed, and the caller
// rendered `{}` as a finished result — empty summary, "unknown" badge, and
// the `#no-flaws` block reading "No reasoning flaws detected." in green.
// A Cloudflare interstitial, a truncated response or any CDN error page
// therefore made a reasoning-analysis tool assert the OPPOSITE of the
// truth. The assertions below are written on the rendered DOM for exactly
// that reason: `state === 'invalid'` alone would not prove the visitor
// stopped seeing a fake verdict.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderFailureState } from '../src/lib/errorState.js';
import { callProxy } from '../src/lib/proxyClient.js';
import { renderAnalysis } from '../src/lib/render.js';
import { strings } from '../src/lib/strings.js';

const T = strings.en;
const EXTENSION_URL = 'https://chromewebstore.google.com/detail/elenchus/x?hl=en';

/**
 * A minimal stand-in for a fetch Response. `bodyText` is what the server
 * sent; `json()` parses it exactly as the real one does — so a non-JSON
 * body rejects here for the same reason it rejects in a browser, rather
 * than because the test hand-wrote a rejection.
 */
function fakeResponse(status, bodyText) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return JSON.parse(bodyText);
    },
  };
}

function fetchReturning(response) {
  return vi.fn(async () => response);
}

/** The exact HTML a CDN error page / challenge interstitial serves. */
const HTML_ERROR_PAGE = `<!DOCTYPE html><html><head><title>Just a moment...</title></head>
<body><h1>Checking your browser before accessing the site.</h1></body></html>`;

const VALID_ANALYSIS = {
  summary: 'The argument is mostly sound.',
  score: 'moderate',
  flaws: [
    {
      type: 'Hasty generalization',
      quote: 'everyone agrees',
      explanation: 'One anecdote does not establish consensus.',
      severity: 'significant',
    },
  ],
  strengths: ['Cites a primary source.'],
};

function call(fetchImpl) {
  return callProxy({
    text: 'x'.repeat(60),
    lang: 'en',
    turnstileToken: 'token-value',
    proxyUrl: 'https://proxy.test/analyze',
    webKey: 'web-key-value',
    fetchImpl,
  });
}

/** Builds the analyzer's result + error DOM, matching the page markup. */
function buildDom() {
  document.body.innerHTML = `
    <p id="error-message"></p>
    <p id="result-summary"></p>
    <span id="result-score"></span>
    <span id="flaws-count"></span>
    <p id="no-flaws" hidden></p>
    <div id="flaws-list"></div>
    <div id="strengths-section" hidden>
      <ul id="strengths-list"></ul>
    </div>
  `;
  return {
    errorEl: document.getElementById('error-message'),
    elements: {
      summaryEl: document.getElementById('result-summary'),
      scoreBadgeEl: document.getElementById('result-score'),
      flawsCountEl: document.getElementById('flaws-count'),
      noFlawsEl: document.getElementById('no-flaws'),
      flawsListEl: document.getElementById('flaws-list'),
      strengthsSectionEl: document.getElementById('strengths-section'),
      strengthsListEl: document.getElementById('strengths-list'),
    },
  };
}

/**
 * Mirrors the submit handler's branch in src/components/Analyzer.astro:
 * a failed outcome renders a failure state, a successful one renders the
 * analysis. Returns which branch ran, so a test can assert the visitor
 * never reached the result panel at all.
 */
function renderOutcome(outcome, dom) {
  if (!outcome.ok) {
    renderFailureState(outcome.state, dom.errorEl, T, EXTENSION_URL);
    return 'error';
  }
  renderAnalysis(outcome.data, dom.elements, T);
  return 'result';
}

describe('callProxy — an unparseable 200 is a failure, never a result', () => {
  let dom;

  beforeEach(() => {
    dom = buildDom();
  });

  it('a 200 carrying an HTML error page yields the invalid failure state', async () => {
    const outcome = await call(fetchReturning(fakeResponse(200, HTML_ERROR_PAGE)));
    expect(outcome.ok).toBe(false);
    expect(outcome.state).toBe('invalid');
  });

  it('a 200 carrying an HTML error page renders the failure copy — NOT an empty, flawless-looking analysis', async () => {
    const outcome = await call(fetchReturning(fakeResponse(200, HTML_ERROR_PAGE)));
    const branch = renderOutcome(outcome, dom);

    expect(branch).toBe('error');
    expect(dom.errorEl.textContent).toBe(T.errInvalidResponse);

    // The whole point. Under the old behaviour these four assertions were
    // all false: the visitor was shown a green "No reasoning flaws
    // detected." verdict on a response the service never produced.
    expect(dom.elements.noFlawsEl.hidden).toBe(true);
    expect(dom.elements.summaryEl.textContent).toBe('');
    expect(dom.elements.scoreBadgeEl.textContent).toBe('');
    expect(dom.elements.flawsListEl.children).toHaveLength(0);
  });

  it('a 200 carrying a truncated JSON body yields the invalid failure state', async () => {
    const truncated = '{"summary":"The argument is mostly so';
    const outcome = await call(fetchReturning(fakeResponse(200, truncated)));
    expect(outcome).toEqual({ ok: false, state: 'invalid' });
  });

  it('a 200 carrying valid JSON that is not an analysis ({}) is invalid, not an empty result', async () => {
    const outcome = await call(fetchReturning(fakeResponse(200, '{}')));
    expect(outcome).toEqual({ ok: false, state: 'invalid' });
    expect(renderOutcome(outcome, dom)).toBe('error');
    expect(dom.elements.noFlawsEl.hidden).toBe(true);
  });

  it('a 200 carrying a JSON array is invalid — typeof [] === "object" is not a shape check', async () => {
    const outcome = await call(fetchReturning(fakeResponse(200, '[]')));
    expect(outcome).toEqual({ ok: false, state: 'invalid' });
  });

  it('a 200 carrying a bare JSON string or null is invalid', async () => {
    expect(await call(fetchReturning(fakeResponse(200, '"ok"')))).toEqual({
      ok: false,
      state: 'invalid',
    });
    expect(await call(fetchReturning(fakeResponse(200, 'null')))).toEqual({
      ok: false,
      state: 'invalid',
    });
  });

  it('a well-formed 200 still succeeds and renders the real analysis', async () => {
    const outcome = await call(
      fetchReturning(fakeResponse(200, JSON.stringify(VALID_ANALYSIS))),
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.data).toEqual(VALID_ANALYSIS);

    expect(renderOutcome(outcome, dom)).toBe('result');
    expect(dom.elements.summaryEl.textContent).toBe('The argument is mostly sound.');
    expect(dom.elements.flawsListEl.children).toHaveLength(1);
  });
});

describe('callProxy — failure states from the response itself', () => {
  it('a fetch that throws selects the network state', async () => {
    const throwing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await call(throwing)).toEqual({ ok: false, state: 'network' });
  });

  it('a 429 with reason "ip" selects the ip state', async () => {
    const body = JSON.stringify({ error: 'Daily limit reached.', reason: 'ip' });
    expect(await call(fetchReturning(fakeResponse(429, body)))).toEqual({
      ok: false,
      state: 'ip',
    });
  });

  // A non-2xx with an unparseable body is an ordinary CDN error page, not
  // the silent-lie case: the status alone still names an honest state, and
  // 'invalid' ("unexpected response") would be strictly less informative
  // than "could not reach the analysis service".
  it('a 503 carrying an HTML error page selects the network state, not invalid', async () => {
    expect(await call(fetchReturning(fakeResponse(503, HTML_ERROR_PAGE)))).toEqual({
      ok: false,
      state: 'network',
    });
  });

  it('a 403 carrying an HTML error page selects the forbidden state, not invalid', async () => {
    expect(await call(fetchReturning(fakeResponse(403, HTML_ERROR_PAGE)))).toEqual({
      ok: false,
      state: 'forbidden',
    });
  });
});

describe('callProxy — the request contract', () => {
  it('sends the web key header and the text/lang/turnstileToken body the Worker expects', async () => {
    const fetchImpl = fetchReturning(fakeResponse(200, JSON.stringify(VALID_ANALYSIS)));
    await call(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://proxy.test/analyze');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Elenchus-Key']).toBe('web-key-value');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      text: 'x'.repeat(60),
      lang: 'en',
      turnstileToken: 'token-value',
    });
  });
});
