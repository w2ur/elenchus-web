// The "complete the challenge first" line by Analyze (#turnstile-hint) must
// clear once Turnstile reports a token. The callback lives in an is:inline
// script in src/components/Analyzer.astro (it must exist before api.js can
// render the widget), so no module import reaches it: this test lifts that
// script out of the component source and runs it in jsdom.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'src/components/Analyzer.astro'), 'utf-8');

const inlineScripts = [...SRC.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const callbackScript = inlineScripts.find((s) => s.includes('elenchusTurnstileSolved'));

describe('the Turnstile solved callback', () => {
  beforeEach(() => {
    delete window.elenchusTurnstileSolved;
    document.documentElement.className = '';
    document.body.innerHTML =
      '<p id="turnstile-hint" role="status">Complete the challenge first.</p>' +
      '<div id="turnstile-container" data-callback="elenchusTurnstileSolved"></div>';
    // Same global scope the browser gives an inline script.
    window.eval(callbackScript);
  });

  it('is named by the widget and defined by an inline script', () => {
    expect(SRC).toMatch(/data-callback="elenchusTurnstileSolved"/);
    expect(callbackScript).toBeDefined();
    expect(typeof window.elenchusTurnstileSolved).toBe('function');
  });

  // Regression: 10bdfa2 — the hint stayed on screen after the visitor solved the challenge.
  it('clears the hint when a token arrives', () => {
    window.elenchusTurnstileSolved('XXXX.DUMMY.TOKEN');
    expect(document.getElementById('turnstile-hint').textContent).toBe('');
  });

  it('leaves the hint alone without a token', () => {
    window.elenchusTurnstileSolved('');
    window.elenchusTurnstileSolved(undefined);
    expect(document.getElementById('turnstile-hint').textContent).toBe('Complete the challenge first.');
  });

  it('is kept by the re-render on a theme change', () => {
    expect(SRC).toMatch(/ts\.render\(turnstileContainer, \{[\s\S]*?callback: window\.elenchusTurnstileSolved,[\s\S]*?\}\)/);
  });
});
