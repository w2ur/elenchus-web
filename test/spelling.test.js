// Regression (design audit 2026-10-09): the English page mixed spellings —
// nav "Analyse", notice "analysing", button "Analyze". English copy is US
// spelling throughout. "analyses" (the plural noun) is the same in both and
// is not matched.
import { describe, expect, it } from 'vitest';
import { bookmarkletCopy, landingCopy } from '../src/lib/pageCopy.js';
import { strings } from '../src/lib/strings.js';

/** Every string reachable in an object, arrays and nested objects included. */
function allStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('English copy uses US spelling', () => {
  it.each([
    ['strings.en', strings.en],
    ['landingCopy.en', landingCopy.en],
    ['bookmarkletCopy.en', bookmarkletCopy.en],
  ])('%s has no "analyse/analysing/analysed"', (_, table) => {
    const hits = allStrings(table).filter((s) => /\banalys(e|ing|ed)\b/i.test(s));
    expect(hits).toEqual([]);
  });
});
