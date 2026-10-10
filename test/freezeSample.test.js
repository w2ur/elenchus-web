// @vitest-environment node
// scripts/freeze-sample.mjs: the network is mocked, the key is a dummy string.
// What is pinned is the contract the owner relies on when running it for real:
// the file shape, the fence-strip, and that nothing is written for a response
// that is not an analysis.
//
// Two groups. The pure ones (argument handling, validation, the fence-strip)
// run in any checkout. The ones that send the production request or read the
// testbed need the sibling repos ../elenchus-proxy and ../elenchus; without
// them they FAIL, each one, with a message naming what is missing. They never
// skip: a skipped pin reads as a passing one.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  run, stripFences, promptVersion, readUpstream, loadEnglish, loadFrench, buildRequestBody, loadPrompt,
} from '../scripts/freeze-sample.mjs';
import { looksLikeAnalysis } from '../src/lib/proxyClient.js';
import { SAMPLE_IDS as IDS, validateSampleFile } from '../src/lib/samples.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBLINGS = [
  join(ROOT, '..', 'elenchus-proxy', 'src', 'prompt.mjs'),
  join(ROOT, '..', 'elenchus-proxy', 'wrangler.toml'),
  join(ROOT, '..', 'elenchus', 'testbed'),
];

/** beforeEach for the groups that run against the real production config. */
function requireSiblings() {
  const missing = SIBLINGS.filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(`this test needs the sibling repos elenchus-proxy and elenchus cloned next to elenchus-web; missing: ${missing.join(', ')}`);
  }
}

const ANALYSIS = {
  summary: 'A short verdict.',
  score: 'weak',
  flaws: [{ type: 'hasty_generalization', severity: 'high', quote: 'q', explanation: 'e' }],
  strengths: [],
};

/** @param {unknown} content @param {object} [extra] */
function mockFetch(content, extra = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ model: 'google/gemma-4-26b-a4b-it:free', choices: [{ message: { content } }], ...extra }),
    };
  };
  fn.calls = calls;
  return fn;
}

let outDir;
let logs;
let errs;
beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'freeze-'));
  logs = [];
  errs = [];
});
afterEach(() => rmSync(outDir, { recursive: true, force: true }));

const deps = (over = {}) => ({
  env: { OPENROUTER_API_KEY: 'test-key' },
  outDir,
  out: (s) => logs.push(s),
  err: (s) => errs.push(s),
  now: () => new Date('2026-10-11T09:00:00Z'),
  ...over,
});

