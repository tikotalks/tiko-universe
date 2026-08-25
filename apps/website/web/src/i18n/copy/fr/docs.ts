import type { SiteCopy } from '../..'

/**
 * Documentation développeur en français.
 *
 * Les noms de services, les chemins et les exemples de code ne sont pas
 * traduits : ce sont des adresses, pas de la prose. Les exemples de code
 * n’apparaissent donc pas ici — ils reviennent à l’anglais, ce qui est voulu.
 */
export const frDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Pages de documentation',
  articleEyebrow: 'Documentation de la plateforme Tiko',
  pages: {
    'docs-overview': {
      label: 'Vue d’ensemble',
      title: 'Documentation de Tiko Universe',
      lede: 'L’architecture, la philosophie produit et la carte des API de la plateforme Tiko.',
      summary: 'Un point d’entrée public et lisible sur la façon dont Tiko est construit et sur la forme du système.',
      callouts: [
        {
          title: 'De petites applis, une plateforme commune',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media et les futures applis réutilisent les mêmes contrats d’identité, d’état, de contenu, de médias, de génération et d’interface.',
        },
        {
          title: 'API d’abord, natif Cloudflare',
          body: 'Les clients sont volontairement légers. L’autorité réside dans les Cloudflare Workers avec D1, R2, KV comme cache et Queues là où le travail asynchrone s’impose.',
        },
        {
          title: 'Pas de formalités de compte d’abord',
          body: 'Un outil destiné à un enfant doit s’ouvrir et être utile avant que la récupération, la synchronisation ou l’administration apparaissent.',
        },
      ],
      sections: [
        {
          eyebrow: 'Ce que cela couvre',
          title: 'Une carte pratique pour celles et ceux qui construisent',
          body: [
            'Cette documentation explique Tiko en tant que produit et en tant que plateforme backend. Ce n’est ni un discours marketing ni un dépotoir de détails d’implémentation.',
            'La règle importante est simple : si un comportement touche les clients web, iOS ou Android, il doit figurer dans un contrat d’API documenté avant de devenir de la logique client cachée.',
          ],
          bullets: [
            'Philosophie : principes produit centrés sur l’enfant et contraintes techniques.',
            'Architecture : applis, packages, Workers, propriété du stockage, domaines et frontières de déploiement.',
            'API : les familles de contrats actuelles et les formes stables sur lesquelles les clients peuvent compter.',
          ],
        },
        {
          eyebrow: 'Forme actuelle de la plateforme',
          title: 'Un dépôt, des responsabilités claires',
          body: [
            'Tiko Universe est un monorepo en npm workspaces : des applis par produit, des packages TypeScript partagés et des services Cloudflare Worker. Le code natif iOS vit à côté de son produit là où il existe ; Android suit les mêmes contrats d’API au lieu de copier la logique backend dans le client.',
          ],
          bullets: [
            'Applis : outils destinés aux enfants et surfaces publiques ou d’administration qui les accompagnent.',
            'Packages : clients typés, contrats partagés, Tiko UI, i18n, médias, identité et utilitaires de test.',
            'Workers : identité, état des applis, contenu, médias, génération, administration et compatibilité TTS temporaire.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Philosophie',
      title: 'Philosophie produit et technique',
      lede: 'Tiko est un logiciel qui pense d’abord à l’enfant. Le backend existe pour que le moment vécu par l’enfant reste immédiat, calme et récupérable, sans devenir du logiciel d’entreprise.',
      summary: 'Les principes non négociables derrière chaque choix d’architecture.',
      callouts: [
        { title: 'Immédiat', body: 'Les applis s’ouvrent et fonctionnent immédiatement. Le premier écran n’est jamais un formulaire de connexion.' },
        { title: 'Petit', body: 'Chaque appli fait une chose claire au lieu de devenir un tableau de bord.' },
        { title: 'Récupérable', body: 'Les sessions liées à l’appareil peuvent devenir récupérables plus tard via un lien magique par e-mail.' },
      ],
      sections: [
        {
          eyebrow: 'Doctrine',
          title: 'Ce qui ne se négocie pas',
          body: [
            'La doctrine est volontairement stricte, parce que « juste une exception » donne six mois plus tard une plateforme que plus personne ne comprend. Tiko l’évite en gardant l’identité, les API et la propriété du stockage ennuyeuses et explicites.',
          ],
          bullets: [
            'Pas de mots de passe et pas de mur de connexion avant l’usage.',
            'Pas de runtime Supabase, pas de pont pour anciens utilisateurs, pas d’obligation de migration, pas d’hypothèse Better Auth.',
            'Identité liée à l’appareil par défaut ; récupération facultative par e-mail via des liens magiques.',
            'D1 est la source de vérité relationnelle. R2 est la source de vérité des octets. KV n’est qu’un cache.',
            'Lezu gère les traductions ; Tiko consomme des bundles et des replis versionnés.',
            'Web, iOS et Android sont des clients égaux des mêmes API HTTPS JSON.',
          ],
        },
        {
          eyebrow: 'Modèle produit',
          title: 'Pourquoi de petites applis',
          body: [
            'Tiko n’est pas une grande « plateforme pour besoins particuliers » avec un labyrinthe de fonctions. C’est un univers de petits outils ciblés que l’on ouvre au moment où un enfant ou un accompagnant a besoin d’une chose.',
            'Des outils séparés réduisent la charge cognitive, gardent les zones tactiles évidentes et permettent de vérifier si un outil aide avant de demander à un accompagnant de faire confiance à la synchronisation, à la récupération ou à l’administration.',
          ],
          bullets: [
            'Yes No : réponses rapides à deux choix.',
            'Type : saisie de texte et sortie vocale.',
            'Cards : choix visuels et contenus familiers.',
            'Sequence : routines ordonnées et étapes suivantes.',
            'Timer : rendre le temps visible et accompagner les transitions.',
          ],
        },
        {
          eyebrow: 'Modèle technique',
          title: 'Les contrats avant les clients',
          body: [
            'Le code client a le droit d’être agréable et robuste. Il n’a pas le droit de devenir secrètement le backend. Si un comportement a de l’autorité, de la persistance, des secrets de fournisseur ou des effets multi-appareils, il appartient à un Worker et à un contrat documenté.',
          ],
          bullets: [
            'Les packages exposent des clients typés, des modèles, des fixtures et la composition d’interface.',
            'Les Workers possèdent l’authentification, les limites de débit, l’accès à D1/R2/KV/Queues, les appels fournisseurs et les mutations durables.',
            'Les applis peuvent garder un état local de repli pour que le parcours de l’enfant reste utilisable si un appel réseau échoue.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Architecture',
      title: 'Architecture',
      lede: 'Tiko est une plateforme native Cloudflare : des applis par produit, des packages client partagés, des Workers comme services de domaine, D1/R2 pour l’état durable, et KV uniquement comme cache.',
      summary: 'Comment le monorepo, les domaines, le stockage, les workers et les clients s’assemblent.',
      callouts: [
        { title: 'Clients', body: 'Les applis web Vue, les applis iOS SwiftUI et les futurs clients Android consomment les mêmes contrats d’API.' },
        { title: 'Services', body: 'Les Workers sont découpés par frontière de domaine, pas par le fichier qui a existé en premier.' },
        { title: 'Stockage', body: 'D1 possède la vérité relationnelle. R2 possède les octets. KV est un cache reconstructible.' },
      ],
      sections: [
        {
          eyebrow: 'Carte du système',
          title: 'Le flux général',
          body: [
            'L’architecture est volontairement banale. Les clients parlent via des API HTTPS JSON. Les Workers valident l’identité et possèdent les mutations. Le stockage est lié au Worker qui possède le domaine.',
          ],
        },
        {
          eyebrow: 'Dépôt',
          title: 'Un monorepo qui met le produit d’abord',
          body: [
            'Le dépôt est organisé d’abord par produits, puis par packages de plateforme et Workers. Le contexte d’une appli destinée aux enfants reste ainsi proche de ses implémentations web et natives, tout en partageant les contrats via les packages.',
          ],
          bullets: [
            '`apps/<product>/web` contient les applis Vue déployées sur Cloudflare Pages.',
            '`apps/<product>/ios` contient les clients SwiftUI là où un travail natif existe.',
            '`packages/*` contient les contrats TypeScript partagés, les clients, Tiko UI, i18n, médias, identité et utilitaires de test.',
            '`workers/*` contient les services Cloudflare Worker avec leurs propres bindings D1/R2 et leurs tests.',
          ],
        },
        {
          eyebrow: 'Frontières de service',
          title: 'Responsabilité de chaque Worker',
          body: [
            'Chaque Worker a une tâche étroite. Cela rend l’autorisation, les migrations, la limitation de débit et le risque de déploiement plus faciles à raisonner.',
          ],
          bullets: [
            '`identity-api` : sujets Ankore, appareils, sessions, comptes et défis par e-mail.',
            '`app-api` : réglages et état des applis par utilisateur.',
            '`content-api` : contenus publiés, enregistrements de type CMS et modèles de lecture cacheables.',
            '`media-api` : autorisation d’upload, métadonnées des médias, propriété et accès R2.',
            '`generation-api` : TTS, génération de phrases et d’images, métadonnées des médias générés et futures queues.',
            '`admin-api` : opérations dangereuses réservées à l’administration, rapports, modération et outils de support.',
            '`tts-api` : surface de compatibilité temporaire destinée à rejoindre generation-api.',
          ],
        },
        {
          eyebrow: 'Domaines',
          title: 'Routes publiques',
          body: [
            'Les domaines font partie de l’architecture. Les nouveaux noms d’hôtes au hasard sont exactement ce qui transforme une plateforme en archéologie.',
          ],
          bullets: [
            '`tiko.mt` : accueil produit et marketing public.',
            '`tikotalks.com` : la surface publique TikoTalks pour la documentation et la marque — ces pages, donc.',
            '`*.tikoapps.org` : la famille des applis en fonctionnement, comme yesno, type, cards, sequence, timer, media et admin.',
            '`id.tiko.mt` : origine d’identité liée à l’appareil (ancien alias de `identity.tikoapi.org`).',
            '`*.tikoapi.org` : la famille des API — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` et `translations` ont chacune leur sous-domaine.',
            '`*.tikocdn.org` : livraison d’octets uniquement, pas de logique applicative.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API',
      title: 'Contrats d’API',
      lede: 'Les API sont la colonne vertébrale du produit. Elles permettent aux clients web, iOS et Android de se comporter de la même façon sans copier la logique backend dans chaque appli.',
      summary: 'Un guide lisible des familles de contrats `/v1` actuelles.',
      callouts: [
        { title: 'Versionné', body: 'Les API visibles des clients vivent sous `/v1` et renvoient du JSON, sauf les points de terminaison qui streament des octets.' },
        { title: 'Erreurs typées', body: 'Les erreurs utilisent des codes stables lisibles par machine et des messages sûrs pour les humains.' },
        { title: 'Compatible bearer', body: 'Les clients natifs doivent fonctionner avec des sessions bearer explicites ; les cookies de navigateur ne suffisent pas.' },
      ],
      sections: [
        {
          eyebrow: 'Règles communes',
          title: 'Règles de contrat',
          body: [
            'La forme de l’API doit rester ennuyeuse. C’est un compliment. Des routes prévisibles et des enveloppes d’erreur constantes empêchent plusieurs clients de diverger.',
          ],
          bullets: [
            'Utiliser des chemins `/v1`.',
            'Renvoyer du JSON depuis les routes d’API ; ne streamer des octets que depuis des routes médias ou audio explicites.',
            'Utiliser l’authentification par session bearer pour la parité native.',
            'Ne jamais révéler si une adresse de récupération ou un identifiant existe.',
            'Ne stocker les jetons bruts que côté client ; le serveur conserve des empreintes.',
            'Ne pas exposer aux clients les corps d’erreur des fournisseurs.',
          ],
        },
        {
          eyebrow: 'Identité',
          title: 'API d’identité liée à l’appareil',
          body: [
            'L’identité existe pour que les applis s’ouvrent immédiatement tout en devenant récupérables plus tard. Le bootstrap crée ou restaure une session d’appareil ; la récupération par e-mail améliore la continuité sans transformer le démarrage en connexion.',
          ],
          bullets: [
            '`POST /v1/identity/device` — créer ou restaurer une session liée à l’appareil.',
            '`GET /v1/identity/session` — valider et renvoyer le bundle de session courant.',
            '`POST /v1/identity/email/challenge` — demander un défi de récupération par e-mail, avec une réponse générique.',
            '`POST /v1/identity/email/verify` — vérifier un jeton de lien magique ou un OTP et renvoyer un bundle d’identité Ankore.',
            '`POST /v1/identity/logout` — révoquer la session bearer courante.',
          ],
        },
        {
          eyebrow: 'Données d’appli',
          title: 'API de réglages et d’état',
          body: [
            'L’API app possède les réglages et l’état par utilisateur des petites applis Tiko. Les réglages sont des préférences visibles par l’accompagnant. L’état est la donnée propre à l’appli qu’il vaut la peine de conserver d’un appareil à l’autre lorsque c’est intentionnel.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — lire les réglages.',
            '`PUT /v1/apps/{app}/settings` — enregistrer les réglages avec gestion de version.',
            '`GET /v1/apps/{app}/state` — lire l’état de l’appli.',
            '`PUT /v1/apps/{app}/state` — enregistrer l’état de l’appli.',
            'Noms d’applis P0 autorisés : `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Génération et médias',
          title: 'TTS, audio généré, uploads et enregistrements médias',
          body: [
            'La génération et les médias sont liés mais ne sont pas la même chose. La génération crée des ressources. Les médias gèrent les ressources déposées et leurs métadonnées. R2 stocke les octets ; D1 stocke la propriété et les métadonnées de recherche.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — générer ou récupérer en cache un audio de synthèse vocale.',
            '`GET /v1/generation/audio/{id}` — streamer les octets audio générés.',
            '`POST /v1/media/uploads` — autoriser et enregistrer un dépôt de média.',
            '`GET /v1/media/{id}` — lire les métadonnées ou les détails d’accès d’un média.',
            '`DELETE /v1/media/{id}` — futur contrat de suppression, quand l’expérience produit existera.',
          ],
        },
        {
          eyebrow: 'Contenu et administration',
          title: 'Contenus publiés et opérations dangereuses',
          body: [
            'Le contenu concerne les modèles de lecture publiés, les contenus d’applis et les enregistrements de type CMS. L’administration est délibérément séparée, parce que des opérations dangereuses ne devraient jamais être glissées dans des API utilisées par des enfants.',
          ],
          bullets: [
            '`content-api` possède les contenus publiés, la visibilité des applis, les versions de contenu et les modèles de lecture cacheables.',
            '`admin-api` possède la configuration back-office, les rapports, la modération, les actions de support et les journaux d’audit.',
            'Les clés ou sessions de l’API d’administration n’ont pas leur place dans les parcours destinés aux enfants.',
          ],
        },
      ],
    },
  },
}
