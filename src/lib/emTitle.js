// The hero title's one-emphasised-word marker: `*word*` in the copy becomes
// `<em>word</em>` in the rendered title. Same regex, same "one pair only,
// malformed falls back verbatim" contract as untilt's
// client/src/components/EmTitle.tsx — kept in a plain .js helper here
// (rather than a .astro/JSX component) because ToolHero.astro renders the
// result with `set:html`, and that is only ever safe because this function
// escapes EVERY character it did not itself insert before returning: the
// two literal <em>/</em> tags are the only markup this can ever produce.
//
// The prefix/suffix groups exclude '*' on purpose, for the same reason as
// the untilt component: a `.*?`/`.*` pair would accept `**word**` (the
// markdown-bold habit) by matching two of its four stars and silently
// rendering a literal '*' on each side of the <em>. Excluding '*' means any
// stray star anywhere in the string breaks the match, and a malformed
// marker renders verbatim (escaped) instead of half-parsing.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {string} text a title carrying at most one `*word*` marker
 * @returns {string} HTML-safe markup: the marked word wrapped in <em>, the
 *   rest as plain (escaped) text
 */
export function emTitle(text) {
  const m = String(text).match(/^([^*]*)\*([^*]+)\*([^*]*)$/s);
  if (!m) return escapeHtml(text);
  return `${escapeHtml(m[1])}<em>${escapeHtml(m[2])}</em>${escapeHtml(m[3])}`;
}
