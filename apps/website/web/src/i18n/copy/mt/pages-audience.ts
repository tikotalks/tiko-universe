import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/**
 * Maltese copy for the audience-facing and help pages.
 *
 * NOTE: not reviewed by a native Maltese speaker — see the note in `pages.ts`.
 */
export const mtAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Għal min jieħu ħsieb',
    description:
      'X’jwiegħed Tiko lill-ġenituri u lil min jieħu ħsieb: l-ebda kont qabel l-użu, l-ebda reklami, l-ebda traċċar, u għodod li tista’ tipprova f’mument diffiċli mingħajr ma tħejji xejn.',
    eyebrow: 'Għal min jieħu ħsieb',
    title: 'Mibni biex l-ewwel mument ma jkunx formola ta’ kont.',
    lede: 'Għandek tkun tista’ tipprova għodda qabel ma tafdaha. Tiko huwa maħsub biex min jieħu ħsieb jiftaħ app, jara jekk tgħinx, u jżid l-irkupru jew is-sinkronizzazzjoni biss meta dan tabilħaqq jimporta.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Prinċipji ta’ fiduċja',
        title: 'Fuq xiex ma nittrattawx.',
        lede: 'Dawn huma impenji, mhux settings tal-lum. Ma jinbidlux meta jinbidlu ċ-ċirkostanzi.',
        points: [
          {
            title: 'Bla ħlas, dejjem',
            body: 'Qatt ma nbigħu d-data tiegħek jew l-attenzjoni ta’ tifel bi skambju għall-aċċess. L-apps huma bla ħlas għax tħallas għall-komunikazzjoni huwa l-iskambju ħażin.',
          },
          {
            title: 'L-ebda reklami. Qatt.',
            body: 'F’ebda app ta’ Tiko m’hemm reklamar, traċċar għar-reklamar, jew netwerks tar-reklami ta’ terzi.',
          },
          {
            title: 'L-ebda ħitan ta’ login',
            body: 'L-apps għat-tfal jinfetħu u jaħdmu mingħajr kont. Xejn ma joqgħod bejn tifel u l-fatt li jinftiehem.',
          },
          {
            title: 'L-inqas possibbli',
            body: 'Niġbru biss dak li app tabilħaqq għandha bżonn biex taħdem, u ħafna mill-apps ta’ Tiko m’għandhom bżonn xejn.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Kif tibda',
        title: 'M’hemmx għalfejn tħejji.',
        body: [
          'M’hemmx mod wieħed korrett kif tibda u xejn x’tissettja qabel. Iftaħ l-app li taqbel mal-mument li qiegħed fih tabilħaqq — mistoqsija x’twieġeb, rutina x’taqsam, kelma x’tipprattika — u użaha. Jekk ma tgħinx, agħlaqha. Ma ntefaq xejn u ma ġie ffirmat xejn.',
          'Ħafna minn dawk li jieħdu ħsieb isibu app waħda li taqbel u jibqgħu magħha għal żmien twil. Dak huwa riżultat tajjeb, mhux limitazzjoni. Tiko ma jridx isir il-post fejn it-tifel tiegħek jgħaddi l-ġurnata.',
        ],
        steps: [
          {
            title: 'Ibda mill-mument, mhux mill-app',
            body: 'Agħżel l-app li taqbel ma’ xi ħaġa li qed tiġri llum. Yes No għal mistoqsija, First għal rutina, Type għal messaġġ li jrid jingħad.',
          },
          {
            title: 'Użaha ħdejn it-tifel',
            body: 'Dawn huma għodod għal żewġ persuni. Li toqgħod ħdejh u turih tapping jew sentenza jgħin aktar milli tgħaddilu l-apparat.',
          },
          {
            title: 'Agħmilha tiegħu',
            body: 'Daħħal ir-ritratti tiegħek, il-kliem tiegħek, ir-rutina tiegħek. Ritratt taż-żraben veri tat-tifel jgħodd aktar minn ikona ta’ żraben.',
          },
          {
            title: 'Żid l-irkupru biss jekk trid',
            body: 'Jekk is-settings għandhom jimxu miegħek fuq apparat ieħor, żid email darba. Jekk le, aqbeż — xejn aktar ma jinbidel.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Bl-onestà kollha',
        title: 'X’jagħmel u x’ma jagħmilx Tiko.',
        body: [
          'Tiko ma jiddijanjostikax, ma jikkurax, u ma jwiegħed l-ebda riżultat. Mhux se jgħidlek jekk it-tifel tiegħek qiegħedx javvanza, u apposta ma jżomm l-ebda punteġġ li jista’ jagħti dik l-impressjoni. Jekk trid evalwazzjoni, dak huwa x-xogħol ta’ terapista tal-lingwa, u wieħed tajjeb jiswa ħafna aktar minn kwalunkwe app.',
          'Dak li Tiko jista’ jagħmel huwa jneħħi t-tfixkil minn mumenti speċifiċi — li tiġi mistoqsi u jkollok mod kif twieġeb, li tkun taf x’ġej wara f’rutina, li toħroġ sentenza li altrimenti tibqa’ mwaħħla. Dawk il-mumenti jgħoddu, u huma xogħol biżżejjed għal għodda waħda.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Privatezza',
        title: 'X’jiġri mid-data tat-tifel tiegħek.',
        body: [
          'F’ħafna mill-apps ta’ Tiko, xejn ma joħroġ mill-apparat. Il-karti li toħloq, ir-rutini li tibni u s-sentenzi li tissejvja jinżammu lokalment. M’hemmx analitika li tirreġistra x’imiss tifel, u l-ebda identifikaturi tar-reklamar.',
          'Jekk tixgħel is-sinkronizzazzjoni, il-kontenut li ħloqt jinżamm biex jasal fl-apparati l-oħra tiegħek. Dak huwa kontenut li adult ħoloq apposta — qatt reġistru ta’ kif tifel uża l-app. Tista’ taqra eżattament x’jinżamm fil-politika tal-privatezza, u għax Tiko huwa open source tista’ wkoll tiċċekkja l-kodiċi minflok tafda l-kelma tagħna.',
        ],
      },
    ],
    cta: {
      title: 'Ipprovaha llum mat-tifel tiegħek.',
      body: 'Iftaħ app u użaha għal żewġ minuti. Dak jgħidlek aktar minn kwalunkwe deskrizzjoni f’din il-paġna.',
      primaryLabel: 'Ara l-apps',
      primaryPath: '/apps',
      secondaryLabel: 'Aqra l-politika tal-privatezza',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Għall-għalliema u t-terapisti',
    description:
      'Tuża Tiko ma’ klassi jew grupp ta’ tfal: profil separat għal kull tifel, l-ebda liċenzja għal kull post, xejn x’tinstalla, u l-ebda data li toħroġ mill-apparat.',
    eyebrow: 'Għall-għalliema u t-terapisti',
    title: 'Segwi ħafna tfal. Żomm kull esperjenza kalma.',
    lede: 'Il-Ġestjoni tal-Profili ta’ Tiko tħalli għalliem jew terapista joħloq profil ħafif u separat għal kull tifel — u jiddeċiedi eżattament għal xiex jista’ jasal kull wieħed. It-tfal jieħdu għodda sempliċi u ffokata. L-adulti jżommu l-kontrolli barra mill-vista.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'Fil-klassi',
        title: 'Mibni għall-għoxrin minuta li tabilħaqq għandek.',
        body: [
          'Is-software li jasal fi skola ġeneralment jassumi li xi ħadd għandu ħin biex jissettjah. Fil-prattika min qed iżomm it-tablet għandu l-ftit minuti bejn lezzjoni u oħra, u tifel li għandu bżonn tweġiba issa.',
          'Tiko huwa mibni għal dik ir-realtà. Fuq apparat immaniġġjat m’hemm xejn x’tinstalla ħlief li tiftaħ link, l-ebda ċavetta ta’ liċenzja x’tiġri warajha, u l-ebda ġurnata ta’ taħriġ qabel ma għodda tkun tista’ tintuża. Jekk ma taqbilx mal-post tiegħek, tkun tlift ftit minuti minflok linja tal-baġit.',
        ],
        points: [
          {
            title: 'L-ebda liċenzja għal kull post',
            body: 'Bla ħlas għal kull tifel fil-klassi jew fil-grupp tiegħek. M’hemmx numru ta’ tfal x’tirrapporta u l-ebda tiġdid x’tiddefendi.',
          },
          {
            title: 'Xejn x’tinstalla',
            body: 'L-apps tal-web jaħdmu minn link fuq apparat immaniġġjat. Dawk native huma installazzjoni normali mill-App Store.',
          },
          {
            title: 'L-ebda kontijiet tat-tfal',
            body: 'It-tfal qatt ma joħolqu logins jew jużaw passwords, u dan iżomm l-għodda barra minn ħafna mill-proċeduri ta’ protezzjoni tat-tfal.',
          },
          {
            title: 'Taħdem fuq in-netwerk li għandek',
            body: 'L-apps jaħdmu offline wara l-ewwel użu, allura netwerk tal-iskola ffiltrat jew mhux affidabbli ma jwaqqafx sessjoni.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Ħafna tfal',
        title: 'Profil separat għal kull tifel.',
        body: [
          'Grupp ta’ tfal mhuwiex utent wieħed. Kull tifel għandu bżonn il-vokabularju tiegħu, ir-rutini tiegħu u l-istampi tiegħu — u ħadd minnhom m’għandu jara dawk ta’ ħaddieħor.',
          'Il-Ġestjoni tal-Profili żżommhom separati fuq l-istess apparat. Inti taqleb bejniethom bħala adult, u kull tifel jara biss il-kontenut tiegħu meta jiftaħ app. Il-kontrolli tal-adulti jinsabu wara l-istess proċessi riżervati użati kullimkien f’Tiko, allura tifel kurjuż ma jispiċċax fis-settings.',
        ],
        points: [
          {
            title: 'Kontenut għal kull tifel',
            body: 'Il-karti, ir-rutini u s-sentenzi salvati jappartjenu lil profil, mhux lill-apparat.',
          },
          {
            title: 'Il-qlib huwa għall-adulti biss',
            body: 'Li tibdel profil hija azzjoni ta’ adult. It-tfal jibqgħu fl-app li ngħatatilhom.',
          },
          {
            title: 'Tajjeb għal apparati maqsuma',
            body: 'Mibni għat-tablet li jgħaddi minn tifel għal ieħor matul il-ġurnata, li huwa kif jaħdmu tabilħaqq ħafna postijiet.',
          },
          {
            title: 'L-ebda viżibbiltà bejn it-tfal',
            body: 'Il-vokabularju u l-istorja ta’ tifel qatt ma jidhru minn profil ieħor.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'Flimkien max-xogħol tiegħek',
        title: 'Għodda f’idejk, mhux programm x’issegwi.',
        body: [
          'Tiko m’għandu l-ebda kurrikulu integrat, l-ebda sekwenza mfassla, u l-ebda opinjoni dwar kif għandha tmur sessjoni. Ma jagħtix punteġġ lil tifel, ma jqabblux ma’ norma, u ma joħroġx rapport. Dawk il-ġudizzji huma tiegħek, u l-evidenza għalihom tiġi mill-osservazzjoni tiegħek, mhux mit-telemetrija ta’ app.',
          'Dak li Tiko jagħtik huwa sett ta’ għodod affidabbli u bla tfixkil li tmur għalihom waqt ix-xogħol li diġà tagħmel: toffri għażla bejn tnejn, tibni sentenza, iżżomm l-attenzjoni fuq pass wieħed, jew tipprattika kelma mingħajr ħoss ta’ żball li jikkastiga l-iżball.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Data u protezzjoni tat-tfal',
        title: 'Fil-qosor: tibqa’ fuq l-apparat.',
        body: [
          'Ħafna mill-apps ta’ Tiko ma jibagħtu xejn imkien. M’hemmx analitika fuq l-interazzjonijiet tat-tfal, l-ebda reklamar, u l-ebda trackers ta’ terzi. L-għarfien tal-vuċi, fejn jintuża, jaħdem fuq l-apparat kull fejn il-pjattaforma tippermetti, u r-reġistrazzjonijiet qatt ma jinżammu.',
          'Għax l-apps huma open source, l-IT jew ir-responsabbli għall-protezzjoni tat-tfal tiegħek jista’ jivverifika dan minflok ma jorbot fuq assigurazzjoni f’fuljett. Jekk il-post tiegħek għandu bżonn id-dettall bil-miktub, il-politika tal-privatezza u d-dokumentazzjoni tal-arkitettura huma t-tnejn pubbliċi.',
        ],
      },
    ],
    cta: {
      title: 'Ipprova l-ewwel ma’ tifel wieħed.',
      body: 'Agħżel app waħda u tifel wieħed din il-ġimgħa. Dak huwa test aktar ġust minn kwalunkwe matriċi ta’ evalwazzjoni, u ma jiswa xejn.',
      primaryLabel: 'Ara l-apps',
      primaryPath: '/apps',
      secondaryLabel: 'Il-prinċipji tagħna',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Mistoqsijiet frekwenti',
    description:
      'Tweġibiet ċari dwar x’inhu Tiko, kemm jiswa, x’jiġbor, u x’apposta ma jgħidx li jagħmel.',
    eyebrow: 'Mistoqsijiet frekwenti',
    title: 'Tweġibiet ċari qabel ma tissettja xejn.',
    lede: 'Tweġibiet qosra għall-mistoqsijiet li l-aktar jagħmlu min jieħu ħsieb, l-għalliema u l-iżviluppaturi. Jekk tiegħek mhijiex hawn, persuna vera hija email ’il bogħod.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'Il-bażi',
        title: 'X’inhu Tiko.',
        questions: [
          {
            question: 'X’inhu Tiko?',
            answer:
              'Tiko huwa ġabra ta’ apps żgħar u bla ħlas li jgħinu lit-tfal jikkomunikaw, jagħżlu, isegwu rutini u jifhmu l-ħin. Kull app tagħmel ħaġa waħda ċara u tinfetaħ mill-ewwel — f’kull lingwa, fuq kull apparat, bla kont.',
          },
          {
            question: 'Għaliex ħafna apps minflok waħda?',
            answer:
              'Għax kull buttuna żejda fuq l-iskrin hija ħaġa oħra li tifel jista’ jaqra ħażin jew imiss bi żball. App li tagħmel ħaġa waħda tista’ tiġi mgħallma kollha, u tifel li tgħallimha jista’ jafdaha. Yes No huma żewġ buttuni; qatt m’għandu jikber fuqhom bennej ta’ sentenzi.',
          },
          {
            question: 'Għal min hu Tiko?',
            answer:
              'Għat-tfal li għandhom bżonn appoġġ biex jesprimu ruħhom — minħabba diffikultà tal-kelma jew tal-lingwa, dewmien fl-iżvilupp, diżabbiltà, jew sempliċement għax għadhom fil-bidu tat-taħdit — u għall-ġenituri, l-għalliema u t-terapisti ħdejhom. Xejn minn dan ma jeħtieġ dijanjożi.',
          },
          {
            question: 'Liema apps jeżistu llum?',
            answer:
              'Yes No, Type, Talk, Say, Sum u First huma disponibbli, fuq il-web jew fuq l-App Store skont l-app. Cards, Sequence u Timer għadhom qed jinbnew. Il-paġna tal-apps turi eżattament fejn tista’ tinfetaħ kull waħda.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Il-prezz',
        title: 'Kemm jiswa u għaliex.',
        questions: [
          {
            question: 'Tiko huwa tabilħaqq bla ħlas?',
            answer:
              'Iva. L-apps ta’ Tiko huma bla ħlas, dejjem. Mhux verżjoni ta’ prova temporanja, mhux togħma, u mhux mezz biex tinbiegħlek xi ħaġa. M’hemmx livell imħallas li jżomm lura funzjoni li tifel għandu bżonn.',
          },
          {
            question: 'Tiko se juri reklami?',
            answer:
              'Le. L-ebda reklami, qatt. Tiko għandu jkun sikur li tiftħu ħdejn tifel mingħajr kontenut kummerċjali, messaġġi sponsorjati, jew xi ħaġa maħsuba biex tiġbed l-attenzjoni.',
          },
          {
            question: 'Jekk hu bla ħlas u bla reklami, kif jiġi ffinanzjat?',
            answer:
              'Tiko huwa mibni bħala proġett open source u mhux bħala negozju b’mira ta’ tkabbir. Dan iżomm l-ispejjeż baxxi — l-apps huma żgħar ħafna u ħafna minnhom ma jitkellmu ma’ ebda server.',
          },
          {
            question: 'Id-data tat-tifel tiegħi hija l-ħlas?',
            answer:
              'Le. Hawn bla ħlas ma jfissirx iffinanzjat bir-reklami. Ħafna mill-apps ta’ Tiko ma jiġbru xejn, allura ma jkun hemm xejn x’jinbiegħ anke kieku ridna.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Kontijiet u privatezza',
        title: 'X’trid tagħti biex tużah.',
        questions: [
          {
            question: 'Għandi bżonn kont?',
            answer:
              'Le. L-apps ta’ Tiko jinfetħu u jaħdmu bla ħajt ta’ login. L-irkupru fakultattiv għal min jieħu ħsieb huwa disponibbli aktar tard permezz ta’ link maġika bl-email, imma l-app tat-tfal qatt ma tibda bil-ħolqien ta’ kont.',
          },
          {
            question: 'X’data jiġbor Tiko?',
            answer:
              'F’ħafna mill-apps, l-ebda waħda. M’hemmx analitika fuq x’imiss tifel, l-ebda identifikaturi tar-reklamar, u l-ebda trackers ta’ terzi. Dak li toħloq — karti, rutini, sentenzi salvati — jibqa’ fuq l-apparat sakemm ma tixgħelx is-sinkronizzazzjoni.',
          },
          {
            question: 'Tiko jirreġistra l-vuċi tat-tifel tiegħi?',
            answer:
              'Fejn app tisma’, l-għarfien tal-vuċi jaħdem fuq l-apparat kull fejn il-pjattaforma tippermetti, u r-reġistrazzjonijiet qatt ma jinżammu jew jintbagħtu. L-apps li ma għandhomx bżonn mikrofonu qatt ma jitolbuh.',
          },
          {
            question: 'Nista’ nivverifika dan kollu?',
            answer:
              'Iva, u għandek. Tiko huwa open source, allura l-kodiċi wara dawn l-affermazzjonijiet huwa pubbliku. Il-politika tal-privatezza tispjega b’lingwa ċara x’jinżamm.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'X’mhuwiex Tiko',
        title: 'Il-limiti, mgħidin ċar.',
        questions: [
          {
            question: 'Tiko huwa prodott terapewtiku jew mediku?',
            answer:
              'Le. Tiko ma jiddijanjostikax, ma jikkurax, u ma jwiegħed l-ebda riżultat. Huwa sett ta’ għodod ta’ komunikazzjoni u tagħlim, mhux intervent kliniku, u mhux sostitut għal terapista tal-lingwa.',
          },
          {
            question: 'Tiko isegwi l-progress?',
            answer:
              'Le, apposta. M’hemmx punteġġi, serje jew dashboards. Il-progress fil-komunikazzjoni mhuwiex xi ħaġa li app għandha tagħti marka għaliha, u numru fuq skrin għandu tendenza jsawwar l-imġiba tal-adult aktar minn dik tat-tifel.',
          },
          {
            question: 'Se jaħdem għat-tifel tiegħi?',
            answer:
              'Onestament ma nafux, u min jgħid mod ieħor qed jaqta’. L-apps huma bla ħlas u jinfetħu mill-ewwel, allura l-irħas mod kif issir taf huwa li tipprova waħda għal ftit minuti.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Prattiku',
        title: 'Apparati, lingwi u użu offline.',
        questions: [
          {
            question: 'Liema lingwi jitkellem Tiko?',
            answer:
              'L-apps huma b’ħafna lingwi mill-bażi, u l-lingwa li jagħżel min jieħu ħsieb timxi miegħu f’kull app ta’ Tiko u fuq dan is-sit. Fejn lingwa għadha m’għandhiex traduzzjoni tal-interfaċċja, l-app taqleb għall-Ingliż minflok ma tirrifjuta li tinfetaħ.',
          },
          {
            question: 'Jaħdem offline?',
            answer:
              'Iva. L-apps iniżżlu l-kontenut ewlieni fuq l-apparat u jibqgħu jaħdmu bla netwerk. Kulma għandu bżonn l-internet huwa żieda, u li ma tilħaqx ma twaqqafx l-app.',
          },
          {
            question: 'Fuq liema apparati jaħdem?',
            answer:
              'Fuq kull browser modern, flimkien ma’ apps native għall-iPhone u l-iPad għal dawk li ħarġu fuq l-App Store. Android isegwi l-istess approċċ.',
          },
          {
            question: 'Nista’ nużah ma’ klassi jew grupp?',
            answer:
              'Iva. Il-Ġestjoni tal-Profili żżomm profil separat għal kull tifel fuq apparat maqsum, u m’hemmx liċenzja għal kull post x’tixtri jew x’tirrapporta.',
          },
        ],
      },
    ],
    cta: {
      title: 'Għad għandek mistoqsija?',
      body: 'L-għajnuna hija persuna, mhux kju ta’ tickets. Staqsi u tieħu tweġiba ċara.',
      primaryLabel: 'Ikseb għajnuna',
      primaryPath: '/support',
      secondaryLabel: 'Għaliex jeżisti Tiko',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Għajnuna',
    description:
      'Għajnuna bl-apps ta’ Tiko għat-tfal, għal min jieħu ħsieb u għall-għalliema — suġġetti komuni, soluzzjoni ta’ problemi, u kif tasal għand persuna.',
    eyebrow: 'Għajnuna',
    title: 'Aħna hawn biex ngħinu.',
    lede: 'Għajnuna bl-apps ta’ Tiko għat-tfal, għal min jieħu ħsieb u għall-għalliema. Ħafna mit-tweġibiet huma hawn taħt — u persuna vera hija email ’il bogħod.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Suġġetti komuni',
        title: 'Tweġibiet mgħaġġla biex tibda.',
        points: [
          {
            title: 'Kif tibda',
            body: 'Kull app ta’ Tiko tinfetaħ mill-ewwel — l-ebda kont jew password. Iftaħ il-link jew installa l-app u ibda użaha.',
          },
          {
            title: 'Kontijiet u apparati',
            body: 'Tiko juża sessjonijiet marbuta mal-apparat minflok passwords. Jekk tibdel jew tirrisettja apparat, żid email tal-irkupru qabel biex il-kontenut tiegħek jimxi miegħek.',
          },
          {
            title: 'Vuċijiet u lingwi',
            body: 'Agħżel vuċi u lingwa li jaqblu mat-tifel. L-apps ta’ Tiko jaħdmu b’ħafna lingwi u jaqilbu mill-ewwel mis-settings.',
          },
          {
            title: 'Użu offline',
            body: 'L-apps jibqgħu jaħdmu bla netwerk wara l-ewwel użu. Is-sinkronizzazzjoni terġa’ tibda waħedha meta l-konnessjoni tiġi lura.',
          },
          {
            title: 'Privatezza u data',
            body: 'Ħafna mill-apps ma jżommu xejn barra mill-apparat. Dak li toħloq jibqa’ lokali sakemm ma tixgħelx is-sinkronizzazzjoni apposta.',
          },
          {
            title: 'Xi ħaġa ma taħdimx?',
            body: 'Għidilna x’rajt, fuq liema apparat, u f’liema app. Dak normalment ikun biżżejjed biex insibuha.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Soluzzjoni ta’ problemi',
        title: 'It-tliet affarijiet li jsolvu ħafna mill-problemi.',
        steps: [
          {
            title: 'Erġa’ tella’ l-app',
            body: 'Agħlaqha għal kollox u erġa’ iftaħha. L-apps tal-web jaġġornaw fl-isfond, u ftuħ ġdid jieħu l-aħħar verżjoni.',
          },
          {
            title: 'Iċċekkja l-lingwa u l-vuċi',
            body: 'Jekk il-vuċi tinstema’ ħażin jew ma tinstemax, il-vuċi magħżula forsi mhijiex installata fuq l-apparat. Ipprova oħra fis-settings — fuq iOS, il-vuċijiet żejda jiġu installati mis-settings tal-aċċessibbiltà tas-sistema.',
          },
          {
            title: 'Ikkonferma li l-apparat mhux mimmutat',
            body: 'Buttuna tas-silenzju jew tab mimmutat huma warajhom aktar rapporti ta’ «l-vuċi ma taħdimx» minn kwalunkwe ħaġa oħra.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Kuntatt',
        title: 'Kellem persuna.',
        body: [
          'L-għajnuna twieġeb min jibni Tiko, mhux kju. M’hemmx numru ta’ ticket u l-ebda livelli ta’ servizz — tieħu tweġiba ċara, anke meta t-tweġiba tkun li xi ħaġa hija miksura jew mhijiex ippjanata.',
          'Jekk qed tirrapporta problema, l-aktar affarijiet utli huma l-app, l-apparat u l-verżjoni tal-browser jew tas-sistema, x’stennejt, u x’ġara minflok. Screenshot jgħodd aktar minn deskrizzjoni.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Ipparteċipa',
        title: 'Irrapporta, issuġġerixxi jew ibni.',
        body: [
          'Tiko huwa open source, allura rapport ta’ żball huwa tabilħaqq utli u pull request hija milqugħa. Id-direzzjoni tal-proġett tiġi l-aktar minn ġenituri, terapisti u għalliema li jgħidu x’jonqos — dak huwa ħafna aktar preċiż minn pjan miktub mingħajrhom.',
          'Jekk taħdem ma’ tfal li jużaw għodod tal-komunikazzjoni u xi ħaġa hawn mhijiex tajba, nippreferu nkunu nafu.',
        ],
      },
    ],
    cta: {
      title: 'Aqra t-tweġibiet l-ewwel.',
      body: 'Il-mistoqsijiet frekwenti jkopru l-prezz, il-privatezza, il-kontijiet, u dak li Tiko apposta ma jagħmilx.',
      primaryLabel: 'Aqra l-mistoqsijiet frekwenti',
      primaryPath: '/faq',
      secondaryLabel: 'Kif jaħdem',
      secondaryPath: '/how-it-works',
    },
  },
}
