import type { SiteCopy } from '../..'

/**
 * Nederlandse documentatie voor bouwers.
 *
 * Namen van diensten, paden en codevoorbeelden blijven onvertaald: dat zijn
 * adressen, geen proza. Codevoorbeelden staan hier daarom niet — die vallen
 * terug op het Engels, wat de bedoeling is.
 */
export const nlDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Documentatiepagina’s',
  articleEyebrow: 'Tiko-platformdocumentatie',
  pages: {
    'docs-overview': {
      label: 'Overzicht',
      title: 'Tiko Universe-documentatie',
      lede: 'De architectuur, de productfilosofie en de API-kaart van het opgeschoonde Tiko-platform.',
      summary: 'Een openbaar, leesbaar startpunt voor hoe Tiko gebouwd is en waarom het systeem deze vorm heeft.',
      callouts: [
        {
          title: 'Kleine apps, gedeeld platform',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media en toekomstige apps hergebruiken allemaal dezelfde afspraken voor identiteit, state, content, media, generatie en UI.',
        },
        {
          title: 'API eerst, Cloudflare-native',
          body: 'Clients zijn bewust dun. Het gezag zit in Cloudflare Workers met D1, R2, KV als cache en Queues waar asynchroon werk nodig wordt.',
        },
        {
          title: 'Geen accountgedoe vooraf',
          body: 'Een app voor een kind moet openen en bruikbaar zijn vóórdat herstel, synchronisatie of beheerfuncties in beeld komen.',
        },
      ],
      sections: [
        {
          eyebrow: 'Wat hier staat',
          title: 'Een praktische kaart voor bouwers',
          body: [
            'Deze documentatie legt Tiko uit als product en als backendplatform. Het is geen marketingtekst en ook geen stortplaats voor implementatiedetails.',
            'De belangrijkste regel is eenvoudig: raakt gedrag de web-, iOS- of Android-clients, dan hoort het in een vastgelegde API-afspraak voordat het verborgen clientlogica wordt.',
          ],
          bullets: [
            'Filosofie: kindgerichte productuitgangspunten en technische beperkingen.',
            'Architectuur: apps, packages, Workers, eigenaarschap van opslag, domeinen en deploygrenzen.',
            'API’s: de huidige contractfamilies en de stabiele vormen waar clients op mogen rekenen.',
          ],
        },
        {
          eyebrow: 'Huidige vorm van het platform',
          title: 'Één repo, duidelijk eigenaarschap',
          body: [
            'Tiko Universe is een monorepo met npm-workspaces: apps per product, gedeelde TypeScript-packages en Cloudflare Worker-services. Native iOS-code staat naast het product waar die bestaat; Android volgt dezelfde API-afspraken in plaats van backendlogica in de client te kopiëren.',
          ],
          bullets: [
            'Apps: apps voor kinderen plus ondersteunende publieke en beheerschermen.',
            'Packages: getypeerde clients, gedeelde contracten, Tiko UI, i18n, media, identiteit en testhulpmiddelen.',
            'Workers: identiteit, app-state, content, media, generatie, beheer en tijdelijke TTS-compatibiliteit.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Filosofie',
      title: 'Product- en engineeringfilosofie',
      lede: 'Tiko is software die het kind vooropstelt. De backend bestaat om het moment voor het kind direct, rustig en herstelbaar te houden, zonder er zakelijke software van te maken.',
      summary: 'De harde uitgangspunten achter elke architectuurkeuze.',
      callouts: [
        { title: 'Direct', body: 'Apps openen en werken meteen. Het eerste scherm is nooit een inlogformulier.' },
        { title: 'Klein', body: 'Elke app doet één duidelijk ding in plaats van uit te groeien tot een bedieningspaneel.' },
        { title: 'Herstelbaar', body: 'Sessies op het toestel kunnen later herstelbaar worden via een e-maillink voor de verzorger.' },
      ],
      sections: [
        {
          eyebrow: 'Uitgangspunten',
          title: 'Waar niet over onderhandeld wordt',
          body: [
            'De uitgangspunten zijn met opzet streng, omdat “heel even een uitzondering” zes maanden later een platform oplevert dat niemand meer begrijpt. Tiko voorkomt dat door identiteit, API’s en eigenaarschap van opslag saai en expliciet te houden.',
          ],
          bullets: [
            'Geen wachtwoorden en geen inlogmuur vóór gebruik.',
            'Geen Supabase-runtime, geen brug voor oude gebruikers, geen migratieplicht en geen aanname van Better Auth.',
            'Standaard identiteit op het toestel; optioneel later e-mailherstel via magic links.',
            'D1 is de relationele bron van waarheid. R2 is de bron van waarheid voor bytes. KV is alleen cache.',
            'Lezu beheert vertalingen; Tiko gebruikt bundels en ingecheckte fallbacks.',
            'Web, iOS en Android zijn gelijkwaardige clients van dezelfde HTTPS-JSON-API’s.',
          ],
        },
        {
          eyebrow: 'Productmodel',
          title: 'Waarom kleine apps',
          body: [
            'Tiko is geen groot “platform voor bijzondere behoeften” met een doolhof aan functies. Het is een universum van kleine, gerichte apps die je opent op het moment dat een kind of verzorger één ding nodig heeft.',
            'Losse apps verlagen de belasting, houden de aanraakvlakken duidelijk en maken het makkelijker om te toetsen of een app helpt, voordat je een verzorger vraagt te vertrouwen op synchronisatie, herstel of beheer.',
          ],
          bullets: [
            'Yes No: snelle antwoorden met twee keuzes.',
            'Type: tekst invoeren en laten uitspreken.',
            'Cards: visuele keuzes en vertrouwde inhoud.',
            'Sequence: geordende routines en volgende stappen.',
            'Timer: tijd zichtbaar maken en overgangen begeleiden.',
          ],
        },
        {
          eyebrow: 'Engineeringmodel',
          title: 'Eerst contracten, dan clients',
          body: [
            'Clientcode mag prettig en robuust zijn. Wat niet mag, is stiekem de backend worden. Heeft gedrag gezag, opslag, providergeheimen of effect op meerdere toestellen, dan hoort het in een Worker met een vastgelegd contract.',
          ],
          bullets: [
            'Packages leveren getypeerde clients, modellen, fixtures en UI-samenstelling.',
            'Workers bezitten authenticatie, rate limits, toegang tot D1/R2/KV/Queues, providercalls en blijvende mutaties.',
            'Apps mogen lokale fallback-state bijhouden zodat het kindgedeelte bruikbaar blijft als een netwerkaanroep mislukt.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Architectuur',
      title: 'Architectuur',
      lede: 'Tiko is een Cloudflare-native platform: apps per product, gedeelde clientpackages, Workers als domeindiensten, D1/R2 voor blijvende state, en KV alleen als cache.',
      summary: 'Hoe de monorepo, domeinen, opslag, workers en clients in elkaar passen.',
      callouts: [
        { title: 'Clients', body: 'Vue-webapps, SwiftUI-apps voor iOS en toekomstige Android-clients gebruiken dezelfde API-afspraken.' },
        { title: 'Diensten', body: 'Workers zijn opgesplitst per domeingrens, niet per bestand dat toevallig het eerst bestond.' },
        { title: 'Opslag', body: 'D1 bezit de relationele waarheid. R2 bezit de bytes. KV is herbouwbare cache.' },
      ],
      sections: [
        {
          eyebrow: 'Systeemkaart',
          title: 'Op hoofdlijnen',
          body: [
            'De architectuur is bewust gewoon. Clients praten via HTTPS-JSON-API’s. Workers controleren identiteit en bezitten de mutaties. Opslag hoort bij de Worker die het domein bezit.',
          ],
        },
        {
          eyebrow: 'Repository',
          title: 'Monorepo met het product voorop',
          body: [
            'De repo is eerst geordend op producten, daarna op platformpackages en Workers. Zo blijft de context van een kindgerichte app dicht bij de web- en native-implementatie, terwijl contracten via packages gedeeld worden.',
          ],
          bullets: [
            '`apps/<product>/web` bevat Vue-apps die naar Cloudflare Pages gaan.',
            '`apps/<product>/ios` bevat SwiftUI-clients waar native werk bestaat.',
            '`packages/*` bevat gedeelde TypeScript-contracten, clients, Tiko UI, i18n, media, identiteit en testhulpmiddelen.',
            '`workers/*` bevat Cloudflare Worker-services met hun eigen D1/R2-bindings en tests.',
          ],
        },
        {
          eyebrow: 'Dienstgrenzen',
          title: 'Eigenaarschap per Worker',
          body: [
            'Elke Worker heeft een smalle taak. Dat maakt autorisatie, migraties, rate limiting en deployrisico beter te overzien.',
          ],
          bullets: [
            '`identity-api`: Ankore-subjecten, toestellen, sessies, accounts en e-mailuitdagingen.',
            '`app-api`: app-instellingen en app-state per gebruiker.',
            '`content-api`: gepubliceerde content, cms-achtige records en cachebare leesmodellen.',
            '`media-api`: uploadautorisatie, mediametadata, eigenaarschap en R2-toegang.',
            '`generation-api`: TTS, zins- en beeldgeneratie, metadata van gegenereerde media en toekomstige queues.',
            '`admin-api`: gevaarlijke handelingen alleen voor beheer, rapportages, moderatie en supporttooling.',
            '`tts-api`: tijdelijk compatibiliteitsoppervlak dat in generation-api moet opgaan.',
          ],
        },
        {
          eyebrow: 'Domeinen',
          title: 'Publieke routes',
          body: [
            'Domeinen horen bij de architectuur. Willekeurige nieuwe hostnamen zijn precies hoe platformen in archeologie veranderen.',
          ],
          bullets: [
            '`tiko.mt`: publieke product- en marketinghome.',
            '`tikotalks.com`: het publieke TikoTalks-oppervlak voor documentatie en merk — deze pagina’s dus.',
            '`*.tikoapps.org`: de familie draaiende apps, zoals yesno, type, cards, sequence, timer, media en admin.',
            '`id.tiko.mt`: identiteitsorigin op basis van het toestel (oude alias van `identity.tikoapi.org`).',
            '`*.tikoapi.org`: de API-familie — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` en `translations` hebben elk hun eigen subdomein.',
            '`*.tikocdn.org`: alleen het afleveren van bytes, geen applicatielogica.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API’s',
      title: 'API-contracten',
      lede: 'De API’s zijn de ruggengraat van het product. Ze laten web-, iOS- en Android-clients hetzelfde gedragen zonder backendlogica in elke app te kopiëren.',
      summary: 'Een leesbare gids door de huidige `/v1`-contractfamilies.',
      callouts: [
        { title: 'Met versie', body: 'API’s die clients zien staan onder `/v1` en geven JSON terug, behalve endpoints die bytes streamen.' },
        { title: 'Getypeerde fouten', body: 'Fouten gebruiken stabiele, machineleesbare codes en veilige teksten voor mensen.' },
        { title: 'Bearer-vriendelijk', body: 'Native clients moeten met expliciete bearer-sessies werken; alleen browsercookies is niet genoeg.' },
      ],
      sections: [
        {
          eyebrow: 'Gedeelde API-regels',
          title: 'Contractregels',
          body: [
            'De vorm van de API mag saai blijven. Dat is een compliment. Voorspelbare routes en foutstructuren houden meerdere clients bij elkaar.',
          ],
          bullets: [
            'Gebruik `/v1`-paden.',
            'Geef JSON terug uit API-routes; stream alleen bytes uit expliciete media- of audioroutes.',
            'Gebruik bearer-sessies zodat native clients gelijkwaardig zijn.',
            'Verklap nooit of een herstel-e-mailadres of handle bestaat.',
            'Bewaar ruwe tokens alleen op de client; de server bewaart hashes.',
            'Geef foutmeldingen van providers niet door aan clients.',
          ],
        },
        {
          eyebrow: 'Identiteit',
          title: 'Identiteits-API op basis van het toestel',
          body: [
            'Identiteit bestaat zodat apps meteen kunnen openen en later toch herstelbaar worden. Bootstrap maakt of herstelt een toestelsessie; e-mailherstel verbetert de continuïteit zonder dat opstarten inloggen wordt.',
          ],
          bullets: [
            '`POST /v1/identity/device` — maak of herstel een sessie op basis van het toestel.',
            '`GET /v1/identity/session` — controleer de huidige sessie en geef de bundel terug.',
            '`POST /v1/identity/email/challenge` — vraag een herstel-e-mail aan, met een generiek antwoord.',
            '`POST /v1/identity/email/verify` — controleer een magic-linktoken of OTP en geef een Ankore-identiteitsbundel terug.',
            '`POST /v1/identity/logout` — trek de huidige bearer-sessie in.',
          ],
        },
        {
          eyebrow: 'Appgegevens',
          title: 'API voor instellingen en state',
          body: [
            'De app-API bezit instellingen en state per gebruiker voor de kleine Tiko-apps. Instellingen zijn voorkeuren die de verzorger ziet. State is de app-specifieke data die het waard is om tussen toestellen te bewaren wanneer dat bewust gebeurt.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — instellingen lezen.',
            '`PUT /v1/apps/{app}/settings` — instellingen opslaan, met versiebeheer.',
            '`GET /v1/apps/{app}/state` — app-state lezen.',
            '`PUT /v1/apps/{app}/state` — app-state opslaan.',
            'Toegestane P0-appnamen: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Generatie en media',
          title: 'TTS, gegenereerde audio, uploads en mediarecords',
          body: [
            'Generatie en media horen bij elkaar maar zijn niet hetzelfde. Generatie maakt bestanden. Media beheert geüploade bestanden en metadata. R2 bewaart de bytes; D1 bewaart eigenaarschap en zoekgegevens.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — genereer of haal gecachte spraakaudio op.',
            '`GET /v1/generation/audio/{id}` — stream gegenereerde audio.',
            '`POST /v1/media/uploads` — autoriseer en registreer een media-upload.',
            '`GET /v1/media/{id}` — lees mediametadata of toegangsgegevens.',
            '`DELETE /v1/media/{id}` — toekomstig verwijdercontract zodra de UX bestaat.',
          ],
        },
        {
          eyebrow: 'Content en beheer',
          title: 'Gepubliceerde content en gevaarlijke handelingen',
          body: [
            'Content gaat over gepubliceerde leesmodellen, appcontent en cms-achtige records. Beheer staat er bewust los van, omdat gevaarlijke handelingen nooit binnengesmokkeld mogen worden in API’s die kinderen gebruiken.',
          ],
          bullets: [
            '`content-api` bezit gepubliceerde content, zichtbaarheid van apps, contentversies en cachebare leesmodellen.',
            '`admin-api` bezit backofficeconfiguratie, rapportages, moderatie, supportacties en auditlogs.',
            'Beheersleutels of -sessies horen niet thuis in stromen die kinderen gebruiken.',
          ],
        },
      ],
    },
  },
}
