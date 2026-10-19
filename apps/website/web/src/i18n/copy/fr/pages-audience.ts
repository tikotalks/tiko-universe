import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** French copy for the audience-facing and help pages. */
export const frAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Pour les accompagnants',
    description:
      'Ce que Tiko promet aux parents et aux accompagnants : aucun compte avant l’usage, aucune publicité, aucun pistage, et des outils que l’on peut essayer dans un moment difficile sans rien préparer.',
    eyebrow: 'Pour les accompagnants',
    title: 'Conçu pour que le premier moment ne soit pas un formulaire.',
    lede: 'On devrait pouvoir essayer un outil avant de lui faire confiance. Tiko est pensé pour qu’un accompagnant ouvre une appli, voie si elle aide, et n’ajoute la récupération ou la synchronisation que lorsque cela compte vraiment.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Principes de confiance',
        title: 'Ce sur quoi nous ne transigeons pas.',
        lede: 'Ce sont des engagements, pas des réglages actuels. Ils ne changent pas quand les circonstances changent.',
        points: [
          {
            title: 'Gratuit, toujours',
            body: 'Nous ne vendons jamais vos données ni l’attention d’un enfant contre un accès. Les applis sont gratuites parce que faire payer la communication est le mauvais échange.',
          },
          {
            title: 'Aucune publicité. Jamais.',
            body: 'Aucune appli Tiko ne contient de publicité, de pistage publicitaire ni de régie tierce.',
          },
          {
            title: 'Aucun mur de connexion',
            body: 'Les applis destinées aux enfants s’ouvrent et fonctionnent sans compte. Rien ne s’interpose entre un enfant et le fait d’être compris.',
          },
          {
            title: 'Le moins possible',
            body: 'Nous ne collectons que ce dont une appli a réellement besoin pour fonctionner, et la plupart des applis Tiko n’ont besoin de rien.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Pour commencer',
        title: 'Vous n’avez rien à préparer.',
        body: [
          'Il n’y a pas de bonne façon de commencer ni rien à configurer d’abord. Ouvrez l’appli qui correspond au moment que vous vivez vraiment — une question à laquelle répondre, une routine à traverser, un mot à travailler — et servez-vous en. Si elle n’aide pas, fermez-la. Rien n’a été dépensé et rien n’a été souscrit.',
          'La plupart des accompagnants trouvent une appli qui convient et y restent longtemps. C’est un bon résultat, pas une limite. Tiko ne cherche pas à devenir l’endroit où votre enfant passe sa journée.',
        ],
        steps: [
          {
            title: 'Partez du moment, pas de l’appli',
            body: 'Choisissez l’appli qui correspond à quelque chose qui arrive aujourd’hui. Yes No pour une question, First pour une routine, Type pour un message à faire passer.',
          },
          {
            title: 'Utilisez-la à côté de votre enfant',
            body: 'Ce sont des outils pour deux personnes. S’asseoir à côté et montrer un toucher ou une phrase fait plus que tendre l’appareil.',
          },
          {
            title: 'Faites-en la sienne',
            body: 'Mettez vos propres photos, vos propres mots, votre propre routine. La photo des vraies chaussures de votre enfant vaut mieux qu’une icône de chaussures.',
          },
          {
            title: 'N’ajoutez la récupération que si vous le voulez',
            body: 'Si vos réglages doivent vous suivre sur un autre appareil, ajoutez une adresse e-mail une fois. Sinon, passez : rien d’autre ne change.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'En toute franchise',
        title: 'Ce que Tiko fera et ne fera pas.',
        body: [
          'Tiko ne diagnostique pas, ne traite pas et ne promet aucun résultat. Il ne vous dira pas si votre enfant progresse, et il ne tient délibérément aucun score qui laisserait croire qu’il le pourrait. Si vous voulez une évaluation, c’est le travail d’une orthophoniste — et une bonne vaut bien plus que n’importe quelle appli.',
          'Ce que Tiko peut faire, c’est retirer la friction de moments précis : être interrogé et avoir un moyen de répondre, savoir ce qui vient ensuite dans une routine, sortir une phrase qui resterait autrement coincée. Ces moments comptent, et ils suffisent largement à occuper un outil.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Confidentialité',
        title: 'Ce qu’il advient des données de votre enfant.',
        body: [
          'Dans la plupart des applis Tiko, rien ne quitte l’appareil. Les cartes que vous créez, les routines que vous construisez et les phrases que vous enregistrez restent en local. Il n’y a pas d’analyse de ce qu’un enfant touche, ni d’identifiants publicitaires.',
          'Si vous activez la synchronisation, le contenu que vous avez créé est stocké pour rejoindre vos autres appareils. C’est du contenu qu’un adulte a délibérément créé — jamais un journal de la façon dont un enfant a utilisé l’appli. La politique de confidentialité indique exactement ce qui est conservé, et comme Tiko est open source, vous pouvez aussi vérifier le code plutôt que de nous croire.',
        ],
      },
    ],
    cta: {
      title: 'Essayez-la aujourd’hui avec votre enfant.',
      body: 'Ouvrez une appli et utilisez-la deux minutes. Cela vous en dira plus que n’importe quelle description sur cette page.',
      primaryLabel: 'Découvrir les applis',
      primaryPath: '/apps',
      secondaryLabel: 'Lire la politique de confidentialité',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Pour les enseignants et les thérapeutes',
    description:
      'Utiliser Tiko dans une classe ou une file active : un profil distinct par enfant, aucune licence par poste, rien à installer, et aucune donnée qui quitte l’appareil.',
    eyebrow: 'Pour les enseignants et les thérapeutes',
    title: 'Accompagner beaucoup d’enfants. Garder chaque expérience calme.',
    lede: 'Le gestionnaire de profils Tiko permet à un enseignant ou à un thérapeute de créer un profil léger et distinct pour chaque enfant — et de décider exactement à quoi chacun accède. Les enfants ont un outil simple et concentré. Les adultes gardent les commandes hors de vue.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'En classe',
        title: 'Conçu pour les vingt minutes dont vous disposez vraiment.',
        body: [
          'Un logiciel qui arrive dans une école suppose généralement que quelqu’un a le temps de le configurer. En pratique, la personne qui tient la tablette a les quelques minutes entre deux cours, et un enfant qui a besoin d’une réponse maintenant.',
          'Tiko est conçu pour cette réalité. Sur un appareil géré, il n’y a rien à installer au-delà d’un lien à ouvrir, aucune clé de licence à courir après dans les achats, et aucune journée de formation avant qu’un outil soit utilisable. S’il ne convient pas à votre contexte, vous aurez perdu quelques minutes plutôt qu’une ligne budgétaire.',
        ],
        points: [
          {
            title: 'Aucune licence par poste',
            body: 'Gratuit pour chaque enfant de votre classe ou de votre file active. Aucun effectif à déclarer, aucun renouvellement à défendre.',
          },
          {
            title: 'Rien à déployer',
            body: 'Les applis web s’ouvrent depuis un lien sur un appareil géré. Les applis natives s’installent normalement depuis l’App Store.',
          },
          {
            title: 'Aucun compte enfant',
            body: 'Les enfants ne créent jamais d’identifiants et ne manipulent jamais de mots de passe, ce qui sort l’outil de la plupart des procédures de protection de l’enfance.',
          },
          {
            title: 'Fonctionne sur le réseau dont vous disposez',
            body: 'Les applis fonctionnent hors ligne après la première ouverture : un réseau scolaire filtré ou instable n’interrompt pas une séance.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Beaucoup d’enfants',
        title: 'Un profil distinct pour chaque enfant.',
        body: [
          'Une file active n’est pas un seul utilisateur. Chaque enfant a besoin de son vocabulaire, de ses routines et de ses images — et aucun ne devrait voir ceux d’un autre.',
          'Le gestionnaire de profils garde tout cela séparé sur le même appareil. Vous passez de l’un à l’autre en tant qu’adulte, et chaque enfant ne voit que son propre contenu quand il ouvre une appli. Les commandes adultes se trouvent derrière les mêmes parcours réservés que partout ailleurs dans Tiko : un enfant curieux ne se retrouve pas dans les réglages.',
        ],
        points: [
          {
            title: 'Contenu par enfant',
            body: 'Les cartes, les routines et les phrases enregistrées appartiennent à un profil, pas à l’appareil.',
          },
          {
            title: 'Changement réservé aux adultes',
            body: 'Changer de profil est une action d’adulte. Les enfants restent dans l’appli qu’on leur a confiée.',
          },
          {
            title: 'Pensé pour les appareils partagés',
            body: 'Conçu pour la tablette qui passe d’un enfant à l’autre au fil de la journée, comme cela se passe réellement.',
          },
          {
            title: 'Aucune visibilité croisée',
            body: 'Le vocabulaire et l’historique d’un enfant ne sont jamais visibles depuis un autre profil.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'À côté de votre pratique',
        title: 'Un outil dans vos mains, pas un programme à suivre.',
        body: [
          'Tiko n’a pas de programme intégré, pas de séquence prescrite et pas d’avis sur la façon dont une séance devrait se dérouler. Il ne note pas un enfant, ne le situe pas par rapport à une norme et ne produit pas de rapport. Ces jugements sont les vôtres, et les éléments qui les fondent viennent de votre observation plutôt que de la télémétrie d’une appli.',
          'Ce que Tiko vous donne, c’est un ensemble d’outils fiables et sans friction à saisir pendant le travail que vous faites déjà : proposer un choix binaire, construire une phrase, tenir l’attention sur une étape, ou travailler un mot sans qu’un buzzer punisse l’échec.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Données et protection de l’enfance',
        title: 'En bref : cela reste sur l’appareil.',
        body: [
          'La plupart des applis Tiko n’envoient rien nulle part. Il n’y a pas d’analyse des interactions des enfants, pas de publicité et pas de traqueurs tiers. La reconnaissance vocale, quand elle est utilisée, s’exécute sur l’appareil partout où la plateforme le permet, et les enregistrements ne sont jamais conservés.',
          'Comme les applis sont open source, votre référent informatique ou protection de l’enfance peut le vérifier plutôt que se fier à une assurance dans une brochure. Si votre établissement a besoin du détail par écrit, la politique de confidentialité et la documentation d’architecture sont toutes deux publiques.',
        ],
      },
    ],
    cta: {
      title: 'Essayez d’abord avec un seul enfant.',
      body: 'Prenez une appli et un enfant cette semaine. C’est un test plus juste que n’importe quelle grille d’évaluation, et cela ne coûte rien.',
      primaryLabel: 'Découvrir les applis',
      primaryPath: '/apps',
      secondaryLabel: 'Principes de confiance',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Questions fréquentes',
    description:
      'Des réponses claires sur ce qu’est Tiko, ce qu’il coûte, ce qu’il collecte et ce qu’il ne prétend délibérément pas faire.',
    eyebrow: 'Questions fréquentes',
    title: 'Des réponses claires, avant toute configuration.',
    lede: 'Réponses courtes aux questions que posent le plus souvent les accompagnants, les enseignants et les développeurs. Si la vôtre n’y est pas, une personne bien réelle est à un e-mail.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'Les bases',
        title: 'Ce qu’est Tiko.',
        questions: [
          {
            question: 'Qu’est-ce que Tiko ?',
            answer:
              'Tiko est une collection de petites applis gratuites qui aident les enfants à communiquer, à faire des choix, à suivre des routines et à comprendre le temps. Chaque appli fait une chose claire et s’ouvre instantanément — dans n’importe quelle langue, sur n’importe quel appareil, sans compte.',
          },
          {
            question: 'Pourquoi plusieurs applis plutôt qu’une seule ?',
            answer:
              'Parce que chaque commande supplémentaire à l’écran est une chose de plus qu’un enfant peut mal lire ou toucher par erreur. Une appli qui fait une seule chose peut être apprise entièrement, et un enfant qui l’a apprise peut lui faire confiance. Yes No, ce sont deux boutons ; il ne devrait jamais y pousser un constructeur de phrases.',
          },
          {
            question: 'À qui s’adresse Tiko ?',
            answer:
              'Aux enfants qui ont besoin d’aide pour s’exprimer — trouble de la parole ou du langage, retard de développement, handicap, ou simplement début de l’apprentissage de la parole — et aux parents, enseignants et thérapeutes à leurs côtés. Rien n’exige de diagnostic.',
          },
          {
            question: 'Quelles applis existent aujourd’hui ?',
            answer:
              'Yes No, Type, Talk, Say, Sum et First sont disponibles, sur le web ou sur l’App Store selon l’appli. Cards, Sequence et Timer sont encore en construction. La page des applis indique précisément où chacune peut s’ouvrir.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Le coût',
        title: 'Ce que ça coûte, et pourquoi.',
        questions: [
          {
            question: 'Tiko est-il vraiment gratuit ?',
            answer:
              'Oui. Les applis Tiko sont gratuites, toujours. Pas un aperçu temporaire, pas un avant-goût, pas un entonnoir de vente. Aucune offre payante ne retient une fonction dont un enfant a besoin.',
          },
          {
            question: 'Tiko affichera-t-il des publicités ?',
            answer:
              'Non. Aucune publicité, jamais. On doit pouvoir ouvrir Tiko à côté d’un enfant sans contenu commercial, message sponsorisé ou quoi que ce soit conçu pour capter l’attention.',
          },
          {
            question: 'Si c’est gratuit et sans publicité, comment est-ce financé ?',
            answer:
              'Tiko est construit comme un projet open source, pas comme une entreprise avec un objectif de croissance. Les coûts restent donc faibles — les applis sont minuscules et la plupart ne parlent à aucun serveur.',
          },
          {
            question: 'Les données de mon enfant sont-elles le paiement ?',
            answer:
              'Non. Gratuit ne veut pas dire financé par la publicité ici. La plupart des applis Tiko ne collectent rien : il n’y aurait rien à vendre même si nous le voulions.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Comptes et confidentialité',
        title: 'Ce qu’il faut céder pour s’en servir.',
        questions: [
          {
            question: 'Ai-je besoin d’un compte ?',
            answer:
              'Non. Les applis Tiko s’ouvrent et fonctionnent sans mur de connexion. La récupération facultative pour l’accompagnant est possible plus tard via un lien magique par e-mail, mais l’appli destinée à l’enfant ne commence jamais par la création d’un compte.',
          },
          {
            question: 'Quelles données Tiko collecte-t-il ?',
            answer:
              'Dans la plupart des applis, aucune. Pas d’analyse de ce qu’un enfant touche, pas d’identifiants publicitaires, pas de traqueurs tiers. Ce que vous créez — cartes, routines, phrases enregistrées — reste sur l’appareil tant que vous n’activez pas la synchronisation.',
          },
          {
            question: 'Tiko enregistre-t-il la voix de mon enfant ?',
            answer:
              'Là où une appli écoute, la reconnaissance vocale s’exécute sur l’appareil partout où la plateforme le permet, et les enregistrements ne sont jamais conservés ni envoyés. Les applis qui n’ont pas besoin de micro n’en demandent jamais.',
          },
          {
            question: 'Puis-je vérifier tout cela ?',
            answer:
              'Oui, et vous devriez. Tiko est open source : le code derrière ces affirmations est public. La politique de confidentialité expose en langage clair ce qui est conservé.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'Ce que Tiko n’est pas',
        title: 'Les limites, dites simplement.',
        questions: [
          {
            question: 'Tiko est-il un produit thérapeutique ou médical ?',
            answer:
              'Non. Tiko ne diagnostique pas, ne traite pas et ne promet aucun résultat. C’est un ensemble d’outils de communication et d’apprentissage, pas une intervention clinique, et pas un substitut à une orthophoniste.',
          },
          {
            question: 'Tiko suit-il les progrès ?',
            answer:
              'Non, délibérément. Il n’y a ni scores, ni séries, ni tableaux de bord. Les progrès en communication ne sont pas quelque chose qu’une appli devrait noter, et un chiffre à l’écran façonne davantage le comportement de l’adulte que celui de l’enfant.',
          },
          {
            question: 'Est-ce que ça marchera pour mon enfant ?',
            answer:
              'Nous ne le savons sincèrement pas, et quiconque prétend le contraire devine. Les applis sont gratuites et s’ouvrent tout de suite : le moyen le moins coûteux de le savoir est d’en essayer une quelques minutes.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Pratique',
        title: 'Appareils, langues et usage hors ligne.',
        questions: [
          {
            question: 'Quelles langues Tiko parle-t-il ?',
            answer:
              'Les applis sont multilingues dès la base, et la langue choisie par un accompagnant le suit dans toutes les applis Tiko et sur ce site. Là où une langue n’a pas encore de traduction d’interface, l’appli revient à l’anglais plutôt que de refuser de s’ouvrir.',
          },
          {
            question: 'Est-ce que ça fonctionne hors ligne ?',
            answer:
              'Oui. Les applis chargent leur contenu principal sur l’appareil et continuent sans réseau. Tout ce qui a besoin d’internet vient en plus, et ne pas y accéder n’arrête pas l’appli.',
          },
          {
            question: 'Sur quels appareils ça fonctionne ?',
            answer:
              'Sur tout navigateur récent, plus les applis natives iPhone et iPad pour celles qui sont sorties sur l’App Store. Android suit la même approche.',
          },
          {
            question: 'Puis-je l’utiliser pour une classe ou une file active ?',
            answer:
              'Oui. Le gestionnaire de profils garde un profil distinct par enfant sur un appareil partagé, et il n’y a aucune licence par poste à acheter ou à déclarer.',
          },
        ],
      },
    ],
    cta: {
      title: 'Une question reste ?',
      body: 'Le support, c’est une personne, pas une file de tickets. Demandez, vous aurez une réponse franche.',
      primaryLabel: 'Obtenir de l’aide',
      primaryPath: '/support',
      secondaryLabel: 'Pourquoi Tiko existe',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Assistance',
    description:
      'Aide sur les applis Tiko pour les enfants, les accompagnants et les enseignants — sujets courants, dépannage et comment joindre une personne.',
    eyebrow: 'Assistance',
    title: 'Nous sommes là pour aider.',
    lede: 'Aide sur les applis Tiko pour les enfants, les accompagnants et les enseignants. La plupart des réponses sont ci-dessous — et une personne bien réelle est à un e-mail.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Sujets courants',
        title: 'Des réponses rapides pour commencer.',
        points: [
          {
            title: 'Premiers pas',
            body: 'Chaque appli Tiko s’ouvre immédiatement — ni compte ni mot de passe. Ouvrez le lien ou installez l’appli, et servez-vous en.',
          },
          {
            title: 'Comptes et appareils',
            body: 'Tiko utilise des sessions liées à l’appareil plutôt que des mots de passe. Si vous changez ou réinitialisez un appareil, ajoutez au préalable une adresse de récupération pour que votre contenu vous suive.',
          },
          {
            title: 'Voix et langues',
            body: 'Choisissez une voix et une langue qui conviennent à l’enfant. Les applis Tiko prennent en charge de nombreuses langues et changent instantanément depuis les réglages.',
          },
          {
            title: 'Usage hors ligne',
            body: 'Les applis continuent de fonctionner sans réseau après la première ouverture. La synchronisation reprend d’elle-même dès que la connexion revient.',
          },
          {
            title: 'Confidentialité et données',
            body: 'La plupart des applis ne stockent rien hors de l’appareil. Ce que vous créez reste local tant que vous n’activez pas délibérément la synchronisation.',
          },
          {
            title: 'Quelque chose ne marche pas ?',
            body: 'Dites-nous ce que vous avez vu, sur quel appareil et dans quelle appli. Cela nous suffit généralement pour le trouver.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Dépannage',
        title: 'Les trois gestes qui règlent la plupart des problèmes.',
        steps: [
          {
            title: 'Rechargez l’appli',
            body: 'Fermez-la complètement et rouvrez-la. Les applis web se mettent à jour en arrière-plan, et un rechargement récupère la dernière version.',
          },
          {
            title: 'Vérifiez la langue et la voix',
            body: 'Si la voix sonne faux ou reste muette, la voix choisie n’est peut-être pas installée sur l’appareil. Essayez-en une autre dans les réglages — sous iOS, les voix supplémentaires s’installent depuis les réglages d’accessibilité du système.',
          },
          {
            title: 'Vérifiez que l’appareil n’est pas en silencieux',
            body: 'Un bouton silencieux ou un onglet coupé explique plus de signalements « la voix ne marche plus » que tout le reste.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Contact',
        title: 'Parlez à une personne.',
        body: [
          'L’assistance est assurée par les personnes qui construisent Tiko, pas par une file d’attente. Il n’y a ni numéro de ticket ni niveaux de service — vous aurez une réponse franche, y compris quand la réponse est que quelque chose est cassé ou n’est pas prévu.',
          'Si vous signalez un problème, les éléments les plus utiles sont l’appli, l’appareil et la version du navigateur ou du système, ce que vous attendiez et ce qui s’est passé à la place. Une capture d’écran vaut mieux qu’une description.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Participer',
        title: 'Signaler, proposer ou contribuer.',
        body: [
          'Tiko est open source : un rapport de bug est vraiment utile et une pull request est bienvenue. La direction du projet vient largement de parents, de thérapeutes et d’enseignants qui décrivent ce qui manque — c’est bien plus juste qu’une feuille de route écrite sans eux.',
          'Si vous travaillez avec des enfants qui utilisent des outils de communication et que quelque chose ici cloche, nous préférons l’entendre.',
        ],
      },
    ],
    cta: {
      title: 'Lisez d’abord les réponses.',
      body: 'La FAQ couvre le coût, la confidentialité, les comptes et ce que Tiko ne fait délibérément pas.',
      primaryLabel: 'Lire la FAQ',
      primaryPath: '/faq',
      secondaryLabel: 'Comment ça marche',
      secondaryPath: '/how-it-works',
    },
  },
}
