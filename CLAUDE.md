# CLAUDE.md — elenchus-web

## Project Overview

Static Astro site at `elenchus.untilt.app` — a paste-text version of the
[Elenchus Chrome extension](https://github.com/w2ur/elenchus): paste any text,
get a structured analysis of its logical flaws, an overall reasoning score,
and its strengths. No backend of its own — it calls the `elenchus-proxy`
Cloudflare Worker (separate repo) over a `web` surface added specifically for
this client.

## Tech Stack

- [Astro](https://astro.build), `output: 'static'` in `astro.config.mjs` — no
  server-side runtime, no framework UI library
- Deployed on Netlify (free tier); `netlify.toml` builds with `npm run build`
  and publishes `dist/`
- Node 24 max — Netlify's build image caps there. **Never pin `.nvmrc` or
  `engines` to a newer local Node than that.**

## User-Facing Language

English.

## Visibility

**The owner is recommended to make this repo public.** Discoverability is the
product here — a tool nobody can find is not distributed — and on this
account branch protection is only enforceable on a public repo (private repos
403 on the branch-protection API regardless of plan). **If this repo ends up
private, every CI gate on it is advisory only, and the README must not claim
enforcement.** See the `ci-and-branch-protection` skill in `~/.claude/` for
why, before adding or changing a gate here.

## The web key is friction, not an auth boundary

`PUBLIC_ELENCHUS_WEB_KEY` (the client-side value of the Worker's
`PROXY_SHARED_SECRET_WEB`) is read into a **static** build. A static Astro
site has no server-side hiding place: whatever value this repo is given ends
up baked into public JS, readable by anyone who opens dev tools. That is
expected, not a bug to fix later.

**Nothing may be built here that assumes this key proves the caller is
Elenchus.** It only lets the Worker's rate limiter distinguish the web
surface from the extension surface for accounting — it is not
authentication and never will be, no matter how it's obfuscated, minified or
split. The actual defences against abuse of the web surface are Cloudflare
Turnstile (verified server-side, in `elenchus-proxy`) and the split
per-surface daily budget (`MAX_DAILY_REQUESTS_WEB`, also enforced server-side
in `elenchus-proxy`). Treat any design that leans on the web key for more
than that as a defect, not a hardening opportunity.

This also means: **never treat this repo's env vars as secrets.** Everything
under `PUBLIC_` in `.env.example` is meant to be public — see the comment
there before adding a new one.

## Visual identity

Mirrors `~/Dev/elenchus/sidepanel/sidepanel.css`: the same token structure
(light values on `:root`, dark values under `@media (prefers-color-scheme:
dark)`, no separate dark-mode toggle), the same font stack, the same card/
button shapes. The one deliberate difference is the accent color — the
portfolio hub assigns Elenchus the teal accent `#4F8A8B` (`src/styles/
global.css`), not the side panel's blue. Stay in that teal family; never
default to purple/violet/indigo (portfolio-wide rule).

Dark + light mode is `prefers-color-scheme` only — no toggle, matching the
extension. Footer signature "Made with care by William" →
`https://william.revah.paris` is in `src/layouts/Layout.astro`; do not
duplicate it elsewhere.

`src/` is a deliberate skeleton (`Layout.astro` + an `index.astro`
placeholder) — the analyzer UI (the paste box, the results panel, the enum
clamp on model output) is a separate task, not part of this scaffold.

## Development

    npm install
    cp .env.example .env
    npm run dev

## Build

    npm run build

Must produce **zero warnings** — no documented exceptions yet. If one becomes
necessary, it goes here with its justification, same as every other repo in
the portfolio.

## Deployment

Netlify builds and deploys automatically on push to `main`. Netlify project
creation, environment variable configuration in the Netlify dashboard, DNS
for `elenchus.untilt.app`, and the Turnstile widget setup are all the
owner's job — not something this repo's tooling does for itself.

## Secrets

No real secret has ever been committed here. `.env.example` carries
placeholders only, and per "the web key is friction, not an auth boundary"
above, none of this repo's env vars are actually secret in the first place —
they are all `PUBLIC_`-prefixed by design.
