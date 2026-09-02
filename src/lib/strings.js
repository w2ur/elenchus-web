// User-facing strings for the analyzer pages (/analyze, /fr/analyze).
//
// This is this repo's own table, not a copy of
// ~/Dev/elenchus/i18n/strings.js — the two pages, audiences and flows are
// different (no settings page, no provider choice, no chrome.storage). The
// only place these two tables are required to agree is the
// severity/score *labels*, because those describe the same enum values the
// Worker returns to both surfaces; C4 covers the automated drift-check
// between them. Wording for `severities`/`scores` and for the free-tier
// notice is matched by hand here to the freeTierNoticeText/
// freeTierNoticeLink/freeTierNoticeEnd/severities/scores entries of
// ~/Dev/elenchus/i18n/strings.js (EN and FR tables) — cited by name, not
// line: that's a different repo, moving independently — so the same
// analysis reads identically on both surfaces. Exception, flagged to C4
// (it owns the automated drift-check): freeTierNoticeText/Link/End
// deliberately diverge from the extension's wording here, because this
// site has no settings page for the extension's link to point at — see
// the CHROME_WEB_STORE_URL comment in src/components/Analyzer.astro.
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

export const strings = {
  en: {
    houseLabel: 'Untilt',
    houseUrl: 'https://untilt.app/',

    heading: 'Elenchus',
    subtitle: 'Paste text, get a reasoning analysis back.',
    textareaLabel: 'Text to analyze',
    textareaPlaceholder: 'Paste an article, post or argument to examine its reasoning…',
    charCount: (count, max) => `${count} / ${max}`,
    minLengthWarning: 'Enter at least 50 characters to analyze.',
    // The textarea itself has maxlength=15000 (mirroring the Worker's own
    // MAX_TEXT_LENGTH), so browsers refuse to type or paste past the cap —
    // this message explains why typing/pasting stopped working, not a
    // post-hoc truncation.
    maxLengthWarning: 'You have reached the 15,000-character limit for one analysis.',

    // Shown when the bookmarklet had to cut the page's text to fit. Stated
    // on arrival, not after the analysis: the reader did not type this text
    // and has no way to see what was left behind — and on the fragment
    // transport the box arrives exactly at the cap, so the character
    // counter alone would look like a coincidence rather than a cut.
    handoffTruncated:
      'This page had more than 15,000 characters, so only the beginning was brought over. Edit the text below if the part you wanted to examine is missing.',

    freeTierNoticeText:
      "Free tier: this text is sent to model providers that may log it and train on it. Avoid analysing confidential text, or ",
    freeTierNoticeLink: 'use your own API key in the Elenchus extension',
    freeTierNoticeEnd: '.',

    // The canonical privacy policy, which this site links rather than
    // restates. It is the page the Chrome Web Store points at and the one
    // the extension's options page opens; a copy here would be a fourth
    // document to keep in agreement, and the one nobody would remember to
    // update. It is also where this site's use of Cloudflare Turnstile is
    // disclosed — the extension does not use it, so the two surfaces are
    // described separately there.
    // Guarded by check-privacy-sync.sh in the elenchus repo.
    privacyLabel: 'Privacy',
    privacyUrl: 'https://william.revah.paris/en/elenchus/privacy/',

    // The footer's link to this page's twin in the other language, written
    // in the language it leads TO — the only form a reader who cannot read
    // this page recognises.
    otherLangLabel: 'Français',

    // The three-state theme toggle (src/lib/theme.js, ThemeToggle.astro).
    // themeLabel is the button's accessible name before any client script
    // has run (prerendered markup, and the fallback if JS never loads); the
    // client script then swaps in themeSystem/Light/Dark so a screen reader
    // announces the CURRENT state, updated on every click.
    themeLabel: 'Theme',
    themeSystem: 'System theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',

    analyzeBtn: 'Analyze',
    retryBtn: 'Retry',
    newAnalysisBtn: 'Analyze again',

    // Names the method, never progress — nothing about this wait is
    // measurable, so nothing about it is claimed. No percentage, no step
    // count, no progress bar (same rule the extension follows).
    loadingMessage: 'Analyzing the reasoning in this text. This can take up to a minute.',

    truncationWarning:
      'This text was too long to analyze in full. Only the first ~15,000 characters were sent to the model — the analysis may miss points from later sections.',
    summaryHeading: 'Summary',
    flawsHeading: 'Flaws',
    noFlaws: 'No reasoning flaws detected.',
    strengthsHeading: 'Strengths',

    scores: { strong: 'strong', moderate: 'moderate', weak: 'weak', unknown: 'unknown' },
    severities: { minor: 'minor', significant: 'significant', critical: 'critical' },

    // Two different Turnstile situations, and they must not share copy.
    //
    // `errTurnstileUnsolved` is the one where the widget IS on the page and
    // simply has not been completed — "complete the challenge" names an
    // action the visitor can actually take, and Retry is the right next
    // step after taking it.
    //
    // `errTurnstileBlocked*` is the one where challenges.cloudflare.com
    // never loaded at all (uBlock Origin, Firefox strict tracking
    // protection, a corporate proxy): there is no widget on the page, so
    // asking someone to "complete the verification challenge" points at
    // something that does not exist, and Retry cannot change the outcome.
    // The claim that the extension needs no challenge is true, not
    // reassurance: the Worker runs zero siteverify calls on the extension's
    // path (an invariant pinned by a call counter in
    // elenchus-proxy/test/turnstile.test.js — cited by name, not line).
    errTurnstileUnsolved: 'Please complete the verification challenge before analyzing.',

    errTurnstileBlockedText:
      "The verification challenge could not load, so this text cannot be analyzed here. That is almost always a content blocker or a strict privacy mode blocking challenges.cloudflare.com — allowing it for this site is the way through. If that is not an option, the ",
    errTurnstileBlockedLink: 'Chrome extension',
    errTurnstileBlockedEnd: ' runs the same analysis with no challenge at all.',

    // The three honest failure states from src/lib/errorState.js. A dry
    // per-IP bucket is the ordinary state of this service on a good day —
    // the web surface allows only 2 analyses/day per IP, service-wide only
    // 150/day — so this is a first-impression surface for most visitors,
    // not a rare error path. Each state names the real numbers and the real
    // next step rather than a generic "something went wrong". No
    // percentage, no step count, no claimed wait that cannot be measured —
    // "resets at 00:00 UTC" is stated because it is true (verified against
    // elenchus-proxy/src/rate-limiter.js's currentDay(), which is
    // ISO-8601/UTC), not because it sounds reassuring.
    errIpText: 'Your 2 free analyses on this site today are used. The ',
    errIpLink: 'Chrome extension',
    errIpEnd: ' gives you 21 a day, and lets you bring your own API key for unlimited use.',

    errServiceText:
      "The free demo has reached today's service-wide limit — everyone is turned away right now, not just you. It resets at 00:00 UTC. Until then, try the ",
    errServiceLink: 'Chrome extension',
    errServiceEnd:
      ', which has its own separate allowance and lets you bring your own API key for unlimited use — or just come back tomorrow.',

    // Deliberately makes no claim about whether retrying will help — that
    // is not knowable from here. Covers both an actual network failure and
    // an upstream failure the Worker itself could not resolve.
    errNetworkText:
      "Could not reach the analysis service — this may be your connection, or a temporary problem on our end. Retrying may or may not help; there's no way to tell from here.",

    errForbidden: 'This request was rejected by the analysis service.',
    errGeneric: 'Something went wrong while analyzing this text. Try again.',
    errInvalidResponse: 'The analysis service returned an unexpected response. Try again.',
  },

  fr: {
    houseLabel: 'Untilt',
    houseUrl: 'https://untilt.app/fr/',

    heading: 'Elenchus',
    subtitle: 'Collez un texte, obtenez une analyse de sa rigueur logique.',
    textareaLabel: 'Texte à analyser',
    textareaPlaceholder: 'Collez un article, un post ou une argumentation pour en examiner le raisonnement…',
    charCount: (count, max) => `${count} / ${max}`,
    minLengthWarning: 'Saisissez au moins 50 caractères pour lancer l’analyse.',
    maxLengthWarning: 'Vous avez atteint la limite de 15 000 caractères pour une analyse.',

    // Voir le commentaire du bloc `en`.
    handoffTruncated:
      'Cette page dépassait 15 000 caractères : seul le début a été repris. Modifiez le texte ci-dessous si le passage que vous vouliez examiner en est absent.',

    freeTierNoticeText:
      "Version gratuite : ce texte est envoyé à des fournisseurs de modèles susceptibles de l'enregistrer et de s'en servir pour l'entraînement. Évitez d'analyser un texte confidentiel, ou ",
    freeTierNoticeLink: 'utilisez votre propre clé API dans l’extension Elenchus',
    freeTierNoticeEnd: '.',

    // Voir le commentaire du bloc `en` : la politique est liée, jamais
    // recopiée ici.
    privacyLabel: 'Confidentialité',
    privacyUrl: 'https://william.revah.paris/elenchus/confidentialite/',

    // Voir le commentaire du bloc `en`.
    otherLangLabel: 'English',

    // Voir le commentaire du bloc `en`.
    themeLabel: 'Thème',
    themeSystem: 'Thème du système',
    themeLight: 'Thème clair',
    themeDark: 'Thème sombre',

    analyzeBtn: 'Analyser',
    retryBtn: 'Réessayer',
    newAnalysisBtn: 'Analyser à nouveau',

    loadingMessage: 'Analyse du raisonnement de ce texte en cours. Cela peut prendre jusqu’à une minute.',

    truncationWarning:
      'Ce texte était trop long pour être analysé en entier. Seuls les ~15 000 premiers caractères ont été envoyés au modèle — l’analyse peut passer à côté de points situés plus loin.',
    summaryHeading: 'Résumé',
    flawsHeading: 'Failles',
    noFlaws: 'Aucune faille de raisonnement détectée.',
    strengthsHeading: 'Points forts',

    scores: { strong: 'solide', moderate: 'modéré', weak: 'faible', unknown: 'inconnu' },
    severities: { minor: 'mineure', significant: 'significative', critical: 'critique' },

    // See the EN block for why these are two states and not one.
    errTurnstileUnsolved: 'Merci de compléter la vérification avant de lancer l’analyse.',

    errTurnstileBlockedText:
      "La vérification n’a pas pu se charger : impossible d’analyser ce texte ici. C’est presque toujours un bloqueur de contenu ou un mode de confidentialité strict qui bloque challenges.cloudflare.com — l’autoriser sur ce site est la solution. Si ce n’est pas envisageable, l’",
    errTurnstileBlockedLink: 'extension Chrome',
    errTurnstileBlockedEnd: ' effectue la même analyse sans aucune vérification.',

    // See the EN block for why these exist and why the UTC reset is stated.
    errIpText: 'Vos 2 analyses gratuites du jour sur ce site sont épuisées. L’',
    errIpLink: 'extension Chrome',
    errIpEnd: ' vous en donne 21 par jour, et vous permet d’utiliser votre propre clé API pour un usage illimité.',

    errServiceText:
      'La version de démonstration gratuite a atteint son plafond quotidien — tout le monde est refusé en ce moment, pas seulement vous. Tout repart à 00:00 UTC. En attendant, essayez l’',
    errServiceLink: 'extension Chrome',
    errServiceEnd:
      ', qui dispose de son propre quota et permet d’utiliser votre propre clé API pour un usage illimité — ou revenez simplement demain.',

    errNetworkText:
      "Impossible de joindre le service d'analyse — cela peut venir de votre connexion, ou d'un problème temporaire de notre côté. Réessayer peut aider ou non ; impossible de le savoir d'ici.",

    errForbidden: 'Cette requête a été rejetée par le service d’analyse.',
    errGeneric: 'Une erreur est survenue pendant l’analyse de ce texte. Réessayez.',
    errInvalidResponse: 'Le service d’analyse a renvoyé une réponse inattendue. Réessayez.',
  },
};
