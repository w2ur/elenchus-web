// Build-time only: turns src/lib/bookmarkletSource.js into the
// `javascript:` URL the install page hands out.
//
// This runs in Node during `astro build` (called from the install pages'
// frontmatter), never in a browser. It exists so the bookmarklet and the
// receiving page share ONE source of truth — src/lib/extract.js and
// src/lib/handoff.js are imported by both ends, and the shipped bookmarklet
// is bundled from them at build time rather than hand-minified into a
// literal that would silently drift the first time either changes.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolved from the project root, NOT from `import.meta.url`. This module is
// imported by an Astro page's frontmatter, and Astro bundles frontmatter
// into `dist/.prerender/chunks/` before running it — so `import.meta.url`
// points into the build output, where the bookmarklet source does not exist
// (measured: "Could not resolve dist/.prerender/chunks/bookmarkletSource.js",
// a build failure, which is the right direction for this mistake to fail).
// `astro build` and `vitest` both run from the project root.
const ENTRY = resolve(process.cwd(), 'src/lib/bookmarkletSource.js');

/**
 * A `javascript:` URL is a bookmark's whole payload, and browsers cap
 * bookmark URLs. Firefox is the tightest of the current engines and the
 * reason Readability.js is not inlined (43 KB encoded). This budget is far
 * below any engine's limit and exists to fail the BUILD if this file ever
 * grows toward that band, rather than to hit an exact ceiling.
 */
export const MAX_BOOKMARKLET_LENGTH = 8000;

/**
 * @param {string} analyzeUrl absolute URL of the analyzer page this
 *   bookmarklet should open (per language)
 * @returns {Promise<string>} a complete `javascript:` URL
 */
export async function buildBookmarklet(analyzeUrl) {
  if (typeof analyzeUrl !== 'string' || !analyzeUrl.startsWith('https://')) {
    throw new Error(
      `buildBookmarklet() needs an absolute https URL for the analyzer page, got: ${analyzeUrl}. ` +
        'It is baked into the bookmarklet as its postMessage target origin, so a relative ' +
        "or empty value would send the reader's text to whatever origin they happened to be on.",
    );
  }

  if (!existsSync(ENTRY)) {
    throw new Error(
      `Cannot find the bookmarklet source at ${ENTRY}. It is resolved from the current working ` +
        'directory, so this build must run from the project root (`npm run build`), not from a ' +
        'subdirectory.',
    );
  }

  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false,
    legalComments: 'none',
    define: { __ELENCHUS_ANALYZE_URL__: JSON.stringify(analyzeUrl) },
  });

  // Trailing `void 0` so the script's completion value is undefined no
  // matter what the bundle's last statement evaluates to. A `javascript:`
  // URL that yields a string REPLACES the page the reader is on with a
  // document containing that string — the worst possible failure mode for a
  // tool that runs on other people's articles.
  //
  // **Observed, not hypothetical.** The M2 probe bookmarklet
  // (`javascript:document.title='ELENCHUS-OK'`, no `void`) did exactly this
  // on 2026-08-28: the assignment's value is the string, and the tab was
  // navigated to a blank page reading ELENCHUS-OK while the address bar
  // still showed the original URL. It goes last, not as a `void` prefix: esbuild emits
  // a `"use strict";` directive first, so a prefix would apply to that
  // directive and leave the real payload's value ungoverned.
  const code = `${result.outputFiles[0].text.trim()};void 0;`;
  const url = `javascript:${encodeURIComponent(code)}`;

  if (url.length > MAX_BOOKMARKLET_LENGTH) {
    throw new Error(
      `The bookmarklet is ${url.length} characters, over the ${MAX_BOOKMARKLET_LENGTH} budget ` +
        'in src/lib/buildBookmarklet.js. Shrink src/lib/bookmarkletSource.js or its imports — ' +
        'do not raise the budget without measuring a real browser bookmark limit.',
    );
  }

  return url;
}
