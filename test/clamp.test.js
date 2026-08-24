// Unit tests for src/lib/clamp.js — written before the implementation
// (test-first), per the C3 brief. `oneOf` is the security control the whole
// renderer leans on: the analysed text is adversarial by construction, so
// the model's output (score/severity/reason) must never reach the DOM
// unconstrained.
import { describe, expect, it } from 'vitest';
import { REASONS, SCORES, SEVERITIES, oneOf } from '../src/lib/clamp.js';

describe('enum values (must match ~/Dev/elenchus/sidepanel/sidepanel.js verbatim)', () => {
  it('SEVERITIES matches the extension source of truth', () => {
    expect(SEVERITIES).toEqual(['minor', 'significant', 'critical']);
  });

  it('SCORES matches the extension source of truth', () => {
    expect(SCORES).toEqual(['strong', 'moderate', 'weak']);
  });

  it('REASONS matches the Worker 429 reason enum', () => {
    expect(REASONS).toEqual(['ip', 'service']);
  });
});

describe('oneOf', () => {
  it('returns the value unchanged when it is in the allowed list', () => {
    expect(oneOf('critical', SEVERITIES, 'minor')).toBe('critical');
  });

  it('clamps an unknown severity to the fallback', () => {
    expect(oneOf('catastrophic', SEVERITIES, 'minor')).toBe('minor');
  });

  it('clamps an unknown score to the fallback', () => {
    expect(oneOf('mediocre', SCORES, 'unknown')).toBe('unknown');
  });

  it('clamps an unknown reason to the fallback', () => {
    expect(oneOf('quota', REASONS, 'service')).toBe('service');
  });

  it('clamps a hostile string designed to break out of an attribute or tag', () => {
    const hostile = '"><img src=x onerror=alert(1)>';
    expect(oneOf(hostile, SEVERITIES, 'minor')).toBe('minor');
  });

  it('clamps non-string values (object, array, number, null, undefined)', () => {
    expect(oneOf({ a: 1 }, SEVERITIES, 'minor')).toBe('minor');
    expect(oneOf(['critical'], SEVERITIES, 'minor')).toBe('minor');
    expect(oneOf(42, SEVERITIES, 'minor')).toBe('minor');
    expect(oneOf(null, SEVERITIES, 'minor')).toBe('minor');
    expect(oneOf(undefined, SEVERITIES, 'minor')).toBe('minor');
  });
});
