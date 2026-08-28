// Text extraction for the bookmarklet: what to send to /analyze when a
// reader clicks it on someone else's page.
//
// This module is bundled into the `javascript:` URL itself (see
// src/lib/buildBookmarklet.js), so it must stay dependency-free and small,
// and it must not touch `window` — everything it needs arrives as
// arguments, which is also what makes it testable in jsdom as a pure
// function of (document, selection text).
//
// **Readability.js is deliberately not inlined here.** 43 KB
// percent-encoded lands in a disputed band for Firefox bookmark length — a
// size argument, and now the only one: the second half of this rationale
// used to be "and those sites block the bookmarklet by CSP anyway", which
// was measured false on 2026-08-28. The size argument alone still carries
// the decision, but it is the one that has to hold.
// The rule this heuristic follows instead: prefer what the reader selected,
// then the paragraphs of the most text-dense container, then nothing —
// never a page-furniture soup that would be analysed as if it were an
// argument.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { MIN_TEXT_LENGTH } from './limits.js';

/**
 * Elements whose text is page furniture, never argument. A paragraph inside
 * any of these is dropped even when it sits in the winning container.
 */
const FURNITURE = 'nav, header, footer, aside, form, figure, script, style, noscript, template, [aria-hidden="true"], [hidden]';

/** Block-level elements whose text reads as prose. */
const PROSE = 'p, blockquote, li, h1, h2, h3, h4';

/**
 * Collapses runs of horizontal whitespace and blank lines, and trims.
 * Text copied out of a rendered page is full of layout whitespace; the
 * model sees a cleaner argument without it, and the character cap goes
 * further.
 *
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizeText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {Element} el
 * @returns {boolean} true when `el` sits inside page furniture
 */
function isFurniture(el) {
  return typeof el.closest === 'function' && el.closest(FURNITURE) !== null;
}

/**
 * The prose blocks of a container, in document order, furniture removed.
 *
 * @param {Element} root
 * @returns {string[]}
 */
function proseBlocks(root) {
  const blocks = [];
  for (const el of root.querySelectorAll(PROSE)) {
    if (isFurniture(el)) continue;
    const text = normalizeText(el.textContent);
    if (text) blocks.push(text);
  }
  return blocks;
}

/**
 * Picks the most text-dense candidate container and returns its prose.
 *
 * Scoring is total prose length rather than element count: a sidebar with
 * twenty one-line links outnumbers an article's paragraphs but carries a
 * fraction of the text.
 *
 * `<body>` is a **last resort, not a candidate**. It contains every other
 * candidate plus all the furniture, so by length it always wins — scoring
 * it alongside the others is how "pick the article" silently becomes "pick
 * the whole page, navigation included". It is only used when the semantic
 * containers yield nothing worth analysing.
 *
 * @param {Document} doc
 * @returns {string}
 */
export function extractFromDocument(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') return '';

  let best = '';
  for (const candidate of doc.querySelectorAll(
    'article, main, [role="main"], .post-content, .article-body',
  )) {
    const text = proseBlocks(candidate).join('\n\n');
    if (text.length > best.length) best = text;
  }

  if (best.length >= MIN_TEXT_LENGTH) return best;
  return doc.body ? proseBlocks(doc.body).join('\n\n') : best;
}

/**
 * What the bookmarklet sends: the reader's selection when there is a usable
 * one, the page's main prose otherwise.
 *
 * The selection wins even when it is shorter than the extracted article —
 * selecting text *is* the reader saying which passage to examine, and
 * silently analysing something else instead would be the tool overruling
 * them. It is only ignored when it is too short for the Worker to accept at
 * all (`MIN_TEXT_LENGTH`), where the alternative is not "wrong text" but "no
 * analysis".
 *
 * @param {Document} doc
 * @param {string | null | undefined} selectionText `String(window.getSelection())`
 * @returns {string} normalized text, possibly empty when the page has no prose
 */
export function extractText(doc, selectionText) {
  const selected = normalizeText(selectionText);
  if (selected.length >= MIN_TEXT_LENGTH) return selected;
  return extractFromDocument(doc);
}
