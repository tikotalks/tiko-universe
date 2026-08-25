import type { SiteCopy } from '../..'

/**
 * Maltese developer documentation.
 *
 * NOTE: not reviewed by a native Maltese speaker — see the note in `pages.ts`.
 *
 * Service names, paths and code samples stay untranslated: they are addresses,
 * not prose. Code samples are therefore absent here and fall back to English,
 * which is intended.
 */
export const mtDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Paġni tad-dokumentazzjoni',
  articleEyebrow: 'Dokumentazzjoni tal-pjattaforma Tiko',
  pages: {
    'docs-overview': {
      label: 'Ħarsa ġenerali',
      title: 'Dokumentazzjoni ta’ Tiko Universe',
      lede: 'L-arkitettura, il-filosofija tal-prodott u l-mappa tal-API tal-pjattaforma Tiko.',
      summary: 'Punt tad-dħul pubbliku u li jinqara dwar kif inhu mibni Tiko u għaliex is-sistema għandha din il-forma.',
      callouts: [
        {
          title: 'Apps żgħar, pjattaforma waħda',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media u apps futuri jerġgħu jużaw l-istess kuntratti ta’ identità, stat, kontenut, media, ġenerazzjoni u UI.',
        },
        {
          title: 'L-API l-ewwel, native għal Cloudflare',
          body: 'Il-klijenti huma apposta rqaq. L-awtorità tinsab fil-Cloudflare Workers b’D1, R2, KV bħala cache, u Queues fejn ix-xogħol asinkroniku jsir meħtieġ.',
        },
        {
          title: 'L-ebda proċedura ta’ kont l-ewwel',
          body: 'Għodda għat-tfal trid tinfetaħ u tkun utli qabel ma jidhru l-irkupru, is-sinkronizzazzjoni jew l-amministrazzjoni.',
        },
      ],
      sections: [
        {
          eyebrow: 'X’tkopri',
          title: 'Mappa prattika għal min jibni',
          body: [
            'Din id-dokumentazzjoni tispjega lil Tiko bħala prodott u bħala pjattaforma tal-backend. Mhijiex materjal ta’ reklamar u mhijiex miżbla ta’ dettalji tal-implimentazzjoni.',
            'Ir-regola importanti hija sempliċi: jekk imġiba tolqot lill-klijenti tal-web, iOS jew Android, tappartjeni lil kuntratt tal-API dokumentat qabel ma ssir loġika moħbija fil-klijent.',
          ],
          bullets: [
            'Filosofija: prinċipji tal-prodott iċċentrati fuq it-tfal u limiti tekniċi.',
            'Arkitettura: apps, packages, Workers, sjieda tal-ħażna, dominji u limiti tar-rilaxx.',
            'API: il-familji ta’ kuntratti attwali u l-forom stabbli li l-klijenti jistgħu jistennew.',
          ],
        },
        {
          eyebrow: 'Il-forma attwali tal-pjattaforma',
          title: 'Repożitorju wieħed, responsabbiltajiet ċari',
          body: [
            'Tiko Universe huwa monorepo b’npm workspaces: apps skont il-prodott, packages TypeScript maqsuma, u servizzi Cloudflare Worker. Il-kodiċi native tal-iOS jinsab ħdejn il-prodott fejn jeżisti; Android isegwi l-istess kuntratti tal-API minflok ma jikkopja l-loġika tal-backend fil-klijent.',
          ],
          bullets: [
            'Apps: għodod għat-tfal u l-uċuħ pubbliċi jew amministrattivi ta’ appoġġ.',
            'Packages: klijenti tipizzati, kuntratti maqsuma, Tiko UI, i18n, media, identità u għodod tat-testijiet.',
            'Workers: identità, stat tal-apps, kontenut, media, ġenerazzjoni, amministrazzjoni u kompatibbiltà temporanja tat-TTS.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Filosofija',
      title: 'Filosofija tal-prodott u tal-inġinerija',
      lede: 'Tiko huwa software li jaħseb l-ewwel fit-tifel. Il-backend jeżisti biex iżomm il-mument tat-tifel immedjat, kalm u rkuprabbli, mingħajr ma jsir software tan-negozju.',
      summary: 'Il-prinċipji li ma jinbidlux wara kull għażla ta’ arkitettura.',
      callouts: [
        { title: 'Immedjat', body: 'L-apps jinfetħu u jaħdmu mill-ewwel. L-ewwel skrin qatt mhu formola ta’ login.' },
        { title: 'Żgħir', body: 'Kull app tagħmel ħaġa waħda ċara minflok ma ssir pannell ta’ kontroll.' },
        { title: 'Irkuprabbli', body: 'Is-sessjonijiet fuq l-apparat jistgħu jsiru rkuprabbli aktar tard permezz ta’ link maġika bl-email.' },
      ],
      sections: [
        {
          eyebrow: 'Duttrina',
          title: 'Fuq xiex ma nittrattawx',
          body: [
            'Id-duttrina hija apposta stretta, għax «eċċezzjoni waħda biss» twassal, sitt xhur wara, għal pjattaforma li ħadd ma jifhem. Tiko jevita dan billi jżomm l-identità, l-API u s-sjieda tal-ħażna sempliċi u espliċiti.',
          ],
          bullets: [
            'L-ebda passwords u l-ebda ħajt ta’ login qabel l-użu.',
            'L-ebda runtime ta’ Supabase, l-ebda pont għall-utenti l-qodma, l-ebda obbligu ta’ migrazzjoni, u l-ebda suppożizzjoni ta’ Better Auth.',
            'Identità fuq l-apparat b’mod awtomatiku; irkupru fakultattiv bl-email permezz ta’ links maġiċi.',
            'D1 huwa s-sors relazzjonali tal-verità. R2 huwa s-sors tal-verità għall-bytes. KV huwa cache biss.',
            'Lezu jamministra t-traduzzjonijiet; Tiko juża l-bundles u l-fallbacks maħżuna fil-kodiċi.',
            'Il-web, iOS u Android huma klijenti ugwali tal-istess API HTTPS JSON.',
          ],
        },
        {
          eyebrow: 'Mudell tal-prodott',
          title: 'Għaliex apps żgħar',
          body: [
            'Tiko mhuwiex pjattaforma kbira «għal bżonnijiet speċjali» b’labirint ta’ funzjonijiet. Huwa univers ta’ għodod żgħar u ffokati li tista’ tiftaħ fil-mument li tifel jew min jieħu ħsieb ikollu bżonn ħaġa waħda.',
            'Għodod separati jnaqqsu l-piż mentali, iżommu ż-żoni tat-tapping ovvji, u jagħmluha aktar faċli tittestja jekk għodda tgħinx qabel ma titlob lil min jieħu ħsieb jafda s-sinkronizzazzjoni, l-irkupru jew l-amministrazzjoni.',
          ],
          bullets: [
            'Yes No: tweġibiet mgħaġġla b’żewġ għażliet.',
            'Type: dħul ta’ test u vuċi.',
            'Cards: għażliet viżivi u kontenut familjari.',
            'Sequence: rutini bl-ordni u l-passi li jmiss.',
            'Timer: tagħmel il-ħin viżibbli u tgħin fil-bidliet.',
          ],
        },
        {
          eyebrow: 'Mudell tal-inġinerija',
          title: 'Il-kuntratti qabel il-klijenti',
          body: [
            'Il-kodiċi tal-klijent jista’ jkun pjaċevoli u reżistenti. Ma jistax bil-moħbi jsir il-backend. Jekk imġiba għandha awtorità, persistenza, sigrieti tal-fornituri, jew effetti bejn apparati, tappartjeni lil Worker u lil kuntratt dokumentat.',
          ],
          bullets: [
            'Il-packages joffru klijenti tipizzati, mudelli, fixtures u komposizzjoni tal-UI.',
            'Il-Workers jieħdu ħsieb l-awtentikazzjoni, il-limiti tar-rata, l-aċċess għal D1/R2/KV/Queues, is-sejħiet lill-fornituri u l-bidliet permanenti.',
            'L-apps jistgħu jżommu stat lokali ta’ riżerva biex il-parti tat-tfal tibqa’ tintuża meta sejħa tan-netwerk tfalli.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Arkitettura',
      title: 'Arkitettura',
      lede: 'Tiko huwa pjattaforma native għal Cloudflare: apps skont il-prodott, packages tal-klijent maqsuma, Workers bħala servizzi tad-dominju, D1/R2 għall-istat permanenti, u KV bħala cache biss.',
      summary: 'Kif jitqabblu l-monorepo, id-dominji, il-ħażna, il-workers u l-klijenti.',
      callouts: [
        { title: 'Klijenti', body: 'L-apps tal-web b’Vue, l-apps tal-iOS b’SwiftUI u l-klijenti futuri ta’ Android jużaw l-istess kuntratti tal-API.' },
        { title: 'Servizzi', body: 'Il-Workers huma maqsuma skont il-limitu tad-dominju, mhux skont liema fajl kien jeżisti l-ewwel.' },
        { title: 'Ħażna', body: 'D1 għandu l-verità relazzjonali. R2 għandu l-bytes. KV huwa cache li jista’ jinbena mill-ġdid.' },
      ],
      sections: [
        {
          eyebrow: 'Mappa tas-sistema',
          title: 'Il-fluss ġenerali',
          body: [
            'L-arkitettura hija apposta sempliċi. Il-klijenti jitkellmu permezz ta’ API HTTPS JSON. Il-Workers jivverifikaw l-identità u għandhom il-bidliet. Il-ħażna hija marbuta mal-Worker li għandu d-dominju.',
          ],
        },
        {
          eyebrow: 'Repożitorju',
          title: 'Monorepo bil-prodott l-ewwel',
          body: [
            'Ir-repożitorju huwa organizzat l-ewwel skont il-prodotti, imbagħad skont il-packages tal-pjattaforma u l-Workers. Hekk il-kuntest ta’ app għat-tfal jibqa’ qrib l-implimentazzjonijiet tal-web u native tagħha, filwaqt li l-kuntratti jinqasmu permezz tal-packages.',
          ],
          bullets: [
            '`apps/<product>/web` fih apps Vue rilaxxati fuq Cloudflare Pages.',
            '`apps/<product>/ios` fih klijenti SwiftUI fejn jeżisti xogħol native.',
            '`packages/*` fih kuntratti TypeScript maqsuma, klijenti, Tiko UI, i18n, media, identità u għodod tat-testijiet.',
            '`workers/*` fih servizzi Cloudflare Worker bil-bindings D1/R2 u t-testijiet tagħhom.',
          ],
        },
        {
          eyebrow: 'Limiti tas-servizzi',
          title: 'Ir-responsabbiltà ta’ kull Worker',
          body: [
            'Kull Worker għandu xogħol dejjaq. Dan jagħmel l-awtorizzazzjoni, il-migrazzjonijiet, il-limiti tar-rata u r-riskju tar-rilaxx aktar faċli biex tirraġunahom.',
          ],
          bullets: [
            '`identity-api`: suġġetti Ankore, apparati, sessjonijiet, kontijiet u sfidi bl-email.',
            '`app-api`: settings u stat tal-apps għal kull utent.',
            '`content-api`: kontenut ippubblikat, rekords tat-tip CMS, u mudelli ta’ qari li jistgħu jinżammu fil-cache.',
            '`media-api`: awtorizzazzjoni tal-uploads, metadata tal-media, sjieda u aċċess għal R2.',
            '`generation-api`: TTS, ġenerazzjoni ta’ sentenzi u stampi, metadata tal-media ġġenerata u queues futuri.',
            '`admin-api`: operazzjonijiet perikolużi għall-amministraturi biss, rapporti, moderazzjoni u għodod ta’ appoġġ.',
            '`tts-api`: wiċċ ta’ kompatibbiltà temporanju li għandu jidħol f’generation-api.',
          ],
        },
        {
          eyebrow: 'Dominji',
          title: 'Rotot pubbliċi',
          body: [
            'Id-dominji huma parti mill-arkitettura. Ismijiet ġodda ta’ host għal xejn huma eżattament kif pjattaformi jsiru arkeoloġija.',
          ],
          bullets: [
            '`tiko.mt`: il-paġna pubblika tal-prodott u tar-reklamar.',
            '`tikotalks.com`: il-wiċċ pubbliku ta’ TikoTalks għad-dokumentazzjoni u l-marka — jiġifieri dawn il-paġni.',
            '`*.tikoapps.org`: il-familja tal-apps li jaħdmu, bħal yesno, type, cards, sequence, timer, media u admin.',
            '`id.tiko.mt`: l-oriġini tal-identità bbażata fuq l-apparat (alias qadim ta’ `identity.tikoapi.org`).',
            '`*.tikoapi.org`: il-familja tas-servizzi tal-API — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` u `translations` kull wieħed għandu s-subdominju tiegħu.',
            '`*.tikocdn.org`: konsenja tal-bytes biss, l-ebda loġika tal-applikazzjoni.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API',
      title: 'Kuntratti tal-API',
      lede: 'L-API huma s-sinsla tal-prodott. Iħallu lill-klijenti tal-web, iOS u Android iġibu ruħhom l-istess mingħajr ma jikkopjaw il-loġika tal-backend f’kull app.',
      summary: 'Gwida li tinqara għall-familji ta’ kuntratti `/v1` attwali.',
      callouts: [
        { title: 'Bil-verżjoni', body: 'L-API viżibbli għall-klijenti jinsabu taħt `/v1` u jirritornaw JSON, ħlief l-endpoints li jibagħtu bytes.' },
        { title: 'Żbalji tipizzati', body: 'L-iżbalji jużaw kodiċi stabbli li jinqara mill-magni u messaġġi sikuri għall-bnedmin.' },
        { title: 'Tajjeb għal bearer', body: 'Il-klijenti native jridu jaħdmu b’sessjonijiet bearer espliċiti; il-cookies tal-browser waħedhom mhumiex biżżejjed.' },
      ],
      sections: [
        {
          eyebrow: 'Regoli komuni tal-API',
          title: 'Regoli tal-kuntratti',
          body: [
            'Il-forma tal-API tista’ tibqa’ sempliċi. Dak huwa kumpliment. Rotot prevedibbli u involukri ta’ żball konsistenti jżommu diversi klijenti milli jitbiegħdu minn xulxin.',
          ],
          bullets: [
            'Uża rotot `/v1`.',
            'Irritorna JSON mir-rotot tal-API; ibgħat bytes biss minn rotot espliċiti tal-media jew tal-awdjo.',
            'Uża sessjonijiet bearer biex il-klijenti native jkunu ugwali.',
            'Qatt ma tikxef jekk email tal-irkupru jew handle jeżistux.',
            'Aħżen it-tokens mhux moħbija biss fuq il-klijent; is-server iżomm il-hashes.',
            'Tiżvelax lill-klijenti l-messaġġi ta’ żball tal-fornituri.',
          ],
        },
        {
          eyebrow: 'Identità',
          title: 'API tal-identità bbażata fuq l-apparat',
          body: [
            'L-identità teżisti biex l-apps jinfetħu mill-ewwel u xorta jsiru rkuprabbli aktar tard. Il-bootstrap joħloq jew jirkupra sessjoni tal-apparat; l-irkupru bl-email itejjeb il-kontinwità mingħajr ma jibdel il-bidu f’login.',
          ],
          bullets: [
            '`POST /v1/identity/device` — oħloq jew irkupra sessjoni bbażata fuq l-apparat.',
            '`GET /v1/identity/session` — ivverifika u rritorna l-bundle tas-sessjoni attwali.',
            '`POST /v1/identity/email/challenge` — itlob sfida tal-irkupru bl-email b’tweġiba ġenerika.',
            '`POST /v1/identity/email/verify` — ivverifika token ta’ link maġika jew OTP u rritorna bundle tal-identità Ankore.',
            '`POST /v1/identity/logout` — ħassar is-sessjoni bearer attwali.',
          ],
        },
        {
          eyebrow: 'Data tal-apps',
          title: 'API tas-settings u tal-istat',
          body: [
            'L-API tal-app għandha s-settings u l-istat għal kull utent tal-apps żgħar ta’ Tiko. Is-settings huma preferenzi li min jieħu ħsieb jara. L-istat huwa d-data speċifika tal-app li jixraq tinżamm bejn apparati meta ż-żamma tkun intenzjonata.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — aqra s-settings.',
            '`PUT /v1/apps/{app}/settings` — issejvja s-settings b’appoġġ għall-verżjonijiet.',
            '`GET /v1/apps/{app}/state` — aqra l-istat tal-app.',
            '`PUT /v1/apps/{app}/state` — issejvja l-istat tal-app.',
            'Ismijiet permessi tal-apps P0: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Ġenerazzjoni u media',
          title: 'TTS, awdjo ġġenerat, uploads u rekords tal-media',
          body: [
            'Il-ġenerazzjoni u l-media huma relatati imma mhumiex l-istess ħaġa. Il-ġenerazzjoni toħloq riżorsi. Il-media tamministra r-riżorsi mtellgħa u l-metadata tagħhom. R2 iżomm il-bytes; D1 iżomm is-sjieda u l-metadata tat-tfittxija.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — iġġenera jew iġbed mill-cache awdjo minn test.',
            '`GET /v1/generation/audio/{id}` — ibgħat il-bytes tal-awdjo ġġenerat.',
            '`POST /v1/media/uploads` — awtorizza u rreġistra upload ta’ media.',
            '`GET /v1/media/{id}` — aqra l-metadata jew id-dettalji tal-aċċess ta’ media.',
            '`DELETE /v1/media/{id}` — kuntratt futur tat-tħassir meta l-esperjenza tal-prodott teżisti.',
          ],
        },
        {
          eyebrow: 'Kontenut u amministrazzjoni',
          title: 'Kontenut ippubblikat u operazzjonijiet perikolużi',
          body: [
            'Il-kontenut jirrigwarda mudelli ta’ qari ppubblikati, kontenut tal-apps, u rekords tat-tip CMS. L-amministrazzjoni hija apposta separata, għax operazzjonijiet perikolużi qatt m’għandhom jiddaħħlu fl-API użati mit-tfal.',
          ],
          bullets: [
            '`content-api` għandha l-kontenut ippubblikat, il-viżibbiltà tal-apps, il-verżjonijiet tal-kontenut, u l-mudelli ta’ qari li jistgħu jinżammu fil-cache.',
            '`admin-api` għandha l-konfigurazzjoni tal-back-office, ir-rapporti, il-moderazzjoni, l-azzjonijiet ta’ appoġġ u l-logs tal-verifika.',
            'Iċ-ċwievet jew is-sessjonijiet tal-API tal-amministrazzjoni ma jappartjenux għall-proċessi użati mit-tfal.',
          ],
        },
      ],
    },
  },
}
