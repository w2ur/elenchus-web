// Markdown export of one analysis. Pure: no DOM, no clock — the caller passes
// the date. Guarantees chosen for a .md file the reader keeps: every model
// string passes through verbatim (including its own internal blank lines —
// nothing here collapses whitespace inside a model field), every quote line
// is blockquoted so a quote cannot escape its block, and a model line that
// begins with a Markdown structure marker (#, ---, ```) is escaped so it
// cannot restructure the document. No HTML is ever generated here; HTML the
// model wrote stays text.
//
// `severity` and `score` are attacker-influenced enum fields (prompt
// injection chooses these strings same as any other model output) and are
// clamped through src/lib/clamp.js's oneOf() before they ever reach a
// heading or a label lookup — the same rule render.js applies on screen.
// Skipping that here (a bare `t.scores[result.score] ?? …` or
// `f.severity ?? …`) would let a hostile score reach Object.prototype (e.g.
// `score: 'toString'`) and let an arbitrary string ride into the exported
// document's headings unclamped, stating a category the on-screen render
// never would.
import { oneOf, SCORES, SEVERITIES } from './clamp.js';

const L = {
  en: { title: 'Elenchus reasoning analysis', summary: 'Summary', score: 'Reasoning score', flaws: 'Flaws', none: 'None found.', strengths: 'Strengths',
        scores: { strong: 'Strong', moderate: 'Moderate', weak: 'Weak', unknown: 'Unknown' },
        caveat: '_Elenchus checks reasoning, not facts — a tight argument on false premises scores well here._' },
  fr: { title: 'Analyse du raisonnement par Elenchus', summary: 'Résumé', score: 'Score de raisonnement', flaws: 'Failles', none: 'Aucune trouvée.', strengths: 'Points forts',
        scores: { strong: 'Solide', moderate: 'Modéré', weak: 'Faible', unknown: 'Inconnu' },
        caveat: "_Elenchus vérifie le raisonnement, pas les faits — un argument serré sur des prémisses fausses obtient un bon score ici._" },
};
const isoDay = (d) => d.toISOString().slice(0, 10);
const escapeLine = (line) => line.replace(/^(#|---|```)/, '\\$1');
const block = (s) => String(s).split('\n').map((l) => '> ' + escapeLine(l)).join('\n');
const para = (s) => String(s).split('\n').map(escapeLine).join('\n');

export function exportFilename(date) { return `elenchus-analysis-${isoDay(date)}.md`; }

export function toMarkdown(result, { lang = 'en', date }) {
  const t = L[lang] ?? L.en;
  const score = oneOf(result.score, SCORES, 'unknown');
  const out = [`# ${t.title} — ${isoDay(date)}`, '', `## ${t.summary}`, para(result.summary ?? ''), '', `## ${t.score}`, t.scores[score], '', `## ${t.flaws}`];
  const flaws = Array.isArray(result.flaws) ? result.flaws : [];
  if (flaws.length === 0) out.push(t.none);
  for (const f of flaws) out.push(`### ${para(f.type ?? '')} (${oneOf(f.severity, SEVERITIES, 'minor')})`, block(f.quote ?? ''), '', para(f.explanation ?? ''), '');
  // A blank line must separate the flaws section from Strengths, but the
  // flaws loop above already leaves one behind when there is at least one
  // flaw (its own trailing ''). Pushing another unconditionally doubled it
  // into a run of 3+ newlines — which used to be mopped up by a blanket
  // `.replace(/\n{3,}/g, '\n\n')` on the whole document, silently collapsing
  // any 3+-newline run a MODEL field contained too (the guarantee this file
  // claims for itself in its header). Checking before pushing keeps exactly
  // one blank line here without touching anything the model wrote.
  if (out.at(-1) !== '') out.push('');
  out.push(`## ${t.strengths}`);
  for (const s of Array.isArray(result.strengths) ? result.strengths : []) out.push(`- ${para(s)}`);
  out.push('', t.caveat, '');
  return out.join('\n');
}
