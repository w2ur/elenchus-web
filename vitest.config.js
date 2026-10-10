// Built through astro/config's getViteConfig so test files can compile and
// render `.astro` components with Astro's container API
// (test/sampleResult.test.js). Most tests here still exercise plain JS
// modules under src/lib/ (clamp, render) and need a DOM (jsdom) to build and
// inspect elements the way the client script does.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
  },
});
