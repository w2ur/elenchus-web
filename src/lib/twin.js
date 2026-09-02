import { strings } from './strings.js';

// twin.js — the other-language twin of a page, shared by HouseHeader.astro
// (the contract's language toggle, which must live in the header — see
// docs/house-contract.md §1 in the untilt repo) and Layout.astro's footer
// link. Both used to compute this inline in Layout.astro; factored out here
// so the two call sites cannot drift, and so the derivation is unit-testable
// without an Astro rendering context.
//
// `path` is always the page's ENGLISH path, with its trailing slash ('/',
// '/analyze/', '/bookmarklet/') — the same convention Layout.astro's own
// `path` prop documents, and every page in `src/pages/` follows it: even
// `src/pages/fr/analyze.astro` passes `path="/analyze/"`, not
// `"/fr/analyze/"`. That convention is what lets `twinFor` compute the
// French URL by prefixing rather than guessing.
//
// SITE mirrors astro.config.mjs's `site: 'https://elenchus.untilt.app'`
// (hardcoded here, not read from `Astro.site`, because a plain function has
// no Astro rendering context to read it from — see test/twin.test.js). The
// two are pinned equal by that test's own comment; if the site ever moves,
// both need updating.
const SITE = 'https://elenchus.untilt.app';

/**
 * @param {string} lang - 'en' or 'fr'.
 * @param {string} [path] - the page's English path, e.g. '/', '/bookmarklet/'.
 * @returns {{ otherHref: string | null, otherLang: string | null, otherLabel: string | null }}
 */
export function twinFor(lang, path) {
  if (!path) {
    return { otherHref: null, otherLang: null, otherLabel: null };
  }

  const enHref = new URL(path, SITE).href;
  const frHref = new URL(path === '/' ? '/fr/' : `/fr${path}`, SITE).href;

  const otherLang = lang === 'fr' ? 'en' : 'fr';
  const otherHref = lang === 'fr' ? enHref : frHref;
  const otherLabel = (strings[lang] ?? strings.en).otherLangLabel;

  return { otherHref, otherLang, otherLabel };
}
