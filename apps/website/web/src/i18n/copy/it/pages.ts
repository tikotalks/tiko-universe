import type { SiteCopyOverride } from '../..'

/**
 * Italian page copy.
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const itPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Perché esiste Tiko',
    description:
      'Perché Tiko è una famiglia di piccole app gratuite e multilingue invece di una grande piattaforma di comunicazione — e perché niente di tutto questo costa qualcosa.',
    eyebrow: 'Perché esiste Tiko',
    title: 'Allegro, semplice e in tutte le lingue.',
    lede: 'Tiko è una famiglia di app piccole, belle e gratuite che aiutano i bambini a comunicare, scegliere, seguire routine e capire il tempo. Ogni app si apre in pochi secondi, funziona in qualsiasi lingua e non chiede mai un account — perché il primo passo dovrebbe essere usarla, non configurarla.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'Il problema',
        title: 'Gli strumenti di comunicazione chiedono troppo prima di aiutare.',
        body: [
          'Un bambino che non riesce ancora a dire ciò di cui ha bisogno sta avendo una giornata difficile adesso — non dopo una prova, una licenza, un corso e un accesso. Eppure la maggior parte dei software di comunicazione chiede tutte e quattro le cose. Arriva come piattaforma: un account da creare, un abbonamento da giustificare, una schermata di configurazione da attraversare e un manuale da leggere prima che qualcuno dica una parola.',
          'Quel costo non è solo denaro. Sono i venti minuti che un insegnante non ha tra una lezione e l’altra, la fiducia che un genitore perde quando la prima schermata è un modulo, e il dispositivo specializzato che resta nell’armadio perché nessuno sa bene come configurarlo. Lo strumento finisce per servire l’istituzione che lo ha comprato invece del bambino che lo tiene in mano.',
          'Tiko parte dall’altro capo. La prima schermata è lo strumento. Tutto il resto — impostazioni, recupero, sincronizzazione tra dispositivi — arriva dopo, per l’adulto, e solo se lo desidera.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'La forma',
        title: 'Tante app piccole, non una grande.',
        lede: 'Tiko non è un pannello di controllo con modalità. È un insieme di app separate, ciascuna che fa bene una sola cosa.',
        body: [
          'Un bambino che impara a rispondere a una domanda non ha bisogno di un costruttore di frasi sulla stessa schermata. Un bambino che segue una routine mattutina non ha bisogno di una tastiera. Ogni comando in più è una cosa in più da leggere male, toccare per sbaglio o che distrae — e per un bambino che già fatica a farsi capire quel costo è reale.',
          'Per questo ogni app Tiko è una app a sé. Yes No sono due pulsanti. Type è un campo di testo e un pulsante per parlare. First mostra un passo alla volta. Apri quella che corrisponde al momento, e sullo schermo non c’è quasi nient’altro.',
        ],
        points: [
          {
            title: 'Una schermata, un compito',
            body: 'Ogni app si apre direttamente su ciò che fa. Nessuna schermata iniziale da attraversare, nessuna modalità da scegliere prima.',
          },
          {
            title: 'Si impara una volta',
            body: 'Poiché una app fa una cosa sola, un bambino può impararla del tutto. La sicurezza viene da uno strumento che si comporta sempre allo stesso modo.',
          },
          {
            title: 'Niente da superare crescendo',
            body: 'Cominciare da Yes No non vincola nessuno. Le app sono separate: passare a Talk o a Type significa aprire un’altra app, non migrare un account.',
          },
          {
            title: 'Abbastanza piccola da fidarsi',
            body: 'Uno strumento che una persona che accudisce capisce in un minuto è uno strumento a cui ricorrerà davvero in un momento difficile.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Lingua',
        title: 'Multilingue dall’inizio, non tradotta dopo.',
        body: [
          'Uno strumento di comunicazione che funziona in una sola lingua lascia fuori proprio i bambini che ne hanno più bisogno: il bambino di una casa bilingue, il bambino la cui lingua di famiglia non è quella della scuola, il bambino che ha cambiato paese e ha perso le parole due volte.',
          'Tiko parla la lingua del bambino, non quella di chi lo programma. Interfaccia, voce e contenuti sono tutti traducibili, e la lingua scelta da chi accudisce lo accompagna in ogni app Tiko e su questo sito. Dove una lingua non ha ancora la traduzione dell’interfaccia, l’app ricorre all’inglese per quelle parole invece di rifiutarsi di aprire.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Perché gratis',
        title: 'Perché l’accesso non dovrebbe avere un prezzo.',
        lede: 'Le app Tiko sono gratuite, sempre. Non una prova, non un assaggio, non un imbuto di vendita.',
        body: [
          'Comunicare non è una funzione premium. Un bambino dovrebbe poter aprire una app Tiko adesso, senza che un adulto decida prima se questo momento vale la spesa — perché quella decisione, presa sotto pressione, di solito viene presa contro il bambino.',
        ],
        points: [
          {
            title: 'Nessuna esitazione',
            body: 'Prova subito uno strumento con un bambino, senza valutare se il momento giustifica il costo.',
          },
          {
            title: 'Nessuna pressione',
            body: 'Nessuna urgenza, nessun senso di colpa, nessuna pubblicità, nessun invito a passare a un piano superiore. Niente trasforma il farsi capire in una transazione.',
          },
          {
            title: 'Nessun patto nascosto',
            body: 'Gratis non significa finanziato dalla pubblicità. Tiko non scambia l’attenzione o i dati di un bambino con l’accesso — non c’è niente da scambiare, perché non viene raccolto niente.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'Ciò che Tiko non è',
        title: 'Uno strumento, non una terapia.',
        body: [
          'Tiko non diagnostica, non cura e non promette risultati. Non è un programma terapeutico, né una valutazione, né un sostituto di un logopedista. Non ci sono punteggi, cruscotti di progresso né rapporti che confrontano un bambino con un altro.',
          'Quello che Tiko offre è un buono strumento per un momento preciso: un modo per rispondere, per scegliere, per dire una frase, per seguire una routine. Logopedisti e insegnanti lo usano accanto al proprio lavoro, e le famiglie nelle ore ordinarie tra un appuntamento e l’altro. È deliberatamente una promessa più piccola di quella che fa la maggior parte dei software in questo campo.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Chi gli dà forma',
        title: 'Costruito con i logopedisti, non solo per loro.',
        lede: 'Logopedisti, insegnanti e altri professionisti guardano Tiko e ci dicono cosa non va.',
        body: [
          'Uno sviluppatore può costruire uno strumento di comunicazione che funziona. Se funzioni per un bambino che fatica a farsi capire è tutta un’altra domanda, e non trova risposta leggendo la documentazione. Trova risposta nelle persone che stanno con quei bambini ogni settimana.',
          'Per questo le app vengono guardate da logopedisti, insegnanti di sostegno e altri professionisti — e i loro riscontri le cambiano. Alcuni sono piccoli: un bersaglio troppo vicino a un altro, una parola sbagliata in un dialetto, una festa troppo eccitante per i bambini con cui lavorano. Altri no: il fatto che Say non abbia un suono d’errore e che nessuna app Tiko tenga un punteggio viene da lì.',
          'Non è un avallo clinico e Tiko non lo rivendica. È una revisione di progettazione fatta da persone il cui giudizio vale più del nostro sulle domande che contano di più, ed è la ragione per cui diverse app sono come sono e non come erano all’inizio.',
        ],
        points: [
          {
            title: 'Rivisto in ottica terapeutica',
            body: 'I professionisti guardano le app pensando ai bambini che seguono, e dicono chiaramente cosa sarebbe d’intralcio.',
          },
          {
            title: 'Riscontri che cambiano il prodotto',
            body: 'Quando una revisione dice che uno schema non va bene per questi bambini, lo schema cambia. I suoni d’errore tolti e i punteggi assenti vengono da lì.',
          },
          {
            title: 'Resta comunque non una terapia',
            body: 'Il contributo dei professionisti rende Tiko meglio progettato. Non lo trasforma in un programma terapeutico, e non lo presentiamo così.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Aperto per scelta',
        title: 'Costruito alla luce del sole, plasmato da chi lo usa.',
        body: [
          'Tiko è open source. Il codice, i contratti dei contenuti e le forme delle API sono pubblici, quindi una scuola, un logopedista o uno sviluppatore può vedere esattamente cosa fa una app con i dati di un bambino — che per la maggior parte delle app Tiko è assolutamente nulla.',
          'Significa anche che la direzione arriva da chi lo usa. Genitori, logopedisti e insegnanti raccontano cosa manca molto più precisamente di una roadmap scritta in isolamento, e un progetto aperto può agire senza aspettare una giustificazione commerciale.',
        ],
      },
    ],
    cta: {
      title: 'Aprine una e guarda.',
      body: 'Il modo più rapido di giudicare Tiko è usarlo due minuti con un bambino. Nessun account, nessun download, nessuna sala d’attesa.',
      primaryLabel: 'Scopri le app',
      primaryPath: '/apps',
      secondaryLabel: 'Come funziona',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Come funziona Tiko',
    description:
      'Come le app Tiko si aprono senza account, cosa succede sul dispositivo e come funziona il recupero facoltativo per chi accudisce.',
    eyebrow: 'Come funziona Tiko',
    title: 'Prima si apre. La configurazione resta sullo sfondo.',
    lede: 'Tiko parte dal dispositivo. Le app si aprono e funzionano subito. Il recupero per chi accudisce può arrivare dopo, con un link magico via e-mail — mai prima che il bambino possa usare lo strumento.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'L’esperienza',
        title: 'Tre momenti, nessun attrito.',
        steps: [
          {
            title: 'Aprire il link',
            body: 'Chi accudisce condivide un link, lo salva nei preferiti o installa l’app dall’App Store. Non c’è niente da licenziare e nessuno a cui chiedere.',
          },
          {
            title: 'Usarla subito',
            body: 'L’app è pronta: nessun accesso, nessun tutorial e nessun percorso di benvenuto. Il bambino vede direttamente lo strumento.',
          },
          {
            title: 'Recuperare dopo, se si vuole',
            body: 'Se chi accudisce vuole che le impostazioni lo seguano su un altro dispositivo, aggiunge un’e-mail e la conferma una volta. È facoltativo, avviene dopo, e il bambino non lo vede mai.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identità sul dispositivo',
        title: 'Mai password.',
        body: [
          'Ogni app Tiko crea una sessione di dispositivo alla prima apertura. È generata in locale, appartiene a quel dispositivo e basta per tutto ciò che l’app fa. Nessuna e-mail, nessuna password, nessun account.',
          'È la parte che la maggior parte dei software di comunicazione prende al contrario. Un account esiste perché un’azienda ti riconosca tra dispositivi diversi — un bisogno reale, ma da adulti, e di solito viene messo davanti al bambino come prezzo d’ingresso. Tiko lo tratta per quello che è: una comodità facoltativa per chi accudisce, offerta più tardi.',
        ],
        points: [
          {
            title: 'Sessione di dispositivo',
            body: 'Creata automaticamente alla prima apertura, conservata in locale, non richiede mai un accesso.',
          },
          {
            title: 'Recupero con link magico',
            body: 'Facoltativo. Chi accudisce aggiunge un’e-mail e la conferma una volta per attivare la sincronizzazione tra dispositivi.',
          },
          {
            title: 'Nessuna formalità per il bambino',
            body: 'Recupero e amministrazione sono solo per adulti. A un bambino non viene mai mostrato un modulo di account.',
          },
          {
            title: 'Uguale su tutte le piattaforme',
            body: 'Le sessioni funzionano allo stesso modo su web, iOS e Android, così una app si comporta identica ovunque giri.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Affidabilità',
        title: 'Continua a funzionare quando la rete non lo fa.',
        body: [
          'Le app Tiko caricano i contenuti principali sul dispositivo e funzionano da lì. Una connessione che cade, una rete scolastica che blocca metà di internet o un viaggio in auto senza segnale non tolgono a un bambino la possibilità di rispondere a una domanda.',
          'Tutto ciò che ha davvero bisogno della rete — sincronizzare le impostazioni, scaricare un nuovo set di immagini — è un’aggiunta. Se fallisce, l’app continua a fare quello che faceva prima.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Cosa viene raccolto',
        title: 'Quasi nulla, e mai dal bambino.',
        body: [
          'La maggior parte delle app Tiko non raccoglie assolutamente nulla. Non ci sono analisi dei tocchi di un bambino, identificativi pubblicitari o tracciatori di terze parti. Il riconoscimento vocale, dove una app lo usa, gira sul dispositivo ovunque la piattaforma lo permetta, e le registrazioni non vengono mai conservate né inviate.',
          'Dove una app conserva qualcosa — le carte create da chi accudisce, una routine costruita, una frase salvata — è contenuto che l’adulto ha creato di proposito, e resta sul dispositivo finché non attiva la sincronizzazione.',
        ],
        points: [
          {
            title: 'Nessuna pubblicità, mai',
            body: 'Nessuna pubblicità, nessun circuito pubblicitario e nessun tracciamento a fini pubblicitari in alcuna app Tiko.',
          },
          {
            title: 'Nessun muro di accesso',
            body: 'Le app per bambini si aprono e funzionano senza alcun tipo di account.',
          },
          {
            title: 'Sul dispositivo quando è possibile',
            body: 'Il riconoscimento vocale usa il motore locale della piattaforma dove esiste. Le registrazioni non vengono conservate.',
          },
          {
            title: 'Verificabile alla luce del sole',
            body: 'Le app sono open source, quindi quanto dichiarato in questa pagina si può verificare invece che crederlo sulla parola.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Un Tiko, tanti schermi',
        title: 'La stessa esperienza, ovunque.',
        body: [
          'Il web è il modo più rapido di provare Tiko: basta un link. Le app native aggiungono quello che un browser fa peggio — affidabilità offline, un’icona sulla schermata iniziale che il bambino riconosce e un supporto vocale migliore.',
          'Qualunque cosa si usi, l’app si comporta allo stesso modo. Sotto ci sono gli stessi contratti, quindi una routine costruita su un tablet è la stessa routine su un telefono.',
        ],
      },
    ],
    cta: {
      title: 'Vuoi il dettaglio tecnico?',
      body: 'La documentazione di architettura e delle API spiega come si incastrano worker, archiviazione e client.',
      primaryLabel: 'Documentazione di architettura',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'Contratti delle API',
      secondaryPath: '/docs/apis',
    },
  },
}
