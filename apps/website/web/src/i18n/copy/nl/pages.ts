import type { SiteCopyOverride } from '../..'

/**
 * Dutch page copy.
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const nlPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Waarom Tiko bestaat',
    description:
      'Waarom Tiko een familie van kleine, gratis, meertalige apps is in plaats van één groot communicatieplatform — en waarom het niets kost.',
    eyebrow: 'Waarom Tiko bestaat',
    title: 'Leuk, eenvoudig en in elke taal.',
    lede: 'Tiko is een familie van kleine, mooie, gratis apps waarmee kinderen kunnen communiceren, kiezen, routines volgen en tijd begrijpen. Elke app opent in seconden, werkt in elke taal en vraagt nooit om een account — want de eerste stap hoort het gebruiken te zijn, niet het instellen.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'Het probleem',
        title: 'Communicatiemiddelen vragen te veel voordat ze helpen.',
        body: [
          'Een kind dat nog niet kan zeggen wat het nodig heeft, heeft het nú moeilijk — niet na een proefperiode, een licentie, een training en een inlog. Toch vraagt de meeste communicatiesoftware om alle vier. Ze komt binnen als platform: een account om aan te maken, een abonnement om te verantwoorden, een instellingenscherm om door te werken en een handleiding om te lezen voordat iemand een woord uitkrijgt.',
          'Die kosten zijn niet alleen geld. Het zijn de twintig minuten die een leerkracht niet heeft tussen twee lessen, het vertrouwen dat een ouder verliest wanneer het eerste scherm een formulier is, en het speciale apparaat dat in de kast blijft omdat niemand precies weet hoe je het instelt. Het middel gaat de instelling dienen die het kocht, in plaats van het kind dat het vasthoudt.',
          'Tiko begint aan de andere kant. Het eerste scherm ís het middel. Al het andere — instellingen, herstel, synchroniseren tussen apparaten — komt daarna, is voor de volwassene, en alleen als die het wil.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'De vorm',
        title: 'Veel kleine apps, niet één grote.',
        lede: 'Tiko is geen bedieningspaneel met standen. Het is een set losse apps die elk één ding goed doen.',
        body: [
          'Een kind dat leert antwoord geven op een vraag heeft geen zinsbouwer op datzelfde scherm nodig. Een kind dat een ochtendroutine volgt heeft geen toetsenbord nodig. Elke extra knop is iets om verkeerd te lezen of mis te tikken — en voor een kind dat al hard werkt om begrepen te worden, telt dat echt.',
          'Daarom is elke Tiko-app een eigen app. Yes No is twee knoppen. Type is een tekstveld en een spreekknop. First is één stap tegelijk. Je opent degene die bij het moment past, en verder staat er bijna niets op het scherm.',
        ],
        points: [
          {
            title: 'Eén scherm, één taak',
            body: 'Elke app opent direct op wat hij doet. Geen beginscherm om door te navigeren, geen stand om eerst te kiezen.',
          },
          {
            title: 'Eén keer leren',
            body: 'Omdat een app één ding doet, kan een kind hem helemaal leren. Vertrouwen komt van een middel dat zich elke keer hetzelfde gedraagt.',
          },
          {
            title: 'Niets om te ontgroeien',
            body: 'Beginnen met Yes No zet je nergens aan vast. De apps staan los, dus overstappen naar Talk of Type is een andere app openen, geen account migreren.',
          },
          {
            title: 'Klein genoeg om te vertrouwen',
            body: 'Een middel dat een verzorger in een minuut begrijpt, is een middel dat hij op een moeilijk moment ook echt pakt.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Taal',
        title: 'Meertalig vanaf het begin, niet achteraf vertaald.',
        body: [
          'Een communicatiemiddel dat maar in één taal werkt, sluit precies de kinderen uit die het het hardst nodig hebben: het kind in een tweetalig gezin, het kind wiens thuistaal niet de schooltaal is, het kind dat verhuisd is en zijn woorden twee keer kwijtraakte.',
          'Tiko spreekt de taal van het kind, niet die van de ontwikkelaar. Interface, gesproken uitvoer en inhoud zijn allemaal vertaalbaar, en de taal die een verzorger kiest gaat mee naar elke Tiko-app en naar deze website. Waar een taal nog geen vertaalde interface heeft, valt de app voor die woorden terug op het Engels in plaats van te weigeren te openen.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Waarom gratis',
        title: 'Omdat toegang geen prijskaartje hoort te hebben.',
        lede: 'De apps van Tiko zijn gratis, altijd. Geen proefversie, geen voorproefje, geen opstapje naar een betaald pakket.',
        body: [
          'Communicatie is geen luxefunctie. Een kind moet nú een Tiko-app kunnen openen, zonder dat een volwassene eerst afweegt of dit specifieke moment het geld waard is — want die afweging, onder druk gemaakt, valt meestal uit in het nadeel van het kind.',
        ],
        points: [
          {
            title: 'Geen aarzeling',
            body: 'Probeer iets meteen met een kind, zonder af te wegen of het moment de kosten rechtvaardigt.',
          },
          {
            title: 'Geen druk',
            body: 'Geen haast, geen schuldgevoel, geen advertenties, geen upgrade-meldingen. Niets maakt van begrepen worden een transactie.',
          },
          {
            title: 'Geen verborgen ruil',
            body: 'Gratis betekent hier niet advertentiegedreven. Tiko ruilt de aandacht of de gegevens van een kind niet in voor toegang — er valt niets te ruilen, want er wordt niets verzameld.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'Wat Tiko niet is',
        title: 'Een hulpmiddel, geen behandeling.',
        body: [
          'Tiko stelt geen diagnoses, behandelt niet en belooft geen resultaten. Het is geen therapieprogramma, geen test en geen vervanging van een logopedist. Er zijn geen scores, geen voortgangsdashboards en geen rapporten die het ene kind met het andere vergelijken.',
          'Wat Tiko wel biedt is een goed hulpmiddel voor een specifiek moment: een manier om te antwoorden, te kiezen, een zin te zeggen, een routine te volgen. Logopedisten en leerkrachten gebruiken het naast hun eigen werk, en gezinnen gebruiken het in de gewone uren tussen afspraken door. Dat is bewust een kleinere belofte dan de meeste software in dit vakgebied doet.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Wie het vormt',
        title: 'Gebouwd mét logopedisten, niet alleen vóór hen.',
        lede: 'Logopedisten, leerkrachten en andere professionals bekijken Tiko en vertellen ons wat eraan mankeert.',
        body: [
          'Een ontwikkelaar kan een communicatiemiddel bouwen dat werkt. Of het werkt voor een kind dat moeite heeft om begrepen te worden is een heel andere vraag, en die beantwoord je niet door documentatie te lezen. Die beantwoorden de mensen die elke week naast die kinderen zitten.',
          'De apps worden daarom bekeken door logopedisten, leerkrachten in het speciaal onderwijs en andere professionals — en hun feedback verandert ze. Soms gaat het om iets kleins: een knop die te dicht bij een andere zit, een woord dat in een bepaald dialect niet klopt, een felicitatie die te veel prikkelt voor de kinderen met wie zij werken. Soms om iets groots: dat Say geen pieptoon bij een fout antwoord heeft, en dat geen enkele Tiko-app een score bijhoudt, komt allebei uit die hoek.',
          'Dit is geen klinische goedkeuring en Tiko doet ook niet alsof. Het is ontwerpbeoordeling door mensen wier oordeel op de belangrijkste vragen meer waard is dan het onze, en het is de reden dat verschillende apps eruitzien zoals ze nu doen in plaats van zoals ze begonnen.',
        ],
        points: [
          {
            title: 'Bekeken vanuit de logopedie',
            body: 'Professionals kijken naar de apps met de kinderen in gedachten die zij begeleiden, en zeggen ronduit waar iets in de weg zit.',
          },
          {
            title: 'Feedback die het product verandert',
            body: 'Zegt een beoordeling dat een patroon verkeerd is voor deze kinderen, dan verandert het patroon. Weggehaalde pieptonen en het ontbreken van scores komen daarvandaan.',
          },
          {
            title: 'Nog steeds geen behandeling',
            body: 'Input van professionals maakt Tiko beter ontworpen. Het maakt er geen therapieprogramma van, en zo presenteren we het ook niet.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Open van nature',
        title: 'Open gebouwd, gevormd door wie het gebruikt.',
        body: [
          'Tiko is open source. De code, de inhoudsafspraken en de API-vormen zijn openbaar, zodat een school, een logopedist of een ontwikkelaar precies kan zien wat een app met de gegevens van een kind doet — wat bij de meeste Tiko-apps helemaal niets is.',
          'Het betekent ook dat de richting van de mensen komt die het gebruiken. Ouders, logopedisten en leerkrachten benoemen veel scherper wat er ontbreekt dan een routekaart die in afzondering is geschreven, en een open project kan daarnaar handelen zonder op een commerciële afweging te wachten.',
        ],
      },
    ],
    cta: {
      title: 'Open er een en kijk zelf.',
      body: 'De snelste manier om Tiko te beoordelen is het twee minuten met een kind te gebruiken. Geen account, geen download, geen wachtkamer.',
      primaryLabel: 'Bekijk de apps',
      primaryPath: '/apps',
      secondaryLabel: 'Hoe het werkt',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Hoe Tiko werkt',
    description:
      'Hoe Tiko-apps zonder account openen, wat er op het apparaat gebeurt, en hoe optioneel herstel voor verzorgers werkt.',
    eyebrow: 'Hoe Tiko werkt',
    title: 'Eerst openen. Instellen komt later.',
    lede: 'Tiko begint bij het apparaat. Apps openen en werken meteen. Herstel voor de verzorger kan later via een e-mailkoppeling — nooit voordat het kind het middel heeft kunnen gebruiken.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'De ervaring',
        title: 'Drie momenten, geen drempels.',
        steps: [
          {
            title: 'Open de link',
            body: 'Een verzorger deelt een link of maakt een bladwijzer, of installeert de app uit de App Store. Er is niets te licentiëren en niemand om toestemming aan te vragen.',
          },
          {
            title: 'Gebruik hem meteen',
            body: 'De app is klaar zonder inloggen, zonder uitleg en zonder introductiescherm. Het kind ziet meteen het middel zelf.',
          },
          {
            title: 'Herstel later, als je wilt',
            body: 'Wil een verzorger dat instellingen meegaan naar een ander apparaat, dan voegt hij eenmalig een e-mailadres toe. Dat is optioneel, het gebeurt achteraf, en het kind ziet het nooit.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identiteit op het apparaat',
        title: 'Nooit wachtwoorden.',
        body: [
          'Elke Tiko-app maakt bij de eerste keer openen een sessie op het apparaat. Die wordt lokaal aangemaakt, hoort bij dat apparaat, en is genoeg om alles te gebruiken wat de app doet. Geen e-mailadres, geen wachtwoord, geen account.',
          'Dit is het deel dat de meeste communicatiesoftware omdraait. Een account bestaat zodat een bedrijf je op meerdere apparaten kan herkennen — een echte behoefte, maar een volwassen behoefte, en meestal wordt hij vóór het kind gezet als toegangsprijs. Tiko behandelt hem als wat hij is: een optioneel gemak voor de verzorger, dat later wordt aangeboden.',
        ],
        points: [
          {
            title: 'Sessie op het apparaat',
            body: 'Automatisch aangemaakt bij de eerste keer openen, lokaal bewaard, en nooit met een inlog.',
          },
          {
            title: 'Herstel via e-mailkoppeling',
            body: 'Optioneel. Een verzorger voegt een e-mailadres toe en bevestigt dat eenmalig om te kunnen synchroniseren.',
          },
          {
            title: 'Geen ceremonie voor het kind',
            body: 'Herstel en beheer zijn er alleen voor volwassenen. Een kind krijgt nooit een accountformulier te zien.',
          },
          {
            title: 'Gelijk op elk platform',
            body: 'Sessies werken hetzelfde op web, iOS en Android, dus een app gedraagt zich overal identiek.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Betrouwbaarheid',
        title: 'Het werkt door als het netwerk dat niet doet.',
        body: [
          'Tiko-apps laden hun kerninhoud naar het apparaat en draaien daarvandaan. Een wegvallende verbinding, een schoolnetwerk dat het halve internet blokkeert of een autorit zonder bereik neemt een kind niet het vermogen af om antwoord te geven.',
          'Alles wat het netwerk echt nodig heeft — instellingen synchroniseren, een nieuwe platenset downloaden — komt er bovenop. Mislukt dat, dan gaat de app gewoon door met wat hij daarvoor deed.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Wat er verzameld wordt',
        title: 'Bijna niets, en nooit van het kind.',
        body: [
          'De meeste Tiko-apps verzamelen helemaal niets. Er is geen analyse die de tikken van een kind volgt, geen advertentie-identificatie en geen tracker van derden. Spraakherkenning draait, waar een app die gebruikt, op het apparaat zelf zolang het platform dat ondersteunt, en opnames worden nooit bewaard of verstuurd.',
          'Slaat een app wel iets op — eigen kaarten, een gebouwde routine, een bewaarde zin — dan is dat inhoud die de volwassene bewust heeft gemaakt, en die blijft op het apparaat tenzij hij synchroniseren aanzet.',
        ],
        points: [
          {
            title: 'Nooit advertenties',
            body: 'Geen reclame, geen advertentienetwerken en geen tracking voor advertenties in welke Tiko-app dan ook.',
          },
          {
            title: 'Geen inlogmuur',
            body: 'De apps voor kinderen openen en werken zonder enige vorm van account.',
          },
          {
            title: 'Op het apparaat waar het kan',
            body: 'Spraakherkenning gebruikt de motor van het apparaat zelf waar die bestaat. Opnames worden niet bewaard.',
          },
          {
            title: 'Openbaar te controleren',
            body: 'De apps zijn open source, dus je kunt wat hier staat nagaan in plaats van het aannemen.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Eén Tiko, veel schermen',
        title: 'Overal dezelfde ervaring.',
        body: [
          'Het web is de snelste manier om Tiko te proberen: een link is genoeg. Native apps voegen toe wat een browser minder goed kan — betrouwbaar offline werken, een pictogram op het beginscherm dat een kind herkent, en betere ondersteuning voor spraak.',
          'Wat je ook gebruikt, de app gedraagt zich hetzelfde. Onder alles liggen dezelfde afspraken, dus een routine die op een tablet is gebouwd is dezelfde routine op een telefoon.',
        ],
      },
    ],
    cta: {
      title: 'Wil je de techniek zien?',
      body: 'De architectuur- en API-documentatie beschrijft hoe de workers, de opslag en de clients in elkaar passen.',
      primaryLabel: 'Architectuurdocumentatie',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'API-contracten',
      secondaryPath: '/docs/apis',
    },
  },
}
