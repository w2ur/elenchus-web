// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://elenchus.untilt.app',
  output: 'static',
  vite: {
    build: {
      // Tailwind v4's stated browser floor (Safari 16.4 / Chrome 111 /
      // Firefox 128), pinned explicitly rather than left to Vite's own
      // undocumented default (chrome111/firefox114/safari16.4/ios16.4 as of
      // Vite 8) — close, but not identical, and a Vite upgrade is free to
      // move it. This repo carries no Tailwind and no oklab/relative-color
      // syntax today, so nothing currently depends on the value: Lightning
      // CSS cannot fold `color-mix(in srgb, var(--text) 6%, transparent)`
      // (--tint's definition, house.css) into a static fallback because the
      // input is a var(), not a constant, and leaves the declaration
      // untouched regardless of target — verified directly against
      // lightningcss's transform() and by building under a deliberately
      // ancient target (chrome50) first and confirming dist still carries no
      // `--tint:var(--text)` fallback pair. Pinned anyway so a future accent
      // added here in that syntax does not inherit whatever Vite defaults to.
      cssTarget: ['chrome111', 'firefox128', 'safari16.4'],
    },
  },
});
