#!/usr/bin/env node
// Freezes a real Elenchus analysis as a saved sample file.
//
// Sends the PRODUCTION request: `buildMessages`, `analysisSchema` and
// `MAX_OUTPUT_TOKENS` are imported from the sibling elenchus-proxy repo (not
// copied; dynamically, on the run path only, so this module and its pure
// functions load in a checkout without that repo), and the upstream URL and model chain are read from its
// wrangler.toml, so a sample is exactly what the free tier would have served.
// The fence-strip below mirrors elenchus-proxy/src/index.js. The result must
// pass `looksLikeAnalysis`, and the whole record src/lib/samples.js's
// validateSampleFile(), before anything is written; the build runs that same
// check on every file it ships (loadSample), so a file edited after the
// freeze fails `astro build`. A sample is never hand-written: the file is
// the model's output, committed as-is.
//
// Usage (the key comes from the environment only; never add a file fallback):
//   OPENROUTER_API_KEY=sk-or-... node scripts/freeze-sample.mjs 2-mixed en
//   OPENROUTER_API_KEY=sk-or-... node scripts/freeze-sample.mjs --all
//   node scripts/freeze-sample.mjs --all --dry-run       (no network, no key)
//   ... 2-mixed en --force --reason "<why>"               (re-run ONE existing sample, never with --all;
//                                                         --force on a missing file is a plain first run: attempt 1, no reason stored)
//
// Exit: 0 healthy, 1 a finding (a run failed validation, or a refusal),
// 2 could not run (no key, bad arguments, unreadable input).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { extractText, normalizeText } from '../src/lib/extract.js';
import { looksLikeAnalysis } from '../src/lib/proxyClient.js';
import { MAX_TEXT_LENGTH, MIN_TEXT_LENGTH } from '../src/lib/limits.js';
import { SAMPLE_IDS as IDS, SAMPLE_LANGS as LANGS, validateSampleFile } from '../src/lib/samples.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = join(ROOT, '..', 'elenchus-proxy', 'wrangler.toml');
const PROMPT = join(ROOT, '..', 'elenchus-proxy', 'src', 'prompt.mjs');
const TESTBED = join(ROOT, '..', 'elenchus', 'testbed');
const INPUT_DIR = join(ROOT, 'scripts', 'samples-input');
const OUT_DIR = join(ROOT, 'src', 'data', 'samples');

/** @param {string} toml @param {string} key */
export function tomlString(toml, key) {
  const m = toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  if (!m) throw new Error(`${key} not found in wrangler.toml`);
  return m[1];
}

/** Same shape as the Worker's upstream config: first model is `model`. */
export function readUpstream(wranglerPath = WRANGLER) {
  const toml = readFileSync(wranglerPath, 'utf8');
  const models = tomlString(toml, 'UPSTREAM_MODEL').split(',').map((s) => s.trim()).filter(Boolean);
  if (models.length === 0) throw new Error('UPSTREAM_MODEL parsed to zero entries');
  return { url: tomlString(toml, 'UPSTREAM_URL'), models };
}

/**
 * The production prompt module, from the sibling elenchus-proxy repo. A
 * dynamic import, never a static one: a static import fails at module load,
 * which took down every test of this script (and `npm test`) in any checkout
 * without the sibling, including the tests that never touch the prompt.
 *
 * @param {string} [promptPath]
 * @returns {Promise<{ buildMessages: Function, analysisSchema: Function, MAX_OUTPUT_TOKENS: number, SYSTEM_PROMPT: string }>}
 */
export async function loadPrompt(promptPath = PROMPT) {
  if (!existsSync(promptPath)) {
    throw new Error(`${promptPath} not found: the elenchus-proxy repo must be cloned next to this one (../elenchus-proxy)`);
  }
  return import(pathToFileURL(promptPath).href);
}

