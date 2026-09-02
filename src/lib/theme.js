// Three-state theme: system → light → dark → system. 'system' means "no
// explicit choice" and is represented by the ABSENCE of a class on <html>,
// letting house.css's `@media (prefers-color-scheme)` block decide. 'light'
// and 'dark' add the matching class from house.css's `:root.light` /
// `:root.dark` overrides (see src/styles/house.css's v2 header), which
// outrank the media query in both directions.
//
// This module is imported both by the inline head script (for the
// before-first-paint read — see Layout.astro) and by ThemeToggle.astro's
// client script (for the click handler), so the key and the cycle order
// live in exactly one place.

export const THEME_KEY = 'elenchus:theme';
const ORDER = ['system', 'light', 'dark'];

export function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return ORDER.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function nextTheme(t) {
  return ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
}

export function applyTheme(t) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (t !== 'system') root.classList.add(t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode */
  }
}
