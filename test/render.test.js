// Unit tests for src/lib/render.js — written before the implementation
// (test-first). Two things must hold at once for these to mean anything:
//
// 1. Array.isArray guards on `flaws` and `strengths` — a hostile or
//    malformed response can send a string or an object instead of an array,
//    and rendering must not throw.
// 2. The renderer never passes model text to innerHTML unescaped. Enum
//    fields (severity/score) are clamped via oneOf() BEFORE they reach any
//    markup; free-text fields (type/quote/explanation/summary/strengths)
//    are escaped or set via textContent, never interpolated raw.
//
// Assertions are made on the actual rendered DOM output (via jsdom), not on
// the renderer's internal calls — per the brief, "assert on the output".
import { beforeEach, describe, expect, it } from 'vitest';
import { analysisView, escapeHtml, renderAnalysis, sampleProvenance } from '../src/lib/render.js';
import { strings } from '../src/lib/strings.js';

const T = strings.en;

/** Builds the DOM fixture renderAnalysis expects, matching the analyzer page markup. */
function buildElements() {
  document.body.innerHTML = `
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
    summaryEl: document.getElementById('result-summary'),
    scoreBadgeEl: document.getElementById('result-score'),
    flawsCountEl: document.getElementById('flaws-count'),
    noFlawsEl: document.getElementById('no-flaws'),
    flawsListEl: document.getElementById('flaws-list'),
    strengthsSectionEl: document.getElementById('strengths-section'),
    strengthsListEl: document.getElementById('strengths-list'),
  };
}

describe('renderAnalysis', () => {
  let elements;

  beforeEach(() => {
    elements = buildElements();
  });

  it('renders a well-formed result', () => {
    renderAnalysis(
      {
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
      },
      elements,
      T,
    );

    expect(elements.summaryEl.textContent).toBe('The argument is mostly sound.');
    expect(elements.scoreBadgeEl.textContent).toBe(T.scores.moderate);
    expect(elements.scoreBadgeEl.className).toContain('moderate');
    expect(elements.flawsCountEl.textContent).toBe('(1)');
    expect(elements.noFlawsEl.hidden).toBe(true);
    expect(elements.flawsListEl.children).toHaveLength(1);
    expect(elements.strengthsSectionEl.hidden).toBe(false);
    expect(elements.strengthsListEl.children).toHaveLength(1);
    expect(elements.strengthsListEl.children[0].textContent).toBe('Cites a primary source.');
  });

  it('shows the no-flaws message and hides the count when flaws is empty', () => {
    renderAnalysis({ summary: '', score: 'strong', flaws: [], strengths: [] }, elements, T);
    expect(elements.noFlawsEl.hidden).toBe(false);
    expect(elements.flawsCountEl.textContent).toBe('');
    expect(elements.strengthsSectionEl.hidden).toBe(true);
  });

  it('guards flaws with Array.isArray: a string instead of an array does not throw and renders as no flaws', () => {
    expect(() =>
      renderAnalysis({ summary: 'x', score: 'weak', flaws: 'not an array', strengths: [] }, elements, T),
    ).not.toThrow();
    expect(elements.flawsListEl.children).toHaveLength(0);
    expect(elements.noFlawsEl.hidden).toBe(false);
  });

  it('guards flaws with Array.isArray: an object instead of an array does not throw', () => {
    expect(() =>
      renderAnalysis({ summary: 'x', score: 'weak', flaws: { evil: true }, strengths: [] }, elements, T),
    ).not.toThrow();
    expect(elements.flawsListEl.children).toHaveLength(0);
  });

  it('guards strengths with Array.isArray: a string instead of an array does not throw', () => {
    expect(() =>
      renderAnalysis({ summary: 'x', score: 'weak', flaws: [], strengths: 'not an array' }, elements, T),
    ).not.toThrow();
    expect(elements.strengthsListEl.children).toHaveLength(0);
    expect(elements.strengthsSectionEl.hidden).toBe(true);
  });

  it('filters blank/non-string entries out of strengths', () => {
    renderAnalysis(
      { summary: 'x', score: 'weak', flaws: [], strengths: ['  ', 42, null, 'A real strength.'] },
      elements,
      T,
    );
    expect(elements.strengthsListEl.children).toHaveLength(1);
    expect(elements.strengthsListEl.children[0].textContent).toBe('A real strength.');
  });

  it('clamps an unknown score to "unknown" rather than rendering it raw', () => {
    renderAnalysis({ summary: 'x', score: 'devastatingly bad', flaws: [], strengths: [] }, elements, T);
    expect(elements.scoreBadgeEl.textContent).toBe(T.scores.unknown);
    expect(elements.scoreBadgeEl.className).not.toContain('devastatingly bad');
  });

  describe('hostile fixture — the security assertion', () => {
    const hostileSeverity = '"><img src=x onerror=alert(1)>';
    const hostileProse = '<img src=x onerror=alert(1)>';

    it('renders a hostile severity as the clamped fallback, never as live markup', () => {
      renderAnalysis(
        {
          summary: 'x',
          score: 'weak',
          flaws: [
            {
              type: 'Category',
              quote: 'quote',
              explanation: 'explanation',
              severity: hostileSeverity,
            },
          ],
          strengths: [],
        },
        elements,
        T,
      );

      const card = elements.flawsListEl.children[0];
      // The clamped enum value ('minor', the fallback) is what appears — not
      // the hostile string — and no <img> element exists anywhere in the
      // rendered card.
      const severityBadge = card.querySelector('.flaw-severity');
      expect(severityBadge.textContent).toBe(T.severities.minor);
      expect(severityBadge.className).toContain('minor');
      expect(card.querySelector('img')).toBeNull();
      // Not 'onerror': the clamp deletes the whole hostile string (it never
      // reaches the DOM at all), so checking for the substring proves
      // nothing about *why* it's gone — unlike the escaping tests below,
      // where 'onerror' legitimately survives as encoded text. Assert on
      // the actual markup shape instead: no raw '<img' anywhere.
      expect(card.innerHTML).not.toContain('<img');
    });

    it('renders hostile prose (type/quote/explanation) escaped, not as live markup', () => {
      renderAnalysis(
        {
          summary: 'x',
          score: 'weak',
          flaws: [
            {
              type: hostileProse,
              quote: hostileProse,
              explanation: hostileProse,
              severity: 'critical',
            },
          ],
          strengths: [],
        },
        elements,
        T,
      );

      const card = elements.flawsListEl.children[0];
      // No live element was created from the hostile string...
      expect(card.querySelector('img')).toBeNull();
      // ...it was HTML-encoded instead (the raw "<img" never appears in the
      // markup, only its escaped form).
      expect(card.innerHTML).not.toContain('<img');
      expect(card.innerHTML).toContain('&lt;img');
      // The raw text must still be present (as escaped text, via
      // textContent), so the flaw itself is not silently dropped — just
      // neutralized.
      expect(card.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    // Regression (final review): `summary` was the ONLY free-text field
    // with no hostile-input test — type, quote, explanation, severity,
    // score and strengths were all covered. It is also the field most
    // likely to echo pasted attacker text verbatim, being the model's
    // freest prose.
    //
    // The gap was invisible because the only assertion touching it read
    // `summaryEl.textContent`, and textContent reads back IDENTICALLY
    // whether the field was written with textContent or innerHTML — so
    // flipping render.js's `summaryEl.textContent =` to `.innerHTML =`
    // left the whole suite green while producing a real, live
    // `<img src="x" onerror="alert(1)">` element in the DOM. Assert on a
    // live-element check and on the escaped markup instead, mirroring the
    // hostile-strengths test below; never on a substring that survives
    // escaping.
    it('renders a hostile summary as plain text via textContent, never as markup', () => {
      renderAnalysis(
        { summary: hostileProse, score: 'weak', flaws: [], strengths: [] },
        elements,
        T,
      );

      // No live element was created from the hostile string...
      expect(elements.summaryEl.querySelector('img')).toBeNull();
      expect(elements.summaryEl.children).toHaveLength(0);
      // ...and the markup shows it encoded, not parsed.
      expect(elements.summaryEl.innerHTML).not.toContain('<img');
      expect(elements.summaryEl.innerHTML).toContain('&lt;img');
      // The prose itself is still shown, just neutralized.
      expect(elements.summaryEl.textContent).toBe(hostileProse);
    });

    it('renders a hostile strength as plain text via textContent, never as markup', () => {
      renderAnalysis(
        { summary: 'x', score: 'weak', flaws: [], strengths: [hostileProse] },
        elements,
        T,
      );
      const li = elements.strengthsListEl.children[0];
      expect(li.querySelector('img')).toBeNull();
      expect(li.textContent).toBe(hostileProse);
    });
  });
});

// analysisView() is the build-time half of the renderer: plain data, no DOM,
// consumed by renderAnalysis() above and by SampleResult.astro at build time.
// Its hostile-input contract is different in kind from the DOM path's: it
// must CLAMP enums (a class attribute has no escaping that makes an unknown
// value safe to style by) and must NOT escape free text — escaping belongs
// to the sink (Astro's `{}`, escapeHtml, textContent), and pre-escaped text
// would print `&lt;img` literally on the page once the sink escapes it
// again. The rendered build-time output, with live-element and escaped-markup
// checks on every free-text field, is pinned in test/sampleResult.test.js.
describe('analysisView', () => {
  const T = strings.en;
  const hostileProse = '<img src=x onerror=alert(1)>';

  it('clamps a hostile score and severity to their fallbacks', () => {
    const v = analysisView(
      {
        summary: 'x',
        score: 'x" onclick="alert(1)',
        flaws: [{ type: 't', quote: 'q', explanation: 'e', severity: '"><img src=x onerror=alert(1)>' }],
        strengths: [],
      },
      T,
    );
    expect(v.score).toBe('unknown');
    expect(v.scoreClass).toBe('score-badge');
    expect(v.scoreLabel).toBe(T.scores.unknown);
    expect(v.flaws[0].severity).toBe('minor');
    expect(v.flaws[0].severityLabel).toBe(T.severities.minor);
  });

  it('keeps every hostile free-text field as the plain string, unescaped (the sink escapes once)', () => {
    const v = analysisView(
      {
        summary: hostileProse,
        score: 'weak',
        flaws: [{ type: hostileProse, quote: hostileProse, explanation: hostileProse, severity: 'critical' }],
        strengths: [hostileProse],
      },
      T,
    );
    expect(v.summary).toBe(hostileProse);
    expect(v.flaws[0]).toMatchObject({ type: hostileProse, quote: hostileProse, explanation: hostileProse });
    expect(v.strengths).toEqual([hostileProse]);
  });

  it('guards flaws/strengths with Array.isArray and filters blank strengths', () => {
    expect(analysisView({ flaws: 'nope', strengths: { a: 1 } }, T)).toMatchObject({
      summary: '',
      flaws: [],
      flawsCount: '',
      strengths: [],
    });
    expect(analysisView({ strengths: ['  ', 42, null, 'Real.'] }, T).strengths).toEqual(['Real.']);
    expect(analysisView(null, T).flaws).toEqual([]);
  });

  it('coerces non-string flaw text the way escapeHtml did, and a null flaw does not throw', () => {
    const v = analysisView({ flaws: [null, { type: 42 }] }, T);
    expect(v.flaws[0]).toMatchObject({ type: '', quote: '', explanation: '', severity: 'minor' });
    expect(v.flaws[1].type).toBe('42');
    expect(v.flawsCount).toBe('(2)');
  });

  it('is what renderAnalysis() renders: the DOM path consumes the same view', () => {
    const result = {
      summary: 'Sound enough.',
      score: 'strong',
      flaws: [{ type: 'A', quote: 'B', explanation: 'C', severity: 'critical' }],
      strengths: ['D'],
    };
    const v = analysisView(result, T);
    const elements = buildElements();
    renderAnalysis(result, elements, T);
    expect(elements.scoreBadgeEl.className).toBe(v.scoreClass);
    expect(elements.flawsCountEl.textContent).toBe(v.flawsCount);
    expect(elements.flawsListEl.querySelector('.flaw-severity').className).toBe(`flaw-severity ${v.flaws[0].severity}`);
  });
});

describe('sampleProvenance', () => {
  const s = { date: '2026-10-10', servedBy: 'example/model-a:free', promptVersion: 'v2', translated: false };

  it('carries the date, the model, the prompt version and "AI-generated"', () => {
    const { label, translated } = sampleProvenance(s, strings.en);
    expect(label).toContain('2026-10-10');
    expect(label).toContain('example/model-a:free');
    expect(label).toContain('prompt v2');
    expect(label).toContain('AI-generated');
    expect(translated).toBeNull();
  });

  it('has a French twin that names the model and says it was AI-generated', () => {
    const { label, translated } = sampleProvenance({ ...s, translated: true }, strings.fr);
    expect(label).toBe('Analyse enregistrée · 2026-10-10 · example/model-a:free · prompt v2 · générée par IA');
    expect(translated).toBe("Texte traduit de l'original anglais");
  });

  it('adds the translated line only for translated === true', () => {
    expect(sampleProvenance({ ...s, translated: 'yes' }, strings.fr).translated).toBeNull();
  });
});

describe('escapeHtml', () => {
  // escapeHtml's JSDoc promises "safe interpolation into an HTML template
  // string, including inside an attribute value". No caller currently uses
  // it in an attribute position, so an escaper that only handled the
  // text-node case (encoding & < > but not " or ') would pass every other
  // test in this file while leaving the documented contract false —
  // exactly the gap a future attribute-position caller would fall into.
  // Assert the contract directly rather than only through today's callers.
  it('encodes & < > (text-node position)', () => {
    expect(escapeHtml('&<>')).toBe('&amp;&lt;&gt;');
  });

  it('encodes " and \' (attribute position)', () => {
    expect(escapeHtml(`"'`)).toBe('&quot;&#39;');
  });

  it('encodes a full attribute-breakout payload with no raw quote left', () => {
    const hostile = `"><img src=x onerror=alert('x')>`;
    const escaped = escapeHtml(hostile);
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
    expect(escaped).not.toContain('<img');
  });

  it('treats null/undefined as empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
