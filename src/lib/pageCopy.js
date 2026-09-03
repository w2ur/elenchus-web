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
    heroTitle: 'Does this argument *hold up?*',
    heroLede:
      'Elenchus does not check facts. It checks whether the conclusions follow from what came before — circular reasoning, false dilemmas, unsupported leaps, loaded framing. A tight argument on false premises scores well here; that is the tool working, not failing.',
    heroChips: ['Any text', 'Nothing to install', 'No account'],

    getHeading: 'What you get back',
    getItems: [
      'A summary of what the text is actually arguing.',
      'An overall reasoning score: strong, moderate or weak.',
      'Each flaw found, with its severity and the passage it comes from.',
      'The strengths — what the argument does well.',
    ],

    waysHeading: 'Three ways to use it',
    ways: [
      {
        name: 'Paste it',
        body: 'Any text, any browser, any device. Nothing to install.',
        // Sub-project 2c, Task 3 folded /analyze into this page: the paste
        // box this card advertises is already ABOVE it, in Analyzer.astro
        // (id="text-input", shared by / and /fr/ — see that file's
        // markup). An href of '/analyze/' would 301 straight back here,
        // sending a visitor away from the very box and back to the top of
        // the page they're already on (fix round 1, Task 3 finding). An
        // in-page anchor instead — no per-language prefix needed, since
        // the id is identical on both pages.
        cta: 'Jump to the paste box',
        href: '#text-input',
      },
      {
        name: 'One click while reading',
        body: 'A bookmark that sends the page you are on — or the passage you selected — straight to the analyzer.',
        cta: 'Get the bookmarklet',
        href: '/bookmarklet/',
      },
      {
        name: 'The Chrome extension',
        body: 'Analyse in a side panel without leaving the page: 21 a day, or unlimited with your own API key.',
        cta: 'View on the Chrome Web Store',
        href: null, // the Web Store URL, threaded in per language
      },
    ],

    // The free web tier is small by construction and cannot grow — the
    // provider caps the whole account. Saying so here is what stops the
    // dry state from reading as a broken site.
    limitsHeading: 'The free demo is small on purpose',
    limitsText:
      'This site runs on a free model tier: 2 analyses a day per visitor, and 150 a day across everyone. When the day’s allowance is gone, it is gone — the extension has its own separate allowance and takes your own API key for unlimited use.',

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
    heroTitle: 'Cet argument *tient-il debout ?*',
    heroLede:
      'Elenchus ne vérifie pas les faits. Il examine si les conclusions découlent de ce qui les précède — raisonnement circulaire, faux dilemmes, sauts non justifiés, cadrage orienté. Un argument serré sur des prémisses fausses obtient un bon score ici ; c’est l’outil qui fonctionne, pas qui échoue.',
    heroChips: ['Tout texte', 'Rien à installer', 'Sans compte'],

    getHeading: 'Ce que vous obtenez',
    getItems: [
      'Un résumé de ce que le texte soutient réellement.',
      'Un score de raisonnement global : solide, modéré ou faible.',
      'Chaque faille repérée, avec sa gravité et le passage dont elle vient.',
      'Les points forts — ce que l’argumentation réussit.',
    ],

    waysHeading: 'Trois façons de l’utiliser',
    ways: [
      {
        name: 'Collez le texte',
        body: 'N’importe quel texte, navigateur ou appareil. Rien à installer.',
        // Voir le commentaire du bloc `en` : même correction, même ancre —
        // l’identifiant "text-input" est partagé par / et /fr/.
        cta: 'Aller à la zone de texte',
        href: '#text-input',
      },
      {
        name: 'En un clic pendant la lecture',
        body: 'Un favori qui envoie la page où vous êtes — ou le passage sélectionné — directement à l’analyseur.',
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
      'Ce site fonctionne sur un palier de modèles gratuit : 2 analyses par jour et par visiteur, 150 par jour pour tout le monde. Une fois le quota du jour épuisé, il l’est — l’extension dispose de son propre quota et accepte votre clé API pour un usage illimité.',

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