describe('freeze-sample run (needs ../elenchus-proxy and ../elenchus)', () => {
  beforeEach(requireSiblings);

  it('writes the exact shape on success and sends the production request', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    const code = await run(['2-mixed', 'en'], deps({ fetchImpl }));
    expect(code).toBe(0);
    const saved = JSON.parse(readFileSync(join(outDir, '2-mixed.en.json'), 'utf8'));
    expect(Object.keys(saved)).toEqual([
      'id', 'lang', 'title', 'text', 'translated', 'result', 'servedBy',
      'requestedModels', 'promptVersion', 'date', 'attempt', 'rerunReason',
    ]);
    expect(saved).toMatchObject({
      id: '2-mixed',
      lang: 'en',
      title: 'Why remote work is destroying our industry',
      translated: false,
      result: ANALYSIS,
      servedBy: 'google/gemma-4-26b-a4b-it:free',
      date: '2026-10-11',
      attempt: 1,
      rerunReason: null,
    });
    expect(saved.promptVersion).toMatch(/^v\d+$/);
    expect(saved.requestedModels.length).toBeGreaterThan(0);
    expect(saved.text).not.toContain(saved.title);

    const { url, init } = fetchImpl.calls[0];
    expect(url).toBe(readUpstream().url);
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body)).toEqual(buildRequestBody(await loadPrompt(), saved.requestedModels, saved.text, 'en'));
  });

  it('marks French samples as translated and sends the French instruction', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    expect(await run(['3-short', 'fr'], deps({ fetchImpl }))).toBe(0);
    const saved = JSON.parse(readFileSync(join(outDir, '3-short.fr.json'), 'utf8'));
    expect(saved.translated).toBe(true);
    expect(saved.lang).toBe('fr');
    expect(JSON.parse(fetchImpl.calls[0].init.body).messages[1].content).toContain(saved.text);
  });

  it('strips a ```json fence before parsing', async () => {
    const fenced = `\`\`\`json\n${JSON.stringify(ANALYSIS)}\n\`\`\``;
    expect(stripFences(fenced)).toBe(JSON.stringify(ANALYSIS));
    const code = await run(['1-sound', 'en'], deps({ fetchImpl: mockFetch(fenced) }));
    expect(code).toBe(0);
    expect(JSON.parse(readFileSync(join(outDir, '1-sound.en.json'), 'utf8')).result).toEqual(ANALYSIS);
  });

  it.each([
    ['an empty object', '{}'],
    ['an array', '[]'],
    ['prose', 'Sorry, I cannot help with that.'],
    ['flaws not an array', JSON.stringify({ summary: 's', flaws: 'none' })],
  ])('writes nothing and exits 1 for %s', async (_name, content) => {
    const code = await run(['2-mixed', 'en'], deps({ fetchImpl: mockFetch(content) }));
    expect(code).toBe(1);
    expect(readdirSync(outDir)).toEqual([]);
    expect(errs.join('\n')).toContain('nothing written');
  });

  it('refuses to overwrite without --force --reason, and leaves the file alone', async () => {
    const existing = join(outDir, '2-mixed.en.json');
    writeFileSync(existing, '{"attempt":1}\n');
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    const code = await run(['2-mixed', 'en'], deps({ fetchImpl }));
    expect(code).toBe(1);
    expect(fetchImpl.calls).toHaveLength(0);
    expect(readFileSync(existing, 'utf8')).toBe('{"attempt":1}\n');
    expect(errs.join('\n')).toContain('already exists');
  });

  it('--force without --reason is a usage error, before any network call', async () => {
    writeFileSync(join(outDir, '2-mixed.en.json'), '{"attempt":1}\n');
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    expect(await run(['2-mixed', 'en', '--force'], deps({ fetchImpl }))).toBe(2);
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it('--force --reason re-runs and records attempt and reason', async () => {
    writeFileSync(join(outDir, '2-mixed.en.json'), '{"attempt":1}\n');
    const code = await run(
      ['2-mixed', 'en', '--force', '--reason', 'first run was truncated'],
      deps({ fetchImpl: mockFetch(JSON.stringify(ANALYSIS)) }),
    );
    expect(code).toBe(0);
    const saved = JSON.parse(readFileSync(join(outDir, '2-mixed.en.json'), 'utf8'));
    expect(saved.attempt).toBe(2);
    expect(saved.rerunReason).toBe('first run was truncated');
  });

  it('exits 2 with a clear message when OPENROUTER_API_KEY is missing', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    const code = await run(['2-mixed', 'en'], deps({ env: {}, fetchImpl }));
    expect(code).toBe(2);
    expect(errs.join('\n')).toContain('OPENROUTER_API_KEY is not set');
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it('--all runs three ids in two languages', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    expect(await run(['--all'], deps({ fetchImpl }))).toBe(0);
    expect(fetchImpl.calls).toHaveLength(6);
    expect(readdirSync(outDir).sort()).toEqual(
      IDS.flatMap((id) => [`${id}.en.json`, `${id}.fr.json`]).sort(),
    );
  });

  it('writes nothing when the response names no model', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS), { model: '' });
    expect(await run(['2-mixed', 'en'], deps({ fetchImpl }))).toBe(1);
    expect(readdirSync(outDir)).toEqual([]);
  });

  it('--force --reason on a missing file is a plain first run: attempt 1, no reason stored', async () => {
    const code = await run(['2-mixed', 'en', '--force', '--reason', 'x'], deps({ fetchImpl: mockFetch(JSON.stringify(ANALYSIS)) }));
    expect(code).toBe(0);
    const saved = JSON.parse(readFileSync(join(outDir, '2-mixed.en.json'), 'utf8'));
    expect(saved.attempt).toBe(1);
    expect(saved.rerunReason).toBeNull();
  });

  it('--dry-run needs no key, makes no call, writes no file', async () => {
    const fetchImpl = mockFetch('unused');
    expect(await run(['--all', '--dry-run'], deps({ env: {}, fetchImpl }))).toBe(0);
    expect(fetchImpl.calls).toHaveLength(0);
    expect(readdirSync(outDir)).toEqual([]);
    expect(logs.join('\n')).toContain('"response_format"');
  });
});

describe('inputs (needs ../elenchus-proxy and ../elenchus)', () => {
  beforeEach(requireSiblings);

  it('EN extraction keeps paragraph breaks and excludes title, nav and the .expect block', () => {
    const { title, text } = loadEnglish('2-mixed');
    expect(title).toBe('Why remote work is destroying our industry');
    expect(text.split('\n\n')).toHaveLength(5);
    expect(text).not.toContain(title);
    expect(text).not.toMatch(/testbed index|Expected/);
  });

  it('FR inputs mirror the EN paragraph structure and the testbed ids', () => {
    for (const id of IDS) {
      const en = loadEnglish(id);
      const fr = loadFrench(id);
      expect(fr.title.length).toBeGreaterThan(0);
      expect(fr.text.split('\n\n')).toHaveLength(en.text.split('\n\n').length);
    }
  });

  it('the prompt version is the bare token', async () => {
    expect(promptVersion((await loadPrompt()).SYSTEM_PROMPT)).toMatch(/^v\d+$/);
  });

  it('looksLikeAnalysis is the shared guard', () => {
    expect(looksLikeAnalysis({})).toBe(false);
    expect(looksLikeAnalysis(ANALYSIS)).toBe(true);
  });
});

