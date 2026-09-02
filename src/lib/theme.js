// Three-state theme: system → light → dark → system. 'system' means "no
// explicit choice" and is represented by the ABSENCE of a class on <html>,
// letting house.css's `@media (prefers-color-scheme)` block decide. 'light'
// and 'dark' add the matching class from house.css's `:root.light` /
// `:root.dark` overrides (see src/styles/house.css's v2 header), which
// outrank the media query in both directions.
//
// Layout.astro's inline head script is `is:inline`, so it cannot import this
// module — it runs before first paint, ahead of any bundled JS. It
// duplicates THEME_KEY as a literal string on purpose. test/houseShell.test.js
// pins the two equal (`expect(layout).toContain(THEME_KEY)`), so a rename
// here cannot silently desync from the inline copy. ThemeToggle.astro's
// client script, by contrast, is a real module and imports THEME_KEY (via
// readTheme/applyTheme) and syncIcons below normally.

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

// Regression: `hidden` is inert on an <svg> — it is not an HTMLElement IDL
// attribute (SVGElement does not reflect it), and the UA stylesheet rule
// `[hidden]{display:none}` does not match SVG in Chromium, so setting it on
// the icon <svg>s directly left all three rendered at once. ThemeToggle.astro
// now wraps each icon in a plain <span data-theme-icon="…"> (an HTMLElement),
// and this toggles a `data-on` attribute instead — global.css hides
// `.theme-icon` by default and shows only the one carrying `[data-on]`.
/**
 * @param {HTMLElement} btn
 * @param {string} theme
 */
export function syncIcons(btn, theme) {
  for (const icon of btn.querySelectorAll('[data-theme-icon]')) {
    if (icon.dataset.themeIcon === theme) icon.setAttribute('data-on', '');
    else icon.removeAttribute('data-on');
  }
}
