// Regression: `hidden` is inert on an <svg> element — it is not an HTMLElement
// IDL attribute (SVGElement does not reflect it) and the UA stylesheet rule
// `[hidden]{display:none}` does not match SVG in Chromium, so all three icons
// used to render at once inside the 44x44 button. The fix wraps each icon in
// a plain <span> (an HTMLElement, where `hidden` — or here, a `[data-on]`
// attribute selector — actually works) and moves the on/off toggle into a
// small, independently-testable `syncIcons()` helper in src/lib/theme.js.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { applyTheme, nextTheme, readTheme, syncIcons } from '../src/lib/theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mount the REAL markup from the component, not a hand-typed replica of it —
// otherwise this test could pass against a component that no longer matches
// what ships.
const source = readFileSync(join(__dirname, '../src/components/ThemeToggle.astro'), 'utf-8');
const buttonMarkup = source.slice(source.indexOf('<button'), source.indexOf('</button>') + '</button>'.length);

function mountButton() {
  document.body.innerHTML = buttonMarkup;
  return document.querySelector('[data-theme-toggle]');
}

function onIcons(btn) {
  return [...btn.querySelectorAll('[data-theme-icon]')].filter((el) => el.hasAttribute('data-on'));
}

describe('theme toggle: one icon on at a time', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('server-renders exactly one icon on: the system icon, before any script runs', () => {
    // No theme choice is known at prerender time (see the component's own
    // header comment), so the SYSTEM icon is the one shipped already on.
    const btn = mountButton();
    const on = onIcons(btn);
    expect(on).toHaveLength(1);
    expect(on[0].dataset.themeIcon).toBe('system');
  });

  it('each icon is a real HTMLElement span, not an <svg data-theme-icon>', () => {
    // The actual bug: `hidden` (or any attribute-based show/hide) on an
    // <svg> does not participate in the UA display rule in Chromium. Pin
    // the element type the toggle now depends on.
    const btn = mountButton();
    for (const icon of btn.querySelectorAll('[data-theme-icon]')) {
      expect(icon.tagName).toBe('SPAN');
    }
  });

  it('syncIcons turns exactly one icon on across the whole system → light → dark → system cycle', () => {
    const btn = mountButton();
    let theme = readTheme();
    for (let i = 0; i < 3; i += 1) {
      theme = nextTheme(theme);
      syncIcons(btn, theme);
      const on = onIcons(btn);
      expect(on).toHaveLength(1);
      expect(on[0].dataset.themeIcon).toBe(theme);
    }
  });

  it('applyTheme + syncIcons reflect a theme restored from storage (e.g. after reload)', () => {
    const btn = mountButton();
    applyTheme('dark');
    syncIcons(btn, readTheme());
    const on = onIcons(btn);
    expect(on).toHaveLength(1);
    expect(on[0].dataset.themeIcon).toBe('dark');
  });

  it('non-vacuity: "exactly one icon on" is not automatically true — two-on is a real, catchable state', () => {
    // Reproduce the shape of the original bug directly (bypassing syncIcons):
    // mark two icons on at once and confirm the assertion the tests above
    // rely on actually distinguishes this from the fixed behaviour, rather
    // than passing no matter what the markup does.
    const btn = mountButton();
    btn.querySelector('[data-theme-icon="light"]').setAttribute('data-on', '');
    btn.querySelector('[data-theme-icon="dark"]').setAttribute('data-on', '');
    // system (server-rendered) + light + dark (just forced) = 3 on at once.
    expect(onIcons(btn)).toHaveLength(3);
    expect(onIcons(btn).length).not.toBe(1);
  });
});
