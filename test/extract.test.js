// src/lib/extract.js — what the bookmarklet decides to send.
//
// These run against real DOM trees built in jsdom rather than against
// mocked queries: the heuristic IS its interaction with a document, and a
// test that stubbed querySelectorAll would pass on a heuristic that picks
// the navigation bar.

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { extractFromDocument, extractText, normalizeText } from '../src/lib/extract.js';
import { MIN_TEXT_LENGTH } from '../src/lib/limits.js';

/** @param {string} html */
function docFrom(html) {
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document;
}

/** A paragraph comfortably longer than MIN_TEXT_LENGTH. */
const LONG = 'Every claim in this paragraph rests on the one before it, which is what makes it an argument.';

describe('normalizeText', () => {
  it('collapses layout whitespace and blank lines', () => {
    expect(normalizeText('  a   b \n\n\n\n c  ')).toBe('a b\n\nc');
  });

  it('returns an empty string for anything that is not a string', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(42)).toBe('');
  });
});

describe('extractFromDocument', () => {
  it('prefers the article over page furniture', () => {
    const doc = docFrom(`
      <nav><p>Home</p><p>Subscribe</p></nav>
      <article><p>${LONG}</p><p>And a second paragraph of the argument.</p></article>
      <footer><p>Copyright</p></footer>
    `);
    const text = extractFromDocument(doc);
    expect(text).toContain(LONG);
    expect(text).not.toContain('Subscribe');
    expect(text).not.toContain('Copyright');
  });

  it('drops furniture nested inside the winning container', () => {
    const doc = docFrom(`
      <article>
        <p>${LONG}</p>
        <aside><p>Read next: ten things about something else entirely.</p></aside>
        <figure><p>Photo credit: someone</p></figure>
      </article>
    `);
    const text = extractFromDocument(doc);
    expect(text).toContain(LONG);
    expect(text).not.toContain('Read next');
    expect(text).not.toContain('Photo credit');
  });

  it('scores by text length, so a link-dense sidebar cannot outvote the article', () => {
    const links = Array.from({ length: 30 }, (_, i) => `<li>Link ${i}</li>`).join('');
    const doc = docFrom(`
      <main><ul>${links}</ul></main>
      <article><p>${LONG}</p><p>${LONG}</p><p>${LONG}</p></article>
    `);
    expect(extractFromDocument(doc)).toContain(LONG);
    expect(extractFromDocument(doc)).not.toContain('Link 12');
  });

  it('falls back to the body when the page has no landmarks', () => {
    const doc = docFrom(`<div><p>${LONG}</p></div>`);
    expect(extractFromDocument(doc)).toContain(LONG);
  });

  it('returns an empty string for a page with no prose', () => {
    const doc = docFrom('<div><img alt="just an image" /></div>');
    expect(extractFromDocument(doc)).toBe('');
  });

  it('returns an empty string rather than throwing on a non-document', () => {
    expect(extractFromDocument(null)).toBe('');
    expect(extractFromDocument({})).toBe('');
  });
});

describe('extractText', () => {
  it('sends the selection when there is a usable one, even though the article is longer', () => {
    const doc = docFrom(`<article><p>${LONG}</p><p>${LONG}</p><p>${LONG}</p></article>`);
    const selection = 'This one sentence is the passage the reader actually asked about, nothing else.';
    expect(selection.length).toBeGreaterThanOrEqual(MIN_TEXT_LENGTH);
    expect(extractText(doc, selection)).toBe(selection);
  });

  it('ignores a selection too short for the Worker to accept', () => {
    const doc = docFrom(`<article><p>${LONG}</p></article>`);
    expect(extractText(doc, 'a stray word').length).toBeGreaterThan(MIN_TEXT_LENGTH);
    expect(extractText(doc, 'a stray word')).toContain(LONG);
  });

  it('treats a whitespace-only selection as no selection', () => {
    const doc = docFrom(`<article><p>${LONG}</p></article>`);
    expect(extractText(doc, '   \n\n   ')).toContain(LONG);
  });
});
