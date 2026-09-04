import { describe, it, expect } from 'vitest';
import { twinFor } from '../src/lib/twin.js';
import { strings } from '../src/lib/strings.js';

describe('twinFor', () => {
  it('the English homepage points at the French homepage', () => {
    expect(twinFor('en', '/')).toEqual({
      otherHref: 'https://elenchus.untilt.app/fr/',
      otherLang: 'fr',
      otherLabel: strings.en.otherLangLabel,
      otherCode: 'FR',
    });
  });

  it('the English bookmarklet page points at its French twin', () => {
    expect(twinFor('en', '/bookmarklet/')).toEqual({
      otherHref: 'https://elenchus.untilt.app/fr/bookmarklet/',
      otherLang: 'fr',
      otherLabel: strings.en.otherLangLabel,
      otherCode: 'FR',
    });
  });

  it('the French homepage points back at the English one, not at itself', () => {
    // path is always the ENGLISH canonical path (see the file comment), so
    // the French homepage's twinFor call still receives '/' — the same
    // input as the English case above, only lang differs. The output must
    // therefore be the opposite twin: the plain '/' page, in English.
    expect(twinFor('fr', '/')).toEqual({
      otherHref: 'https://elenchus.untilt.app/',
      otherLang: 'en',
      otherLabel: strings.fr.otherLangLabel,
      otherCode: 'EN',
    });
  });

  it('no path means no twin, rather than a guessed one', () => {
    expect(twinFor('en', undefined)).toEqual({
      otherHref: null,
      otherLang: null,
      otherLabel: null,
      otherCode: null,
    });
  });

  // The header shows the code, the footer keeps the word: two renderings of
  // one derivation, so they cannot disagree about which way the toggle goes.
  // The code names the DESTINATION, matching otherLang/otherHref — a control
  // reading "EN" on an English page states a fact instead of offering an
  // action, which is what both tools shipped before this.
  it('the code is the destination language, uppercased, and agrees with otherLang', () => {
    for (const lang of ['en', 'fr']) {
      const { otherLang, otherCode } = twinFor(lang, '/');
      expect(otherCode).toBe(otherLang.toUpperCase());
    }
  });
});
