// @vitest-environment node

// src/lib/buildBookmarklet.js — the build step that turns
// src/lib/bookmarkletSource.js into the `javascript:` URL the install page
// hands out.
//
// Nothing else can check this: the shipped bookmarklet is not a file in the
// repo, it is a string produced at build time, and it runs on other
// people's pages where no error of ours can be reported.

import { describe, expect, it } from 'vitest';

import { MAX_BOOKMARKLET_LENGTH, buildBookmarklet } from '../src/lib/buildBookmarklet.js';

const ANALYZE_URL = 'https://elenchus.untilt.app/analyze';

describe('buildBookmarklet', () => {
  it('produces a javascript: URL within the bookmark-length budget', async () => {
    const url = await buildBookmarklet(ANALYZE_URL);
    expect(url.startsWith('javascript:')).toBe(true);
    expect(url.length).toBeLessThanOrEqual(MAX_BOOKMARKLET_LENGTH);
  });

  it('bakes in the analyzer URL it was given, so the FR bookmarklet opens the FR page', async () => {
    const fr = decodeURIComponent(await buildBookmarklet('https://elenchus.untilt.app/fr/analyze'));
    expect(fr).toContain('https://elenchus.untilt.app/fr/analyze');
    expect(fr).not.toContain('__ELENCHUS_ANALYZE_URL__');
  });

  it('ends with a statement whose value is undefined', async () => {
    // A javascript: URL that evaluates to a string replaces the page the
    // reader is on with that string. Verified by evaluating the decoded
    // body the way a browser would: `void 0` last is what makes this
    // undefined rather than whatever the bundle happened to return.
    const code = decodeURIComponent((await buildBookmarklet(ANALYZE_URL)).slice('javascript:'.length));
    expect(code.trimEnd().endsWith('void 0;')).toBe(true);
  });

  it('refuses a relative or empty analyzer URL rather than shipping one', async () => {
    // The URL is also the postMessage target origin. A relative value would
    // send the reader's text to whatever site they were reading.
    await expect(buildBookmarklet('/analyze')).rejects.toThrow(/absolute https URL/);
    await expect(buildBookmarklet('')).rejects.toThrow(/absolute https URL/);
    await expect(buildBookmarklet(undefined)).rejects.toThrow(/absolute https URL/);
  });
});
