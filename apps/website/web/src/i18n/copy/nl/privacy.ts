import type { SiteCopy } from '../..'

/** Nederlands privacybeleid. De ankers (`id`) blijven onvertaald. */
export const nlPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Privacybeleid',
  description: 'Hoe de Tiko-apps en tikotalks.com met gegevens omgaan, in gewone taal.',
  eyebrow: 'Privacybeleid',
  title: 'Wat we verzamelen, en wat niet.',
  lede: 'Tiko maakt rustige, toegankelijke apps voor kinderen. Privacy is geen bijzaak — het hoort bij het ontwerp. Dit beleid legt in gewone taal uit hoe de Tiko-apps en tikotalks.com met gegevens omgaan.',
  lastUpdatedLabel: 'Laatst bijgewerkt',
  lastUpdated: 'juni 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'Onze belofte',
      bullets: [
        'Gratis, altijd. We verkopen je gegevens of de aandacht van een kind nooit in ruil voor toegang.',
        'Geen advertenties. Nooit. Er zit geen reclame, geen tracking voor reclame en geen advertentienetwerk van derden in de Tiko-apps.',
        'Geen inlogmuur. De apps voor kinderen openen en werken zonder account.',
        'We verzamelen zo min mogelijk, en alleen wat een app echt nodig heeft om te werken.',
      ],
    },
    {
      id: 'device-first',
      title: 'Standaard op het toestel',
      body: [
        'Tiko-apps zijn gemaakt om op het toestel te werken. Je instellingen, opgeslagen zinnen, concepten en recente inhoud staan lokaal, zodat de apps snel blijven en offline bruikbaar zijn. Gebruik je een app zonder in te loggen, dan blijft die inhoud op je toestel.',
      ],
    },
    {
      id: 'accounts',
      title: 'Optionele accounts en synchronisatie',
      body: [
        'Tiko werkt met identiteit op basis van het toestel in plaats van wachtwoorden. Kies je ervoor om herstel voor verzorgers of synchronisatie tussen toestellen aan te zetten, dan bewaren we mogelijk een e-mailadres om je een inloglink te sturen en je toestellen te koppelen. Dat is altijd optioneel en altijd inzichtelijk — de app voor het kind begint nooit met het aanmaken van een account.',
      ],
    },
    {
      id: 'speech',
      title: 'Spraak en inhoud',
      body: [
        'Sommige apps, zoals Tiko Type en Tiko Talk, kunnen tekst hardop uitspreken. Om natuurlijke spraak te maken kan de tekst die je laat uitspreken naar onze spraakdienst gaan, waar hij alleen wordt verwerkt om audio terug te geven. We gebruiken die inhoud niet voor advertentieprofielen en we verkopen hem niet.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'Wat we niet doen',
      bullets: [
        'We tonen geen advertenties en gebruiken geen advertentietrackers.',
        'We verkopen of verhuren geen persoonsgegevens.',
        'We vragen een kind niet om een account of persoonlijke gegevens om een app te gebruiken.',
        'We doen geen medische, diagnostische of therapeutische beloftes, en we verzamelen daarvoor geen gezondheidsgegevens.',
      ],
    },
    {
      id: 'children',
      title: 'Privacy van kinderen',
      body: [
        'Tiko-apps zijn zo gemaakt dat je ze veilig naast een kind kunt openen. Omdat de apps werken zonder accounts en zonder advertenties, kan een kind ze gebruiken zonder persoonlijke gegevens te delen. Zet een verzorger optioneel herstel aan, dan horen die accountgegevens bij de verzorger, niet bij het kind.',
      ],
    },
    {
      id: 'retention',
      title: 'Bewaren en verwijderen',
      body: [
        'Lokaal opgeslagen inhoud blijft op het toestel tot je hem wist of de app verwijdert. Heb je een optioneel account aangemaakt, dan kun je ons altijd vragen dat account en de bijbehorende gegevens te verwijderen door te mailen naar {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Wijzigingen in dit beleid',
      body: [
        'Veranderen we iets aan hoe we met gegevens omgaan, dan werken we deze pagina bij en passen we de datum hierboven aan. Belangrijke wijzigingen maken we duidelijk.',
      ],
    },
    {
      id: 'contact',
      title: 'Neem contact op',
      body: [
        'Vragen over privacy of je gegevens? Mail naar {email} en een echt mens helpt je verder.',
      ],
    },
  ],
}
