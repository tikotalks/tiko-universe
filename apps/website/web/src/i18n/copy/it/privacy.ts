import type { SiteCopy } from '../..'

/** Informativa sulla privacy in italiano. Gli ancoraggi (`id`) non si traducono. */
export const itPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Informativa sulla privacy',
  description: 'Come le app Tiko e tikotalks.com trattano i dati, in parole semplici.',
  eyebrow: 'Informativa sulla privacy',
  title: 'Cosa raccogliamo e cosa no.',
  lede: 'Tiko realizza app calme e accessibili per bambini. La privacy non è un ripensamento: fa parte del progetto. Questa informativa spiega in parole semplici come le app Tiko e tikotalks.com trattano i dati.',
  lastUpdatedLabel: 'Ultimo aggiornamento',
  lastUpdated: 'giugno 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'La nostra promessa',
      bullets: [
        'Gratis, sempre. Non vendiamo mai i tuoi dati né l’attenzione di un bambino in cambio di accesso.',
        'Nessuna pubblicità. Mai. Nelle app Tiko non c’è pubblicità, tracciamento a fini pubblicitari o circuiti di annunci di terze parti.',
        'Nessun muro di accesso. Le app per bambini si aprono e funzionano senza account.',
        'Raccogliamo il meno possibile, e solo ciò di cui una app ha davvero bisogno per funzionare.',
      ],
    },
    {
      id: 'device-first',
      title: 'Sul dispositivo per impostazione predefinita',
      body: [
        'Le app Tiko sono fatte per funzionare sul dispositivo. Impostazioni, frasi salvate, bozze e contenuti recenti restano in locale così le app rimangono veloci e utilizzabili offline. Se usi una app senza accedere, quel contenuto resta sul tuo dispositivo.',
      ],
    },
    {
      id: 'accounts',
      title: 'Account e sincronizzazione facoltativi',
      body: [
        'Tiko usa un’identità legata al dispositivo invece delle password. Se scegli di attivare il recupero per chi accudisce o la sincronizzazione tra dispositivi, possiamo conservare un indirizzo e-mail per inviarti un link di accesso e collegare i tuoi dispositivi. È sempre facoltativo e sempre trasparente — la app per il bambino non inizia mai con la creazione di un account.',
      ],
    },
    {
      id: 'speech',
      title: 'Voce e contenuti',
      body: [
        'Alcune app, come Tiko Type e Tiko Talk, possono leggere il testo ad alta voce. Per generare una voce naturale, il testo che chiedi di leggere può essere inviato al nostro servizio vocale ed elaborato solo per restituire l’audio. Non usiamo quel contenuto per costruire profili pubblicitari e non lo vendiamo.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'Cosa non facciamo',
      bullets: [
        'Non mostriamo pubblicità e non usiamo tracciatori pubblicitari.',
        'Non vendiamo né affittiamo dati personali.',
        'Non chiediamo a un bambino di creare un account o di fornire dati personali per usare una app.',
        'Non facciamo affermazioni mediche, diagnostiche o terapeutiche, e non raccogliamo dati sanitari a tali fini.',
      ],
    },
    {
      id: 'children',
      title: 'Privacy dei bambini',
      body: [
        'Le app Tiko sono progettate per essere aperte serenamente accanto a un bambino. Poiché funzionano senza account e senza pubblicità, un bambino può usarle senza condividere informazioni personali. Quando chi accudisce sceglie di attivare il recupero facoltativo, quelle informazioni di account appartengono all’adulto, non al bambino.',
      ],
    },
    {
      id: 'retention',
      title: 'Conservazione e cancellazione',
      body: [
        'I contenuti salvati in locale restano sul dispositivo finché non li cancelli o rimuovi la app. Se hai creato un account facoltativo, puoi chiederci in qualsiasi momento di eliminarlo insieme ai dati collegati scrivendo a {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Modifiche a questa informativa',
      body: [
        'Se cambiamo il modo in cui trattiamo i dati, aggiorneremo questa pagina e la data qui sopra. Le modifiche rilevanti verranno indicate con chiarezza.',
      ],
    },
    {
      id: 'contact',
      title: 'Contattaci',
      body: [
        'Domande sulla privacy o sui tuoi dati? Scrivi a {email} e ti risponderà una persona vera.',
      ],
    },
  ],
}
