import type { SiteCopy } from '../..'

/** Deutsche Datenschutzerklärung. Die Anker (`id`) bleiben unübersetzt. */
export const dePrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Datenschutzerklärung',
  description: 'Wie die Tiko-Apps und tikotalks.com mit Daten umgehen, in klarer Sprache.',
  eyebrow: 'Datenschutzerklärung',
  title: 'Was wir erheben — und was nicht.',
  lede: 'Tiko macht ruhige, zugängliche Apps für Kinder. Datenschutz ist kein Nachgedanke, sondern Teil der Gestaltung. Diese Erklärung beschreibt in klarer Sprache, wie die Tiko-Apps und tikotalks.com mit Daten umgehen.',
  lastUpdatedLabel: 'Zuletzt aktualisiert',
  lastUpdated: 'Juni 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'Unser Versprechen',
      bullets: [
        'Kostenlos, immer. Wir verkaufen niemals Ihre Daten oder die Aufmerksamkeit eines Kindes für Zugang.',
        'Keine Werbung. Nie. In den Tiko-Apps gibt es keine Werbung, kein Tracking zu Werbezwecken und keine Werbenetzwerke von Dritten.',
        'Keine Login-Hürden. Die Apps für Kinder öffnen und funktionieren ohne Konto.',
        'Wir erheben so wenig wie möglich, und nur das, was eine App wirklich zum Funktionieren braucht.',
      ],
    },
    {
      id: 'device-first',
      title: 'Standardmäßig auf dem Gerät',
      body: [
        'Tiko-Apps sind dafür gebaut, auf dem Gerät zu arbeiten. Ihre Einstellungen, gespeicherten Sätze, Entwürfe und zuletzt genutzten Inhalte liegen lokal, damit die Apps schnell und offline nutzbar bleiben. Wenn Sie eine App ohne Anmeldung benutzen, bleiben diese Inhalte auf Ihrem Gerät.',
      ],
    },
    {
      id: 'accounts',
      title: 'Optionale Konten und Abgleich',
      body: [
        'Tiko nutzt eine gerätebasierte Identität statt Passwörtern. Wenn Sie die Wiederherstellung für Betreuende oder den Abgleich zwischen Geräten aktivieren, speichern wir möglicherweise eine E-Mail-Adresse, um Ihnen einen Anmeldelink zu schicken und Ihre Geräte zu verbinden. Das ist immer optional und immer transparent — die App für das Kind beginnt nie mit dem Anlegen eines Kontos.',
      ],
    },
    {
      id: 'speech',
      title: 'Sprache und Inhalte',
      body: [
        'Einige Apps, etwa Tiko Type und Tiko Talk, können Text vorlesen. Um natürliche Sprache zu erzeugen, kann der Text, den Sie sprechen lassen, an unseren Sprachdienst gehen und dort ausschließlich verarbeitet werden, um Audio zurückzugeben. Wir nutzen diese Inhalte nicht für Werbeprofile und verkaufen sie nicht.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'Was wir nicht tun',
      bullets: [
        'Wir zeigen keine Werbung und nutzen keine Werbe-Tracker.',
        'Wir verkaufen oder vermieten keine personenbezogenen Daten.',
        'Wir verlangen von keinem Kind ein Konto oder persönliche Angaben, um eine App zu benutzen.',
        'Wir machen keine medizinischen, diagnostischen oder therapeutischen Versprechen und erheben dafür auch keine Gesundheitsdaten.',
      ],
    },
    {
      id: 'children',
      title: 'Datenschutz für Kinder',
      body: [
        'Tiko-Apps sind so gestaltet, dass man sie neben einem Kind bedenkenlos öffnen kann. Weil die Apps ohne Konten und ohne Werbung funktionieren, kann ein Kind sie benutzen, ohne persönliche Angaben zu teilen. Richtet eine Betreuungsperson die optionale Wiederherstellung ein, gehören diese Kontodaten der Betreuungsperson, nicht dem Kind.',
      ],
    },
    {
      id: 'retention',
      title: 'Aufbewahrung und Löschung',
      body: [
        'Lokal gespeicherte Inhalte bleiben auf dem Gerät, bis Sie sie löschen oder die App entfernen. Haben Sie ein optionales Konto angelegt, können Sie jederzeit dessen Löschung samt zugehöriger Daten verlangen — schreiben Sie dazu an {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Änderungen dieser Erklärung',
      body: [
        'Ändern wir den Umgang mit Daten, aktualisieren wir diese Seite und passen das Datum oben an. Wesentliche Änderungen machen wir deutlich.',
      ],
    },
    {
      id: 'contact',
      title: 'Kontakt',
      body: [
        'Fragen zum Datenschutz oder zu Ihren Daten? Schreiben Sie an {email} — ein echter Mensch hilft weiter.',
      ],
    },
  ],
}
