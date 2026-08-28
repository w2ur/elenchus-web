// The two text-length numbers this site shares with the elenchus-proxy
// Worker, in one place so the paste box, the bookmarklet and the fragment
// handoff cannot drift apart.
//
// Both mirror constants in `elenchus-proxy/src/index.js` — `MAX_TEXT_LENGTH`
// (which truncates silently server-side) and its `>= 50` minimum-length
// check. Cited by name and file only, never by line: the two repos move
// independently, so a line cite goes stale the moment either changes.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

/** @type {number} */
export const MAX_TEXT_LENGTH = 15000;

/** @type {number} */
export const MIN_TEXT_LENGTH = 50;
