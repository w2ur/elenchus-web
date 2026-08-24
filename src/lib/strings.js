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

    freeTierNoticeText:
      "Free tier: this text is sent to model providers that may log it and train on it. Avoid analysing confidential text, or ",
    freeTierNoticeLink: 'use your own API key in the Elenchus extension',
    freeTierNoticeEnd: '.',

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

    errTurnstile: 'Please complete the verification challenge before analyzing.',
    errNetwork: 'Network error — check your connection and try again.',
    errDailyLimitIp: 'Daily limit reached for your connection. Try again tomorrow.',
    errDailyLimitService: 'The free tier has reached its daily ceiling. Try again tomorrow.',
    errForbidden: 'This request was rejected by the analysis service.',
    errGeneric: 'Something went wrong while analyzing this text. Try again.',
    errInvalidResponse: 'The analysis service returned an unexpected response. Try again.',
  },

  fr: {
    heading: 'Elenchus',
    subtitle: 'Collez un texte, obtenez une analyse de sa rigueur logique.',
    textareaLabel: 'Texte à analyser',
    textareaPlaceholder: 'Collez un article, un post ou une argumentation pour en examiner le raisonnement…',
    charCount: (count, max) => `${count} / ${max}`,
    minLengthWarning: 'Saisissez au moins 50 caractères pour lancer l’analyse.',
    maxLengthWarning: 'Vous avez atteint la limite de 15 000 caractères pour une analyse.',

    freeTierNoticeText:
      "Version gratuite : ce texte est envoyé à des fournisseurs de modèles susceptibles de l'enregistrer et de s'en servir pour l'entraînement. Évitez d'analyser un texte confidentiel, ou ",
    freeTierNoticeLink: 'utilisez votre propre clé API dans l’extension Elenchus',
    freeTierNoticeEnd: '.',

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

    errTurnstile: 'Merci de compléter la vérification avant de lancer l’analyse.',
    errNetwork: 'Erreur réseau — vérifiez votre connexion et réessayez.',
    errDailyLimitIp: 'Limite quotidienne atteinte pour votre connexion. Réessayez demain.',
    errDailyLimitService: 'La version gratuite a atteint son plafond quotidien. Réessayez demain.',
    errForbidden: 'Cette requête a été rejetée par le service d’analyse.',
    errGeneric: 'Une erreur est survenue pendant l’analyse de ce texte. Réessayez.',
    errInvalidResponse: 'Le service d’analyse a renvoyé une réponse inattendue. Réessayez.',
  },
};
