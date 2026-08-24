// Configuration for calls this site makes to the elenchus-proxy Cloudflare
// Worker. This is a static build (astro.config.mjs: output: 'static'), so
// every value exported here ends up baked into public JS — see CLAUDE.md,
// "the web key is friction, not an auth boundary". Nothing here is a secret.
//
// Plain JS with JSDoc, not TypeScript — this repo has no type-checker in
// its build (see CLAUDE.md, "vanilla JS with JSDoc"). A .ts file here would
// read as type-safe and enforce nothing.

/**
 * elenchus-proxy Worker endpoint for the web surface.
 *
 * This is a constant in source, not an env var, deliberately. It is
 * public (visible in the network tab of any request this site makes),
 * stable (owner-operated, not expected to move), and the deployment plan
 * only provisions PUBLIC_ELENCHUS_WEB_KEY and PUBLIC_TURNSTILE_SITE_KEY
 * for this site's Netlify build. A required env var Netlify never sets
 * would silently resolve to `undefined` in production — Astro never loads
 * `.env.example` at build time, so a value present only there is not a
 * fallback, it is a landmine. Nothing is gained by making a public,
 * unchanging value configurable, so it lives here instead.
 *
 * @type {string}
 */
export const ELENCHUS_PROXY_URL = 'https://elenchus-proxy.william-445.workers.dev/analyze';

/**
 * Reads a required PUBLIC_ build-time env var, or throws immediately with a
 * clear, actionable message.
 *
 * Without this, a missing key silently becomes an empty `X-Elenchus-Key`
 * header on every request, and the Worker's only feedback is an opaque
 * 403 — indistinguishable from a real abuse rejection. Failing here, at
 * config-load time, turns that into a message that names the exact
 * variable and how to set it, before any network call is attempted.
 *
 * @param {string} name
 * @param {string | undefined} value
 * @returns {string}
 */
function requireEnv(name, value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env for local dev, or set it ` +
        'in the Netlify build environment for production — see .env.example ' +
        'and CLAUDE.md ("The web key is friction, not an auth boundary").',
    );
  }
  return value;
}

/**
 * Value of the Worker's PROXY_SHARED_SECRET_WEB. Per CLAUDE.md, this
 * distinguishes the web surface from the extension surface for the
 * Worker's rate-limit accounting. It is not authentication and is not a
 * secret, even though it is read from an env var like one.
 *
 * @type {string}
 */
export const ELENCHUS_WEB_KEY = requireEnv(
  'PUBLIC_ELENCHUS_WEB_KEY',
  import.meta.env.PUBLIC_ELENCHUS_WEB_KEY,
);

/**
 * Cloudflare Turnstile site key (site keys are public by design).
 *
 * @type {string}
 */
export const TURNSTILE_SITE_KEY = requireEnv(
  'PUBLIC_TURNSTILE_SITE_KEY',
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
);
