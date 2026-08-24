---
name: "Elenchus"
tagline_fr: "Collez un texte, obtenez une analyse de sa rigueur logique — sans compte, sans extension."
tagline_en: "Paste text, get a reasoning analysis back — no account, no extension."
facts_fr: "Site statique Astro, sans backend propre : appelle le Worker Cloudflare qui alimente déjà l'extension Elenchus."
facts_en: "Static Astro site with no backend of its own — calls the same Cloudflare Worker that already powers the Elenchus extension."
---

# Elenchus (web)

Static Astro site at [elenchus.untilt.app](https://elenchus.untilt.app) — a
paste-text version of the [Elenchus Chrome
extension](https://github.com/w2ur/elenchus): paste any text and get a
structured analysis of its logical flaws, an overall reasoning score, and its
strengths. No install required.

This repo has no backend of its own. It calls the `elenchus-proxy` Cloudflare
Worker (a separate repo) over a `web` surface added specifically for this
client — see `CLAUDE.md` for what that surface can and cannot assume about the
caller.

**Status:** scaffolding only. The analyzer UI has not been built yet.

## Tech stack

- [Astro](https://astro.build) (`output: 'static'`) — no server, no framework
  runtime shipped to the client beyond what a page needs
- Deployed on [Netlify](https://www.netlify.com) (free tier)
- Calls the `elenchus-proxy` Worker (separate repo) for analysis

## Development

    npm install
    cp .env.example .env
    # fill PUBLIC_ELENCHUS_PROXY_URL / PUBLIC_ELENCHUS_WEB_KEY / PUBLIC_TURNSTILE_SITE_KEY
    npm run dev

## Build

    npm run build

Builds to `./dist/`. Must produce zero warnings — see `CLAUDE.md`.

## Deployment

Netlify builds and deploys automatically on push to `main` (`netlify.toml`:
`npm run build`, publish `dist`). Netlify project creation, environment
variables and DNS are the owner's job, not this repo's.
