import type { SiteCopy } from '../..'

/** Politique de confidentialité en français. Les ancres (`id`) restent non traduites. */
export const frPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Politique de confidentialité',
  description: 'Comment les applis Tiko et tikotalks.com traitent les données, en langage clair.',
  eyebrow: 'Politique de confidentialité',
  title: 'Ce que nous collectons, et ce que nous ne collectons pas.',
  lede: 'Tiko crée des applis calmes et accessibles pour les enfants. La confidentialité n’est pas une réflexion après coup : elle fait partie de la conception. Cette politique explique en langage clair comment les applis Tiko et tikotalks.com traitent les données.',
  lastUpdatedLabel: 'Dernière mise à jour',
  lastUpdated: 'juin 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'Notre promesse',
      bullets: [
        'Gratuit, toujours. Nous ne vendons jamais vos données ni l’attention d’un enfant contre un accès.',
        'Aucune publicité. Jamais. Les applis Tiko ne contiennent ni publicité, ni pistage publicitaire, ni régie tierce.',
        'Aucun mur de connexion. Les applis destinées aux enfants s’ouvrent et fonctionnent sans compte.',
        'Nous collectons le moins possible, et uniquement ce dont une appli a réellement besoin pour fonctionner.',
      ],
    },
    {
      id: 'device-first',
      title: 'Sur l’appareil par défaut',
      body: [
        'Les applis Tiko sont conçues pour fonctionner sur l’appareil. Vos réglages, phrases enregistrées, brouillons et contenus récents sont stockés localement pour que les applis restent rapides et utilisables hors ligne. Si vous utilisez une appli sans vous connecter, ce contenu reste sur votre appareil.',
      ],
    },
    {
      id: 'accounts',
      title: 'Comptes et synchronisation facultatifs',
      body: [
        'Tiko utilise une identité liée à l’appareil plutôt que des mots de passe. Si vous choisissez d’activer la récupération pour l’accompagnant ou la synchronisation entre appareils, nous pouvons conserver une adresse e-mail afin de vous envoyer un lien de connexion et de relier vos appareils. C’est toujours facultatif et toujours transparent — l’appli destinée à l’enfant ne commence jamais par la création d’un compte.',
      ],
    },
    {
      id: 'speech',
      title: 'Voix et contenus',
      body: [
        'Certaines applis, comme Tiko Type et Tiko Talk, peuvent lire du texte à voix haute. Pour produire une voix naturelle, le texte que vous demandez à faire lire peut être envoyé à notre service vocal et traité uniquement pour renvoyer de l’audio. Nous n’utilisons pas ce contenu pour constituer des profils publicitaires et nous ne le vendons pas.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'Ce que nous ne faisons pas',
      bullets: [
        'Nous n’affichons pas de publicité et n’utilisons pas de traqueurs publicitaires.',
        'Nous ne vendons ni ne louons de données personnelles.',
        'Nous n’exigeons pas qu’un enfant crée un compte ou communique des informations personnelles pour utiliser une appli.',
        'Nous ne faisons aucune promesse médicale, diagnostique ou thérapeutique, et nous ne collectons pas de données de santé à ces fins.',
      ],
    },
    {
      id: 'children',
      title: 'Vie privée des enfants',
      body: [
        'Les applis Tiko sont conçues pour être ouvertes sans crainte à côté d’un enfant. Comme elles fonctionnent sans compte et sans publicité, un enfant peut s’en servir sans partager d’informations personnelles. Lorsqu’un accompagnant choisit d’activer la récupération facultative, ces informations de compte appartiennent à l’accompagnant, pas à l’enfant.',
      ],
    },
    {
      id: 'retention',
      title: 'Conservation et suppression',
      body: [
        'Le contenu stocké localement reste sur l’appareil jusqu’à ce que vous l’effaciez ou supprimiez l’appli. Si vous avez créé un compte facultatif, vous pouvez à tout moment nous demander de le supprimer, ainsi que les données associées, en écrivant à {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Modifications de cette politique',
      body: [
        'Si nous changeons notre façon de traiter les données, nous mettrons cette page à jour et modifierons la date ci-dessus. Les changements importants seront signalés clairement.',
      ],
    },
    {
      id: 'contact',
      title: 'Nous contacter',
      body: [
        'Des questions sur la confidentialité ou vos données ? Écrivez à {email} et une personne bien réelle vous répondra.',
      ],
    },
  ],
}
