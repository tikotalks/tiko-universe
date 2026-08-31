import type { SiteCopy } from '../..'

/**
 * Maltese copy for the app surfaces.
 *
 * NOTE: not reviewed by a native Maltese speaker — see the note in `pages.ts`.
 */
export const mtAppsPage: SiteCopy['appsPage'] = {
  intro: {
    eyebrow: 'L-univers tal-apps',
    title: 'Apps żgħar. Xogħol wieħed ċar kull waħda.',
    lede: 'Tiko mhuwiex app waħda kbira. Huwa sett ta’ għodod żgħar u ffokati li jinfetħu mill-ewwel u jagħmlu ħaġa waħda tajjeb. Agħżel dik li taqbel mal-mument.',
  },
  media: {
    eyebrow: 'Mil-librerija ta’ Tiko',
    title: 'Eluf ta’ stampi ċari u kkuluriti.',
  },
  onTheWay: {
    eyebrow: 'Fit-triq',
    title: 'Ġejjin aktar apps żgħar.',
    lede: 'Cards, Sequence u Timer huma mibnija fuq l-istess prinċipji ċċentrati fuq it-tfal bħall-apps ta’ fuq. Kull waħda tinfetaħ malajr u tagħmel ħaġa waħda biss.',
    ctaTitle: 'Mibnija fuq l-istess kuntratti.',
    ctaBody: 'Kull app ta’ Tiko żżomm l-istess wegħdiet iċċentrati fuq it-tfal — tinfetaħ malajr, tagħmel ħaġa waħda, titkellem kull lingwa.',
    ctaLabel: 'Aqra d-dokumentazzjoni tal-arkitettura',
  },
}

export const mtAppDetail: SiteCopy['appDetail'] = {
  notFound: {
    eyebrow: 'Ma nstabitx',
    title: 'L-app ma nstabitx.',
    body: 'M’hemm l-ebda app ta’ Tiko b’dak l-isem.',
    backLabel: 'Lura għall-apps kollha',
  },
  hero: {
    brandPrefix: 'Tiko',
    openLabel: 'Iftaħ {app}',
    comingSoon: 'Dalwaqt',
    iconAlt: 'Ikona tal-app {app}',
  },
  features: {
    eyebrow: 'X’tagħmel',
    title: 'Mibnija għal xogħol wieħed ċar.',
  },
  screenshots: {
    eyebrow: 'Fuq l-apparat',
    title: '{app}, fuq skrin veru.',
    lede: 'Meħud fuq iPhone, kemm fil-mod ċar kif ukoll f’dak skur. Xejn minn dan mhuwiex simulazzjoni.',
  },
  moment: {
    eyebrow: 'Il-mument uman',
    imageAlt: 'Mument kalm ma’ {app}',
    whySmallTitle: 'Għaliex tibqa’ żgħira',
    calmTitle: 'Kif tibqa’ kalma',
  },
  useWhen: {
    eyebrow: 'Meta tużaha',
    title: 'Meta tmur għal {app}',
  },
  cta: {
    openWeb: 'Iftaħha issa fuq il-web.',
    onAppStore: 'Issa fuq l-App Store.',
    comingSoon: 'Dalwaqt.',
    allAppsLabel: 'L-apps kollha',
  },
  mediaLibrary: {
    eyebrow: 'Librerija ta’ stampi integrata',
    title: 'Stampi ta’ Tiko Media, lesti għal Cards.',
    lede: 'Cards jista’ jibda bi stampi ċari u magħrufa minn Tiko Media. Ara l-librerija pubblika jew użahom direttament fis-settijiet tal-karti.',
    browseLabel: 'Ara Tiko Media',
    fallbackImageTitle: 'Stampa ta’ Tiko Media',
  },
  downloadLabel: 'Niżżel {app} mill-App Store',
}

