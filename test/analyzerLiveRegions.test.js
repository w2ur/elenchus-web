// Pins the live-region ARIA wiring in src/components/Analyzer.astro.
//
// The three panels toggled with `hidden` (#loading-state, #error-state,
// #result-state) are the ONLY way a screen-reader user learns the outcome
// of an analysis — including the dry-state message, which is the ORDINARY
// result on this free tier, not an edge case (see src/lib/errorState.js).
// Nothing in that component's client <script> is reachable by
// `npx vitest run` (see CLAUDE.md and proxyClient.js's header), and until
// this file, nothing reachable asserted on the markup either: `role`,
// `aria-live` and `aria-atomic` could be deleted from Analyzer.astro and
// every test in this repo would stay green, silently turning the analyzer
// into a tool that announces nothing on its most common outcome.
//
// Source-level, not build-level: reads the .astro file directly, the same
// approach test/configFailLoud.test.js uses for the frontmatter import —
// no `astro build` dependency, so this stays fast and doesn't rot if dist/
// is stale or absent.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(join(REPO_ROOT, 'src/components/Analyzer.astro'), 'utf8');

/**
 * Returns the opening tag for a given element id, e.g. the full
 * `<div id="loading-state" role="status" hidden>` — not just a substring
 * match anywhere in the file, so an attribute moved onto some other
 * element would not fool this.
 *
 * @param {string} id
 * @returns {string}
 */
function openingTag(id) {
  const match = SOURCE.match(new RegExp(`<div\\s+id="${id}"[^>]*>`));
  expect(match, `no <div id="${id}"> found in Analyzer.astro`).not.toBeNull();
  return /** @type {RegExpMatchArray} */ (match)[0];
}

describe('Analyzer.astro live regions carry the ARIA that makes them audible', () => {
  it('#loading-state announces politely (role="status")', () => {
    expect(openingTag('loading-state')).toMatch(/role="status"/);
  });

  it('#error-state announces politely, not as an alert (role="status")', () => {
    // Deliberately role="status", not role="alert" — see CLAUDE.md and the
    // comment above the markup: the two most common failure states here
    // (ip, service) are presented as dry-state copy, not alarms, and an
    // assertive interruption would contradict that in the one channel the
    // visual treatment cannot reach.
    expect(openingTag('error-state')).toMatch(/role="status"/);
  });

  it('#result-state announces non-atomically (aria-live="polite", aria-atomic="false")', () => {
    // NOT role="status" here — that implies aria-atomic="true", which
    // would re-read the entire analysis as one block on every incremental
    // change instead of announcing just the arriving content.
    const tag = openingTag('result-state');
    expect(tag).toMatch(/aria-live="polite"/);
    expect(tag).toMatch(/aria-atomic="false"/);
    expect(tag).not.toMatch(/role="status"/);
  });
});