describe('validateSampleFile', () => {
  const good = () => ({
    id: '2-mixed', lang: 'en', title: 't', text: 'x', translated: false, result: ANALYSIS,
    servedBy: 'google/gemma-4-26b-a4b-it:free', requestedModels: ['a'], promptVersion: 'v2',
    date: '2026-10-11', attempt: 1, rerunReason: null,
  });

  it('accepts a well-formed record', () => {
    expect(validateSampleFile(good())).toEqual([]);
  });

  it.each([
    ['empty result', (r) => { r.result = {}; }],
    ['bracket promptVersion', (r) => { r.promptVersion = '[v2 - x]'; }],
    ['empty servedBy', (r) => { r.servedBy = ''; }],
    ['bad date', (r) => { r.date = 'today'; }],
    ['fr not marked translated', (r) => { r.lang = 'fr'; }],
    ['attempt 2 without a reason', (r) => { r.attempt = 2; }],
    ['attempt 1 with a reason', (r) => { r.rerunReason = 'why'; }],
    ['missing key', (r) => { delete r.requestedModels; }],
    ['unknown id', (r) => { r.id = 'x'; }],
  ])('rejects %s', (_n, mutate) => {
    const r = good();
    mutate(r);
    expect(validateSampleFile(r).length).toBeGreaterThan(0);
  });
});

describe('flags (pure: refused before any config is read)', () => {
  // Regression (final review D): `--all --force --reason x` re-froze all
  // six samples, overwriting every one the owner had already looked at.
  it('--force with --all is refused before any network call; it needs one <id> <lang>', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    for (const id of ['1-sound', '2-mixed', '3-short']) {
      for (const lang of ['en', 'fr']) writeFileSync(join(outDir, `${id}.${lang}.json`), '{"attempt":1}\n');
    }
    expect(await run(['--all', '--force', '--reason', 'redo'], deps({ fetchImpl }))).toBe(2);
    expect(errs.join('\n')).toMatch(/one sample at a time/);
    expect(fetchImpl.calls).toHaveLength(0);
    expect(readFileSync(join(outDir, '2-mixed.en.json'), 'utf8')).toBe('{"attempt":1}\n');
  });

  it('--reason without --force is a usage error', async () => {
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    expect(await run(['2-mixed', 'en', '--reason', 'x'], deps({ fetchImpl }))).toBe(2);
    expect(fetchImpl.calls).toHaveLength(0);
  });
});

// Regression (final review M): the script imported elenchus-proxy's
// prompt.mjs statically, so loading the module at all failed in a checkout
// without the sibling repo, and `npm test` went red on every test here,
// including the pure ones. The import is dynamic now, on the run path only.
describe('without the sibling repo', () => {
  it('the script has no static import of the sibling repo', () => {
    const src = readFileSync(join(ROOT, 'scripts/freeze-sample.mjs'), 'utf8');
    expect(src).not.toMatch(/^import[^;]*elenchus-proxy/m);
  });

  it('a run exits 2 naming the missing repo, before any network call', async () => {
    const wranglerPath = join(outDir, 'wrangler.toml');
    writeFileSync(wranglerPath, 'UPSTREAM_URL = "https://example.invalid/v1"\nUPSTREAM_MODEL = "example/m"\n');
    const fetchImpl = mockFetch(JSON.stringify(ANALYSIS));
    const code = await run(['1-sound', 'fr'], deps({
      fetchImpl, wranglerPath, promptPath: join(outDir, 'nope', 'prompt.mjs'),
    }));
    expect(code).toBe(2);
    expect(errs.join('\n')).toMatch(/elenchus-proxy repo must be cloned/);
    expect(fetchImpl.calls).toHaveLength(0);
    expect(readdirSync(outDir)).toEqual(['wrangler.toml']);
  });
});

// The on-disk pin (every committed sample passes validateSampleFile, plus the
// sha256 of 2-mixed.{en,fr}.json per U2) lands with the owner's real runs. It
// is a todo, not a vacuous pass.
it.todo('pins src/data/samples/*.json: validateSampleFile on all six, and the sha256 of 2-mixed.{en,fr}.json');
