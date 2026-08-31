import type { SiteCopy } from '../..'

/**
 * Documentazione per sviluppatori in italiano.
 *
 * Nomi dei servizi, percorsi ed esempi di codice non si traducono: sono
 * indirizzi, non prosa. Gli esempi di codice quindi non compaiono qui e
 * ricadono sull’inglese, come previsto.
 */
export const itDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Pagine di documentazione',
  articleEyebrow: 'Documentazione della piattaforma Tiko',
  pages: {
    'docs-overview': {
      label: 'Panoramica',
      title: 'Documentazione di Tiko Universe',
      lede: 'L’architettura, la filosofia di prodotto e la mappa delle API della piattaforma Tiko.',
      summary: 'Un punto d’ingresso pubblico e leggibile su come è costruito Tiko e perché il sistema ha questa forma.',
      callouts: [
        {
          title: 'App piccole, piattaforma condivisa',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media e le app future riusano gli stessi contratti di identità, stato, contenuti, media, generazione e interfaccia.',
        },
        {
          title: 'Prima le API, nativo Cloudflare',
          body: 'I client sono volutamente leggeri. L’autorità sta nei Cloudflare Workers con D1, R2, KV come cache e Queues dove il lavoro asincrono diventa necessario.',
        },
        {
          title: 'Nessuna trafila di account all’inizio',
          body: 'Uno strumento per bambini deve aprirsi ed essere utile prima che compaiano recupero, sincronizzazione o amministrazione.',
        },
      ],
      sections: [
        {
          eyebrow: 'Cosa copre',
          title: 'Una mappa pratica per chi costruisce',
          body: [
            'Questa documentazione spiega Tiko come prodotto e come piattaforma di backend. Non è materiale di marketing né una discarica di dettagli implementativi.',
            'La regola importante è semplice: se un comportamento riguarda i client web, iOS o Android, appartiene a un contratto di API documentato prima di diventare logica nascosta nel client.',
          ],
          bullets: [
            'Filosofia: principi di prodotto centrati sul bambino e vincoli tecnici.',
            'Architettura: app, package, Workers, proprietà dello storage, domini e confini di rilascio.',
            'API: le famiglie di contratti attuali e le forme stabili su cui i client possono contare.',
          ],
        },
        {
          eyebrow: 'Forma attuale della piattaforma',
          title: 'Un repository, responsabilità chiare',
          body: [
            'Tiko Universe è un monorepo con npm workspaces: app per prodotto, package TypeScript condivisi e servizi Cloudflare Worker. Il codice nativo iOS sta accanto al prodotto dove esiste; Android segue gli stessi contratti di API invece di copiare la logica di backend nel client.',
          ],
          bullets: [
            'App: strumenti per bambini e superfici pubbliche o amministrative di supporto.',
            'Package: client tipizzati, contratti condivisi, Tiko UI, i18n, media, identità e strumenti di test.',
            'Workers: identità, stato delle app, contenuti, media, generazione, amministrazione e compatibilità TTS temporanea.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Filosofia',
      title: 'Filosofia di prodotto e di ingegneria',
      lede: 'Tiko è software che pensa prima al bambino. Il backend esiste per tenere il momento del bambino immediato, calmo e recuperabile, senza trasformarlo in software aziendale.',
      summary: 'I principi irrinunciabili dietro ogni scelta di architettura.',
      callouts: [
        { title: 'Immediato', body: 'Le app si aprono e funzionano subito. La prima schermata non è mai un modulo di accesso.' },
        { title: 'Piccolo', body: 'Ogni app fa una cosa chiara invece di diventare un pannello di controllo.' },
        { title: 'Recuperabile', body: 'Le sessioni sul dispositivo possono diventare recuperabili più tardi con un link magico via e-mail.' },
      ],
      sections: [
        {
          eyebrow: 'Dottrina',
          title: 'Ciò su cui non si tratta',
          body: [
            'La dottrina è volutamente rigida, perché «solo un’eccezione» produce, sei mesi dopo, una piattaforma che nessuno capisce più. Tiko lo evita tenendo identità, API e proprietà dello storage noiose ed esplicite.',
          ],
          bullets: [
            'Nessuna password e nessun muro di accesso prima dell’uso.',
            'Nessun runtime Supabase, nessun ponte per vecchi utenti, nessun obbligo di migrazione, nessun presupposto Better Auth.',
            'Identità sul dispositivo per impostazione predefinita; recupero facoltativo via e-mail con link magici.',
            'D1 è la fonte relazionale di verità. R2 è la fonte di verità dei byte. KV è solo cache.',
            'Lezu gestisce le traduzioni; Tiko consuma bundle e fallback versionati.',
            'Web, iOS e Android sono client di pari livello delle stesse API HTTPS JSON.',
          ],
        },
        {
          eyebrow: 'Modello di prodotto',
          title: 'Perché app piccole',
          body: [
            'Tiko non è una grande «piattaforma per bisogni speciali» con un labirinto di funzioni. È un universo di piccoli strumenti mirati da aprire nel momento in cui un bambino o chi lo accudisce ha bisogno di una cosa.',
            'Strumenti separati riducono il carico cognitivo, tengono evidenti le aree di tocco e rendono più facile capire se uno strumento aiuta prima di chiedere a chi accudisce di fidarsi di sincronizzazione, recupero o amministrazione.',
          ],
          bullets: [
            'Yes No: risposte rapide a due scelte.',
            'Type: scrittura di testo e voce.',
            'Cards: scelte visive e contenuti familiari.',
            'Sequence: routine ordinate e passi successivi.',
            'Timer: rendere visibile il tempo e accompagnare i passaggi.',
          ],
        },
        {
          eyebrow: 'Modello di ingegneria',
          title: 'Prima i contratti, poi i client',
          body: [
            'Il codice client può essere piacevole e resistente. Non può diventare di nascosto il backend. Se un comportamento ha autorità, persistenza, segreti dei fornitori o effetti tra dispositivi, appartiene a un Worker e a un contratto documentato.',
          ],
          bullets: [
            'I package espongono client tipizzati, modelli, fixture e composizione dell’interfaccia.',
            'I Workers possiedono autenticazione, limiti di frequenza, accesso a D1/R2/KV/Queues, chiamate ai fornitori e mutazioni durature.',
            'Le app possono tenere uno stato locale di riserva così il percorso del bambino resta usabile quando una chiamata di rete fallisce.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Architettura',
      title: 'Architettura',
      lede: 'Tiko è una piattaforma nativa Cloudflare: app per prodotto, package client condivisi, Workers come servizi di dominio, D1/R2 per lo stato durevole e KV solo come cache.',
      summary: 'Come si incastrano monorepo, domini, storage, worker e client.',
      callouts: [
        { title: 'Client', body: 'Le app web in Vue, le app iOS in SwiftUI e i futuri client Android usano gli stessi contratti di API.' },
        { title: 'Servizi', body: 'I Workers sono divisi per confine di dominio, non per il file che è esistito per primo.' },
        { title: 'Storage', body: 'D1 possiede la verità relazionale. R2 possiede i byte. KV è cache ricostruibile.' },
      ],
      sections: [
        {
          eyebrow: 'Mappa del sistema',
          title: 'Il flusso generale',
          body: [
            'L’architettura è volutamente banale. I client parlano tramite API HTTPS JSON. I Workers verificano l’identità e possiedono le mutazioni. Lo storage è legato al Worker che possiede il dominio.',
          ],
        },
        {
          eyebrow: 'Repository',
          title: 'Monorepo con il prodotto per primo',
          body: [
            'Il repository è organizzato prima per prodotti, poi per package di piattaforma e Workers. Così il contesto di una app per bambini resta vicino alle sue implementazioni web e native, condividendo i contratti tramite i package.',
          ],
          bullets: [
            '`apps/<product>/web` contiene app Vue distribuite su Cloudflare Pages.',
            '`apps/<product>/ios` contiene client SwiftUI dove esiste lavoro nativo.',
            '`packages/*` contiene contratti TypeScript condivisi, client, Tiko UI, i18n, media, identità e strumenti di test.',
            '`workers/*` contiene servizi Cloudflare Worker con i propri binding D1/R2 e i propri test.',
          ],
        },
        {
          eyebrow: 'Confini dei servizi',
          title: 'Responsabilità di ogni Worker',
          body: [
            'Ogni Worker ha un compito stretto. Questo rende più semplici da ragionare autorizzazione, migrazioni, limiti di frequenza e rischio di rilascio.',
          ],
          bullets: [
            '`identity-api`: soggetti Ankore, dispositivi, sessioni, account e sfide via e-mail.',
            '`app-api`: impostazioni e stato delle app per utente.',
            '`content-api`: contenuti pubblicati, record in stile CMS e modelli di lettura memorizzabili in cache.',
            '`media-api`: autorizzazione dei caricamenti, metadati dei media, proprietà e accesso a R2.',
            '`generation-api`: TTS, generazione di frasi e immagini, metadati dei media generati e future queue.',
            '`admin-api`: operazioni pericolose solo per amministratori, report, moderazione e strumenti di assistenza.',
            '`tts-api`: superficie di compatibilità temporanea destinata a confluire in generation-api.',
          ],
        },
        {
          eyebrow: 'Domini',
          title: 'Rotte pubbliche',
          body: [
            'I domini fanno parte dell’architettura. Nuovi nomi host a caso sono esattamente il modo in cui le piattaforme diventano archeologia.',
          ],
          bullets: [
            '`tiko.mt`: home pubblica di prodotto e marketing.',
            '`tikotalks.com`: la superficie pubblica di TikoTalks per documentazione e marchio — cioè queste pagine.',
            '`*.tikoapps.org`: la famiglia delle app in esecuzione, come yesno, type, cards, sequence, timer, media e admin.',
            '`id.tiko.mt`: origine dell’identità basata sul dispositivo (vecchio alias di `identity.tikoapi.org`).',
            '`*.tikoapi.org`: la famiglia dei servizi API — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` e `translations` hanno ciascuno il proprio sottodominio.',
            '`*.tikocdn.org`: solo consegna di byte, nessuna logica applicativa.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API',
      title: 'Contratti delle API',
      lede: 'Le API sono la spina dorsale del prodotto. Permettono ai client web, iOS e Android di comportarsi allo stesso modo senza copiare la logica di backend in ogni app.',
      summary: 'Una guida leggibile alle famiglie di contratti `/v1` attuali.',
      callouts: [
        { title: 'Versionate', body: 'Le API visibili ai client stanno sotto `/v1` e restituiscono JSON, tranne gli endpoint che trasmettono byte.' },
        { title: 'Errori tipizzati', body: 'Gli errori usano codici stabili leggibili da una macchina e messaggi sicuri per le persone.' },
        { title: 'Compatibili con bearer', body: 'I client nativi devono funzionare con sessioni bearer esplicite; i soli cookie del browser non bastano.' },
      ],
      sections: [
        {
          eyebrow: 'Regole comuni delle API',
          title: 'Regole di contratto',
          body: [
            'La forma delle API può restare noiosa. È un complimento. Rotte prevedibili e involucri d’errore costanti impediscono a più client di divergere.',
          ],
          bullets: [
            'Usare percorsi `/v1`.',
            'Restituire JSON dalle rotte API; trasmettere byte solo da rotte esplicite di media o audio.',
            'Usare sessioni bearer per la parità con i client nativi.',
            'Non rivelare mai se un’e-mail di recupero o un identificativo esiste.',
            'Conservare i token grezzi solo lato client; il server conserva gli hash.',
            'Non esporre ai client i corpi d’errore dei fornitori.',
          ],
        },
        {
          eyebrow: 'Identità',
          title: 'API di identità basata sul dispositivo',
          body: [
            'L’identità esiste perché le app si aprano subito e possano comunque diventare recuperabili dopo. Il bootstrap crea o ripristina una sessione di dispositivo; il recupero via e-mail migliora la continuità senza trasformare l’avvio in un accesso.',
          ],
          bullets: [
            '`POST /v1/identity/device` — creare o ripristinare una sessione basata sul dispositivo.',
            '`GET /v1/identity/session` — verificare e restituire il bundle di sessione corrente.',
            '`POST /v1/identity/email/challenge` — richiedere una sfida di recupero via e-mail, con risposta generica.',
            '`POST /v1/identity/email/verify` — verificare un token di link magico o un OTP e restituire un bundle di identità Ankore.',
            '`POST /v1/identity/logout` — revocare la sessione bearer corrente.',
          ],
        },
        {
          eyebrow: 'Dati delle app',
          title: 'API di impostazioni e stato',
          body: [
            'L’API app possiede impostazioni e stato per utente delle piccole app Tiko. Le impostazioni sono preferenze visibili a chi accudisce. Lo stato sono i dati specifici della app che vale la pena conservare tra dispositivi quando la persistenza è voluta.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — leggere le impostazioni.',
            '`PUT /v1/apps/{app}/settings` — salvare le impostazioni con supporto alle versioni.',
            '`GET /v1/apps/{app}/state` — leggere lo stato della app.',
            '`PUT /v1/apps/{app}/state` — salvare lo stato della app.',
            'Nomi di app P0 consentiti: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Generazione e media',
          title: 'TTS, audio generato, caricamenti e record media',
          body: [
            'Generazione e media sono collegate ma non sono la stessa cosa. La generazione crea risorse. I media gestiscono le risorse caricate e i loro metadati. R2 conserva i byte; D1 conserva proprietà e metadati di ricerca.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — generare o recuperare dalla cache l’audio da testo a voce.',
            '`GET /v1/generation/audio/{id}` — trasmettere i byte dell’audio generato.',
            '`POST /v1/media/uploads` — autorizzare e registrare un caricamento di media.',
            '`GET /v1/media/{id}` — leggere i metadati o i dettagli di accesso di un media.',
            '`DELETE /v1/media/{id}` — futuro contratto di cancellazione quando esisterà l’esperienza di prodotto.',
          ],
        },
        {
          eyebrow: 'Contenuti e amministrazione',
          title: 'Contenuti pubblicati e operazioni pericolose',
          body: [
            'I contenuti riguardano modelli di lettura pubblicati, contenuti delle app e record in stile CMS. L’amministrazione è deliberatamente separata, perché le operazioni pericolose non devono mai essere infilate nelle API usate dai bambini.',
          ],
          bullets: [
            '`content-api` possiede i contenuti pubblicati, la visibilità delle app, le versioni dei contenuti e i modelli di lettura memorizzabili in cache.',
            '`admin-api` possiede la configurazione di back-office, i report, la moderazione, le azioni di assistenza e i log di audit.',
            'Le chiavi o le sessioni dell’API di amministrazione non appartengono ai percorsi usati dai bambini.',
          ],
        },
      ],
    },
  },
}