/** The proxy's request body, key for key (elenchus-proxy/src/index.js). */
export function buildRequestBody(prompt, models, text, lang) {
  const { MAX_OUTPUT_TOKENS, analysisSchema, buildMessages } = prompt;
  return {
    model: models[0],
    ...(models.length > 1 ? { models } : {}),
    max_tokens: MAX_OUTPUT_TOKENS,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'reasoning_analysis', strict: true, schema: analysisSchema(lang) },
    },
    messages: buildMessages(text, lang),
  };
}

/** The proxy's fence-strip (elenchus-proxy/src/index.js). */
export function stripFences(content) {
  return content
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

/** `[v2 — …]` tag to the bare `v2` token. @param {string} systemPrompt */
export function promptVersion(systemPrompt) {
  const m = String(systemPrompt).match(/^\[(v\d+)\b/);
  if (!m) throw new Error('prompt version tag not found at the start of SYSTEM_PROMPT');
  return m[1];
}

/**
 * EN input from the testbed page, extracted with the bookmarklet's own
 * extractText() but NOT identical to what the bookmarklet would send: the h1
 * is removed first and stored apart as `title`, because the page shows the
 * title separately (the chip label, the Examples page heading) and repeating
 * it as the first line of `text` would print it twice.
 */
export function loadEnglish(id, testbedDir = TESTBED) {
  const html = readFileSync(join(testbedDir, `${id}.html`), 'utf8');
  const { document } = new JSDOM(html).window;
  const h1 = document.querySelector('h1');
  const title = normalizeText(h1?.textContent);
  h1?.remove();
  return { title, text: extractText(document, '') };
}

/** FR input: committed translation. */
export function loadFrench(id, inputDir = INPUT_DIR) {
  const { title, text } = JSON.parse(readFileSync(join(inputDir, `${id}.fr.json`), 'utf8'));
  return { title, text };
}

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  let reason = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--reason') { reason = argv[i + 1] ?? ''; i += 1; } else if (a.startsWith('--')) flags.add(a);
    else positional.push(a);
  }
  return { flags, positional, reason };
}

/**
 * @param {string[]} argv
 * @param {object} [deps]
 * @returns {Promise<number>} exit code
 */
