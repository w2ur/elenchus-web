// Prose for the site's content pages, kept out of src/lib/strings.js — that
// table is the analyzer UI's own strings (labels, failure states, the
// severity/score labels a drift-check compares against the extension), and
// page copy has none of those obligations.
//
// One object per page, both languages side by side, so a paragraph cannot be
// updated in English and forgotten in French: the two live on adjacent
// lines rather than in two files.
//
// Every claim about where the bookmarklet does and does not run is a
// MEASURED claim (2026-08-28, Chrome): it ran on github.com — whose
// `script-src` carries no `'unsafe-inline'` — on lemonde.fr, and on
// chromewebstore.google.com; it did nothing on `chrome://settings`. Firefox,
// Safari and Chrome's PDF viewer were not tested and are described as
// untested, never guessed at. See CLAUDE.md, "The bookmarklet handoff".
//
// Plain JS with JSDoc, not TypeScript — see CLAUDE.md.

export const landingCopy = {
  en: {
    title: 'Elenchus — does this argument hold up?',
    description:
      'Paste any text and get a structured analysis of its reasoning: where the logic breaks, how strong the case is, and what it gets right. Elenchus examines reasoning — it does not fact-check.',

    // The page's h1/intro/"it does not fact-check" paragraph used to open
    // this page (Landing.astro). Sub-project 2c, Task 3 moved them into the
    // ToolHero band instead (heroTitle/heroLede below) — the front page is
    // now the analyzer, and CLAUDE.md's rule that this claim precede every
    // call to action means it belongs in the hero, above the paste box, not
    // in a heading further down a page that no longer opens with it.
    heroEyebrow: 'For arguments',
    // One italic word, as the house contract (§2) sets it: two read as a
    // phrase in a switched face, not as the one word that carries the stress.
    heroTitle: 'Does this argument *hold* up?',
    // Two lines at 1440 (owner decision 16, 2026-10-10), the "does not check
    // facts" claim still first. The false-premises caveat that used to close
    // this lede now sits next to the score (strings.js scoreCaveat), where a
    // good score on a falsehood is actually read.
    heroLede:
      'Elenchus does not check facts. It checks whether each conclusion follows from what came before: circular reasoning, false dilemmas, unsupported leaps.',
    heroChips: ['Any text', 'Nothing to install', 'No account'],

    // The method band: four panels, each a contour drawing and one caption
    // with one line under it. Product copy, truthful to the prompt
    // (elenchus-proxy/src/prompt.mjs): it quotes each flaw, rates its
    // severity, and returns a three-level score plus optional strengths.
    methodHeading: 'How it reads a text',
    method: [
      { caption: 'Finds the conclusion', line: 'What the text is trying to get you to accept.' },
      { caption: 'Traces what supports it', line: 'The reasons and evidence it offers on the way there.' },
      { caption: 'Flags the gap', line: 'Each step that does not follow, quoted, with how serious it is.' },
      { caption: 'Scores the whole', line: 'Strong, moderate or weak, and what the argument does well.' },
    ],

    // Three cards, one per saved run, each linking to its section on the
    // Examples page. The names and lines come from examplesCopy.kinds, so the
    // card and the section it opens cannot describe the text differently.
    getHeading: 'What you get back',
    getCta: 'See the full run',

    // Two cards, not three (design audit 2026-10-09): a "Paste it" card used
    // to lead this list and pointed at the paste box directly above it — the
    // one way in a visitor has already found by the time they read this.
    waysHeading: 'Two more ways to use it',
    ways: [
      {
        name: 'One click while reading',
        body: 'A bookmark that sends the page you are on, or the passage you selected, straight to the analyzer.',
        cta: 'Get the bookmarklet',
        href: '/bookmarklet/',
      },
      {
        name: 'The Chrome extension',
        body: 'Analyze in a side panel without leaving the page: 21 a day, or unlimited with your own API key.',
        cta: 'View on the Chrome Web Store',
        href: null, // the Web Store URL, threaded in per language
      },
    ],

    // The free web tier is small by construction and cannot grow — the
    // provider caps the whole account. Saying so here is what stops the
    // dry state from reading as a broken site.
    limitsHeading: 'The free demo is small on purpose',
    limitsText:
      'This site runs on a free model tier: 2 analyses a day per visitor, and 150 a day across everyone. When the day’s allowance is gone, it is gone. The extension has its own separate allowance and takes your own API key for unlimited use.',

    privacyText: 'What happens to the text you submit is described in the ',
    privacyLink: 'privacy policy',
    privacyEnd: '.',

    houseText: 'Elenchus is part of ',
    houseLink: 'Untilt',
    houseEnd: ', a small house of tools for thinking straight.',
  },

  fr: {
    title: 'Elenchus — cet argument tient-il debout ?',
    description:
      'Collez un texte et obtenez une analyse structurée de son raisonnement : où la logique cède, la solidité de l’ensemble, et ce qui tient. Elenchus examine le raisonnement — il ne vérifie pas les faits.',

    // Voir le commentaire du bloc `en` : ce contenu vit désormais dans le
    // bandeau ToolHero (heroTitle/heroLede), pas dans un titre plus bas.
    heroEyebrow: 'Pour les arguments',
    // Un seul mot en italique (contrat maison §2). Espace insécable avant « ? ».
    heroTitle: 'Cet argument *tient-il* debout\u00a0?',
    heroLede:
      'Elenchus ne vérifie pas les faits. Il examine si chaque conclusion découle de ce qui la précède : raisonnement circulaire, faux dilemmes, sauts non justifiés.',
    heroChips: ['Tout texte', 'Rien à installer', 'Sans compte'],

    methodHeading: 'Comment il lit un texte',
    method: [
      { caption: 'Repère la conclusion', line: 'Ce que le texte cherche à vous faire admettre.' },
      { caption: 'Remonte ce qui la soutient', line: 'Les raisons et les éléments qu’il avance pour y arriver.' },
      { caption: 'Signale la faille', line: 'Chaque étape qui ne suit pas, citée, avec sa gravité.' },
      { caption: 'Note l’ensemble', line: 'Solide, modéré ou faible, et ce que l’argument réussit.' },
    ],

    getHeading: 'Ce que vous obtenez',
    getCta: 'Voir l’analyse complète',

    waysHeading: 'Deux autres façons de l’utiliser',
    ways: [
      {
        name: 'En un clic pendant la lecture',
        body: 'Un favori qui envoie la page où vous êtes, ou le passage sélectionné, directement à l’analyseur.',
        cta: 'Obtenir le bookmarklet',
        href: '/fr/bookmarklet/',
      },
      {
        name: 'L’extension Chrome',
        body: 'Analysez dans un panneau latéral sans quitter la page : 21 par jour, ou sans limite avec votre propre clé API.',
        cta: 'Voir sur le Chrome Web Store',
        href: null,
      },
    ],

    limitsHeading: 'La démonstration gratuite est volontairement petite',
    limitsText:
      'Ce site fonctionne sur un palier de modèles gratuit : 2 analyses par jour et par visiteur, 150 par jour pour tout le monde. Une fois le quota du jour épuisé, il l’est. L’extension dispose de son propre quota et accepte votre clé API pour un usage illimité.',

    privacyText: 'Le sort du texte que vous soumettez est décrit dans la ',
    privacyLink: 'politique de confidentialité',
    privacyEnd: '.',

    houseText: 'Elenchus fait partie d’',
    houseLink: 'Untilt',
    houseEnd: ', une petite maison d’outils pour penser droit.',
  },
};

