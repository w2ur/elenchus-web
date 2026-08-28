// src/lib/handoff.js — the bookmarklet → /analyze protocol.
//
// Both ends of this protocol ship in different bundles (the `javascript:`
// URL and this site's client script), so nothing at runtime can tell them
// they disagree. These tests are what holds the two to the same contract.

import { describe, expect, it } from 'vitest';

import {
  PROTOCOL_VERSION,
  READY_TYPE,
  TEXT_TYPE,
  buildFragmentUrl,
  isBookmarkletLaunch,
  parseTextMessage,
  readFragment,
} from '../src/lib/handoff.js';
import { MAX_TEXT_LENGTH } from '../src/lib/limits.js';

const ANALYZE_URL = 'https://elenchus.untilt.app/analyze';

describe('isBookmarkletLaunch', () => {
  it('recognises the launch marker', () => {
    expect(isBookmarkletLaunch('?src=bm')).toBe(true);
    expect(isBookmarkletLaunch('src=bm')).toBe(true);
    expect(isBookmarkletLaunch('?utm=x&src=bm')).toBe(true);
  });

  it('is false for an ordinary visit, which is what keeps the paste page from talking to an opener', () => {
    expect(isBookmarkletLaunch('')).toBe(false);
    expect(isBookmarkletLaunch('?src=newsletter')).toBe(false);
    expect(isBookmarkletLaunch(undefined)).toBe(false);
  });
});

describe('buildFragmentUrl / readFragment', () => {
  it('round-trips text that would break a naive URL concatenation', () => {
    const text = 'Il affirme que « 100 % » des cas — #1 & #2 — le prouvent.\n\nCe qui ne suit pas.';
    const parsed = readFragment(new URL(buildFragmentUrl(ANALYZE_URL, text)).hash);
    expect(parsed).toEqual({ text, truncated: false });
  });

  it('keeps the text in the fragment, never in the query — a fragment is not sent to a server', () => {
    const url = new URL(buildFragmentUrl(ANALYZE_URL, 'the argument'));
    expect(url.search).toBe('');
    expect(url.hash).toContain('t=');
  });

  it('cuts at the Worker cap and says so', () => {
    const long = 'x'.repeat(MAX_TEXT_LENGTH + 500);
    const parsed = readFragment(new URL(buildFragmentUrl(ANALYZE_URL, long)).hash);
    expect(parsed.text).toHaveLength(MAX_TEXT_LENGTH);
    expect(parsed.truncated).toBe(true);
  });

  it('does not flag truncation for a text that exactly fits', () => {
    const exact = 'x'.repeat(MAX_TEXT_LENGTH);
    const parsed = readFragment(new URL(buildFragmentUrl(ANALYZE_URL, exact)).hash);
    expect(parsed.truncated).toBe(false);
  });

  it('reads nothing out of an ordinary anchor or an empty hash', () => {
    expect(readFragment('#section-2')).toBeNull();
    expect(readFragment('#t=')).toBeNull();
    expect(readFragment('')).toBeNull();
    expect(readFragment(undefined)).toBeNull();
  });
});

describe('parseTextMessage', () => {
  const valid = { type: TEXT_TYPE, v: PROTOCOL_VERSION, text: 'the argument' };

  it('accepts the protocol message', () => {
    expect(parseTextMessage(valid)).toBe('the argument');
  });

  it('rejects anything else that may land on a page listening for messages', () => {
    expect(parseTextMessage(null)).toBeNull();
    expect(parseTextMessage('the argument')).toBeNull();
    expect(parseTextMessage({ ...valid, type: READY_TYPE })).toBeNull();
    expect(parseTextMessage({ ...valid, type: 'webpackHotUpdate' })).toBeNull();
    expect(parseTextMessage({ ...valid, v: PROTOCOL_VERSION + 1 })).toBeNull();
    expect(parseTextMessage({ ...valid, text: '' })).toBeNull();
    expect(parseTextMessage({ ...valid, text: { toString: () => 'nope' } })).toBeNull();
  });
});
