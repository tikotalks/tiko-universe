import type { SiteCopy } from '../..'

/**
 * Deutsche Entwicklerdokumentation.
 *
 * Dienstnamen, Pfade und Codebeispiele bleiben unübersetzt: Das sind Adressen,
 * keine Prosa. Codebeispiele stehen deshalb nicht in dieser Datei — sie fallen
 * auf Englisch zurück, und das ist so gewollt.
 */
export const deDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Dokumentationsseiten',
  articleEyebrow: 'Tiko-Plattformdokumentation',
  pages: {
    'docs-overview': {
      label: 'Überblick',
      title: 'Tiko-Universe-Dokumentation',
      lede: 'Die Architektur, die Produktphilosophie und die API-Landkarte der aufgeräumten Tiko-Plattform.',
      summary: 'Ein öffentlicher, lesbarer Einstieg in den Aufbau von Tiko und die Gründe für die Form des Systems.',
      callouts: [
        {
          title: 'Kleine Apps, gemeinsame Plattform',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media und künftige Apps nutzen dieselben Verträge für Identität, State, Content, Medien, Generierung und UI.',
        },
        {
          title: 'API zuerst, Cloudflare-nativ',
          body: 'Clients sind bewusst dünn. Die Autorität liegt in Cloudflare Workers mit D1, R2, KV als Cache und Queues, wo asynchrone Arbeit nötig wird.',
        },
        {
          title: 'Kein Kontoaufwand vorweg',
          body: 'Eine App für Kinder muss öffnen und nützlich sein, bevor Wiederherstellung, Abgleich oder Verwaltung auftauchen.',
        },
      ],
      sections: [
        {
          eyebrow: 'Worum es hier geht',
          title: 'Eine praktische Landkarte für Bauende',
          body: [
            'Diese Dokumentation erklärt Tiko als Produkt und als Backend-Plattform. Sie ist weder Marketingtext noch Abladeplatz für Implementierungsdetails.',
            'Die wichtigste Regel ist einfach: Betrifft ein Verhalten Web-, iOS- oder Android-Clients, gehört es in einen dokumentierten API-Vertrag, bevor es zu versteckter Client-Logik wird.',
          ],
          bullets: [
            'Philosophie: kindgerechte Produktgrundsätze und technische Randbedingungen.',
            'Architektur: Apps, Packages, Workers, Speicherhoheit, Domains und Deploy-Grenzen.',
            'APIs: die aktuellen Vertragsfamilien und die stabilen Formen, auf die Clients bauen dürfen.',
          ],
        },
        {
          eyebrow: 'Aktuelle Form der Plattform',
          title: 'Ein Repo, klare Zuständigkeiten',
          body: [
            'Tiko Universe ist ein Monorepo mit npm-Workspaces: Apps pro Produkt, gemeinsame TypeScript-Packages und Cloudflare-Worker-Dienste. Nativer iOS-Code liegt neben dem Produkt, wo es ihn gibt; Android folgt denselben API-Verträgen, statt Backend-Logik in den Client zu kopieren.',
          ],
          bullets: [
            'Apps: Apps für Kinder sowie unterstützende öffentliche und administrative Oberflächen.',
            'Packages: typisierte Clients, gemeinsame Verträge, Tiko UI, i18n, Medien, Identität und Testhilfen.',
            'Workers: Identität, App-State, Content, Medien, Generierung, Verwaltung und temporäre TTS-Kompatibilität.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Philosophie',
      title: 'Produkt- und Engineering-Philosophie',
      lede: 'Tiko ist Software, die das Kind zuerst denkt. Das Backend existiert, um den Moment für das Kind unmittelbar, ruhig und wiederherstellbar zu halten, ohne daraus Business-Software zu machen.',
      summary: 'Die Grundsätze hinter jeder Architekturentscheidung.',
      callouts: [
        { title: 'Unmittelbar', body: 'Apps öffnen und funktionieren sofort. Der erste Bildschirm ist nie ein Login-Formular.' },
        { title: 'Klein', body: 'Jede App tut eine klare Sache, statt zum Bedienfeld zu werden.' },
        { title: 'Wiederherstellbar', body: 'Gerätesitzungen können später über einen E-Mail-Magic-Link wiederherstellbar werden.' },
      ],
      sections: [
        {
          eyebrow: 'Grundsätze',
          title: 'Worüber nicht verhandelt wird',
          body: [
            'Die Grundsätze sind bewusst streng, weil aus „nur diese eine Ausnahme“ sechs Monate später eine Plattform wird, die niemand mehr versteht. Tiko vermeidet das, indem Identität, APIs und Speicherhoheit langweilig und ausdrücklich bleiben.',
          ],
          bullets: [
            'Keine Passwörter und keine Login-Hürde vor der Nutzung.',
            'Keine Supabase-Runtime, keine Brücke für Altnutzer, keine Migrationspflicht, keine Better-Auth-Annahme.',
            'Standardmäßig Identität auf dem Gerät; optional später E-Mail-Wiederherstellung über Magic Links.',
            'D1 ist die relationale Quelle der Wahrheit. R2 ist die Quelle der Wahrheit für Bytes. KV ist nur Cache.',
            'Lezu verwaltet Übersetzungen; Tiko konsumiert Bundles und eingecheckte Fallbacks.',
            'Web, iOS und Android sind gleichrangige Clients derselben HTTPS-JSON-APIs.',
          ],
        },
        {
          eyebrow: 'Produktmodell',
          title: 'Warum kleine Apps',
          body: [
            'Tiko ist keine große „Plattform für besondere Bedürfnisse“ mit einem Labyrinth an Funktionen. Es ist ein Universum kleiner, fokussierter Werkzeuge, die man genau dann öffnet, wenn ein Kind oder eine Betreuungsperson eine Sache braucht.',
            'Getrennte Werkzeuge senken die kognitive Last, halten die Tippflächen offensichtlich und machen es leichter zu prüfen, ob ein Werkzeug hilft, bevor man einer Betreuungsperson Abgleich, Wiederherstellung oder Verwaltung zumutet.',
          ],
          bullets: [
            'Yes No: schnelle Antworten mit zwei Auswahlmöglichkeiten.',
            'Type: Texteingabe und Sprachausgabe.',
            'Cards: visuelle Auswahl und vertraute Inhalte.',
            'Sequence: geordnete Abläufe und nächste Schritte.',
            'Timer: Zeit sichtbar machen und Übergänge begleiten.',
          ],
        },
        {
          eyebrow: 'Engineering-Modell',
          title: 'Erst Verträge, dann Clients',
          body: [
            'Client-Code darf angenehm und robust sein. Er darf nicht heimlich zum Backend werden. Hat Verhalten Autorität, Persistenz, Provider-Geheimnisse oder geräteübergreifende Wirkung, gehört es in einen Worker und in einen dokumentierten Vertrag.',
          ],
          bullets: [
            'Packages liefern typisierte Clients, Modelle, Fixtures und UI-Komposition.',
            'Workers besitzen Auth, Rate Limits, Zugriff auf D1/R2/KV/Queues, Provider-Aufrufe und dauerhafte Mutationen.',
            'Apps dürfen lokalen Fallback-State halten, damit der Kinderfluss nutzbar bleibt, wenn ein Netzwerkaufruf fehlschlägt.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Architektur',
      title: 'Architektur',
      lede: 'Tiko ist eine Cloudflare-native Plattform: Apps pro Produkt, gemeinsame Client-Packages, Workers als Domänendienste, D1/R2 für dauerhaften State und KV nur als Cache.',
      summary: 'Wie Monorepo, Domains, Speicher, Workers und Clients zusammenpassen.',
      callouts: [
        { title: 'Clients', body: 'Vue-Web-Apps, SwiftUI-iOS-Apps und künftige Android-Clients nutzen dieselben API-Verträge.' },
        { title: 'Dienste', body: 'Workers sind nach Domänengrenzen getrennt, nicht nach der Datei, die zufällig zuerst existierte.' },
        { title: 'Speicher', body: 'D1 besitzt die relationale Wahrheit. R2 besitzt die Bytes. KV ist neu aufbaubarer Cache.' },
      ],
      sections: [
        {
          eyebrow: 'Systemkarte',
          title: 'Der grobe Fluss',
          body: [
            'Die Architektur ist bewusst schlicht. Clients sprechen über HTTPS-JSON-APIs. Workers prüfen Identität und besitzen Mutationen. Speicher hängt an dem Worker, der die Domäne besitzt.',
          ],
        },
        {
          eyebrow: 'Repository',
          title: 'Monorepo mit dem Produkt zuerst',
          body: [
            'Das Repo ist zuerst nach Produkten geordnet, danach nach Plattform-Packages und Workers. So bleibt der Kontext einer kindgerechten App nah an ihrer Web- und Native-Implementierung, während Verträge über Packages geteilt werden.',
          ],
          bullets: [
            '`apps/<product>/web` enthält Vue-Apps, die auf Cloudflare Pages laufen.',
            '`apps/<product>/ios` enthält SwiftUI-Clients, wo native Arbeit existiert.',
            '`packages/*` enthält gemeinsame TypeScript-Verträge, Clients, Tiko UI, i18n, Medien, Identität und Testhilfen.',
            '`workers/*` enthält Cloudflare-Worker-Dienste mit eigenen D1/R2-Bindings und Tests.',
          ],
        },
        {
          eyebrow: 'Dienstgrenzen',
          title: 'Zuständigkeit pro Worker',
          body: [
            'Jeder Worker hat eine schmale Aufgabe. Das macht Autorisierung, Migrationen, Rate Limiting und Deploy-Risiko leichter überschaubar.',
          ],
          bullets: [
            '`identity-api`: Ankore-Subjekte, Geräte, Sitzungen, Konten und E-Mail-Challenges.',
            '`app-api`: App-Einstellungen und App-State pro Benutzer.',
            '`content-api`: veröffentlichte Inhalte, CMS-artige Records und cachebare Lesemodelle.',
            '`media-api`: Upload-Autorisierung, Medien-Metadaten, Eigentum und R2-Zugriff.',
            '`generation-api`: TTS, Satz- und Bildgenerierung, Metadaten generierter Medien und künftige Queues.',
            '`admin-api`: gefährliche, rein administrative Operationen, Berichte, Moderation und Support-Werkzeuge.',
            '`tts-api`: temporäre Kompatibilitätsfläche, die in generation-api aufgehen soll.',
          ],
        },
        {
          eyebrow: 'Domains',
          title: 'Öffentliche Routen',
          body: [
            'Domains gehören zur Architektur. Willkürliche neue Hostnamen sind genau der Weg, auf dem Plattformen zu Archäologie werden.',
          ],
          bullets: [
            '`tiko.mt`: öffentliche Produkt- und Marketing-Startseite.',
            '`tikotalks.com`: die öffentliche TikoTalks-Fläche für Dokumentation und Marke — also diese Seiten.',
            '`*.tikoapps.org`: die Familie laufender Apps wie yesno, type, cards, sequence, timer, media und admin.',
            '`id.tiko.mt`: Identitäts-Origin auf Gerätebasis (alter Alias von `identity.tikoapi.org`).',
            '`*.tikoapi.org`: die API-Familie — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` und `translations` haben je eine eigene Subdomain.',
            '`*.tikocdn.org`: nur Auslieferung von Bytes, keine Anwendungslogik.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'APIs',
      title: 'API-Verträge',
      lede: 'Die APIs sind das Rückgrat des Produkts. Sie lassen Web-, iOS- und Android-Clients sich gleich verhalten, ohne Backend-Logik in jede App zu kopieren.',
      summary: 'Ein lesbarer Führer durch die aktuellen `/v1`-Vertragsfamilien.',
      callouts: [
        { title: 'Versioniert', body: 'Für Clients sichtbare APIs liegen unter `/v1` und liefern JSON, außer bei Endpunkten, die Bytes streamen.' },
        { title: 'Typisierte Fehler', body: 'Fehler nutzen stabile, maschinenlesbare Codes und sichere Texte für Menschen.' },
        { title: 'Bearer-freundlich', body: 'Native Clients müssen mit expliziten Bearer-Sitzungen arbeiten; reine Browser-Cookies genügen nicht.' },
      ],
      sections: [
        {
          eyebrow: 'Gemeinsame API-Regeln',
          title: 'Vertragsregeln',
          body: [
            'Die Form der API darf langweilig bleiben. Das ist ein Kompliment. Vorhersehbare Routen und Fehlerhüllen halten mehrere Clients davon ab, auseinanderzudriften.',
          ],
          bullets: [
            'Verwende `/v1`-Pfade.',
            'Liefere JSON aus API-Routen; streame Bytes nur aus ausdrücklichen Medien- oder Audio-Routen.',
            'Nutze Bearer-Sitzungen, damit native Clients gleichrangig sind.',
            'Verrate nie, ob eine Wiederherstellungs-E-Mail oder ein Handle existiert.',
            'Speichere rohe Tokens nur clientseitig; der Server hält Hashes.',
            'Gib Fehlermeldungen von Providern nicht an Clients weiter.',
          ],
        },
        {
          eyebrow: 'Identität',
          title: 'Identitäts-API auf Gerätebasis',
          body: [
            'Identität existiert, damit Apps sofort öffnen und später trotzdem wiederherstellbar werden. Bootstrap legt eine Gerätesitzung an oder stellt sie wieder her; E-Mail-Wiederherstellung verbessert die Kontinuität, ohne den Start zum Login zu machen.',
          ],
          bullets: [
            '`POST /v1/identity/device` — Gerätesitzung anlegen oder wiederherstellen.',
            '`GET /v1/identity/session` — aktuelle Sitzung prüfen und das Bundle zurückgeben.',
            '`POST /v1/identity/email/challenge` — Wiederherstellungs-E-Mail anfordern, mit generischer Antwort.',
            '`POST /v1/identity/email/verify` — Magic-Link-Token oder OTP prüfen und ein Ankore-Identitäts-Bundle zurückgeben.',
            '`POST /v1/identity/logout` — die aktuelle Bearer-Sitzung widerrufen.',
          ],
        },
        {
          eyebrow: 'App-Daten',
          title: 'API für Einstellungen und State',
          body: [
            'Die App-API besitzt Einstellungen und State pro Benutzer für die kleinen Tiko-Apps. Einstellungen sind Präferenzen, die Betreuende sehen. State ist die app-spezifische Datenmenge, die es wert ist, geräteübergreifend erhalten zu bleiben, wenn das bewusst geschieht.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — Einstellungen lesen.',
            '`PUT /v1/apps/{app}/settings` — Einstellungen mit Versionierung speichern.',
            '`GET /v1/apps/{app}/state` — App-State lesen.',
            '`PUT /v1/apps/{app}/state` — App-State speichern.',
            'Erlaubte P0-App-Namen: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Generierung und Medien',
          title: 'TTS, generiertes Audio, Uploads und Medien-Records',
          body: [
            'Generierung und Medien gehören zusammen, sind aber nicht dasselbe. Generierung erzeugt Assets. Medien verwalten hochgeladene Assets und Metadaten. R2 speichert Bytes; D1 speichert Eigentum und Suchmetadaten.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — Sprachaudio erzeugen oder aus dem Cache holen.',
            '`GET /v1/generation/audio/{id}` — generiertes Audio streamen.',
            '`POST /v1/media/uploads` — Medien-Upload autorisieren und registrieren.',
            '`GET /v1/media/{id}` — Medien-Metadaten oder Zugriffsdetails lesen.',
            '`DELETE /v1/media/{id}` — künftiger Löschvertrag, sobald es dafür eine UX gibt.',
          ],
        },
        {
          eyebrow: 'Content und Verwaltung',
          title: 'Veröffentlichte Inhalte und gefährliche Operationen',
          body: [
            'Content betrifft veröffentlichte Lesemodelle, App-Inhalte und CMS-artige Records. Die Verwaltung ist bewusst getrennt, weil gefährliche Operationen nie in APIs geschmuggelt werden sollten, die Kinder benutzen.',
          ],
          bullets: [
            '`content-api` besitzt veröffentlichte Inhalte, App-Sichtbarkeit, Content-Versionen und cachebare Lesemodelle.',
            '`admin-api` besitzt Backoffice-Konfiguration, Berichte, Moderation, Support-Aktionen und Audit-Logs.',
            'Admin-API-Schlüssel oder -Sitzungen gehören nicht in Abläufe, die Kinder benutzen.',
          ],
        },
      ],
    },
  },
}
