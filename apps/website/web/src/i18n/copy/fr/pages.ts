import type { SiteCopyOverride } from '../..'

/**
 * French page copy.
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const frPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Pourquoi Tiko existe',
    description:
      'Pourquoi Tiko est une famille de petites applis gratuites et multilingues plutôt qu’une grande plateforme de communication — et pourquoi rien de tout cela ne coûte quoi que ce soit.',
    eyebrow: 'Pourquoi Tiko existe',
    title: 'Joyeux, simple, et dans toutes les langues.',
    lede: 'Tiko est une famille de petites applis belles et gratuites qui aident les enfants à communiquer, à choisir, à suivre des routines et à comprendre le temps. Chaque appli s’ouvre en quelques secondes, fonctionne dans n’importe quelle langue et ne demande jamais de compte — parce que la première étape devrait être l’usage, pas la configuration.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'Le problème',
        title: 'Les outils de communication demandent trop avant d’aider.',
        body: [
          'Un enfant qui ne peut pas encore dire ce dont il a besoin vit une journée difficile maintenant — pas après une période d’essai, une licence, une formation et une connexion. Pourtant, la plupart des logiciels de communication réclament les quatre. Ils arrivent comme une plateforme : un compte à créer, un abonnement à justifier, un écran de configuration à parcourir et un manuel à lire avant que quiconque prononce un mot.',
          'Ce coût n’est pas seulement financier. Ce sont les vingt minutes qu’un enseignant n’a pas entre deux cours, la confiance qu’un parent perd quand le premier écran est un formulaire administratif, et l’appareil spécialisé qui reste dans le placard parce que personne ne sait vraiment comment l’installer. L’outil finit par servir l’institution qui l’a acheté plutôt que l’enfant qui le tient.',
          'Tiko part de l’autre bout. Le premier écran, c’est l’outil. Tout le reste — réglages, récupération, synchronisation entre appareils — vient ensuite, pour l’adulte, et seulement s’il le souhaite.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'La forme',
        title: 'Beaucoup de petites applis, pas une grande.',
        lede: 'Tiko n’est pas un tableau de bord avec des modes. C’est un ensemble d’applis distinctes, chacune faisant bien une seule chose.',
        body: [
          'Un enfant qui apprend à répondre à une question n’a pas besoin d’un constructeur de phrases sur le même écran. Un enfant qui suit une routine du matin n’a pas besoin d’un clavier. Chaque commande supplémentaire est une chose de plus à mal lire, à toucher par erreur ou qui distrait — et pour un enfant qui travaille déjà dur pour se faire comprendre, ce coût est réel.',
          'Chaque appli Tiko est donc sa propre appli. Yes No, ce sont deux boutons. Type, c’est un champ de texte et un bouton pour parler. First montre une étape à la fois. On ouvre celle qui correspond au moment, et l’écran ne contient presque rien d’autre.',
        ],
        points: [
          {
            title: 'Un écran, une tâche',
            body: 'Chaque appli s’ouvre directement sur ce qu’elle fait. Pas d’écran d’accueil à parcourir, pas de mode à choisir d’abord.',
          },
          {
            title: 'S’apprend une fois',
            body: 'Parce qu’une appli fait une seule chose, un enfant peut l’apprendre entièrement. La confiance vient d’un outil qui se comporte de la même façon à chaque fois.',
          },
          {
            title: 'Rien à quitter en grandissant',
            body: 'Commencer par Yes No n’enferme personne. Les applis sont séparées : passer à Talk ou à Type, c’est ouvrir une autre appli, pas migrer un compte.',
          },
          {
            title: 'Assez petit pour inspirer confiance',
            body: 'Un outil qu’un accompagnant comprend en une minute est un outil vers lequel il se tournera vraiment dans un moment difficile.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'La langue',
        title: 'Multilingue dès le départ, pas traduit après coup.',
        body: [
          'Un outil de communication qui ne fonctionne que dans une langue laisse de côté les enfants qui en ont le plus besoin : l’enfant d’un foyer bilingue, l’enfant dont la langue familiale n’est pas celle de l’école, l’enfant qui a changé de pays et perdu ses mots deux fois.',
          'Tiko parle la langue de l’enfant, pas celle des développeurs. L’interface, la voix de synthèse et les contenus sont traduisibles, et la langue choisie par un accompagnant le suit dans toutes les applis Tiko et sur ce site. Là où une langue n’a pas encore de traduction d’interface, l’appli revient à l’anglais pour ces mots au lieu de refuser de s’ouvrir.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Pourquoi gratuit',
        title: 'Parce que l’accès ne devrait pas avoir d’étiquette de prix.',
        lede: 'Les applis Tiko sont gratuites, toujours. Pas un essai, pas un avant-goût, pas un entonnoir de vente.',
        body: [
          'Communiquer n’est pas une option premium. Un enfant devrait pouvoir ouvrir une appli Tiko tout de suite, sans qu’un adulte décide d’abord si ce moment précis vaut la dépense — parce que cette décision, prise sous pression, se prend le plus souvent contre l’enfant.',
        ],
        points: [
          {
            title: 'Aucune hésitation',
            body: 'Essayez un outil avec un enfant immédiatement, sans peser si le moment justifie le coût.',
          },
          {
            title: 'Aucune pression',
            body: 'Pas d’urgence, pas de culpabilisation, pas de publicité, pas d’invitations à passer à la version supérieure. Rien ne transforme le fait d’être compris en transaction.',
          },
          {
            title: 'Aucun marché caché',
            body: 'Gratuit ne veut pas dire financé par la publicité. Tiko n’échange ni l’attention ni les données d’un enfant contre l’accès — il n’y a rien à échanger, puisque rien n’est collecté.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'Ce que Tiko n’est pas',
        title: 'Un outil, pas un traitement.',
        body: [
          'Tiko ne diagnostique pas, ne traite pas et ne promet aucun résultat. Ce n’est ni un programme de thérapie, ni un bilan, ni un substitut à une orthophoniste. Il n’y a pas de scores, pas de tableaux de progression et pas de rapports comparant un enfant à un autre.',
          'Ce que Tiko propose, c’est un bon outil pour un moment précis : un moyen de répondre, de choisir, de dire une phrase, de suivre une routine. Les orthophonistes et les enseignants l’utilisent à côté de leur propre travail, et les familles s’en servent dans les heures ordinaires entre deux rendez-vous. C’est volontairement une promesse plus modeste que celle de la plupart des logiciels du secteur.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Qui le façonne',
        title: 'Construit avec les orthophonistes, pas seulement pour elles.',
        lede: 'Des orthophonistes, des enseignants et d’autres professionnels examinent Tiko et nous disent ce qui ne va pas.',
        body: [
          'Un développeur peut construire un outil de communication qui fonctionne. Savoir s’il fonctionne pour un enfant qui peine à se faire comprendre est une tout autre question, et elle ne se règle pas en lisant une documentation. Elle se règle auprès des personnes qui accompagnent ces enfants chaque semaine.',
          'Les applis sont donc examinées par des orthophonistes, des enseignants spécialisés et d’autres professionnels — et leurs retours les changent. Certains sont mineurs : une cible trop proche d’une autre, un mot faux dans un dialecte, une célébration trop stimulante pour les enfants qu’ils accompagnent. D’autres non : si Say n’a pas de buzzer d’erreur et si aucune appli Tiko ne tient de score, cela vient de là.',
          'Ce n’est pas une validation clinique et Tiko n’en revendique aucune. C’est une revue de conception par des personnes dont le jugement vaut plus que le nôtre sur les questions qui comptent le plus, et c’est la raison pour laquelle plusieurs applis ressemblent à ce qu’elles sont aujourd’hui plutôt qu’à ce qu’elles étaient au départ.',
        ],
        points: [
          {
            title: 'Examiné du point de vue thérapeutique',
            body: 'Les professionnels regardent les applis en pensant aux enfants qu’ils accompagnent, et disent clairement ce qui gênerait.',
          },
          {
            title: 'Des retours qui changent le produit',
            body: 'Quand une revue dit qu’un mécanisme ne convient pas à ces enfants, le mécanisme change. Les buzzers retirés et l’absence de score viennent de là.',
          },
          {
            title: 'Toujours pas un traitement',
            body: 'L’apport des professionnels rend Tiko mieux conçu. Il n’en fait pas un programme de thérapie, et nous ne le présentons pas ainsi.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Ouvert par défaut',
        title: 'Construit au grand jour, façonné par celles et ceux qui l’utilisent.',
        body: [
          'Tiko est open source. Le code, les contrats de contenu et les formes d’API sont publics : une académie, une orthophoniste ou un développeur peut voir exactement ce qu’une appli fait des données d’un enfant — c’est-à-dire rien du tout pour la plupart des applis Tiko.',
          'Cela signifie aussi que la direction vient de celles et ceux qui l’utilisent. Parents, orthophonistes et enseignants signalent ce qui manque bien plus précisément qu’une feuille de route écrite en vase clos, et un projet ouvert peut y répondre sans attendre un argument commercial.',
        ],
      },
    ],
    cta: {
      title: 'Ouvrez-en une et voyez.',
      body: 'Le plus rapide pour juger Tiko, c’est de l’utiliser deux minutes avec un enfant. Pas de compte, pas de téléchargement, pas de salle d’attente.',
      primaryLabel: 'Découvrir les applis',
      primaryPath: '/apps',
      secondaryLabel: 'Comment ça marche',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Comment Tiko fonctionne',
    description:
      'Comment les applis Tiko s’ouvrent sans compte, ce qui se passe sur l’appareil, et comment fonctionne la récupération facultative pour les accompagnants.',
    eyebrow: 'Comment Tiko fonctionne',
    title: 'D’abord ouvrir. La configuration reste en arrière-plan.',
    lede: 'Tiko commence sur l’appareil. Les applis s’ouvrent et fonctionnent immédiatement. La récupération pour l’accompagnant peut venir plus tard par un lien magique envoyé par e-mail — jamais avant que l’enfant puisse utiliser l’outil.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'L’expérience',
        title: 'Trois moments, aucune friction.',
        steps: [
          {
            title: 'Ouvrir le lien',
            body: 'Un accompagnant partage un lien, l’ajoute aux favoris ou installe l’appli depuis l’App Store. Il n’y a rien à licencier et personne à solliciter.',
          },
          {
            title: 'S’en servir tout de suite',
            body: 'L’appli est prête : pas de connexion, pas de tutoriel, pas de parcours d’accueil. L’enfant voit l’outil lui-même, immédiatement.',
          },
          {
            title: 'Récupérer plus tard, si vous le voulez',
            body: 'Si un accompagnant veut que ses réglages le suivent sur un autre appareil, il ajoute une adresse e-mail et la confirme une fois. C’est facultatif, cela arrive après coup, et l’enfant ne le voit jamais.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identité sur l’appareil',
        title: 'Jamais de mots de passe.',
        body: [
          'Chaque appli Tiko crée une session d’appareil à la première ouverture. Elle est générée localement, appartient à cet appareil, et suffit pour tout ce que l’appli sait faire. Pas d’adresse e-mail, pas de mot de passe, pas de compte.',
          'C’est le point que la plupart des logiciels de communication prennent à l’envers. Un compte existe pour qu’une entreprise vous reconnaisse d’un appareil à l’autre — un vrai besoin, mais un besoin d’adulte, et on le place généralement devant l’enfant comme prix d’entrée. Tiko le traite pour ce qu’il est : un confort facultatif pour l’accompagnant, proposé plus tard.',
        ],
        points: [
          {
            title: 'Session d’appareil',
            body: 'Créée automatiquement à la première ouverture, stockée localement, et ne demande jamais de connexion.',
          },
          {
            title: 'Récupération par lien magique',
            body: 'Facultative. Un accompagnant ajoute une adresse e-mail et la confirme une fois pour activer la synchronisation entre appareils.',
          },
          {
            title: 'Aucune formalité pour l’enfant',
            body: 'La récupération et l’administration sont réservées aux adultes. Un enfant ne voit jamais de formulaire de compte.',
          },
          {
            title: 'Identique sur toutes les plateformes',
            body: 'Les sessions fonctionnent de la même façon sur le web, iOS et Android : une appli se comporte partout pareil.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Fiabilité',
        title: 'Ça continue de marcher quand le réseau, non.',
        body: [
          'Les applis Tiko chargent leur contenu principal sur l’appareil et fonctionnent depuis là. Une connexion qui saute, un réseau d’école qui bloque la moitié d’internet ou un trajet en voiture sans signal n’enlèvent pas à un enfant la possibilité de répondre à une question.',
          'Tout ce qui a réellement besoin du réseau — synchroniser des réglages, télécharger un nouveau jeu d’images — vient en plus. Si cela échoue, l’appli continue comme avant.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Ce qui est collecté',
        title: 'Presque rien, et jamais depuis l’enfant.',
        body: [
          'La plupart des applis Tiko ne collectent rien du tout. Il n’y a pas d’analyse des touchers d’un enfant, pas d’identifiants publicitaires et pas de traqueurs tiers. La reconnaissance vocale, quand une appli l’utilise, s’exécute sur l’appareil partout où la plateforme le permet, et les enregistrements ne sont jamais conservés ni envoyés.',
          'Quand une appli stocke quelque chose — les cartes créées par un accompagnant, une routine qu’il a construite, une phrase enregistrée —, c’est du contenu que l’adulte a délibérément créé, et il reste sur l’appareil tant que la synchronisation n’est pas activée.',
        ],
        points: [
          {
            title: 'Aucune publicité, jamais',
            body: 'Pas de publicité, pas de régies et aucun pistage publicitaire dans aucune appli Tiko.',
          },
          {
            title: 'Aucun mur de connexion',
            body: 'Les applis destinées aux enfants s’ouvrent et fonctionnent sans compte d’aucune sorte.',
          },
          {
            title: 'Sur l’appareil quand c’est possible',
            body: 'La reconnaissance vocale utilise le moteur local de la plateforme là où il existe. Les enregistrements ne sont pas conservés.',
          },
          {
            title: 'Vérifiable au grand jour',
            body: 'Les applis sont open source : les affirmations de cette page peuvent être vérifiées plutôt que crues sur parole.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Un Tiko, beaucoup d’écrans',
        title: 'La même expérience, partout.',
        body: [
          'Le web est le moyen le plus rapide d’essayer Tiko : un lien suffit. Les applis natives ajoutent ce qu’un navigateur fait moins bien — fiabilité hors ligne, une icône sur l’écran d’accueil que l’enfant reconnaît, et une meilleure prise en charge de la voix.',
          'Quel que soit votre choix, l’appli se comporte de la même façon. Les mêmes contrats se trouvent dessous : une routine construite sur une tablette est la même routine sur un téléphone.',
        ],
      },
    ],
    cta: {
      title: 'Vous voulez le détail technique ?',
      body: 'La documentation d’architecture et d’API explique comment les workers, le stockage et les clients s’assemblent.',
      primaryLabel: 'Doc d’architecture',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'Contrats d’API',
      secondaryPath: '/docs/apis',
    },
  },
}