export const bookmarkletCopy = {
  en: {
    title: 'The Elenchus bookmarklet — one click from any page',
    description:
      "Drag one link to your bookmarks bar and examine the reasoning of whatever you're reading, in one click, in any browser.",

    heading: 'The bookmarklet',
    intro:
      "A bookmark that takes the page you're reading — or just the passage you selected — and opens it in the Elenchus analyzer, already filled in.",

    installHeading: 'Install it',
    installStep: 'Drag this button to your bookmarks bar:',
    buttonLabel: 'Analyze reasoning',
    installHint:
      'Press ⌘⇧B (Ctrl+Shift+B on Windows) if the bookmarks bar is hidden. Drag it — do not copy and paste the link: Chrome silently strips the "javascript:" prefix from a pasted bookmark, and the result does nothing at all.',

    useHeading: 'Use it',
    useSteps: [
      'Optional: select the passage you want examined. Nothing selected means the page’s main text is used.',
      'Click the bookmark. The analyzer opens in a new tab with the text already in the box.',
      'Solve the challenge and press Analyze. Nothing is sent anywhere until you do.',
    ],

    limitsHeading: 'Where it does not work',
    limitsIntro: 'Tested in Chrome. What was measured, and what was not:',
    limits: [
      'Browser pages such as chrome://settings, and the new-tab page: the bookmark does nothing there. Browsers do not let a bookmarklet run on their own screens.',
      'If pop-ups are blocked for the site you are on, the analyzer tab never opens. Allow pop-ups for that site, or use the paste box.',
      'A page with no real prose — a video page, a photo gallery, an app — gives the analyzer nothing to work with. Select the text you mean, or paste it.',
      'Firefox and Safari have not been tested. The paste box works in every browser.',
    ],
    limitsGood:
      'It does run on sites with a strict Content-Security-Policy, github.com included — that was tested, because the opposite was expected.',

    fallbackHeading: 'The paste box works everywhere',
    fallbackText: 'Any text, any browser, any device: ',
    fallbackLink: 'open the analyzer',
    fallbackEnd: ' and paste it in.',

    privacyHeading: 'What it sends',
    privacyText:
      'The bookmarklet reads the page in your browser and hands the text to the analyzer tab directly — it does not go through a server on the way. Nothing is sent for analysis until you press the Analyze button. What happens after that is described in the ',
    privacyLink: 'privacy policy',
    privacyEnd: '.',
  },

  fr: {
    title: 'Le bookmarklet Elenchus — en un clic depuis n’importe quelle page',
    description:
      'Glissez un lien dans votre barre de favoris et examinez le raisonnement de ce que vous lisez, en un clic, dans n’importe quel navigateur.',

    heading: 'Le bookmarklet',
    intro:
      'Un favori qui prend la page que vous lisez — ou seulement le passage que vous avez sélectionné — et l’ouvre dans l’analyseur Elenchus, déjà rempli.',

    installHeading: 'Installation',
    installStep: 'Glissez ce bouton dans votre barre de favoris :',
    buttonLabel: 'Analyser le raisonnement',
    installHint:
      'Appuyez sur ⌘⇧B (Ctrl+Maj+B sous Windows) si la barre de favoris est masquée. Glissez-le — ne le copiez-collez pas : Chrome retire silencieusement le préfixe « javascript: » d’un favori collé, et le résultat ne fait alors rien du tout.',

    useHeading: 'Utilisation',
    useSteps: [
      'Facultatif : sélectionnez le passage à examiner. Sans sélection, le texte principal de la page est utilisé.',
      'Cliquez sur le favori. L’analyseur s’ouvre dans un nouvel onglet, le texte déjà dans le champ.',
      'Résolvez la vérification et lancez l’analyse. Rien n’est envoyé avant ce moment-là.',
    ],

    limitsHeading: 'Là où il ne fonctionne pas',
    limitsIntro: 'Testé dans Chrome. Ce qui a été mesuré, et ce qui ne l’a pas été :',
    limits: [
      'Les pages du navigateur comme chrome://settings, ou la page d’accueil d’un nouvel onglet : le favori n’y fait rien. Les navigateurs interdisent à un bookmarklet de s’exécuter sur leurs propres écrans.',
      'Si les fenêtres pop-up sont bloquées sur le site où vous êtes, l’onglet de l’analyseur ne s’ouvre jamais. Autorisez-les pour ce site, ou utilisez le champ de collage.',
      'Une page sans véritable texte — une vidéo, une galerie, une application — ne donne rien à analyser. Sélectionnez le texte concerné, ou collez-le.',
      'Firefox et Safari n’ont pas été testés. Le champ de collage, lui, fonctionne dans tous les navigateurs.',
    ],
    limitsGood:
      'Il fonctionne sur les sites à Content-Security-Policy stricte, github.com compris — c’est justement ce qui a été testé, parce que l’inverse était attendu.',

    fallbackHeading: 'Le champ de collage fonctionne partout',
    fallbackText: 'N’importe quel texte, navigateur ou appareil : ',
    fallbackLink: 'ouvrez l’analyseur',
    fallbackEnd: ' et collez-le.',

    privacyHeading: 'Ce qui est envoyé',
    privacyText:
      'Le bookmarklet lit la page dans votre navigateur et transmet le texte directement à l’onglet de l’analyseur — il ne passe par aucun serveur en chemin. Rien n’est envoyé pour analyse tant que vous n’avez pas lancé l’analyse. Ce qui se passe ensuite est décrit dans la ',
    privacyLink: 'politique de confidentialité',
    privacyEnd: '.',
  },
};

