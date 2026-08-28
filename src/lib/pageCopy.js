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