export const mtNotFound: SiteCopy['notFound'] = {
  eyebrow: 'Il-paġna ma nstabitx',
  title: 'Din il-paġna mhijiex hawn.',
  lede: 'Il-link forsi hija qadima, jew il-paġna nbidlet post. Kull app ta’ Tiko hija tap ’il bogħod hawn taħt.',
  primaryLabel: 'Ara l-apps',
  secondaryLabel: 'Lura għall-paġna prinċipali',
  appsEyebrow: 'Miftuħa issa',
  appsTitle: 'Apps li tista’ tuża llum.',
}

/** Per app, by slug. App names are never translated. */
export const mtApps: SiteCopy['apps'] = {
  'yes-no': {
    shortSummary: 'Żewġ buttuni kbar. Tweġiba waħda ċara. Mill-ewwel.',
    headline: 'Mistoqsija waħda ċara. Tweġiba waħda ċara.',
    description: 'Yes No jagħti lit-tfal żewġ għażliet kbar u impossibbli li tinjorahom fuq skrin wieħed. L-ebda konfużjoni, l-ebda scrolling, l-ebda kont. Tiftaħ, tara l-mistoqsija, tmiss it-tweġiba.',
    platformNotes: 'Issa fuq il-web u fuq l-App Store għall-iPhone u l-iPad. Android iżomm l-istess forma sempliċi b’żewġ għażliet.',
    useWhen: [
      'tifel għandu bżonn iwieġeb malajr',
      'min jieħu ħsieb irid jagħmel mistoqsija sempliċi',
      'it-tkellim jew it-tapping għandhom isiru mingħajr skrin ikkomplikat',
    ],
    moment: 'L-aktar mument sempliċi possibbli — mistoqsija waħda, żewġ għażliet kbar, u xejn bejn it-tifel u t-tweġiba.',
    whySmall: 'Yes No jibqa’ żgħir għax żewġ għażliet huma l-punt kollu. M’għandux isir kwestjonarju, pannell ta’ kontroll jew reġistru tal-imġiba.',
    calmDetail: 'Żoni kbar, kuntrast qawwi, vuċi u l-ebda pass ta’ kont iżommu l-mument tat-tweġiba fuq it-tifel.',
    features: [
      { title: 'Żewġ buttuni kbar', body: 'Iva u Le jimlew l-iskrin. Impossibbli li tinjorahom, faċli li tmisshom.' },
      { title: 'Vuċi', body: 'Kull tweġiba tingħad b’leħen għoli biex kulħadd fil-kamra jisimgħha.' },
      { title: 'Storja tat-tweġibiet', body: 'Min jieħu ħsieb jista’ jara t-tweġibiet riċenti mingħajr ma jfixkel lit-tifel.' },
      { title: 'Taħdem offline', body: 'L-ebda netwerk mhu meħtieġ għall-użu bażiku. Tiftaħ u tmiss, xejn aktar.' },
    ],
    captions: [],
  },
  type: {
    shortSummary: 'Ikteb ħsieb u isimgħu jingħad mill-ewwel.',
    headline: 'Ikteb ħsieb. Isimgħu jingħad.',
    description: 'Type huwa kaxxa ta’ test bla distrazzjonijiet, għall-mumenti meta tifel irid jikkomunika bil-kitba. Kull messaġġ jista’ jingħad b’leħen għoli b’tap wieħed.',
    platformNotes: 'Issa fuq il-web u fuq l-App Store għall-iPhone u l-iPad. Android isegwi bl-istess esperjenza kalma u ffokata.',
    useWhen: [
      'tifel irid jikteb messaġġ',
      'sentenzi salvati jkunu ta’ għajnuna',
      'il-vuċi għandha tibqa’ sempliċi u faċli biex tilħaqha',
    ],
    moment: 'Xi ħsibijiet jinkitbu aktar faċilment milli jingħadu — u xi ħsibijiet miktuba jistħoqqilhom vuċi fil-kamra.',
    whySmall: 'Type iżomm il-kitba u l-vuċi f’post kwiet wieħed minflok ma jsir editur ta’ dokumenti jew app ta’ messaġġi.',
    calmDetail: 'L-app tagħmel il-kitba ovvja, iżżomm il-vuċi tap ’il bogħod, u tevita buttuni li jikkompetu mas-sentenza.',
    features: [
      { title: 'Kaxxa ta’ test nadifa', body: 'Kaxxa waħda, buttuna waħda. Tikteb messaġġ u ttellgħu bil-vuċi, bla menus.' },
      { title: 'Librerija ta’ sentenzi', body: 'Salva sentenzi li jerġgħu jiġu spiss biex ikunu tap ’il bogħod.' },
      { title: 'Għażla tal-vuċi', body: 'Agħżel vuċi li taqbel mat-tifel u mal-mument.' },
      { title: 'Tajba mat-tastieri', body: 'Taħdem kemm mat-tastieri fuq l-iskrin kif ukoll ma’ tastieri esterni.' },
    ],
    captions: [],
  },
  cards: {
    shortSummary: 'Karti bi stampi sbieħ. Mis waħda u tismagħha titkellem.',
    headline: 'Stampi li jitkellmu waħedhom.',
    description: 'Cards juri stampi familjari fi grilja sempliċi. Mis karta biex tisma’ l-isem tagħha. Agħżel mill-kategoriji inklużi jew ibni sett tiegħek għal kull rutina jew sitwazzjoni.',
    platformNotes: 'Ġejja bħala esperjenza ffokata tal-karti — stampi sbieħ, tap wieħed biex jitkellmu.',
    useWhen: [
      'l-istampi jikkomunikaw aktar malajr mit-test',
      'l-għażliet għandhom ikunu viżibbli u faċli biex timsshom',
      'librerija ta’ stampi lesta tiffranka ħin ta’ tħejjija',
    ],
    moment: 'Stampa familjari tagħmel għażla faċli. Tmissha, tisimgħha, tkompli.',
    whySmall: 'Cards jiffoka fuq għażliet viżibbli, mhux fuq sistema kkumplikata ta’ ġestjoni tal-kontenut quddiem it-tifel.',
    calmDetail: 'Karti kwadri, tikketti ċari u stampi magħrufa jagħmlu t-tfittxija u t-tapping prevedibbli.',
    features: [
      { title: 'Karti bl-istampi', body: 'Mis karta biex tisma’ l-isem tagħha. L-istampi jagħmlu l-għażliet aktar mgħaġġla biex jingħarfu.' },
      { title: 'Kategoriji inklużi', body: 'Annimali, ikel, emozzjonijiet, ġisem, forom, kuluri, trasport, numri u ittri, lesti biex jintużaw.' },
      { title: 'Karti tiegħek', body: 'Żid karti b’isem, stampa u vuċi tiegħek għal kull kelma jew frażi.' },
      { title: 'Offline l-ewwel', body: 'Il-karti u l-istampi jitgħabbew mill-ħażna lokali biex l-app tibqa’ tintuża bla netwerk.' },
    ],
    captions: [],
  },
  sequence: {
    shortSummary: 'Rutini pass pass. Dejjem ċari, dejjem ’il quddiem.',
    headline: 'Pass wieħed kull darba, dejjem ċar.',
    description: 'Sequence jibdel kull rutina f’lista ċara ta’ passi. Il-pass tal-mument dejjem jidher kbir u fin-nofs. Tmiss biex tkompli. Bla ma taqta’ x’ġej wara.',
    platformNotes: 'Ġejja għall-web u għal native — il-pass li jmiss dejjem viżibbli, dejjem tap ’il bogħod.',
    useWhen: [
      'rutina għandha bżonn ordni ċara',
      'il-pass li jmiss għandu dejjem ikun viżibbli',
      'il-prevedibbiltà tagħmel il-bidliet aktar faċli',
    ],
    moment: 'Kull rutina ssir aktar faċli meta l-pass li jmiss ikun diġà jidher minflok ma jkun f’moħħ ħaddieħor.',
    whySmall: 'Sequence mhuwiex pjanifikatur ta’ proġetti. Juri l-pass tal-mument, il-moviment li jmiss, u biżżejjed progress biex tħossok orjentat.',
    calmDetail: 'Pass wieħed jibqa’ fin-nofs, il-progress jibqa’ sempliċi, u l-istampi jagħmlu r-rutina aktar faċli tingħaraf.',
    features: [
      { title: 'Pass wieħed, skrin sħiħ', body: 'Il-pass tal-mument dejjem ikun l-akbar ħaġa fuq l-iskrin.' },
      { title: 'Barra tal-progress', body: 'Sinjal viżiv sempliċi juri kemm waslet ir-rutina.' },
      { title: 'Rutini tiegħek', body: 'Ibni kull sekwenza: rutina ta’ filgħodu, bidla fil-klassi, tilbes.' },
      { title: 'Stampa għal kull pass', body: 'Kull pass jista’ jkollu stampa biex jingħaraf mill-ewwel.' },
    ],
    captions: [],
  },
  timer: {
    shortSummary: 'Ħin li jonqos kbir u ċar. Ara eżatt kemm fadal.',
    headline: 'Ħin li tabilħaqq tara.',
    description: 'Timer jagħmel il-mixi tal-ħin viżibbli u kalm. Numru kbir li jonqos juri eżatt kemm fadal. L-ebda beeps li jbeżżgħu, biss tmiem viżiv kwiet.',
    platformNotes: 'Ġejja bħala skrin wieħed iffokat — ħaġa waħda, magħmula sew, fuq il-web, iOS u Android.',
    useWhen: [
      'il-bidliet għandhom bżonn tmiem viżibbli',
      'l-istennija tħossha inqas astratta meta l-ħin ikun fuq l-iskrin',
      'l-iskrin għandu jagħmel ħaġa waħda biss',
    ],
    moment: 'Il-ħin iħossu reali meta tarah jiċkien.',
    whySmall: 'Timer jibqa’ fuq il-ħin li jonqos minflok ma jsir kalendarju, ġabra ta’ żveljarini jew app tal-produttività.',
    calmDetail: 'Numru kbir, progress viżibbli u tmiem ġentili jżommu l-ħin konkret mingħajr ma jżidu ansjetà.',
    features: [
      { title: 'Ħin kbir li jonqos', body: 'Il-ħin jimla l-iskrin. L-ebda numri żgħar, l-ebda arloġġi moħbija.' },
      { title: 'Progress viżiv', body: 'Ċirku jew barra jiċkien hekk kif il-ħin jgħaddi, u jagħmlu konkret.' },
      { title: 'Sinjal ġentili tat-tmiem', body: 'Sinjal viżiv kalm u ħoss artab fakultattiv jgħidu li l-ħin spiċċa.' },
      { title: 'Ħinijiet lesti', body: 'Issettja ħinijiet komuni bħal 5, 10 jew 15-il minuta b’tap wieħed.' },
    ],
    captions: [],
  },
  talk: {
    shortSummary: 'Mis il-kliem, ibni sentenza, u isimgħha tingħad.',
    headline: 'Ibni sentenzi. Sib leħnek.',
    description: 'Talk huwa app ta’ komunikazzjoni ġentili, kelma b’kelma. Mis il-kliem biex tibni sentenza fuq strixxa ċara, imbagħad tħalliha tingħad b’leħen għoli. Maħsuba għat-tfal li qed isibu leħinhom — kelma kull darba.',
    platformNotes: 'Issa fuq il-web. iOS u Android isegwu bl-istess esperjenza kalma u ffokata.',
    useWhen: [
      'tifel qed jibni l-lingwa, kelma b’kelma',
      'li tgħid sentenza sħiħa għandu jieħu ftit tapping, mhux tastiera',
      'grilja ta’ kliem kalma u prevedibbli tgħin aktar minn skrin mimli',
    ],
    moment: 'Kull kelma li tifel jagħżel hija att żgħir ta’ min hu. Talk iżomm it-triq mill-ħsieb sal-leħen l-iqsar u l-aktar ġentili possibbli.',
    whySmall: 'Talk jibqa’ fuq il-bini u l-għajdut ta’ sentenza waħda. Mhuwiex app ta’ chat, feed ta’ kontenut, jew tablet għal kollox.',
    calmDetail: 'Grilja ta’ kliem prevedibbli, strixxa ċara tas-sentenza u buttuna waħda biex titkellem iżommu l-attenzjoni fuq il-leħen tat-tifel — mhux fuq l-interfaċċja.',
    features: [
      { title: 'Grilja ta’ kliem', body: 'Mis il-kliem biex iżżidhom mal-istrixxa tas-sentenza. Il-kategoriji jżommu l-kliem relatat qrib xulxin.' },
      { title: 'Strixxa tas-sentenza', body: 'Ara s-sentenza tinbena, kelma b’kelma, qabel ma tingħad.' },
      { title: 'Tkellem b’leħen għoli', body: 'Buttuna waħda tgħid is-sentenza sħiħa b’vuċi ċara.' },
      { title: 'Taħdem offline', body: 'Il-pakketti ewlenin tal-kliem jinżammu lokalment biex Talk jaħdem bla netwerk.' },
    ],
    captions: [],
  },
  say: {
    shortSummary: 'Ara karta, isma’ l-kelma, għidha lura, iċċelebra.',
    headline: 'Prattika kalma tal-kelma, kelma kull darba.',
    description: 'Say huwa app biex tipprattika l-kelma. Agħżel kategorija, ara karta kbira u ħelwa, isma’ l-kelma tagħha, u għidha lura. Kelma tajba twassal għal ċelebrazzjoni ferrieħa u l-karta li jmiss tidher waħedha.',
    platformNotes: 'Issa fuq l-App Store għall-iPhone u l-iPad. Android u l-web isegwu bl-istess esperjenza kalma u ffokata.',
    useWhen: [
      'tifel qed jipprattika l-ewwel kliem tiegħu',
      'kelma mitlufa tfisser prova kalma oħra, mhux ħoss ta’ żball',
      'stampa familjari tagħmel il-kelma aktar faċli biex tintlaħaq',
    ],
    moment: 'Li tipprattika kelma għandu jħossu bħal inkoraġġiment, qatt bħal eżami.',
    whySmall: 'Say jipprattika l-kliem. Mhuwiex programm ta’ terapija, dashboard tal-progress, jew sistema ta’ punteġġ — m’hemmx ħoss ta’ żball, l-ebda salib aħmar, u l-ebda punteġġ imkien.',
    calmDetail: 'Karta kbira waħda kull darba, il-kelma mgħoddija b’vuċi ħelwa, u Skip dejjem fil-qrib biex l-ebda tifel ma jeħel.',
    features: [
      { title: 'Sitt kategoriji ta’ stampi', body: 'Annimali, ikel, vetturi, ġisem, kuluri u numri, lesti biex tipprattika.' },
      { title: 'Kull karta tista’ tinbidel', body: 'X’jidher, x’jingħad, u liema kliem jgħoddu tajjeb: kollox tiegħek.' },
      { title: 'Smigħ fuq l-apparat', body: 'L-għarfien tal-vuċi jaħdem fuq l-apparat fejn hu appoġġjat. Ir-reġistrazzjonijiet qatt ma jinżammu jew jintbagħtu.' },
      { title: 'Sitt lingwi mitkellma', body: 'Jitkellem u jisma’ bl-Ingliż, l-Olandiż, il-Franċiż, l-Ispanjol, il-Ġermaniż u l-Malti.' },
    ],
    captions: ['Agħżel kategorija', 'Karta waħda, kelma waħda'],
  },
  sum: {
    shortSummary: 'Matematika li titkellem — u li qatt ma tgħid «ħażin».',
    headline: 'Kull numru mgħoddi. Kull tweġiba għażla.',
    description: 'Sum huwa app tal-matematika li titkellem għat-tfal, u mhijiex kalkulatriċi: qatt ma turi r-riżultat. Kull buttuna tingħad b’leħen għoli, u t-tweġiba hija dejjem għażla bejn tliet kaxxi kbar.',
    platformNotes: 'Issa fuq l-App Store għall-iPhone u l-iPad. Android u l-web isegwu bl-istess esperjenza kalma u ffokata.',
    useWhen: [
      'l-għadd u s-somom għandhom jinstemgħu, mhux biss jidhru',
      'tap ħażin ifisser terġa’ tisma’ s-somma, mhux ħoss ta’ żball',
      'ġenitur irid jillimita kemm jikbru n-numri',
    ],
    moment: 'Somma tinżamm aħjar meta tisimgħha — «tlieta… żid… ħamsa…» — minflok ma taqraha minn fuq skrin.',
    whySmall: 'Sum jgħallem somma waħda kull darba. Mhuwiex kurrikulu, kejl ta’ serje, jew rapport tal-iskola.',
    calmDetail: 'Agħżel il-kaxxa t-tajba u l-iskrin jiċċelebra; agħżel oħra u Sum sempliċement jerġa’ jgħid is-somma. L-ebda ħoss ta’ żball, l-ebda salib aħmar, l-ebda pressjoni.',
    features: [
      { title: 'Tastiera li titkellem', body: 'Kull numru u kull sinjal jinqara b’leħen għoli fil-lingwa tat-tifel.' },
      { title: 'It-tweġiba hija għażla', body: 'Tliet kaxxi — waħda tajba u tnejn simili magħżula sew. Qatt kaxxa vojta fejn tfalli.' },
      { title: 'L-erba’ operazzjonijiet', body: 'Żid, naqqas, immoltiplika u iddividi, b’numru massimu li ġenitur jista’ jissettja.' },
      { title: 'Tliet modi kif twieġeb', body: 'Agħżel kaxxa, ikteb in-numru, jew għidu b’leħen għoli. Biss dan tal-aħħar juża l-mikrofonu.' },
    ],
    captions: ['Agħżel livell', 'Tliet kaxxi, waħda tajba', 'It-tastiera li titkellem'],
  },
  first: {
    shortSummary: 'L-ewwel, imbagħad, lest. Rutina bl-istampi li titkellem.',
    headline: 'Pass wieħed kull darba, mgħoddi b’leħen għoli.',
    description: 'First jibdel rutina fi stampi li tifel jista’ jsegwi waħdu. Inti tibni l-passi; it-tifel jara stampa kbira waħda kull darba, jisimgħha tingħad, u jmissha biex jimmarkaha.',
    platformNotes: 'Issa fuq l-App Store għall-iPhone u l-iPad. Android u l-web isegwu bl-istess esperjenza kalma u ffokata.',
    useWhen: [
      'rutina għandha tiġi segwita mingħajr adult li jirrakkontaha',
      'tifel għandu jara x’qed jiġri issa u x’ġej wara',
      'ma jridu l-ebda mikrofonu, kamera jew talba ta’ permess',
    ],
    moment: 'Rutina tieqaf tkun negozjar meta l-pass li jmiss ikun diġà fuq l-iskrin minflok f’moħħ ħaddieħor.',
    whySmall: 'First juri l-pass fejn wasal it-tifel. Mhuwiex pjanifikatur, arloġġ jew tabella tal-imġiba — m’hemmx timers u l-ebda punteġġi.',
    calmDetail: 'Il-passi jiġu mmarkati fl-ordni, tap ’il quddiem sempliċement jgħid dak il-pass, u l-aħħar marka dejjem tista’ titneħħa.',
    features: [
      { title: 'Pass kbir wieħed kull darba', body: 'Stampa, titlu qasir, mgħoddi fil-lingwa tat-tifel hekk kif jasal imissu.' },
      { title: 'Tmien rutini lesti', body: 'Filgħodu, ħin l-irqad, toħroġ, ikla, banju, tiġbor, ġurnata l-iskola, u bord ta’ l-ewwel/imbagħad.' },
      { title: 'Il-kliem tiegħek, ir-ritratti tiegħek', body: 'Kull rutina u kull pass jistgħu jinbidlu — inklużi ritratti taż-żraben jew tal-basket veri tat-tifel.' },
      { title: 'L-ebda permessi', body: 'L-ebda mikrofonu, l-ebda kamera, l-ebda reklami, l-ebda kontijiet. Taħdem offline wara l-ewwel użu.' },
    ],
    captions: ['Agħżel rutina', 'Pass wieħed, skrin sħiħ', 'Ittemm ir-rutina'],
  },
}
