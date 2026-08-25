// Pins the build-time fail-loud gate — the one guarantee in this repo that
// nothing else can catch.
//
// src/lib/config.js throws at MODULE SCOPE when a required PUBLIC_ env var
// is missing. That fails the *build* only because src/pages/analyze.astro
// and src/pages/fr/analyze.astro import it in FRONTMATTER, which runs in
// Node during `astro build` (output: 'static'). The client script receives
// config through data-* attributes instead, so nothing else imports
// config.js at all — the two frontmatter imports are the entire mechanism.
//
// A final review removed both imports with the env unset and got build
// exit 0. So a future refactor that "tidies away" an import that looks
// unused would ship a site broken for every visitor, with a green deploy
// and no test failing. There is no type-checker here to notice, and
// `npm run build` cannot notice by construction: with the imports gone
// there is nothing left to fail.
//
// Two halves, both pinned below, because either one alone is a false sense
// of safety:
//   1. Both pages import config.js, and do it from frontmatter — an import
//      moved into a client <script> compiles fine and only throws in a
//      visitor's browser, which is exactly the failure the frontmatter
//      import exists to prevent.
//   2. Importing config.js with a required var unset actually throws, and
//      the message names the variable. A refactor that made the read lazy
//      (a getter, a function call at fetch time) would leave half 1 true
//      and the gate dead.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Resolved through fileURLToPath, deliberately NOT through
// `new URL('../x', import.meta.url)`: Vite rewrites that exact pattern into
// its own asset-URL resolution at transform time, which silently yields
// `<testdir>/undefined` here instead of a repo path. Measured, not assumed
// — the string-literal form resolved to `/src/pages/analyze.astro` and the
// template-literal form to `.../test/undefined`.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  { file: 'src/pages/analyze.astro', specifier: '../lib/config.js' },
  { file: 'src/pages/fr/analyze.astro', specifier: '../../lib/config.js' },
];

/**
 * Returns only the Astro frontmatter — the fenced block between the first
 * two `---` lines, which is the part that runs in Node at build time. An
 * import found anywhere else in the file does NOT fail the build, so the
 * whole point of this test is that it reads this slice and not the file.
 *
 * @param {string} source
 * @returns {string}
 */
function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function readPage(file) {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

describe('the frontmatter config import (half 1: the build actually loads config.js)', () => {
  for (const { file, specifier } of PAGES) {
    it(`${file} imports config.js from FRONTMATTER, not from a client script`, () => {
      const block = frontmatter(readPage(file));
      expect(block).not.toBe('');
      // An import statement, not a mention in a comment: a comment saying
      // "we import ../lib/config.js" would satisfy a bare substring check
      // while importing nothing.
      expect(block).toMatch(
        new RegExp(`^\\s*import\\s+[^\\n]*from\\s+['"]${specifier.replace(/\./g, '\\.')}['"]`, 'm'),
      );
    });

    it(`${file} actually reads the exported values (an unused import invites a "tidy-up")`, () => {
      const source = readPage(file);
      for (const name of ['ELENCHUS_PROXY_URL', 'ELENCHUS_WEB_KEY', 'TURNSTILE_SITE_KEY']) {
        expect(source).toContain(name);
      }
    });
  }
});

describe('the module-scope throw (half 2: loading config.js with a var unset fails loudly)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['PUBLIC_ELENCHUS_WEB_KEY', 'PUBLIC_TURNSTILE_SITE_KEY'],
    ['PUBLIC_TURNSTILE_SITE_KEY', 'PUBLIC_ELENCHUS_WEB_KEY'],
  ])('importing config.js throws and names %s when it is missing', async (missing, present) => {
    vi.stubEnv(present, 'set-for-this-test');
    vi.stubEnv(missing, '');
    vi.resetModules();

    await expect(import('../src/lib/config.js')).rejects.toThrow(missing);
  });

  it('the thrown message says how to fix it, not just that something is wrong', async () => {
    vi.stubEnv('PUBLIC_TURNSTILE_SITE_KEY', 'set-for-this-test');
    vi.stubEnv('PUBLIC_ELENCHUS_WEB_KEY', '');
    vi.resetModules();

    await expect(import('../src/lib/config.js')).rejects.toThrow(/\.env\.example/);
  });
});
