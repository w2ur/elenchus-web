// src/lib/emTitle.js — the hero title's one-emphasised-word marker.
//
// Same one-pair contract as untilt's client/src/components/EmTitle.tsx, but
// this one returns an HTML string (not JSX) because ToolHero.astro renders
// it with `set:html` — Astro has no server-side "React.createElement"
// equivalent for a plain .js helper. That is exactly why the escaping test
// below exists: set:html is only safe because this function never emits
// anything but the two literal <em>/</em> tags around text it already
// escaped.
import { describe, it, expect } from 'vitest';
import { emTitle } from '../src/lib/emTitle.js';

describe('emTitle', () => {
  it('wraps the starred word in <em> and leaves the rest as plain text', () => {
    expect(emTitle('Does this argument *hold up?*')).toBe(
      'Does this argument <em>hold up?</em>',
    );
  });

  it('renders plain text unchanged when there is no star pair', () => {
    expect(emTitle('Elenchus')).toBe('Elenchus');
  });

  // Regression, same shape as the untilt EmTitle test: '**word**' (the
  // markdown-bold habit) is not the one-pair marker this parses. A
  // permissive regex would match two of the four stars and leave a literal
  // '*' on each side of the <em> — a malformed marker must fall back to
  // verbatim text instead of half-parsing.
  it('falls back to verbatim text when the marker is malformed (markdown-bold habit)', () => {
    expect(emTitle('Tools for **thinking** straight.')).toBe(
      'Tools for **thinking** straight.',
    );
  });

  it('escapes HTML in the surrounding text and in the emphasised word before ever inserting <em> — this is what makes set:html safe', () => {
    expect(emTitle('<script>alert(1)</script> *hold up?*')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; <em>hold up?</em>',
    );
    expect(emTitle('Does this argument *<script>alert(1)</script>*')).toBe(
      'Does this argument <em>&lt;script&gt;alert(1)&lt;/script&gt;</em>',
    );
  });

  it('escapes plain text with no star pair too', () => {
    expect(emTitle('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });
});
