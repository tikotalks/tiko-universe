import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** German copy for the audience-facing and help pages. */
export const deAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Für Betreuende',
    description:
      'Was Tiko Eltern und Betreuenden zusagt: kein Konto vor der Nutzung, keine Werbung, kein Tracking — und Werkzeuge, die man in einem schwierigen Moment ohne Vorbereitung ausprobieren kann.',
    eyebrow: 'Für Betreuende',
    title: 'So gebaut, dass der erste Moment kein Kontoformular ist.',
    lede: 'Man sollte ein Werkzeug ausprobieren können, bevor man ihm vertraut. Tiko ist so gestaltet, dass eine Betreuungsperson eine App öffnen, sehen kann, ob sie hilft, und Wiederherstellung oder Abgleich erst dann ergänzt, wenn es wirklich darauf ankommt.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Vertrauensgrundsätze',
        title: 'Woran wir nicht rütteln.',
        lede: 'Das sind Zusagen, keine aktuellen Einstellungen. Sie ändern sich nicht, wenn sich die Umstände ändern.',
        points: [
          {
            title: 'Kostenlos, immer',
            body: 'Wir verkaufen niemals Ihre Daten oder die Aufmerksamkeit eines Kindes für Zugang. Die Apps sind kostenlos, weil Geld für Kommunikation zu verlangen der falsche Handel ist.',
          },
          {
            title: 'Keine Werbung. Nie.',
            body: 'In keiner Tiko-App gibt es Werbung, Tracking zu Werbezwecken oder Werbenetzwerke von Dritten.',
          },
          {
            title: 'Keine Login-Hürden',
            body: 'Die Apps für Kinder öffnen und funktionieren ohne Konto. Nichts steht zwischen einem Kind und dem Verstandenwerden.',
          },
          {
            title: 'So wenig wie möglich',
            body: 'Wir erheben nur, was eine App wirklich zum Funktionieren braucht — und die meisten Tiko-Apps brauchen gar nichts.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Erste Schritte',
        title: 'Sie müssen nichts vorbereiten.',
        body: [
          'Es gibt keinen richtigen Anfang und nichts, was vorher eingerichtet werden müsste. Öffnen Sie die App, die zu dem Moment passt, in dem Sie gerade stecken — eine Frage, die beantwortet werden will, ein Ablauf, der zu schaffen ist, ein Wort zum Üben — und benutzen Sie sie. Hilft sie nicht, schließen Sie sie wieder. Es wurde nichts ausgegeben und nichts abgeschlossen.',
          'Die meisten Betreuenden finden eine App, die passt, und bleiben lange dabei. Das ist ein gutes Ergebnis, kein eingeschränktes. Tiko will nicht der Ort werden, an dem Ihr Kind seinen Tag verbringt.',
        ],
        steps: [
          {
            title: 'Beginnen Sie mit dem Moment, nicht mit der App',
            body: 'Wählen Sie die App, die zu etwas passt, das heute ansteht. Yes No für eine Frage, First für einen Ablauf, Type für eine Nachricht, die gesagt werden muss.',
          },
          {
            title: 'Benutzen Sie sie neben Ihrem Kind',
            body: 'Das sind Werkzeuge für zwei Menschen. Daneben zu sitzen und einen Tipp oder einen Satz vorzumachen, bringt mehr, als das Gerät zu überreichen.',
          },
          {
            title: 'Machen Sie sie zu seiner App',
            body: 'Setzen Sie eigene Fotos, eigene Wörter, den eigenen Ablauf ein. Ein Foto der tatsächlichen Schuhe Ihres Kindes schlägt jedes Symbolbild von Schuhen.',
          },
          {
            title: 'Wiederherstellung nur, wenn Sie sie wollen',
            body: 'Sollen die Einstellungen auf ein anderes Gerät mitkommen, hinterlegen Sie einmal eine E-Mail-Adresse. Wenn nicht, lassen Sie es — sonst ändert sich nichts.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Ehrlich gesagt',
        title: 'Was Tiko tut und was nicht.',
        body: [
          'Tiko stellt keine Diagnosen, behandelt nicht und verspricht keine Ergebnisse. Es sagt Ihnen nicht, ob Ihr Kind Fortschritte macht, und führt bewusst keine Punktestände, die das andeuten könnten. Wenn Sie eine Einschätzung möchten, ist das die Arbeit einer Logopädin — und eine gute ist weit mehr wert als jede App.',
          'Was Tiko kann: bestimmten Momenten die Reibung nehmen — gefragt zu werden und antworten zu können, zu wissen, was als Nächstes kommt, einen Satz herauszubekommen, der sonst stecken bliebe. Diese Momente zählen, und sie sind Aufgabe genug für ein Werkzeug.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Datenschutz',
        title: 'Was mit den Daten Ihres Kindes passiert.',
        body: [
          'In den meisten Tiko-Apps verlässt nichts das Gerät. Karten, die Sie anlegen, Abläufe, die Sie bauen, und Sätze, die Sie speichern, bleiben lokal. Es gibt keine Analyse dessen, was ein Kind antippt, und keine Werbe-IDs.',
          'Schalten Sie den Abgleich ein, wird der von Ihnen erstellte Inhalt gespeichert, damit er Ihre anderen Geräte erreicht. Das ist Inhalt, den ein Erwachsener bewusst angelegt hat — nie ein Protokoll darüber, wie ein Kind die App benutzt hat. Was genau aufbewahrt wird, steht in der Datenschutzerklärung, und weil Tiko quelloffen ist, können Sie es auch im Code nachsehen, statt uns zu glauben.',
        ],
      },
    ],
    cta: {
      title: 'Probieren Sie es heute mit Ihrem Kind.',
      body: 'Öffnen Sie eine App und benutzen Sie sie zwei Minuten lang. Das sagt Ihnen mehr als jede Beschreibung auf dieser Seite.',
      primaryLabel: 'Apps entdecken',
      primaryPath: '/apps',
      secondaryLabel: 'Datenschutzerklärung lesen',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Für Lehrkräfte und Therapeutinnen',
    description:
      'Tiko in Klasse und Praxis: eigene Profile pro Kind, keine Lizenz pro Platz, nichts zu installieren und keine Daten, die das Gerät verlassen.',
    eyebrow: 'Für Lehrkräfte und Therapeutinnen',
    title: 'Viele Kinder begleiten. Jedes Erlebnis ruhig halten.',
    lede: 'Mit dem Tiko Profilmanager legen Lehrkräfte und Therapeutinnen für jedes Kind ein eigenes, schlankes Profil an — und bestimmen genau, worauf es zugreifen kann. Kinder bekommen ein einfaches, fokussiertes Werkzeug. Die Bedienelemente bleiben bei den Erwachsenen.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'Im Unterricht',
        title: 'Gebaut für die zwanzig Minuten, die Sie wirklich haben.',
        body: [
          'Software, die in einer Schule ankommt, setzt meist voraus, dass jemand Zeit zum Einrichten hat. In Wirklichkeit hat die Person mit dem Tablet die paar Minuten zwischen zwei Stunden — und ein Kind, das jetzt eine Antwort braucht.',
          'Tiko ist für diese Realität gebaut. Auf einem verwalteten Gerät gibt es nichts zu installieren außer einen Link zu öffnen, keinen Lizenzschlüssel durch die Beschaffung zu jagen und keinen Fortbildungstag, bevor etwas nutzbar wird. Passt es nicht zu Ihrem Umfeld, haben Sie ein paar Minuten verloren statt einer Haushaltsposition.',
        ],
        points: [
          {
            title: 'Keine Lizenz pro Platz',
            body: 'Kostenlos für jedes Kind in Ihrer Klasse oder Praxis. Keine Kopfzahl zu melden, keine Verlängerung zu rechtfertigen.',
          },
          {
            title: 'Nichts auszurollen',
            body: 'Die Web-Apps laufen über einen Link auf einem verwalteten Gerät. Native Apps sind eine ganz normale Installation aus dem App Store.',
          },
          {
            title: 'Keine Kinderkonten',
            body: 'Kinder legen nie Logins an und hantieren nie mit Passwörtern, was das Werkzeug aus den meisten Prüfverfahren zum Kinderschutz heraushält.',
          },
          {
            title: 'Funktioniert im Netz, das Sie haben',
            body: 'Apps laufen nach dem ersten Öffnen offline, ein gefiltertes oder unzuverlässiges Schulnetz stoppt also keine Sitzung.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Viele Kinder',
        title: 'Ein eigenes Profil für jedes Kind.',
        body: [
          'Eine Praxis ist nicht ein Benutzer. Jedes Kind braucht seinen eigenen Wortschatz, seine eigenen Abläufe und seine eigenen Bilder — und keines davon sollte die eines anderen Kindes sehen.',
          'Der Profilmanager hält all das auf demselben Gerät getrennt. Sie wechseln als Erwachsene zwischen den Profilen, und jedes Kind sieht beim Öffnen einer App nur seine eigenen Inhalte. Die Steuerung liegt hinter denselben Erwachsenen-Abläufen wie überall in Tiko, ein neugieriges Kind landet also nicht in den Einstellungen.',
        ],
        points: [
          {
            title: 'Inhalte pro Kind',
            body: 'Karten, Abläufe und gespeicherte Sätze gehören zu einem Profil, nicht zum Gerät.',
          },
          {
            title: 'Wechsel nur durch Erwachsene',
            body: 'Das Profil zu wechseln ist eine Handlung für Erwachsene. Kinder bleiben in der App, die man ihnen gegeben hat.',
          },
          {
            title: 'Für geteilte Geräte gemacht',
            body: 'Gebaut für das Tablet, das im Lauf des Tages von Kind zu Kind wandert — so arbeiten die meisten Einrichtungen tatsächlich.',
          },
          {
            title: 'Keine Einsicht ins andere Profil',
            body: 'Wortschatz und Verlauf eines Kindes sind aus einem anderen Profil nie sichtbar.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'Neben Ihrer Arbeit',
        title: 'Ein Werkzeug in Ihrer Hand, kein Programm zum Abarbeiten.',
        body: [
          'Tiko hat kein eingebautes Curriculum, keine vorgeschriebene Reihenfolge und keine Meinung dazu, wie eine Sitzung ablaufen sollte. Es bewertet kein Kind, ordnet es keiner Norm zu und erzeugt keinen Bericht. Diese Einschätzungen sind Ihre, und die Belege dafür kommen aus Ihrer Beobachtung, nicht aus der Telemetrie einer App.',
          'Was Tiko Ihnen gibt, sind verlässliche, reibungsarme Werkzeuge für die Arbeit, die Sie ohnehin tun: eine Möglichkeit, eine Ja-Nein-Wahl anzubieten, einen Satz zu bauen, die Aufmerksamkeit auf einem Schritt zu halten oder ein Wort zu üben, ohne dass ein Fehlerton den Fehlversuch bestraft.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Daten und Kinderschutz',
        title: 'Kurzfassung: Es bleibt auf dem Gerät.',
        body: [
          'Die meisten Tiko-Apps senden nirgendwohin etwas. Es gibt keine Analyse kindlicher Interaktionen, keine Werbung und keine Tracker von Dritten. Spracherkennung läuft, wo sie genutzt wird, auf dem Gerät, sofern die Plattform es erlaubt, und Aufnahmen werden nie gespeichert.',
          'Weil die Apps quelloffen sind, kann Ihre IT oder Ihre Kinderschutzbeauftragte das überprüfen, statt sich auf eine Zusicherung im Prospekt zu verlassen. Braucht Ihre Einrichtung es schriftlich: Datenschutzerklärung und Architekturdokumentation sind beide öffentlich.',
        ],
      },
    ],
    cta: {
      title: 'Probieren Sie es zuerst mit einem Kind.',
      body: 'Nehmen Sie diese Woche eine App und ein Kind. Das ist ein fairerer Test als jede Bewertungsmatrix — und er kostet nichts.',
      primaryLabel: 'Apps entdecken',
      primaryPath: '/apps',
      secondaryLabel: 'Vertrauensgrundsätze',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Häufige Fragen',
    description:
      'Klare Antworten dazu, was Tiko ist, was es kostet, was es erhebt und was es bewusst nicht behauptet.',
    eyebrow: 'Häufige Fragen',
    title: 'Klare Antworten, noch vor dem Einrichten.',
    lede: 'Kurze Antworten auf die Fragen, die Betreuende, Lehrkräfte und Entwickler am häufigsten stellen. Ist Ihre nicht dabei, ist ein echter Mensch eine E-Mail entfernt.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'Die Grundlagen',
        title: 'Was Tiko ist.',
        questions: [
          {
            question: 'Was ist Tiko?',
            answer:
              'Tiko ist eine Sammlung kleiner, kostenloser Apps, die Kindern helfen zu kommunizieren, zu wählen, Abläufe zu verfolgen und Zeit zu begreifen. Jede App tut eine klare Sache und öffnet sofort — in jeder Sprache, auf jedem Gerät, ohne Konto.',
          },
          {
            question: 'Warum viele Apps statt einer?',
            answer:
              'Weil jedes zusätzliche Bedienelement eine weitere Sache ist, die ein Kind falsch lesen oder falsch antippen kann. Eine App, die eine Aufgabe hat, lässt sich vollständig lernen — und ein Kind, das sie gelernt hat, kann ihr vertrauen. Yes No sind zwei Tasten; daraus sollte nie ein Satzbaukasten wachsen.',
          },
          {
            question: 'Für wen ist Tiko?',
            answer:
              'Für Kinder, die Unterstützung beim Ausdrücken brauchen — wegen einer Sprech- oder Sprachstörung, einer Entwicklungsverzögerung, einer Behinderung oder einfach, weil sie noch am Anfang des Sprechens stehen — und für die Eltern, Lehrkräfte und Therapeutinnen an ihrer Seite. Nichts davon setzt eine Diagnose voraus.',
          },
          {
            question: 'Welche Apps gibt es heute?',
            answer:
              'Yes No, Type, Talk, Say, Sum und First sind verfügbar, je nach App im Web oder im App Store. Cards, Sequence und Timer werden noch gebaut. Die Apps-Seite zeigt genau, wo sich jede öffnen lässt.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Kosten',
        title: 'Was es kostet und warum.',
        questions: [
          {
            question: 'Ist Tiko wirklich kostenlos?',
            answer:
              'Ja. Die Tiko-Apps sind kostenlos, immer. Keine befristete Vorschau, kein Anreißer, kein Verkaufstrichter. Es gibt keine Bezahlstufe, die eine Funktion zurückhält, die ein Kind braucht.',
          },
          {
            question: 'Wird Tiko Werbung zeigen?',
            answer:
              'Nein. Keine Werbung, nie. Tiko soll man neben einem Kind öffnen können, ohne kommerzielle Inhalte, gesponserte Hinweise oder irgendetwas, das auf Aufmerksamkeit aus ist.',
          },
          {
            question: 'Wenn es kostenlos und werbefrei ist — wie wird es finanziert?',
            answer:
              'Tiko ist als Open-Source-Projekt gebaut, nicht als Unternehmen mit Wachstumsziel. Das hält die laufenden Kosten klein — die Apps sind winzig, und die meisten sprechen mit gar keinem Server.',
          },
          {
            question: 'Sind die Daten meines Kindes die Bezahlung?',
            answer:
              'Nein. Kostenlos heißt hier nicht werbefinanziert. Die meisten Tiko-Apps erheben nichts, es gäbe also nichts zu verkaufen, selbst wenn wir wollten.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Konten und Datenschutz',
        title: 'Was Sie dafür hergeben müssen.',
        questions: [
          {
            question: 'Brauche ich ein Konto?',
            answer:
              'Nein. Tiko-Apps öffnen und funktionieren ohne Login-Hürde. Die optionale Wiederherstellung für Betreuende ist später über einen Magic Link per E-Mail möglich, aber die App für das Kind beginnt nie mit dem Anlegen eines Kontos.',
          },
          {
            question: 'Welche Daten erhebt Tiko?',
            answer:
              'In den meisten Apps keine. Es gibt keine Analyse dessen, was ein Kind antippt, keine Werbe-IDs und keine Tracker von Dritten. Was Sie anlegen — Karten, Abläufe, gespeicherte Sätze — bleibt auf dem Gerät, solange Sie den Abgleich nicht einschalten.',
          },
          {
            question: 'Nimmt Tiko die Stimme meines Kindes auf?',
            answer:
              'Wo eine App zuhört, läuft die Spracherkennung auf dem Gerät, sofern die Plattform das unterstützt, und Aufnahmen werden nie gespeichert oder hochgeladen. Apps, die kein Mikrofon brauchen, fragen auch nie danach.',
          },
          {
            question: 'Kann ich das überprüfen?',
            answer:
              'Ja, und Sie sollten es. Tiko ist quelloffen, der Code hinter diesen Aussagen ist also öffentlich. Die Datenschutzerklärung beschreibt in klarer Sprache, was aufbewahrt wird.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'Was Tiko nicht ist',
        title: 'Die Grenzen, klar benannt.',
        questions: [
          {
            question: 'Ist Tiko ein Therapie- oder Medizinprodukt?',
            answer:
              'Nein. Tiko stellt keine Diagnosen, behandelt nicht und verspricht keine Ergebnisse. Es ist eine Sammlung von Kommunikations- und Lernwerkzeugen, keine klinische Maßnahme und kein Ersatz für eine Logopädin oder einen Logopäden.',
          },
          {
            question: 'Verfolgt Tiko den Fortschritt?',
            answer:
              'Nein, und zwar bewusst. Es gibt keine Punkte, Serien oder Dashboards. Fortschritt in der Kommunikation sollte keine App benoten, und eine Zahl auf dem Bildschirm prägt eher das Verhalten der Erwachsenen als das des Kindes.',
          },
          {
            question: 'Wird es bei meinem Kind funktionieren?',
            answer:
              'Wir wissen es ehrlich nicht, und wer etwas anderes behauptet, rät. Die Apps sind kostenlos und sofort offen — der günstigste Weg, es herauszufinden, ist, eine ein paar Minuten lang auszuprobieren.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Praktisches',
        title: 'Geräte, Sprachen und Offline-Nutzung.',
        questions: [
          {
            question: 'Welche Sprachen spricht Tiko?',
            answer:
              'Die Apps sind von Grund auf mehrsprachig, und die Sprache, die eine Betreuungsperson wählt, begleitet sie durch jede Tiko-App und über diese Website. Wo es für eine Sprache noch keine Übersetzung der Oberfläche gibt, greift die App auf Englisch zurück, statt sich zu verweigern.',
          },
          {
            question: 'Funktioniert es offline?',
            answer:
              'Ja. Die Apps laden ihre Kerninhalte auf das Gerät und arbeiten ohne Netz weiter. Alles, was das Internet braucht, kommt obendrauf, und wenn es nicht erreichbar ist, hält das die App nicht auf.',
          },
          {
            question: 'Auf welchen Geräten läuft es?',
            answer:
              'In jedem modernen Browser, dazu native iPhone- und iPad-Apps für die, die im App Store erschienen sind. Android folgt demselben Ansatz.',
          },
          {
            question: 'Kann ich es in einer Klasse oder Praxis einsetzen?',
            answer:
              'Ja. Der Profilmanager hält pro Kind ein eigenes Profil auf einem geteilten Gerät, und es gibt keine Lizenz pro Platz zu kaufen oder zu melden.',
          },
        ],
      },
    ],
    cta: {
      title: 'Noch eine Frage offen?',
      body: 'Support ist ein Mensch, keine Ticket-Warteschlange. Fragen Sie, und Sie bekommen eine klare Antwort.',
      primaryLabel: 'Support erhalten',
      primaryPath: '/support',
      secondaryLabel: 'Warum es Tiko gibt',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Support',
    description:
      'Hilfe zu den Tiko-Apps für Kinder, Betreuende und Lehrkräfte — häufige Themen, Fehlerbehebung und der Weg zu einem Menschen.',
    eyebrow: 'Support',
    title: 'Wir helfen gern.',
    lede: 'Hilfe zu den Tiko-Apps für Kinder, Betreuende und Lehrkräfte. Die meisten Antworten stehen unten — und ein echter Mensch ist eine E-Mail entfernt.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Häufige Themen',
        title: 'Schnelle Antworten für den Anfang.',
        points: [
          {
            title: 'Erste Schritte',
            body: 'Jede Tiko-App öffnet sofort — kein Konto, kein Passwort nötig. Link öffnen oder App installieren und loslegen.',
          },
          {
            title: 'Konten und Geräte',
            body: 'Tiko nutzt Gerätesitzungen statt Passwörter. Wenn Sie das Gerät wechseln oder zurücksetzen, hinterlegen Sie vorher eine Wiederherstellungs-E-Mail, damit Ihre Inhalte mitkommen.',
          },
          {
            title: 'Stimmen und Sprachen',
            body: 'Wählen Sie eine Stimme und eine Sprache, die zum Kind passen. Tiko-Apps unterstützen viele Sprachen und wechseln sofort über die Einstellungen.',
          },
          {
            title: 'Offline-Nutzung',
            body: 'Apps arbeiten nach dem ersten Öffnen ohne Netz weiter. Der Abgleich läuft von selbst wieder an, sobald eine Verbindung besteht.',
          },
          {
            title: 'Datenschutz und Daten',
            body: 'Die meisten Apps speichern nichts außerhalb des Geräts. Was Sie anlegen, bleibt lokal, solange Sie den Abgleich nicht bewusst einschalten.',
          },
          {
            title: 'Etwas funktioniert nicht?',
            body: 'Schreiben Sie uns, was Sie gesehen haben, auf welchem Gerät und in welcher App. Das reicht uns meistens, um es zu finden.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Fehlerbehebung',
        title: 'Die drei Dinge, die die meisten Probleme lösen.',
        steps: [
          {
            title: 'App neu laden',
            body: 'Schließen Sie sie ganz und öffnen Sie sie erneut. Web-Apps aktualisieren sich im Hintergrund, und ein Neuladen holt die neueste Fassung.',
          },
          {
            title: 'Sprache und Stimme prüfen',
            body: 'Klingt die Sprachausgabe falsch oder bleibt stumm, ist die gewählte Stimme womöglich nicht auf dem Gerät installiert. Probieren Sie in den Einstellungen eine andere — unter iOS installiert man zusätzliche Stimmen in den Bedienungshilfen des Systems.',
          },
          {
            title: 'Prüfen, ob das Gerät stummgeschaltet ist',
            body: 'Ein Stummschalter oder ein stummgeschalteter Tab steckt hinter mehr „die Sprachausgabe ist kaputt“-Meldungen als alles andere.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Kontakt',
        title: 'Fragen Sie einen Menschen.',
        body: [
          'Support beantworten die Menschen, die Tiko bauen, keine Warteschlange. Es gibt keine Ticketnummer und keine Support-Stufen — Sie bekommen eine klare Antwort, auch dann, wenn die Antwort lautet, dass etwas kaputt oder nicht geplant ist.',
          'Wenn Sie ein Problem melden, helfen am meisten: die App, das Gerät samt Browser- oder Systemversion, was Sie erwartet haben und was stattdessen passiert ist. Ein Screenshot schlägt jede Beschreibung.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Mitmachen',
        title: 'Melden, vorschlagen oder mitbauen.',
        body: [
          'Tiko ist quelloffen, ein Fehlerbericht ist also wirklich nützlich und ein Pull Request willkommen. Die Richtung des Projekts kommt größtenteils von Eltern, Therapeutinnen und Lehrkräften, die beschreiben, was fehlt — das ist weit genauer als eine Roadmap, die ohne sie geschrieben wurde.',
          'Wenn Sie mit Kindern arbeiten, die Kommunikationshilfen nutzen, und hier etwas nicht stimmt, hören wir das lieber, als es nicht zu erfahren.',
        ],
      },
    ],
    cta: {
      title: 'Lesen Sie zuerst die Antworten.',
      body: 'Die FAQ behandelt Kosten, Datenschutz, Konten und das, was Tiko bewusst nicht tut.',
      primaryLabel: 'FAQ lesen',
      primaryPath: '/faq',
      secondaryLabel: 'So funktioniert es',
      secondaryPath: '/how-it-works',
    },
  },
}
