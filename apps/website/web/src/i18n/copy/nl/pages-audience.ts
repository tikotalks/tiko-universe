import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** Dutch copy for the audience-facing and help pages. */
export const nlAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Voor verzorgers',
    description:
      'Wat Tiko belooft aan ouders en verzorgers: geen account vooraf, geen advertenties, geen tracking, en middelen die je op een moeilijk moment kunt proberen zonder voorbereiding.',
    eyebrow: 'Voor verzorgers',
    title: 'Zo gebouwd dat het eerste moment geen formulier is.',
    lede: 'Je moet iets kunnen proberen voordat je het vertrouwt. Tiko is zo gemaakt dat een verzorger een app kan openen, kan zien of het helpt, en pas herstel of synchronisatie toevoegt wanneer dat er echt toe doet.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Uitgangspunten',
        title: 'Waar we niet vanaf wijken.',
        lede: 'Dit zijn beloftes, geen huidige instellingen. Ze veranderen niet als de omstandigheden veranderen.',
        points: [
          {
            title: 'Altijd gratis',
            body: 'We verkopen je gegevens of de aandacht van een kind nooit in ruil voor toegang. De apps zijn gratis omdat geld vragen voor communicatie de verkeerde ruil is.',
          },
          {
            title: 'Nooit advertenties',
            body: 'Er zit geen reclame, geen tracking voor reclame en geen advertentienetwerk van derden in welke Tiko-app dan ook.',
          },
          {
            title: 'Geen inlogmuren',
            body: 'De apps voor kinderen openen en werken zonder account. Niets staat tussen een kind en begrepen worden.',
          },
          {
            title: 'Zo min mogelijk',
            body: 'We verzamelen alleen wat een app echt nodig heeft om te werken, en de meeste Tiko-apps hebben helemaal niets nodig.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Beginnen',
        title: 'Je hoeft je niet voor te bereiden.',
        body: [
          'Er is geen juiste manier om te beginnen en niets om eerst in te stellen. Open de app die past bij het moment waar je nú in zit — een vraag die beantwoord moet worden, een routine die door moet, een woord om te oefenen — en gebruik hem. Helpt het niet, dan sluit je hem. Er is niets uitgegeven en niets aangemeld.',
          'De meeste verzorgers vinden één app die past en blijven daar lang bij. Dat is een goede uitkomst, geen beperkte. Tiko probeert niet de plek te worden waar je kind zijn dag doorbrengt.',
        ],
        steps: [
          {
            title: 'Begin bij het moment, niet bij de app',
            body: 'Kies de app die past bij iets van vandaag. Yes No voor een vraag, First voor een routine, Type voor een bericht dat eruit moet.',
          },
          {
            title: 'Gebruik hem naast je kind',
            body: 'Dit zijn middelen voor twee mensen. Ernaast zitten en een tik of een zin voordoen werkt beter dan een apparaat overhandigen.',
          },
          {
            title: 'Maak hem eigen',
            body: 'Zet er je eigen foto\'s, je eigen woorden en je eigen routine in. Een foto van de échte schoenen van je kind werkt beter dan een pictogram van schoenen.',
          },
          {
            title: 'Voeg herstel alleen toe als je het wilt',
            body: 'Moeten instellingen meegaan naar een ander apparaat, voeg dan eenmalig een e-mailadres toe. Zo niet, sla het over — er verandert verder niets.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Eerlijk zijn',
        title: 'Wat Tiko wel en niet doet.',
        body: [
          'Tiko stelt geen diagnoses, behandelt niet en belooft geen resultaten. Het vertelt je niet of je kind vooruitgaat, en houdt bewust geen scores bij die zouden suggereren dat het dat kan. Wil je een onderzoek, dan is dat werk voor een logopedist, en een goede is veel meer waard dan welke app dan ook.',
          'Wat Tiko wél kan is drempels weghalen op specifieke momenten: gevraagd worden en een manier hebben om te antwoorden, weten wat er nu komt in een routine, een zin eruit krijgen die anders was blijven steken. Die momenten doen ertoe, en dat is genoeg werk voor één middel.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Privacy',
        title: 'Wat er met de gegevens van je kind gebeurt.',
        body: [
          'In de meeste Tiko-apps verlaat er niets het apparaat. Kaarten die je maakt, routines die je bouwt en zinnen die je bewaart staan lokaal opgeslagen. Er is geen analyse die bijhoudt waar een kind op tikt, en geen advertentie-identificatie.',
          'Zet je synchronisatie aan, dan wordt de inhoud die jij hebt gemaakt opgeslagen zodat die je andere apparaten bereikt. Dat is inhoud die een volwassene bewust heeft gemaakt — nooit een logboek van hoe een kind de app gebruikte. Wat er precies bewaard wordt staat in het privacybeleid, en omdat Tiko open source is kun je ook gewoon de code nakijken.',
        ],
      },
    ],
    cta: {
      title: 'Probeer het vandaag met je kind.',
      body: 'Open een app en gebruik hem twee minuten. Dat zegt je meer dan welke beschrijving op deze pagina ook.',
      primaryLabel: 'Bekijk de apps',
      primaryPath: '/apps',
      secondaryLabel: 'Lees het privacybeleid',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Voor onderwijs en logopedie',
    description:
      'Tiko gebruiken met een klas of caseload: een apart profiel per kind, geen licentie per leerling, niets te installeren, en geen gegevens die het apparaat verlaten.',
    eyebrow: 'Voor onderwijs en logopedie',
    title: 'Veel kinderen begeleiden. Elke ervaring rustig houden.',
    lede: 'Met Tiko Profielbeheer maakt een leerkracht of logopedist een apart, licht profiel per kind — en bepaalt precies wat elk kind kan bereiken. Kinderen krijgen een eenvoudig, gericht middel. Volwassenen houden de knoppen veilig buiten beeld.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'In de klas',
        title: 'Gemaakt voor de twintig minuten die je écht hebt.',
        body: [
          'Software die een school binnenkomt gaat er meestal van uit dat iemand tijd heeft om hem in te richten. In de praktijk heeft degene met de tablet de paar minuten tussen twee lessen, en een kind dat nú een antwoord nodig heeft.',
          'Tiko is voor die werkelijkheid gebouwd. Er valt op een beheerd apparaat niets te installeren behalve een link openen, er is geen licentiesleutel om via inkoop achterna te zitten, en er is geen studiedag nodig voordat iets bruikbaar is. Past het niet bij jullie situatie, dan ben je een paar minuten kwijt in plaats van een begrotingspost.',
        ],
        points: [
          {
            title: 'Geen licentie per leerling',
            body: 'Gratis voor elk kind in je klas of caseload. Geen aantallen door te geven en geen verlenging te verdedigen.',
          },
          {
            title: 'Niets uit te rollen',
            body: 'De webapps draaien vanaf een link op een beheerd apparaat. Native apps zijn een gewone installatie uit de App Store.',
          },
          {
            title: 'Geen accounts voor kinderen',
            body: 'Kinderen maken geen inloggegevens aan en beheren geen wachtwoorden, waardoor het middel grotendeels buiten toetsing op veiligheid valt.',
          },
          {
            title: 'Werkt op het netwerk dat je hebt',
            body: 'Apps werken na de eerste keer offline, dus een gefilterd of wisselvallig schoolnetwerk legt een sessie niet stil.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Veel kinderen',
        title: 'Een apart profiel per kind.',
        body: [
          'Een caseload is geen enkele gebruiker. Elk kind heeft zijn eigen woordenschat, zijn eigen routines en zijn eigen foto\'s nodig — en geen van hen hoort die van een ander te zien.',
          'Profielbeheer houdt die gescheiden op hetzelfde apparaat. Jij wisselt ertussen als volwassene, en elk kind ziet alleen zijn eigen inhoud wanneer het een app opent. De knoppen voor volwassenen zitten achter dezelfde flows die overal in Tiko voor verzorgers gelden, zodat een nieuwsgierig kind niet per ongeluk in de instellingen belandt.',
        ],
        points: [
          {
            title: 'Inhoud per kind',
            body: 'Kaarten, routines en bewaarde zinnen horen bij een profiel, niet bij het apparaat.',
          },
          {
            title: 'Wisselen doet de volwassene',
            body: 'Van profiel wisselen is een handeling voor volwassenen. Kinderen blijven in de app die ze gekregen hebben.',
          },
          {
            title: 'Geschikt voor gedeelde apparaten',
            body: 'Gemaakt voor de tablet die de hele dag van kind naar kind gaat, want zo werkt het in de praktijk.',
          },
          {
            title: 'Geen inzage over en weer',
            body: 'De woordenschat en geschiedenis van het ene kind zijn nooit zichtbaar vanuit een ander profiel.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'Naast je eigen werk',
        title: 'Een middel in jouw handen, geen programma om te volgen.',
        body: [
          'Tiko heeft geen ingebouwd curriculum, geen voorgeschreven volgorde en geen mening over hoe een sessie hoort te verlopen. Het geeft een kind geen cijfer, zet het niet af tegen een norm en maakt geen rapport. Die oordelen zijn van jou, en het bewijs daarvoor komt uit je eigen observatie, niet uit de telemetrie van een app.',
          'Wat Tiko je wel geeft is een set betrouwbare, drempelloze middelen om naar te grijpen tijdens het werk dat je toch al doet: een manier om een keuze uit twee aan te bieden, een zin te bouwen, de aandacht bij één stap te houden, of een woord te oefenen zonder dat een pieptoon een misser afstraft.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Gegevens en veiligheid',
        title: 'Kort gezegd: het blijft op het apparaat.',
        body: [
          'De meeste Tiko-apps sturen nergens iets heen. Er is geen analyse van wat kinderen doen, geen reclame en geen tracker van derden. Spraakherkenning draait, waar die gebruikt wordt, op het apparaat zelf zolang het platform dat toestaat, en opnames worden nooit bewaard.',
          'Omdat de apps open source zijn kan je ICT- of veiligheidsverantwoordelijke dat nagaan in plaats van te vertrouwen op een belofte in een folder. Heeft jullie organisatie het zwart op wit nodig, dan zijn het privacybeleid en de architectuurdocumentatie allebei openbaar.',
        ],
      },
    ],
    cta: {
      title: 'Probeer het eerst met één kind.',
      body: 'Kies deze week één app en één kind. Dat is een eerlijker test dan welke afwegingsmatrix ook, en het kost niets.',
      primaryLabel: 'Bekijk de apps',
      primaryPath: '/apps',
      secondaryLabel: 'Onze uitgangspunten',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Veelgestelde vragen',
    description:
      'Duidelijke antwoorden over wat Tiko is, wat het kost, wat het verzamelt en wat het bewust niet belooft.',
    eyebrow: 'Veelgestelde vragen',
    title: 'Eerst duidelijke antwoorden.',
    lede: 'Korte antwoorden op de vragen die verzorgers, leerkrachten en ontwikkelaars het vaakst stellen. Staat die van jou er niet bij, dan is er een mens één e-mail verderop.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'De basis',
        title: 'Wat Tiko is.',
        questions: [
          {
            question: 'Wat is Tiko?',
            answer:
              'Tiko is een verzameling kleine, gratis apps waarmee kinderen kunnen communiceren, kiezen, routines volgen en tijd begrijpen. Elke app doet één duidelijk ding en opent meteen — in elke taal, op elk apparaat, zonder account.',
          },
          {
            question: 'Waarom zijn het veel apps in plaats van één?',
            answer:
              'Omdat elke extra knop op het scherm iets is om verkeerd te lezen of mis te tikken. Een app die één taak heeft kan volledig geleerd worden, en een kind dat hem geleerd heeft kan erop vertrouwen. Yes No is twee knoppen; daar hoort nooit een zinsbouwer bij te groeien.',
          },
          {
            question: 'Voor wie is Tiko?',
            answer:
              'Voor kinderen die steun nodig hebben om zich te uiten — door een spraak- of taalprobleem, een ontwikkelingsachterstand, een beperking, of simpelweg omdat ze nog vroeg zijn in het leren praten — en voor de ouders, leerkrachten en logopedisten naast hen. Er is geen diagnose voor nodig.',
          },
          {
            question: 'Welke apps zijn er nu?',
            answer:
              'Yes No, Type, Talk, Say, Sum en First zijn er nu, op het web of in de App Store, afhankelijk van de app. Cards, Sequence en Timer worden nog gebouwd. Op de apps-pagina zie je precies waar elke app te openen is.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Kosten',
        title: 'Wat het kost, en waarom.',
        questions: [
          {
            question: 'Is Tiko echt gratis?',
            answer:
              'Ja. De Tiko-apps zijn gratis, altijd. Geen tijdelijke kennismaking, geen voorproefje en geen opstapje naar een betaald pakket. Er is geen betaalde laag die een functie tegenhoudt die een kind nodig heeft.',
          },
          {
            question: 'Komen er advertenties in Tiko?',
            answer:
              'Nee. Nooit advertenties. Tiko moet veilig te openen zijn naast een kind, zonder commerciële inhoud, gesponsorde meldingen of iets dat is ontworpen om aandacht te trekken.',
          },
          {
            question: 'Als het gratis en advertentievrij is, hoe wordt het dan betaald?',
            answer:
              'Tiko is gebouwd als opensourceproject, niet als bedrijf met een groeidoel. Daardoor blijven de kosten klein — de apps zijn piepklein en de meeste praten met helemaal geen server.',
          },
          {
            question: 'Zijn de gegevens van mijn kind de betaling?',
            answer:
              'Nee. Gratis betekent hier niet advertentiegedreven. De meeste Tiko-apps verzamelen niets, dus er valt niets te verkopen, ook al zouden we willen.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Accounts en privacy',
        title: 'Wat je moet inleveren om het te gebruiken.',
        questions: [
          {
            question: 'Heb ik een account nodig?',
            answer:
              'Nee. Tiko-apps openen en werken zonder inlogmuur. Optioneel herstel voor de verzorger kan later via een e-mailkoppeling, maar de app voor het kind begint nooit met het instellen van een account.',
          },
          {
            question: 'Welke gegevens verzamelt Tiko?',
            answer:
              'In de meeste apps geen. Er is geen analyse van waar een kind op tikt, geen advertentie-identificatie en geen tracker van derden. Wat je zelf maakt — kaarten, routines, bewaarde zinnen — blijft op het apparaat tenzij je synchronisatie aanzet.',
          },
          {
            question: 'Neemt Tiko de stem van mijn kind op?',
            answer:
              'Waar een app luistert, draait spraakherkenning op het apparaat zelf zolang het platform dat ondersteunt, en opnames worden nooit bewaard of verstuurd. Apps die geen microfoon nodig hebben vragen er ook nooit om.',
          },
          {
            question: 'Kan ik dit controleren?',
            answer:
              'Ja, en dat zou je moeten doen. Tiko is open source, dus de code achter deze uitspraken is openbaar. Het privacybeleid beschrijft in gewone taal wat er bewaard wordt.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'Wat Tiko niet is',
        title: 'De grenzen, gewoon benoemd.',
        questions: [
          {
            question: 'Is Tiko een therapie- of medisch product?',
            answer:
              'Nee. Tiko stelt geen diagnoses, behandelt niet en belooft geen resultaten. Het is een set communicatie- en leermiddelen, geen klinische interventie, en geen vervanging van een logopedist.',
          },
          {
            question: 'Houdt Tiko vooruitgang bij?',
            answer:
              'Nee, bewust niet. Er zijn geen scores, reeksen of dashboards. Vooruitgang in communicatie is niets waar een app een cijfer aan hoort te geven, en een getal op een scherm stuurt meestal meer het gedrag van de volwassene dan dat van het kind.',
          },
          {
            question: 'Werkt het voor mijn kind?',
            answer:
              'Dat weten we echt niet, en wie beweert van wel, gokt. De apps zijn gratis en openen meteen, dus de goedkoopste manier om erachter te komen is er een paar minuten een te proberen.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Praktisch',
        title: 'Apparaten, talen en offline gebruik.',
        questions: [
          {
            question: 'Welke talen spreekt Tiko?',
            answer:
              'De apps zijn van de grond af meertalig, en de taal die een verzorger kiest gaat mee naar elke Tiko-app en naar deze website. Waar een taal nog geen vertaalde interface heeft, valt de app terug op het Engels in plaats van te weigeren te openen.',
          },
          {
            question: 'Werkt het offline?',
            answer:
              'Ja. De apps laden hun kerninhoud naar het apparaat en blijven zonder netwerk werken. Alles wat internet nodig heeft komt er bovenop, en als dat mislukt stopt de app niet.',
          },
          {
            question: 'Op welke apparaten werkt het?',
            answer:
              'Elke moderne browser, plus native iPhone- en iPad-apps voor de apps die in de App Store staan. Android volgt dezelfde aanpak.',
          },
          {
            question: 'Kan ik het met een klas of caseload gebruiken?',
            answer:
              'Ja. Profielbeheer houdt een apart profiel per kind op een gedeeld apparaat, en er is geen licentie per leerling te kopen of door te geven.',
          },
        ],
      },
    ],
    cta: {
      title: 'Toch nog een vraag?',
      body: 'Support is een mens, geen wachtrij. Stel je vraag en je krijgt een eerlijk antwoord.',
      primaryLabel: 'Naar support',
      primaryPath: '/support',
      secondaryLabel: 'Waarom Tiko bestaat',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Support',
    description:
      'Hulp bij de Tiko-apps voor kinderen, verzorgers en onderwijs — veelvoorkomende onderwerpen, oplossingen en hoe je een mens bereikt.',
    eyebrow: 'Support',
    title: 'We helpen je graag.',
    lede: 'Hulp bij de Tiko-apps voor kinderen, verzorgers en onderwijs. De meeste antwoorden staan hieronder — en er is een mens één e-mail verderop.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Veelvoorkomende onderwerpen',
        title: 'Snelle antwoorden om mee te beginnen.',
        points: [
          {
            title: 'Beginnen',
            body: 'Elke Tiko-app opent meteen — geen account of wachtwoord nodig. Open de link of installeer de app en ga aan de slag.',
          },
          {
            title: 'Accounts en apparaten',
            body: 'Tiko gebruikt sessies op het apparaat in plaats van wachtwoorden. Ga je van apparaat wisselen of het resetten, voeg dan vooraf een herstel-e-mailadres toe zodat je inhoud meegaat.',
          },
          {
            title: 'Stemmen en talen',
            body: 'Kies een stem en taal die passen bij het kind. Tiko-apps ondersteunen veel talen en wisselen direct vanuit de instellingen.',
          },
          {
            title: 'Offline gebruik',
            body: 'Apps blijven na de eerste keer werken zonder netwerk. Synchroniseren gaat vanzelf verder zodra er weer verbinding is.',
          },
          {
            title: 'Privacy en gegevens',
            body: 'De meeste apps bewaren niets buiten het apparaat. Wat je maakt blijft lokaal tenzij je synchronisatie bewust aanzet.',
          },
          {
            title: 'Werkt er iets niet?',
            body: 'Vertel ons wat je zag, op welk apparaat en in welke app. Dat is meestal genoeg om het te vinden.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Problemen oplossen',
        title: 'De drie dingen die het meeste verhelpen.',
        steps: [
          {
            title: 'Herlaad de app',
            body: 'Sluit hem helemaal af en open hem opnieuw. Webapps werken zichzelf op de achtergrond bij, en herladen pakt de nieuwste versie op.',
          },
          {
            title: 'Controleer de taal en de stem',
            body: 'Klinkt spraak verkeerd of blijft het stil, dan staat de gekozen stem misschien niet op het apparaat. Probeer een andere stem in de instellingen — op iOS installeer je extra stemmen via de toegankelijkheidsinstellingen.',
          },
          {
            title: 'Kijk of het geluid uitstaat',
            body: 'Een schakelaar op stil of een gedempt tabblad verklaart meer meldingen van "spraak werkt niet" dan wat dan ook.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Contact',
        title: 'Vraag het een mens.',
        body: [
          'Support wordt beantwoord door de mensen die Tiko bouwen, niet door een wachtrij. Er is geen ticketnummer en geen abonnementsniveau — je krijgt een eerlijk antwoord, ook als dat antwoord is dat iets kapot is of niet gepland staat.',
          'Meld je een probleem, dan helpen vooral: de app, het apparaat en de versie van de browser of het besturingssysteem, wat je verwachtte, en wat er in plaats daarvan gebeurde. Een schermafbeelding zegt meer dan een beschrijving.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Meedoen',
        title: 'Meld iets, stel iets voor, of bouw mee.',
        body: [
          'Tiko is open source, dus een bugmelding is echt nuttig en een pull request is welkom. De richting van het project komt grotendeels van ouders, logopedisten en leerkrachten die vertellen wat er ontbreekt — dat is veel nauwkeuriger dan een routekaart die zonder hen is geschreven.',
          'Werk je met kinderen die communicatiemiddelen gebruiken en klopt hier iets niet, dan horen we dat liever wel dan niet.',
        ],
      },
    ],
    cta: {
      title: 'Lees eerst de antwoorden.',
      body: 'De veelgestelde vragen gaan over kosten, privacy, accounts en wat Tiko bewust niet doet.',
      primaryLabel: 'Naar de veelgestelde vragen',
      primaryPath: '/faq',
      secondaryLabel: 'Hoe het werkt',
      secondaryPath: '/how-it-works',
    },
  },
}
