// Editor-only. Nothing in `npm run build` type-checks this repo — there is
// no TypeScript compiler installed and no `astro check` step (see
// CLAUDE.md, "vanilla JS with JSDoc"). This file gives editors/IDEs
// autocomplete for `import.meta.env`; it enforces nothing and its presence
// must not be read as a type-checking gate.

/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Value of the Worker's PROXY_SHARED_SECRET_WEB. See src/lib/config.js. */
  readonly PUBLIC_ELENCHUS_WEB_KEY: string | undefined;
  /** Cloudflare Turnstile site key. See src/lib/config.js. */
  readonly PUBLIC_TURNSTILE_SITE_KEY: string | undefined;
}
