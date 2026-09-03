// Markdown export of one analysis. Pure: no DOM, no clock — the caller passes
// the date. Guarantees chosen for a .md file the reader keeps: every model
// string passes through verbatim, every quote line is blockquoted so a quote
// cannot escape its block, and a model line that begins with a Markdown
// structure marker (#, ---, ```) is escaped so it cannot restructure the
// document. No HTML is ever generated here; HTML the model wrote stays text.
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
  const out = [`# ${t.title} — ${isoDay(date)}`, '', `## ${t.summary}`, para(result.summary ?? ''), '', `## ${t.score}`, t.scores[result.score] ?? t.scores.unknown, '', `## ${t.flaws}`];
  const flaws = Array.isArray(result.flaws) ? result.flaws : [];
  if (flaws.length === 0) out.push(t.none);
  for (const f of flaws) out.push(`### ${para(f.type ?? '')} (${f.severity ?? 'minor'})`, block(f.quote ?? ''), '', para(f.explanation ?? ''), '');
  out.push('', `## ${t.strengths}`);
  for (const s of Array.isArray(result.strengths) ? result.strengths : []) out.push(`- ${para(s)}`);
  out.push('', t.caveat, '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
