// Regression (design audit 2026-10-09): the counter under the paste box read
// "0 / 15000" — no unit, no thousands separator — and the server-rendered
// first paint hard-coded that bare form in Analyzer.astro rather than going
// through the same function the client uses on every keystroke.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { strings } from '../src/lib/strings.js';

describe('charCount', () => {
  it('English: separator and unit', () => {
    expect(strings.en.charCount(0, 15000)).toBe('0 / 15,000 characters');
    expect(strings.en.charCount(1234, 15000)).toBe('1,234 / 15,000 characters');
  });

  it('French: narrow no-break space separator and unit', () => {
    // fr-FR groups with U+202F, which also keeps "15 000" on one line.
    expect(strings.fr.charCount(0, 15000)).toBe('0 / 15 000 caractères');
  });

  it("the first paint uses the same function, not a hard-coded bare ratio", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/components/Analyzer.astro'),
      'utf-8',
    );
    expect(src).toMatch(/<span id="char-count">\{T\.charCount\(0, MAX_TEXT_LENGTH\)\}<\/span>/);
  });
});
