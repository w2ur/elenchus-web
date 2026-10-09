import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, nextTheme, readTheme, THEME_KEY, turnstileTheme } from '../src/lib/theme.js';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });

  it('applies a class only for an explicit choice', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    applyTheme('system');
    expect(document.documentElement.className).toBe('');
  });

  it('persists under one key and reads back, defaulting to system on garbage', () => {
    applyTheme('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readTheme()).toBe('system');
  });
});

// Regression (design audit 2026-10-09): the Turnstile widget carried
// data-theme="auto", which follows the SYSTEM scheme, so a visitor who chose
// the opposite scheme with the toggle got a light widget on a dark page (or
// the reverse). turnstileTheme() maps the explicit choice; the inline copy in
// Analyzer.astro must agree with it, because it is what runs before the
// widget's first render.
describe('turnstileTheme', () => {
  const cases = [
    ['dark', 'dark'],
    ['light', 'light'],
    ['', 'auto'],
  ];

  it.each(cases)('class "%s" on <html> gives data-theme "%s"', (cls, expected) => {
    document.documentElement.className = cls;
    expect(turnstileTheme(document.documentElement.classList)).toBe(expected);
  });

  it.each(cases)("Analyzer.astro's inline copy agrees for class \"%s\"", (cls, expected) => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/components/Analyzer.astro'), 'utf-8');
    const m = src.match(/<script is:inline>([\s\S]*?turnstile-container[\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    document.body.innerHTML = '<div id="turnstile-container" data-theme="auto"></div>';
    document.documentElement.className = cls;
    new Function(m[1])();
    expect(document.getElementById('turnstile-container').dataset.theme).toBe(expected);
  });

  it('the widget is told the page language, not left to the browser locale', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/components/Analyzer.astro'), 'utf-8');
    const div = src.slice(src.indexOf('id="turnstile-container"'), src.indexOf('</div>', src.indexOf('id="turnstile-container"')));
    expect(div).toMatch(/data-language=\{lang\}/);
  });
});
