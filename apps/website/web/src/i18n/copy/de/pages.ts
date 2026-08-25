import type { SiteCopyOverride } from '../..'

/**
 * German page copy.
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const dePages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Warum es Tiko gibt',
    description:
      'Warum Tiko eine Familie kleiner, kostenloser, mehrsprachiger Apps ist statt einer großen Kommunikationsplattform — und warum nichts davon etwas kostet.',
    eyebrow: 'Warum es Tiko gibt',
    title: 'Fröhlich, einfach und in jeder Sprache.',
    lede: 'Tiko ist eine Familie kleiner, schöner, kostenloser Apps, die Kindern helfen zu kommunizieren, zu wählen, Abläufe zu verfolgen und Zeit zu begreifen. Jede App öffnet in Sekunden, funktioniert in jeder Sprache und verlangt nie ein Konto — denn der erste Schritt sollte das Benutzen sein, nicht das Einrichten.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'Das Problem',
        title: 'Kommunikationshilfen verlangen zu viel, bevor sie helfen.',
        body: [
          'Ein Kind, das noch nicht sagen kann, was es braucht, hat jetzt gerade einen schweren Tag — nicht nach einer Testphase, einer Lizenz, einer Schulung und einem Login. Trotzdem verlangt die meiste Kommunikationssoftware genau diese vier Dinge. Sie kommt als Plattform: ein Konto zum Anlegen, ein Abo zum Rechtfertigen, ein Einstellungsbildschirm zum Durcharbeiten und ein Handbuch zum Lesen, bevor irgendjemand ein Wort herausbringt.',
          'Diese Kosten sind nicht nur Geld. Es sind die zwanzig Minuten, die eine Lehrkraft zwischen zwei Stunden nicht hat, das Vertrauen, das Eltern verlieren, wenn der erste Bildschirm ein Verwaltungsformular ist, und das Spezialgerät, das im Schrank bleibt, weil niemand genau weiß, wie man es einrichtet. Am Ende dient das Werkzeug der Einrichtung, die es gekauft hat, und nicht dem Kind, das es in der Hand hält.',
          'Tiko beginnt am anderen Ende. Der erste Bildschirm ist das Werkzeug. Alles andere — Einstellungen, Wiederherstellung, Abgleich zwischen Geräten — kommt danach, für die Erwachsenen, und nur wenn sie es möchten.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'Die Form',
        title: 'Viele kleine Apps statt einer großen.',
        lede: 'Tiko ist kein Bedienfeld mit Modi. Es ist eine Reihe eigenständiger Apps, von denen jede eine Aufgabe gut erledigt.',
        body: [
          'Ein Kind, das lernt, auf eine Frage zu antworten, braucht auf demselben Bildschirm keinen Satzbaukasten. Ein Kind, das einem Morgenablauf folgt, braucht keine Tastatur. Jedes zusätzliche Bedienelement ist eine weitere Sache, die man falsch lesen, falsch antippen oder als Ablenkung erleben kann — und für ein Kind, das ohnehin hart daran arbeitet, verstanden zu werden, sind diese Kosten real.',
          'Deshalb ist jede Tiko-App ihre eigene App. Yes No sind zwei Tasten. Type ist ein Textfeld und eine Sprechtaste. First zeigt einen Schritt nach dem anderen. Man öffnet die App, die zum Moment passt, und auf dem Bildschirm steht fast nichts anderes.',
        ],
        points: [
          {
            title: 'Ein Bildschirm, eine Aufgabe',
            body: 'Jede App öffnet direkt dort, wo sie arbeitet. Kein Startbildschirm zum Navigieren, kein Modus, den man vorher wählen muss.',
          },
          {
            title: 'Einmal lernen',
            body: 'Weil eine App eine Sache tut, kann ein Kind sie vollständig lernen. Sicherheit entsteht durch ein Werkzeug, das sich jedes Mal gleich verhält.',
          },
          {
            title: 'Nichts, dem man entwächst',
            body: 'Mit Yes No anzufangen bindet niemanden. Die Apps sind getrennt, der Wechsel zu Talk oder Type ist also das Öffnen einer anderen App — keine Kontomigration.',
          },
          {
            title: 'Klein genug, um zu vertrauen',
            body: 'Ein Werkzeug, das eine Betreuungsperson in einer Minute versteht, ist eines, zu dem sie in einem schwierigen Moment tatsächlich greift.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Sprache',
        title: 'Mehrsprachig von Anfang an, nicht nachträglich übersetzt.',
        body: [
          'Eine Kommunikationshilfe, die nur in einer Sprache funktioniert, lässt genau die Kinder außen vor, die sie am dringendsten brauchen: das Kind in einem zweisprachigen Zuhause, das Kind, dessen Familiensprache nicht die Schulsprache ist, das Kind, das das Land gewechselt und seine Worte zweimal verloren hat.',
          'Tiko spricht die Sprache des Kindes, nicht die der Entwickler. Oberfläche, gesprochene Ausgabe und Inhalte sind übersetzbar, und die Sprache, die eine Betreuungsperson wählt, begleitet sie durch jede Tiko-App und über diese Website. Wo es für eine Sprache noch keine Übersetzung der Oberfläche gibt, greift die App für diese Wörter auf Englisch zurück, statt sich zu verweigern.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Warum kostenlos',
        title: 'Weil Zugang kein Preisschild haben sollte.',
        lede: 'Die Tiko-Apps sind kostenlos, immer. Keine Testphase, kein Anreißer, kein Verkaufstrichter.',
        body: [
          'Kommunikation ist keine Zusatzfunktion. Ein Kind sollte eine Tiko-App jetzt sofort öffnen können, ohne dass ein Erwachsener zuerst entscheidet, ob dieser eine Moment das Geld wert ist — denn diese Entscheidung fällt unter Druck meist gegen das Kind aus.',
        ],
        points: [
          {
            title: 'Kein Zögern',
            body: 'Probieren Sie ein Werkzeug sofort mit einem Kind aus, ohne abzuwägen, ob der Moment die Kosten rechtfertigt.',
          },
          {
            title: 'Kein Druck',
            body: 'Keine Dringlichkeit, keine Scham, keine Werbung, keine Upgrade-Hinweise. Nichts macht aus Verstandenwerden ein Geschäft.',
          },
          {
            title: 'Kein versteckter Handel',
            body: 'Kostenlos heißt hier nicht werbefinanziert. Tiko tauscht weder die Aufmerksamkeit noch die Daten eines Kindes gegen Zugang — es gibt nichts zu tauschen, weil nichts erhoben wird.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'Was Tiko nicht ist',
        title: 'Ein Werkzeug, keine Behandlung.',
        body: [
          'Tiko stellt keine Diagnosen, behandelt nicht und verspricht keine Ergebnisse. Es ist kein Therapieprogramm, keine Diagnostik und kein Ersatz für eine Logopädin oder einen Logopäden. Es gibt keine Punkte, keine Fortschritts-Dashboards und keine Berichte, die ein Kind mit einem anderen vergleichen.',
          'Was Tiko bietet, ist ein gutes Werkzeug für einen bestimmten Moment: eine Möglichkeit zu antworten, zu wählen, einen Satz zu sagen, einem Ablauf zu folgen. Therapeutinnen und Lehrkräfte nutzen es neben ihrer eigenen Arbeit, Familien in den gewöhnlichen Stunden zwischen den Terminen. Das ist bewusst ein kleinerer Anspruch, als ihn die meiste Software in diesem Bereich erhebt.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Wer es prägt',
        title: 'Mit Therapeutinnen entwickelt, nicht nur für sie.',
        lede: 'Logopädinnen, Lehrkräfte und andere Fachleute schauen sich Tiko an und sagen uns, was daran nicht stimmt.',
        body: [
          'Entwickler können eine Kommunikationshilfe bauen, die funktioniert. Ob sie für ein Kind funktioniert, das darum ringt, verstanden zu werden, ist eine ganz andere Frage — und sie lässt sich nicht durch Lesen einer Dokumentation beantworten. Sie beantworten die Menschen, die jede Woche mit diesen Kindern arbeiten.',
          'Deshalb sehen sich Logopädinnen, Förderlehrkräfte und andere Fachleute die Apps an — und ihre Rückmeldungen verändern sie. Manches ist klein: ein Ziel, das zu dicht am nächsten liegt, ein Wort, das in einem Dialekt falsch ist, eine Belohnung, die für ihre Kinder zu aufregend ist. Manches nicht: dass Say keinen Fehlerton hat und keine Tiko-App Punkte zählt, kam beides aus dieser Richtung.',
          'Das ist keine klinische Empfehlung, und Tiko behauptet auch keine. Es ist Design-Review durch Menschen, deren Urteil bei den wichtigsten Fragen mehr wiegt als unseres — und der Grund, warum mehrere Apps heute so aussehen, wie sie aussehen, und nicht wie am Anfang.',
        ],
        points: [
          {
            title: 'Aus therapeutischer Sicht geprüft',
            body: 'Fachleute schauen auf die Apps mit den Kindern im Kopf, die sie begleiten, und sagen klar, wo etwas im Weg steht.',
          },
          {
            title: 'Rückmeldungen, die das Produkt verändern',
            body: 'Wenn eine Rückmeldung sagt, ein Muster passt für diese Kinder nicht, wird das Muster geändert. Entfernte Fehlertöne und fehlende Punktzahlen kamen genau daher.',
          },
          {
            title: 'Trotzdem keine Behandlung',
            body: 'Fachlicher Input macht Tiko besser gestaltet. Er macht daraus kein Therapieprogramm, und wir stellen es auch nicht so dar.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Offen von Haus aus',
        title: 'Offen gebaut, geprägt von denen, die es benutzen.',
        body: [
          'Tiko ist quelloffen. Der Code, die Inhaltsverträge und die API-Formen sind öffentlich. Ein Schulträger, eine Therapeutin oder ein Entwickler kann also genau nachsehen, was eine App mit den Daten eines Kindes tut — bei den meisten Tiko-Apps nämlich gar nichts.',
          'Es bedeutet auch, dass die Richtung von den Menschen kommt, die es benutzen. Eltern, Therapeutinnen und Lehrkräfte beschreiben viel genauer, was fehlt, als es eine im stillen Kämmerlein geschriebene Roadmap könnte — und ein offenes Projekt kann darauf reagieren, ohne auf einen Geschäftsfall zu warten.',
        ],
      },
    ],
    cta: {
      title: 'Öffnen Sie eine und sehen Sie selbst.',
      body: 'Am schnellsten beurteilt man Tiko, indem man es zwei Minuten lang mit einem Kind benutzt. Kein Konto, kein Download, kein Wartezimmer.',
      primaryLabel: 'Apps entdecken',
      primaryPath: '/apps',
      secondaryLabel: 'So funktioniert es',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'So funktioniert Tiko',
    description:
      'Wie Tiko-Apps ohne Konto öffnen, was auf dem Gerät passiert und wie die optionale Wiederherstellung für Betreuende funktioniert.',
    eyebrow: 'So funktioniert Tiko',
    title: 'Erst öffnen. Das Einrichten bleibt im Hintergrund.',
    lede: 'Tiko beginnt auf dem Gerät. Apps öffnen und funktionieren sofort. Die Wiederherstellung für Betreuende kann später über einen Magic Link per E-Mail dazukommen — nie bevor das Kind das Werkzeug benutzen darf.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'Der Ablauf',
        title: 'Drei Momente, keine Reibung.',
        steps: [
          {
            title: 'Den Link öffnen',
            body: 'Eine Betreuungsperson teilt einen Link, legt ein Lesezeichen an oder installiert die App aus dem App Store. Es gibt nichts zu lizenzieren und niemanden zu fragen.',
          },
          {
            title: 'Sofort benutzen',
            body: 'Die App ist bereit: keine Anmeldung, kein Tutorial, kein Onboarding. Das Kind sieht direkt das Werkzeug selbst.',
          },
          {
            title: 'Später wiederherstellen, wenn Sie möchten',
            body: 'Sollen die Einstellungen auf ein anderes Gerät mitkommen, hinterlegt die Betreuungsperson einmal eine E-Mail-Adresse und bestätigt sie. Das ist optional, geschieht im Nachhinein, und das Kind sieht nichts davon.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identität auf dem Gerät',
        title: 'Niemals Passwörter.',
        body: [
          'Jede Tiko-App legt beim ersten Öffnen eine Gerätesitzung an. Sie entsteht lokal, gehört zu diesem Gerät und reicht für alles, was die App kann. Keine E-Mail-Adresse, kein Passwort, kein Konto.',
          'Das ist der Punkt, den die meiste Kommunikationssoftware verkehrt herum angeht. Ein Konto gibt es, damit ein Unternehmen jemanden über Geräte hinweg wiedererkennt — ein echtes Bedürfnis, aber ein erwachsenes, und es wird dem Kind meist als Eintrittspreis vorangestellt. Tiko behandelt es als das, was es ist: eine optionale Bequemlichkeit für die Betreuungsperson, später angeboten.',
        ],
        points: [
          {
            title: 'Gerätesitzung',
            body: 'Wird beim ersten Öffnen automatisch angelegt, bleibt lokal und verlangt nie ein Login.',
          },
          {
            title: 'Wiederherstellung per Magic Link',
            body: 'Optional. Eine Betreuungsperson hinterlegt eine E-Mail-Adresse und bestätigt sie einmal, um den Abgleich zwischen Geräten zu aktivieren.',
          },
          {
            title: 'Kein Aufwand für das Kind',
            body: 'Wiederherstellung und Verwaltung sind nur für Erwachsene. Einem Kind wird nie ein Kontoformular gezeigt.',
          },
          {
            title: 'Überall gleich',
            body: 'Sitzungen funktionieren im Web, unter iOS und unter Android gleich, damit sich eine App überall identisch verhält.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Verlässlichkeit',
        title: 'Es funktioniert weiter, wenn das Netz es nicht tut.',
        body: [
          'Tiko-Apps laden ihre Kerninhalte auf das Gerät und laufen von dort. Eine abgebrochene Verbindung, ein Schulnetz, das das halbe Internet blockiert, oder eine Autofahrt ohne Empfang nimmt einem Kind nicht die Möglichkeit, auf eine Frage zu antworten.',
          'Alles, was wirklich das Netz braucht — Einstellungen abgleichen, ein neues Bilderset laden — kommt obendrauf. Schlägt es fehl, macht die App einfach weiter wie zuvor.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Was erhoben wird',
        title: 'Fast nichts, und nie vom Kind.',
        body: [
          'Die meisten Tiko-Apps erheben überhaupt nichts. Es gibt keine Analyse der Tipps eines Kindes, keine Werbe-IDs und keine Tracker von Dritten. Spracherkennung läuft, wo eine App sie nutzt, auf dem Gerät, sofern die Plattform das unterstützt; Aufnahmen werden nie gespeichert oder hochgeladen.',
          'Wo eine App doch etwas speichert — eigene Karten einer Betreuungsperson, ein selbst gebauter Ablauf, ein gespeicherter Satz —, ist es Inhalt, den ein Erwachsener bewusst angelegt hat, und er bleibt auf dem Gerät, solange der Abgleich nicht eingeschaltet wird.',
        ],
        points: [
          {
            title: 'Keine Werbung, nie',
            body: 'Keine Werbung, keine Werbenetzwerke und kein Tracking zu Werbezwecken in irgendeiner Tiko-App.',
          },
          {
            title: 'Keine Login-Hürde',
            body: 'Die Apps für Kinder öffnen und funktionieren ganz ohne Konto.',
          },
          {
            title: 'Auf dem Gerät, wo möglich',
            body: 'Spracherkennung nutzt die geräteeigene Engine der Plattform, wo es sie gibt. Aufnahmen werden nicht aufbewahrt.',
          },
          {
            title: 'Offen nachlesbar',
            body: 'Die Apps sind quelloffen, die Aussagen auf dieser Seite lassen sich also prüfen statt bloß glauben.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Ein Tiko, viele Bildschirme',
        title: 'Überall dasselbe Erlebnis.',
        body: [
          'Das Web ist der schnellste Weg, Tiko auszuprobieren: ein Link genügt. Native Apps ergänzen, was ein Browser weniger gut kann — Verlässlichkeit offline, ein Symbol auf dem Home-Bildschirm, das ein Kind wiedererkennt, und bessere Sprachunterstützung.',
          'Was Sie auch nutzen: Die App verhält sich gleich. Unter allem liegen dieselben Verträge, ein auf dem Tablet gebauter Ablauf ist also derselbe Ablauf auf dem Telefon.',
        ],
      },
    ],
    cta: {
      title: 'Sie möchten die technischen Details?',
      body: 'Die Architektur- und API-Dokumentation beschreibt, wie Workers, Speicher und Clients zusammenspielen.',
      primaryLabel: 'Architektur-Doku',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'API-Verträge',
      secondaryPath: '/docs/apis',
    },
  },
}
