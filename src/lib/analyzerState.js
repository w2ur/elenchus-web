// Which of the analyzer's panels are on screen, and how the state moves when
// the visitor edits the box. Kept out of Analyzer.astro's client <script>,
// which no test can import (CLAUDE.md, Testing).
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

/** @typedef {'form' | 'loading' | 'error' | 'result' | 'sample'} AnalyzerState */

/**
 * 'sample' keeps the form AND the result on screen: a loaded example shows
 * the text that was analysed above what the model said about it.
 *
 * @param {AnalyzerState} state
 * @returns {{ form: boolean, loading: boolean, error: boolean, result: boolean }}
 */
export function panelsFor(state) {
  return {
    form: state === 'form' || state === 'sample',
    loading: state === 'loading',
    error: state === 'error',
    result: state === 'result' || state === 'sample',
  };
}

/**
 * The state after an edit to the box. A loaded example's result and its
 * "Saved run" label describe the text that was loaded; once the visitor
 * edits it, they describe a text no longer in the box, so the first edit
 * returns to the bare form (the caller also clears the panel). Every other
 * state is unchanged by typing.
 *
 * @param {AnalyzerState} state
 * @returns {AnalyzerState}
 */
export function stateAfterInput(state) {
  return state === 'sample' ? 'form' : state;
}