// The Examples page (/examples/, /fr/examples/) and the three front-page
// cards that link into it. `kinds` describes each testbed text without
// predicting what the model made of it: the run itself says that. Keys are
// the sample ids (src/lib/samples.js EXAMPLE_IDS), so each card's anchor and
// the section it lands on share one name.
//
// The intro is the provenance the republishing condition asks for (owner
// decision 8, 2026-10-10): AI-generated, saved on a date, by a named model,
// and the French texts are translations of the English originals. The date
// and the model are per run, so the intro points at the label that carries
// them rather than restating values a re-freeze would make stale.
export const examplesCopy = {
  en: {
    title: 'Elenchus examples: three saved runs',
    description:
      'Three texts analysed by Elenchus and saved as the model returned them: an opinion piece, a three-line claim and a policy memo.',
    heading: 'Examples',
    intro: [
      'Three texts, each analysed by Elenchus and saved exactly as the model returned it. Nothing in the analyses has been edited.',
      'Every analysis here is AI-generated. The label above each one gives the date it was saved and names the model that wrote it. On the French version of this page, the texts are translations of these English originals.',
    ],
    empty: 'Examples are being prepared. The three runs will appear here once they have been saved.',
    missing: 'This run is being prepared.',
    textLabel: 'The text analysed',
    kinds: {
      '2-mixed': {
        name: 'An opinion piece',
        body: 'A manager’s case against remote work, in five paragraphs.',
      },
      '3-short': {
        name: 'A three-line claim',
        body: 'Founders, early mornings and settled science, in three sentences.',
      },
      '1-sound': {
        name: 'A policy memo',
        body: 'Why a bridge is due for inspection, worked out from a rule and a year of traffic counts.',
      },
    },
  },

  fr: {
    title: 'Exemples Elenchus : trois analyses enregistrées',
    description:
      'Trois textes analysés par Elenchus et enregistrés tels que le modèle les a rendus : une tribune, une affirmation en trois lignes et une note de service.',
    heading: 'Exemples',
    intro: [
      'Trois textes, chacun analysé par Elenchus et enregistré exactement tel que le modèle l’a rendu. Rien dans les analyses n’a été retouché.',
      'Chaque analyse ici est générée par IA. L’étiquette au-dessus de chacune donne la date de son enregistrement et nomme le modèle qui l’a écrite. Les textes de cette page sont des traductions des originaux anglais.',
    ],
    empty: 'Les exemples sont en préparation. Les trois analyses apparaîtront ici une fois enregistrées.',
    missing: 'Cette analyse est en préparation.',
    textLabel: 'Le texte analysé',
    kinds: {
      '2-mixed': {
        name: 'Une tribune',
        body: 'Un manager plaide contre le télétravail, en cinq paragraphes.',
      },
      '3-short': {
        name: 'Une affirmation en trois lignes',
        body: 'Des fondateurs, des réveils matinaux et une science établie, en trois phrases.',
      },
      '1-sound': {
        name: 'Une note de service',
        body: 'Pourquoi un pont doit être inspecté, démontré à partir d’une règle et d’un an de comptages.',
      },
    },
  },
};
