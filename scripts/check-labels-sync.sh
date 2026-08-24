#!/usr/bin/env bash
# The severity and score labels describe the same enum values the
# elenchus-proxy Worker returns to both surfaces (this site's analyzer and
# the extension's side panel), and the two repos have no import that could
# keep them in step — see the file comment atop src/lib/strings.js. This is
# the check that says so out loud, in the spirit of
# ~/Dev/elenchus/scripts/check-prompt-sync.sh.
#
# Deliberately narrow. This repo's src/lib/strings.js and the extension's
# i18n/strings.js overlap in more than severities/scores, and some of that
# overlap is INTENTIONALLY different: freeTierNoticeText, freeTierNoticeLink
# and freeTierNoticeEnd read differently here on purpose — this site has no
# settings page for the extension's own wording to point at, so the link
# text was extended and "this page's text" became "this text" (see the
# CHROME_WEB_STORE_URL comment in src/components/Analyzer.astro, and the
# file comment atop src/lib/strings.js). Comparing every shared key would
# red on those three every single run, and a check that cries wolf gets
# disabled — so only severities/scores are compared, explicitly, below.
#
# Exits 1 on drift, 2 if either file is missing or cannot be read.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_STRINGS="${1:-$SCRIPT_DIR/../src/lib/strings.js}"
EXT_STRINGS="${2:-$HOME/Dev/elenchus/i18n/strings.js}"

for path in "$WEB_STRINGS" "$EXT_STRINGS"; do
  if [ ! -f "$path" ]; then
    echo "MISSING — $path does not exist."
    exit 2
  fi
done

node -e '
const fs = require("fs");
const path = require("path");

const [webPath, extPath] = process.argv.slice(1);

// The only tables this script is responsible for. freeTierNotice* is
// excluded on purpose — see the file header above.
const TABLES = ["severities", "scores"];
const LANGS = ["en", "fr"];

async function loadWebStrings(p) {
  // src/lib/strings.js is a real ES module (this repo has "type": "module"
  // — see package.json), so it can be imported directly rather than parsed.
  const mod = await import(`file://${path.resolve(p)}`);
  return mod.strings;
}

function loadExtensionStrings(p) {
  // i18n/strings.js is loaded as a classic script in the extension (see its
  // own file header: "globals rather than exports") — no import/export
  // statements, so it can be evaluated directly to read the
  // ELENCHUS_STRINGS global it declares.
  const code = fs.readFileSync(p, "utf8");
  const read = new Function(`${code}\nreturn ELENCHUS_STRINGS;`);
  return read();
}

(async () => {
  let web;
  let ext;
  try {
    web = await loadWebStrings(webPath);
  } catch (err) {
    console.error(`CANNOT READ — ${webPath}: ${err.message}`);
    process.exit(2);
  }
  try {
    ext = loadExtensionStrings(extPath);
  } catch (err) {
    console.error(`CANNOT READ — ${extPath}: ${err.message}`);
    process.exit(2);
  }

  const drifts = [];
  for (const lang of LANGS) {
    for (const table of TABLES) {
      const webTable = (web && web[lang] && web[lang][table]) || {};
      const extTable = (ext && ext[lang] && ext[lang][table]) || {};
      const keys = Array.from(new Set([...Object.keys(webTable), ...Object.keys(extTable)])).sort();
      for (const key of keys) {
        const w = webTable[key];
        const e = extTable[key];
        if (w !== e) {
          drifts.push(`${lang}.${table}.${key}: web=${JSON.stringify(w)} extension=${JSON.stringify(e)}`);
        }
      }
    }
  }

  if (drifts.length === 0) {
    console.log("OK — severity/score labels are identical in both repos (en + fr).");
    process.exit(0);
  }

  console.log("DRIFT — severity/score labels differ between elenchus-web and elenchus:");
  for (const line of drifts) {
    console.log(`  ${line}`);
  }
  process.exit(1);
})();
' "$WEB_STRINGS" "$EXT_STRINGS"
