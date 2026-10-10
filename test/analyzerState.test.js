// src/lib/analyzerState.js: which panels a state shows, and what an edit to
// the box does to the state.
import { describe, expect, it } from 'vitest';
import { panelsFor, stateAfterInput } from '../src/lib/analyzerState.js';

describe('panelsFor', () => {
  it.each([
    ['form', { form: true, loading: false, error: false, result: false }],
    ['loading', { form: false, loading: true, error: false, result: false }],
    ['error', { form: false, loading: false, error: true, result: false }],
    ['result', { form: false, loading: false, error: false, result: true }],
    ['sample', { form: true, loading: false, error: false, result: true }],
  ])('%s', (state, panels) => {
    expect(panelsFor(state)).toEqual(panels);
  });
});

// Regression (final review C): in the 'sample' state, editing the box left
// the saved result and its "Saved run · … · AI-generated" label on screen,
// now describing a text no longer in the box. The first edit returns to the
// bare form (and Analyzer.astro clears the panel with render.js clearResult).
describe('stateAfterInput', () => {
  it('an edit after loading an example returns to the bare form', () => {
    expect(stateAfterInput('sample')).toBe('form');
    expect(panelsFor(stateAfterInput('sample')).result).toBe(false);
  });

  it.each(['form', 'loading', 'error', 'result'])('typing leaves %s alone', (state) => {
    expect(stateAfterInput(state)).toBe(state);
  });
});
