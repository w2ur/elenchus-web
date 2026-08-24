// Standalone from astro.config.mjs on purpose: these tests exercise plain
// JS modules under src/lib/ (clamp, render) and need a DOM (jsdom) to build
// and inspect elements the way the client script does — they do not touch
// Astro's own build pipeline.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
  },
});
