// @vitest-environment node
//
// ToolNav.astro rendered through Astro's container API, in both of its
// states. Regression (final review F): the Examples item was always in the
// nav (desktop pills and the mobile tab bar, one element), so before any
// sample was frozen every visitor was offered a page that only says the runs
// are being prepared. It is rendered only when this language has a saved run
// (samples.js hasSamples()); three items without one, four with.
//
// Fixtures are synthetic: nothing here reads or writes src/data/samples/.
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import ToolNav from '../src/components/ToolNav.astro';
import { hasSamples } from '../src/lib/samples.js';
import { strings } from '../src/lib/strings.js';

let container;
beforeAll(async () => {
  container = await AstroContainer.create();
});

async function nav(props) {
  const html = await container.renderToString(ToolNav, { props });
  return new JSDOM(`<body>${html}</body>`).window.document.querySelector('nav');
}

const labels = (el) => [...el.querySelectorAll('a')].map((a) => a.textContent.trim());

describe('the Examples nav item follows the saved runs', () => {
  it.each(['en', 'fr'])('%s: three items and three icons without a saved run', async (lang) => {
    const el = await nav({ lang, showExamples: false });
    const t = strings[lang];
    expect(el.classList.contains('tool-nav-bar')).toBe(true);
    expect(labels(el)).toEqual([t.navAnalyse, t.navBookmarklet, t.navExtension]);
    expect(el.querySelectorAll('svg')).toHaveLength(3);
    expect(el.querySelector(`a[href="${t.navExamplesHref}"]`)).toBeNull();
  });

  it.each(['en', 'fr'])('%s: four items and four icons with one', async (lang) => {
    const el = await nav({ lang, showExamples: true, path: '/examples/' });
    const t = strings[lang];
    expect(labels(el)).toEqual([t.navAnalyse, t.navExamples, t.navBookmarklet, t.navExtension]);
    expect(el.querySelectorAll('svg')).toHaveLength(4);
    const item = el.querySelector(`a[href="${t.navExamplesHref}"]`);
    expect(item.getAttribute('aria-current')).toBe('page');
  });

  it('defaults to hasSamples(lang), read at build time', () => {
    const src = readFileSync('src/components/ToolNav.astro', 'utf-8');
    expect(src).toMatch(/showExamples = hasSamples\(lang\)/);
    expect(src).toMatch(/\{showExamples && \(/);
  });
});

describe('hasSamples', () => {
  const rec = (id, lang) => ({
    id, lang, title: 'T', text: 'Synthetic text.', translated: lang === 'fr',
    result: { summary: 's', score: 'weak', flaws: [], strengths: [] },
    servedBy: 'example/m', requestedModels: ['example/m'], promptVersion: 'v2',
    date: '2026-10-10', attempt: 1, rerunReason: null,
  });
  const files = (...rs) => Object.fromEntries(rs.map((r) => [`../data/samples/${r.id}.${r.lang}.json`, r]));

  it('is per language and true from one run', () => {
    expect(hasSamples('en', {})).toBe(false);
    expect(hasSamples('en', files(rec('3-short', 'en')))).toBe(true);
    expect(hasSamples('fr', files(rec('3-short', 'en')))).toBe(false);
  });

  it('fails on a malformed file rather than hiding the item', () => {
    expect(() => hasSamples('en', files({ ...rec('2-mixed', 'en'), translated: true }))).toThrow(/cannot be shown/);
  });
});
