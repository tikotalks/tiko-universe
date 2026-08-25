import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** Italian copy for the audience-facing and help pages. */
export const itAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Per chi accudisce',
    description:
      'Cosa promette Tiko a genitori e a chi accudisce: nessun account prima dell’uso, nessuna pubblicità, nessun tracciamento, e strumenti da provare in un momento difficile senza preparare niente.',
    eyebrow: 'Per chi accudisce',
    title: 'Fatto perché il primo momento non sia un modulo.',
    lede: 'Dovresti poter provare uno strumento prima di fidartene. Tiko è pensato perché chi accudisce apra una app, veda se aiuta e aggiunga recupero o sincronizzazione solo quando conta davvero.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Principi di fiducia',
        title: 'Ciò su cui non trattiamo.',
        lede: 'Sono impegni, non impostazioni attuali. Non cambiano quando cambiano le circostanze.',
        points: [
          {
            title: 'Gratis, sempre',
            body: 'Non vendiamo mai i tuoi dati né l’attenzione di un bambino in cambio di accesso. Le app sono gratuite perché far pagare la comunicazione è lo scambio sbagliato.',
          },
          {
            title: 'Nessuna pubblicità. Mai.',
            body: 'In nessuna app Tiko c’è pubblicità, tracciamento a fini pubblicitari o circuiti di annunci di terze parti.',
          },
          {
            title: 'Nessun muro di accesso',
            body: 'Le app per bambini si aprono e funzionano senza account. Niente si frappone tra un bambino e il farsi capire.',
          },
          {
            title: 'Il meno possibile',
            body: 'Raccogliamo solo ciò di cui una app ha davvero bisogno per funzionare, e la maggior parte delle app Tiko non ha bisogno di nulla.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Per cominciare',
        title: 'Non devi prepararti.',
        body: [
          'Non c’è un modo giusto di iniziare né qualcosa da configurare prima. Apri la app che corrisponde al momento in cui ti trovi davvero — una domanda a cui rispondere, una routine da attraversare, una parola da esercitare — e usala. Se non aiuta, chiudila. Non hai speso nulla e non hai sottoscritto nulla.',
          'La maggior parte di chi accudisce trova una app che va bene e ci resta a lungo. È un buon risultato, non un limite. Tiko non vuole diventare il posto dove tuo figlio passa la giornata.',
        ],
        steps: [
          {
            title: 'Parti dal momento, non dalla app',
            body: 'Scegli la app che corrisponde a qualcosa che succede oggi. Yes No per una domanda, First per una routine, Type per un messaggio da dire.',
          },
          {
            title: 'Usala accanto a tuo figlio',
            body: 'Sono strumenti per due persone. Sedersi accanto e mostrare un tocco o una frase vale più che passare il dispositivo.',
          },
          {
            title: 'Rendila sua',
            body: 'Metti le tue foto, le tue parole, la tua routine. Una foto delle scarpe vere di tuo figlio batte l’icona di un paio di scarpe.',
          },
          {
            title: 'Aggiungi il recupero solo se lo vuoi',
            body: 'Se le impostazioni devono seguirti su un altro dispositivo, aggiungi un’e-mail una volta. Altrimenti salta: non cambia nient’altro.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Con onestà',
        title: 'Cosa fa Tiko e cosa non fa.',
        body: [
          'Tiko non diagnostica, non cura e non promette risultati. Non ti dirà se tuo figlio sta migliorando, e deliberatamente non tiene punteggi che lo lascino intendere. Se vuoi una valutazione, quello è il lavoro di un logopedista — e un bravo logopedista vale molto più di qualsiasi app.',
          'Quello che Tiko può fare è togliere attrito a momenti precisi: ricevere una domanda e avere un modo per rispondere, sapere cosa viene dopo in una routine, tirare fuori una frase che altrimenti resterebbe bloccata. Quei momenti contano, e bastano come compito per uno strumento.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Privacy',
        title: 'Che fine fanno i dati di tuo figlio.',
        body: [
          'Nella maggior parte delle app Tiko non esce nulla dal dispositivo. Le carte che crei, le routine che costruisci e le frasi che salvi restano in locale. Non c’è analisi di cosa tocca un bambino né identificativi pubblicitari.',
          'Se attivi la sincronizzazione, il contenuto che hai creato viene conservato per raggiungere i tuoi altri dispositivi. È contenuto che un adulto ha creato di proposito — mai un registro di come un bambino ha usato la app. Puoi leggere esattamente cosa viene conservato nell’informativa sulla privacy e, poiché Tiko è open source, puoi anche controllare il codice invece di crederci sulla parola.',
        ],
      },
    ],
    cta: {
      title: 'Provalo oggi con tuo figlio.',
      body: 'Apri una app e usala per due minuti. Ti dirà più di qualsiasi descrizione in questa pagina.',
      primaryLabel: 'Scopri le app',
      primaryPath: '/apps',
      secondaryLabel: 'Leggi l’informativa sulla privacy',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Per insegnanti e terapisti',
    description:
      'Usare Tiko in una classe o con un gruppo di bambini: profili separati per ciascuno, nessuna licenza a postazione, niente da installare e nessun dato che lascia il dispositivo.',
    eyebrow: 'Per insegnanti e terapisti',
    title: 'Segui tanti bambini. Mantieni ogni esperienza calma.',
    lede: 'Il Gestore Profili di Tiko permette a un insegnante o a un terapista di creare un profilo leggero e separato per ogni bambino — e di decidere esattamente a cosa ciascuno arriva. I bambini hanno uno strumento semplice e concentrato. Gli adulti tengono i comandi fuori vista.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'In classe',
        title: 'Fatto per i venti minuti che hai davvero.',
        body: [
          'Il software che arriva in una scuola di solito dà per scontato che qualcuno abbia tempo per configurarlo. In pratica chi tiene il tablet ha i pochi minuti tra una lezione e l’altra, e un bambino che ha bisogno di una risposta adesso.',
          'Tiko è fatto per questa realtà. Su un dispositivo gestito non c’è nulla da installare oltre ad aprire un link, nessuna chiave di licenza da inseguire negli acquisti e nessuna giornata di formazione prima che uno strumento sia usabile. Se non è adatto al tuo contesto, avrai perso qualche minuto invece di una voce di bilancio.',
        ],
        points: [
          {
            title: 'Nessuna licenza a postazione',
            body: 'Gratis per ogni bambino della tua classe o del tuo gruppo. Nessun numero di utenti da dichiarare e nessun rinnovo da giustificare.',
          },
          {
            title: 'Niente da distribuire',
            body: 'Le app web partono da un link su un dispositivo gestito. Quelle native sono una normale installazione dall’App Store.',
          },
          {
            title: 'Nessun account per i bambini',
            body: 'I bambini non creano mai credenziali né maneggiano password, il che tiene lo strumento fuori dalla maggior parte delle verifiche di tutela dei minori.',
          },
          {
            title: 'Funziona con la rete che hai',
            body: 'Le app funzionano offline dopo il primo utilizzo, quindi una rete scolastica filtrata o instabile non interrompe una seduta.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Tanti bambini',
        title: 'Un profilo separato per ogni bambino.',
        body: [
          'Un gruppo di bambini non è un solo utente. Ogni bambino ha bisogno del proprio vocabolario, delle proprie routine e delle proprie immagini — e nessuno dovrebbe vedere quelli di un altro.',
          'Il Gestore Profili li tiene separati sullo stesso dispositivo. Passi da uno all’altro da adulto, e ogni bambino vede solo i propri contenuti quando apre una app. I comandi per adulti stanno dietro agli stessi percorsi riservati usati ovunque in Tiko, così un bambino curioso non finisce nelle impostazioni.',
        ],
        points: [
          {
            title: 'Contenuti per bambino',
            body: 'Carte, routine e frasi salvate appartengono a un profilo, non al dispositivo.',
          },
          {
            title: 'Cambio solo da adulti',
            body: 'Cambiare profilo è un’azione da adulti. I bambini restano nella app che è stata loro affidata.',
          },
          {
            title: 'Pensato per dispositivi condivisi',
            body: 'Fatto per il tablet che passa da un bambino all’altro durante la giornata, che è come funzionano davvero quasi tutti i contesti.',
          },
          {
            title: 'Nessuna visibilità incrociata',
            body: 'Il vocabolario e la cronologia di un bambino non sono mai visibili da un altro profilo.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'Accanto al tuo lavoro',
        title: 'Uno strumento nelle tue mani, non un programma da seguire.',
        body: [
          'Tiko non ha un curricolo integrato, né una sequenza prescritta, né un’opinione su come debba andare una seduta. Non assegna punteggi a un bambino, non lo colloca rispetto a una norma e non produce rapporti. Quei giudizi sono tuoi, e le prove che ti servono vengono dalla tua osservazione, non dalla telemetria di una app.',
          'Quello che Tiko ti dà è un insieme di strumenti affidabili e senza attrito a cui ricorrere durante il lavoro che già fai: offrire una scelta binaria, costruire una frase, tenere l’attenzione su un passo o esercitare una parola senza che un suono d’errore punisca lo sbaglio.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Dati e tutela dei minori',
        title: 'In breve: resta sul dispositivo.',
        body: [
          'La maggior parte delle app Tiko non manda nulla da nessuna parte. Non c’è analisi delle interazioni dei bambini, né pubblicità, né tracciatori di terze parti. Il riconoscimento vocale, dove viene usato, gira sul dispositivo ovunque la piattaforma lo consenta, e le registrazioni non vengono mai conservate.',
          'Poiché le app sono open source, il tuo referente informatico o per la tutela dei minori può verificarlo invece di affidarsi a una rassicurazione in una brochure. Se il tuo contesto ha bisogno del dettaglio per iscritto, l’informativa sulla privacy e la documentazione di architettura sono entrambe pubbliche.',
        ],
      },
    ],
    cta: {
      title: 'Prova prima con un solo bambino.',
      body: 'Scegli una app e un bambino questa settimana. È una prova più onesta di qualunque griglia di valutazione, e non costa nulla.',
      primaryLabel: 'Scopri le app',
      primaryPath: '/apps',
      secondaryLabel: 'Principi di fiducia',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Domande frequenti',
    description:
      'Risposte chiare su cos’è Tiko, quanto costa, cosa raccoglie e cosa deliberatamente non pretende di fare.',
    eyebrow: 'Domande frequenti',
    title: 'Risposte chiare prima di configurare qualsiasi cosa.',
    lede: 'Risposte brevi alle domande che chi accudisce, gli insegnanti e gli sviluppatori fanno più spesso. Se la tua non c’è, una persona vera è a un’e-mail di distanza.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'Le basi',
        title: 'Cos’è Tiko.',
        questions: [
          {
            question: 'Che cos’è Tiko?',
            answer:
              'Tiko è una raccolta di piccole app gratuite che aiutano i bambini a comunicare, scegliere, seguire routine e capire il tempo. Ogni app fa una cosa chiara e si apre all’istante — in qualsiasi lingua, su qualsiasi dispositivo, senza account.',
          },
          {
            question: 'Perché tante app invece di una sola?',
            answer:
              'Perché ogni comando in più sullo schermo è una cosa in più che un bambino può leggere male o toccare per sbaglio. Una app che fa una cosa sola si può imparare del tutto, e un bambino che l’ha imparata può fidarsene. Yes No sono due pulsanti; non dovrebbe mai crescerci sopra un costruttore di frasi.',
          },
          {
            question: 'A chi è rivolto Tiko?',
            answer:
              'Ai bambini che hanno bisogno di sostegno per esprimersi — per una difficoltà di parola o di linguaggio, un ritardo dello sviluppo, una disabilità o semplicemente perché stanno iniziando a parlare — e ai genitori, insegnanti e terapisti al loro fianco. Niente di tutto questo richiede una diagnosi.',
          },
          {
            question: 'Quali app esistono oggi?',
            answer:
              'Yes No, Type, Talk, Say, Sum e First sono disponibili, sul web o sull’App Store a seconda della app. Cards, Sequence e Timer sono ancora in costruzione. La pagina delle app mostra esattamente dove si può aprire ciascuna.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Costo',
        title: 'Quanto costa e perché.',
        questions: [
          {
            question: 'Tiko è davvero gratis?',
            answer:
              'Sì. Le app Tiko sono gratuite, sempre. Non un’anteprima temporanea, non un assaggio, non un imbuto di vendita. Non c’è un piano a pagamento che trattiene una funzione di cui un bambino ha bisogno.',
          },
          {
            question: 'Tiko mostrerà pubblicità?',
            answer:
              'No. Nessuna pubblicità, mai. Tiko deve poter essere aperto accanto a un bambino senza contenuti commerciali, messaggi sponsorizzati o qualsiasi cosa pensata per catturare l’attenzione.',
          },
          {
            question: 'Se è gratis e senza pubblicità, come si sostiene?',
            answer:
              'Tiko è costruito come progetto open source e non come un’azienda con obiettivi di crescita. Questo tiene bassi i costi: le app sono minuscole e la maggior parte non parla con nessun server.',
          },
          {
            question: 'I dati di mio figlio sono il pagamento?',
            answer:
              'No. Qui gratis non significa finanziato dalla pubblicità. La maggior parte delle app Tiko non raccoglie nulla, quindi non ci sarebbe niente da vendere nemmeno volendo.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Account e privacy',
        title: 'A cosa devi rinunciare per usarlo.',
        questions: [
          {
            question: 'Serve un account?',
            answer:
              'No. Le app Tiko si aprono e funzionano senza muro di accesso. Il recupero facoltativo per chi accudisce è disponibile dopo tramite un link magico via e-mail, ma la app per il bambino non inizia mai con la creazione di un account.',
          },
          {
            question: 'Quali dati raccoglie Tiko?',
            answer:
              'Nella maggior parte delle app, nessuno. Non c’è analisi di cosa tocca un bambino, né identificativi pubblicitari, né tracciatori di terze parti. Ciò che crei — carte, routine, frasi salvate — resta sul dispositivo finché non attivi la sincronizzazione.',
          },
          {
            question: 'Tiko registra la voce di mio figlio?',
            answer:
              'Dove una app ascolta, il riconoscimento vocale gira sul dispositivo ovunque la piattaforma lo permetta, e le registrazioni non vengono mai conservate né inviate. Le app che non hanno bisogno del microfono non lo chiedono mai.',
          },
          {
            question: 'Posso verificare tutto questo?',
            answer:
              'Sì, e dovresti. Tiko è open source, quindi il codice dietro queste affermazioni è pubblico. L’informativa sulla privacy spiega in parole semplici cosa viene conservato.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'Ciò che Tiko non è',
        title: 'I limiti, detti chiaramente.',
        questions: [
          {
            question: 'Tiko è un prodotto terapeutico o medico?',
            answer:
              'No. Tiko non diagnostica, non cura e non promette risultati. È un insieme di strumenti di comunicazione e apprendimento, non un intervento clinico, e non sostituisce un logopedista.',
          },
          {
            question: 'Tiko misura i progressi?',
            answer:
              'No, deliberatamente. Non ci sono punteggi, serie o cruscotti. I progressi nella comunicazione non sono qualcosa che una app debba valutare, e un numero sullo schermo tende a plasmare il comportamento dell’adulto più di quello del bambino.',
          },
          {
            question: 'Funzionerà con mio figlio?',
            answer:
              'Sinceramente non lo sappiamo, e chi dice il contrario sta indovinando. Le app sono gratuite e si aprono all’istante, quindi il modo meno costoso di scoprirlo è provarne una per qualche minuto.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Pratica',
        title: 'Dispositivi, lingue e uso offline.',
        questions: [
          {
            question: 'Quali lingue parla Tiko?',
            answer:
              'Le app sono multilingue fin dalle fondamenta, e la lingua scelta da chi accudisce lo accompagna in ogni app Tiko e su questo sito. Dove una lingua non ha ancora la traduzione dell’interfaccia, la app ricorre all’inglese invece di rifiutarsi di aprire.',
          },
          {
            question: 'Funziona offline?',
            answer:
              'Sì. Le app caricano i contenuti principali sul dispositivo e continuano a funzionare senza rete. Tutto ciò che ha bisogno di internet è un’aggiunta, e non riuscire a raggiungerlo non ferma la app.',
          },
          {
            question: 'Su quali dispositivi funziona?',
            answer:
              'Su qualsiasi browser moderno, più le app native per iPhone e iPad per quelle già uscite sull’App Store. Android segue lo stesso approccio.',
          },
          {
            question: 'Posso usarlo con una classe o un gruppo?',
            answer:
              'Sì. Il Gestore Profili tiene un profilo separato per ogni bambino su un dispositivo condiviso, e non c’è nessuna licenza a postazione da comprare o dichiarare.',
          },
        ],
      },
    ],
    cta: {
      title: 'Hai ancora una domanda?',
      body: 'L’assistenza è una persona, non una coda di ticket. Chiedi e avrai una risposta diretta.',
      primaryLabel: 'Chiedi assistenza',
      primaryPath: '/support',
      secondaryLabel: 'Perché esiste Tiko',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Assistenza',
    description:
      'Aiuto sulle app Tiko per bambini, chi accudisce e insegnanti — argomenti comuni, risoluzione dei problemi e come parlare con una persona.',
    eyebrow: 'Assistenza',
    title: 'Siamo qui per aiutare.',
    lede: 'Aiuto sulle app Tiko per bambini, chi accudisce e insegnanti. La maggior parte delle risposte è qui sotto — e una persona vera è a un’e-mail di distanza.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Argomenti comuni',
        title: 'Risposte rapide per iniziare.',
        points: [
          {
            title: 'Primi passi',
            body: 'Ogni app Tiko si apre subito — niente account né password. Apri il link o installa la app e comincia a usarla.',
          },
          {
            title: 'Account e dispositivi',
            body: 'Tiko usa sessioni di dispositivo invece delle password. Se cambi o ripristini un dispositivo, aggiungi prima un’e-mail di recupero così i tuoi contenuti ti seguono.',
          },
          {
            title: 'Voci e lingue',
            body: 'Scegli una voce e una lingua adatte al bambino. Le app Tiko supportano molte lingue e cambiano all’istante dalle impostazioni.',
          },
          {
            title: 'Uso offline',
            body: 'Le app continuano a funzionare senza rete dopo il primo utilizzo. La sincronizzazione riprende da sola quando la connessione torna.',
          },
          {
            title: 'Privacy e dati',
            body: 'La maggior parte delle app non conserva nulla fuori dal dispositivo. Ciò che crei resta in locale finché non attivi la sincronizzazione di proposito.',
          },
          {
            title: 'Qualcosa non funziona?',
            body: 'Raccontaci cosa hai visto, su quale dispositivo e in quale app. Di solito ci basta per trovarlo.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Risoluzione dei problemi',
        title: 'Le tre cose che risolvono quasi tutto.',
        steps: [
          {
            title: 'Ricarica la app',
            body: 'Chiudila del tutto e riaprila. Le app web si aggiornano in background, e una ricarica prende la versione più recente.',
          },
          {
            title: 'Controlla lingua e voce',
            body: 'Se la voce suona sbagliata o resta muta, la voce scelta potrebbe non essere installata sul dispositivo. Provane un’altra dalle impostazioni — su iOS le voci aggiuntive si installano dalle impostazioni di accessibilità del sistema.',
          },
          {
            title: 'Verifica che il dispositivo non sia in silenzioso',
            body: 'Un interruttore del silenzioso o una scheda muta spiegano più segnalazioni di «la voce non funziona» di qualsiasi altra cosa.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Contatti',
        title: 'Parla con una persona.',
        body: [
          'All’assistenza rispondono le persone che costruiscono Tiko, non una coda. Non c’è un numero di ticket né piani a livelli — avrai una risposta diretta, anche quando la risposta è che qualcosa è rotto o non è previsto.',
          'Se segnali un problema, le cose più utili da indicare sono la app, il dispositivo e la versione del browser o del sistema, cosa ti aspettavi e cosa è successo invece. Uno screenshot vale più di una descrizione.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Partecipare',
        title: 'Segnala, proponi o contribuisci.',
        body: [
          'Tiko è open source, quindi una segnalazione di errore è davvero utile e una pull request è benvenuta. La direzione del progetto viene in gran parte da genitori, terapisti e insegnanti che raccontano cosa manca — è molto più accurato di una roadmap scritta senza di loro.',
          'Se lavori con bambini che usano strumenti di comunicazione e qui c’è qualcosa che non va, preferiamo saperlo.',
        ],
      },
    ],
    cta: {
      title: 'Leggi prima le risposte.',
      body: 'Le domande frequenti coprono costi, privacy, account e ciò che Tiko deliberatamente non fa.',
      primaryLabel: 'Leggi le domande frequenti',
      primaryPath: '/faq',
      secondaryLabel: 'Come funziona',
      secondaryPath: '/how-it-works',
    },
  },
}
