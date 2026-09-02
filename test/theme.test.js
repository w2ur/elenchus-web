import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, nextTheme, readTheme, THEME_KEY } from '../src/lib/theme.js';

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