export async function run(argv, deps = {}) {
  const {
    env = process.env,
    fetchImpl = globalThis.fetch,
    out = (s) => console.log(s),
    err = (s) => console.error(s),
    outDir = OUT_DIR,
    wranglerPath = WRANGLER,
    promptPath = PROMPT,
    testbedDir = TESTBED,
    inputDir = INPUT_DIR,
    now = () => new Date(),
  } = deps;

  const { flags, positional, reason } = parseArgs(argv);
  const known = new Set(['--all', '--dry-run', '--force']);
  for (const f of flags) {
    if (!known.has(f)) { err(`Unknown flag ${f}.`); return 2; }
  }

  // A forced re-run overwrites a sample someone already looked at, so it is
  // one named sample at a time: `--all --force` would re-freeze all six.
  if (flags.has('--all') && flags.has('--force')) {
    err('--force re-runs one sample at a time: name it as <id> <lang>, not --all.');
    return 2;
  }

  let jobs;
  if (flags.has('--all')) {
    jobs = IDS.flatMap((id) => LANGS.map((lang) => ({ id, lang })));
  } else {
    const [id, lang] = positional;
    if (!IDS.includes(id) || !LANGS.includes(lang)) {
      err(`Usage: freeze-sample.mjs <${IDS.join('|')}> <${LANGS.join('|')}> [--dry-run] [--force --reason "<text>"] | --all [--dry-run]`);
      return 2;
    }
    jobs = [{ id, lang }];
  }
  if (reason !== null && !flags.has('--force')) {
    err('--reason only makes sense with --force.');
    return 2;
  }
  if (flags.has('--force') && !(reason && reason.trim())) {
    err('--force requires --reason "<why this run is allowed>". The first run that passes validation is the sample.');
    return 2;
  }

  const dry = flags.has('--dry-run');
  if (!dry && !env.OPENROUTER_API_KEY) {
    err('OPENROUTER_API_KEY is not set. Export it in your own shell; do not put it in a file.');
    return 2;
  }

  // Every input is loaded and checked before the first network call: a bad
  // input later in the list used to exit 2 after the earlier jobs had already
  // made paid calls and written their files.
  const inputs = new Map();
  for (const { id, lang } of jobs) {
    const label = `${id}.${lang}`;
    let input;
    try {
      input = lang === 'en' ? loadEnglish(id, testbedDir) : loadFrench(id, inputDir);
    } catch (e) {
      err(`${label}: cannot load the input (${e.message}).`);
      return 2;
    }
    if (typeof input.title !== 'string' || !input.title.trim() || typeof input.text !== 'string') {
      err(`${label}: the input has no title or no text.`);
      return 2;
    }
    // The Worker slices to MAX_TEXT_LENGTH and refuses a trimmed text under
    // MIN_TEXT_LENGTH (elenchus-proxy/src/index.js:166-169); it does not trim.
    input.text = input.text.slice(0, MAX_TEXT_LENGTH);
    if (input.text.trim().length < MIN_TEXT_LENGTH) {
      err(`${label}: the text is shorter than ${MIN_TEXT_LENGTH} characters; the Worker would refuse it.`);
      return 2;
    }
    inputs.set(label, input);
  }

  let upstream;
  let prompt;
  let version;
  try {
    upstream = readUpstream(wranglerPath);
    prompt = await loadPrompt(promptPath);
    version = promptVersion(prompt.SYSTEM_PROMPT);
  } catch (e) {
    err(`Cannot read the production config: ${e.message}`);
    return 2;
  }

  let failures = 0;
  for (const { id, lang } of jobs) {
    const file = join(outDir, `${id}.${lang}.json`);
    const label = `${id}.${lang}`;
    const input = inputs.get(label);

    if (dry) {
      out(`=== ${label} ===`);
      out(`title: ${input.title}`);
      out('text:');
      out(input.text);
      out(`POST ${upstream.url}`);
      out('request body:');
      out(JSON.stringify(buildRequestBody(prompt, upstream.models, input.text, lang), null, 2));
      continue;
    }

    let attempt = 1;
    let rerunReason = null;
    if (existsSync(file)) {
      if (!flags.has('--force')) {
        err(`${label}: ${file} already exists. The first run that passes validation is the sample; re-run only with --force --reason "<text>".`);
        failures += 1;
        continue;
      }
      let previous = 1;
      try { previous = Number(JSON.parse(readFileSync(file, 'utf8')).attempt) || 1; } catch { previous = 1; }
      attempt = previous + 1;
      rerunReason = reason.trim();
    }

    try {
      const res = await fetchImpl(upstream.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify(buildRequestBody(prompt, upstream.models, input.text, lang)),
      });
      if (!res.ok) throw new Error(`upstream answered HTTP ${res.status}`);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty response');
      let result;
      try {
        result = JSON.parse(stripFences(content));
      } catch {
        throw new Error('response is not parseable JSON');
      }
      if (!looksLikeAnalysis(result)) throw new Error('response failed looksLikeAnalysis');
      const servedBy = typeof data.model === 'string' ? data.model : null;
      if (!servedBy) throw new Error('response carries no model field, so servedBy cannot be recorded');

      const record = {
        id,
        lang,
        title: input.title,
        text: input.text,
        translated: lang === 'fr',
        result,
        servedBy,
        requestedModels: upstream.models,
        promptVersion: version,
        date: now().toISOString().slice(0, 10),
        attempt,
        rerunReason,
      };
      const problems = validateSampleFile(record);
      if (problems.length > 0) throw new Error(`record invalid: ${problems.join('; ')}`);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
      out(`${label}: written (${servedBy}, attempt ${attempt}).`);
    } catch (e) {
      err(`${label}: FAILED, nothing written (${e.message}).`);
      failures += 1;
    }
  }
  return failures > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
