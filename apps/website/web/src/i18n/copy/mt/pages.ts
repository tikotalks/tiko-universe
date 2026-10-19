import type { SiteCopyOverride } from '../..'

/**
 * Maltese page copy.
 *
 * NOTE: this translation is a best effort and has NOT been reviewed by a native
 * Maltese speaker. Maltese is a small language with little reliable reference
 * material, and this is a product for children who already struggle to be
 * understood — a clumsy translation is worse here than an honest English
 * fallback. Please have this checked before relying on it.
 *
 * Section ids are deliberately absent — they are anchors, not text.
 */
export const mtPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Għaliex jeżisti Tiko',
    description:
      'Għaliex Tiko huwa familja ta’ apps żgħar, bla ħlas u f’ħafna lingwi minflok pjattaforma waħda kbira tal-komunikazzjoni — u għaliex xejn minn dan ma jiswa flus.',
    eyebrow: 'Għaliex jeżisti Tiko',
    title: 'Sabiħ, sempliċi, u f’kull lingwa.',
    lede: 'Tiko huwa familja ta’ apps żgħar, sbieħ u bla ħlas li jgħinu lit-tfal jikkomunikaw, jagħżlu, isegwu rutini u jifhmu l-ħin. Kull app tinfetaħ fi ftit sekondi, taħdem f’kull lingwa, u qatt ma titlob kont — għax l-ewwel pass għandu jkun l-użu, mhux l-issettjar.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'Il-problema',
        title: 'L-għodod tal-komunikazzjoni jitolbu wisq qabel ma jgħinu.',
        body: [
          'Tifel jew tifla li għadhom ma jistgħux jgħidu dak li jridu qed ikollhom ġurnata diffiċli issa — mhux wara perjodu ta’ prova, liċenzja, taħriġ u login. Xorta waħda, ħafna mis-software tal-komunikazzjoni jitlob l-erbgħa. Jasal bħala pjattaforma: kont x’toħloq, abbonament x’tiġġustifika, skrin ta’ konfigurazzjoni x’taqsam, u manwal x’taqra qabel ma ħadd joħroġ kelma.',
          'Dak il-prezz mhuwiex biss flus. Huma l-għoxrin minuta li għalliem ma għandux bejn żewġ lezzjonijiet, il-fiduċja li ġenitur jitlef meta l-ewwel skrin ikun formola, u l-apparat speċjalizzat li jibqa’ fl-armarju għax ħadd mhu ċert kif jissettjah. L-għodda tispiċċa sservi lill-istituzzjoni li xtratha minflok lit-tifel li qed iżommha f’idejh.',
          'Tiko jibda min-naħa l-oħra. L-ewwel skrin huwa l-għodda nnifisha. Kollox l-ieħor — settings, irkupru, sinkronizzazzjoni bejn apparati — jiġi wara, għall-adult, u biss jekk irid.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'Il-forma',
        title: 'Ħafna apps żgħar, mhux waħda kbira.',
        lede: 'Tiko mhuwiex pannell ta’ kontroll b’modalitajiet. Huwa sett ta’ apps separati, kull waħda tagħmel ħaġa waħda tajjeb.',
        body: [
          'Tifel li qed jitgħallem iwieġeb mistoqsija ma għandux bżonn bennej ta’ sentenzi fuq l-istess skrin. Tifel li qed isegwi rutina ta’ filgħodu ma għandux bżonn tastiera. Kull buttuna żejda hija ħaġa oħra x’taqra ħażin, tmiss bi żball, jew li tiddistrajk — u għal tifel li diġà qed jitħabat biex jinftiehem, dak il-prezz huwa reali.',
          'Għalhekk kull app ta’ Tiko hija app għaliha. Yes No huma żewġ buttuni. Type huwa kaxxa ta’ test u buttuna biex titkellem. First juri pass wieħed kull darba. Tiftaħ dik li taqbel mal-mument, u fuq l-iskrin ma jkun hemm kważi xejn aktar.',
        ],
        points: [
          {
            title: 'Skrin wieħed, xogħol wieħed',
            body: 'Kull app tinfetaħ direttament fuq dak li tagħmel. L-ebda skrin tal-bidu x’taqsam, l-ebda modalità x’tagħżel l-ewwel.',
          },
          {
            title: 'Titgħallimha darba',
            body: 'Għax app tagħmel ħaġa waħda, tifel jista’ jitgħallimha kollha. Il-fiduċja tiġi minn għodda li ġġib ruħha l-istess kull darba.',
          },
          {
            title: 'Xejn x’tikber minnu',
            body: 'Li tibda b’Yes No ma jorbot lil ħadd. L-apps huma separati, allura li tgħaddi għal Talk jew Type ifisser tiftaħ app oħra, mhux li tittrasferixxi kont.',
          },
          {
            title: 'Żgħira biżżejjed biex tafda',
            body: 'Għodda li min jieħu ħsieb jifhem f’minuta hija għodda li tabilħaqq se jmur għaliha f’mument diffiċli.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Il-lingwa',
        title: 'B’ħafna lingwi mill-bidu, mhux tradotta wara.',
        body: [
          'Għodda tal-komunikazzjoni li taħdem f’lingwa waħda biss tħalli barra proprju lit-tfal li l-aktar għandhom bżonnha: it-tifel f’dar b’żewġ lingwi, it-tifel li l-lingwa tal-familja mhijiex dik tal-iskola, it-tifel li biddel pajjiż u tilef il-kliem darbtejn.',
          'Tiko jitkellem il-lingwa tat-tifel, mhux dik ta’ min jipprogramma. L-interfaċċja, il-vuċi u l-kontenut kollha jistgħu jiġu tradotti, u l-lingwa li jagħżel min jieħu ħsieb timxi miegħu f’kull app ta’ Tiko u fuq dan is-sit. Fejn lingwa għadha m’għandhiex traduzzjoni tal-interfaċċja, l-app taqleb għall-Ingliż għal dak il-kliem minflok ma tirrifjuta li tinfetaħ.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Għaliex bla ħlas',
        title: 'Għax l-aċċess m’għandux ikollu prezz.',
        lede: 'L-apps ta’ Tiko huma bla ħlas, dejjem. Mhux prova, mhux togħma, mhux mezz biex tinbiegħlek xi ħaġa oħra.',
        body: [
          'Il-komunikazzjoni mhijiex funzjoni premium. Tifel għandu jkun jista’ jiftaħ app ta’ Tiko issa, mingħajr ma adult l-ewwel jiddeċiedi jekk dan il-mument jiswiex il-flus — għax dik id-deċiżjoni, meħuda taħt pressjoni, ġeneralment tittieħed kontra t-tifel.',
        ],
        points: [
          {
            title: 'L-ebda eżitazzjoni',
            body: 'Ipprova għodda ma’ tifel mill-ewwel, mingħajr ma tiżen jekk il-mument jiġġustifikax il-prezz.',
          },
          {
            title: 'L-ebda pressjoni',
            body: 'L-ebda urġenza, l-ebda ħtija, l-ebda reklami, l-ebda stediniet biex tħallas aktar. Xejn ma jibdel il-fatt li tinftiehem f’tranżazzjoni.',
          },
          {
            title: 'L-ebda ftehim moħbi',
            body: 'Bla ħlas ma jfissirx iffinanzjat bir-reklami. Tiko ma jpartatx l-attenzjoni jew id-data ta’ tifel għall-aċċess — m’hemm xejn x’jibdel, għax xejn ma jinġabar.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'X’mhuwiex Tiko',
        title: 'Għodda, mhux kura.',
        body: [
          'Tiko ma jiddijanjostikax, ma jikkurax, u ma jwiegħed l-ebda riżultat. Mhuwiex programm ta’ terapija, mhuwiex evalwazzjoni, u mhuwiex sostitut għal terapista tal-lingwa. M’hemmx punteġġi, l-ebda dashboards tal-progress, u l-ebda rapporti li jqabblu tifel ma’ ieħor.',
          'Dak li joffri Tiko huwa għodda tajba għal mument speċifiku: mod kif twieġeb, kif tagħżel, kif tgħid sentenza, kif issegwi rutina. It-terapisti u l-għalliema jużawh flimkien max-xogħol tagħhom, u l-familji fis-sigħat ordinarji bejn l-appuntamenti. Dik hija apposta wegħda iżgħar minn ta’ ħafna software f’dan il-qasam.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Min jiffurmah',
        title: 'Mibni mat-terapisti, mhux biss għalihom.',
        lede: 'Terapisti tal-lingwa, għalliema u professjonisti oħra jeżaminaw Tiko u jgħidulna x’hemm ħażin.',
        body: [
          'Żviluppatur jista’ jibni għodda tal-komunikazzjoni li taħdem. Jekk taħdimx għal tifel li qed jitħabat biex jinftiehem hija mistoqsija oħra għal kollox, u ma tinstabx tweġiba għaliha billi taqra dokumentazzjoni. Jweġbuha n-nies li joqogħdu ma’ dawk it-tfal kull ġimgħa.',
          'Għalhekk l-apps jiġu eżaminati minn terapisti tal-lingwa, għalliema tal-edukazzjoni speċjali u professjonisti oħra — u l-kummenti tagħhom ibiddluhom. Xi wħud huma żgħar: mira wisq qrib oħra, kelma żbaljata f’djalett partikolari, ċelebrazzjoni wisq eċċitanti għat-tfal li jaħdmu magħhom. Oħrajn le: ir-raġuni li Say m’għandux ħoss ta’ żball, u li l-ebda app ta’ Tiko ma żżomm punteġġ, ġew minn hemm.',
          'Dan mhuwiex approvazzjoni klinika u Tiko ma jgħid li hi. Hija reviżjoni tad-disinn minn nies li l-ġudizzju tagħhom jiswa aktar mit-tagħna fuq l-aktar mistoqsijiet importanti, u hija r-raġuni li diversi apps jidhru kif inhuma llum minflok kif bdew.',
        ],
        points: [
          {
            title: 'Eżaminat mill-perspettiva terapewtika',
            body: 'Il-professjonisti jħarsu lejn l-apps bit-tfal li jsegwu f’moħħhom, u jgħidu ċar fejn xi ħaġa tfixkel.',
          },
          {
            title: 'Kummenti li jbiddlu l-prodott',
            body: 'Meta reviżjoni tgħid li mudell mhux tajjeb għal dawn it-tfal, il-mudell jinbidel. Il-ħsejjes tal-iżball imneħħija u n-nuqqas ta’ punteġġi ġew minn hemm.',
          },
          {
            title: 'Xorta mhux kura',
            body: 'Il-kontribut professjonali jagħmel lil Tiko disinjat aħjar. Ma jagħmlux programm ta’ terapija, u aħna ma nippreżentawhx bħala tali.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Miftuħ mill-bidu',
        title: 'Mibni fil-miftuħ, iffurmat minn min jużah.',
        body: [
          'Tiko huwa open source. Il-kodiċi, il-kuntratti tal-kontenut u l-forom tal-API huma pubbliċi, allura skola, terapista jew żviluppatur jista’ jara eżattament x’tagħmel app bid-data ta’ tifel — li għal ħafna mill-apps ta’ Tiko huwa xejn.',
          'Ifisser ukoll li d-direzzjoni tiġi minn min jużah. Ġenituri, terapisti u għalliema jgħidu x’jonqos ħafna aktar preċiżament minn pjan miktub waħdu, u proġett miftuħ jista’ jaġixxi mingħajr ma jistenna raġuni kummerċjali.',
        ],
      },
    ],
    cta: {
      title: 'Iftaħ waħda u ara.',
      body: 'L-aktar mod mgħaġġel kif tiġġudika lil Tiko huwa li tużah żewġ minuti ma’ tifel. L-ebda kont, l-ebda download, l-ebda stennija.',
      primaryLabel: 'Ara l-apps',
      primaryPath: '/apps',
      secondaryLabel: 'Kif jaħdem',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Kif jaħdem Tiko',
    description:
      'Kif l-apps ta’ Tiko jinfetħu bla kont, x’jiġri fuq l-apparat, u kif jaħdem l-irkupru fakultattiv għal min jieħu ħsieb.',
    eyebrow: 'Kif jaħdem Tiko',
    title: 'L-ewwel iftaħ. L-issettjar jibqa’ fl-isfond.',
    lede: 'Tiko jibda fuq l-apparat. L-apps jinfetħu u jaħdmu mill-ewwel. L-irkupru għal min jieħu ħsieb jista’ jiġi wara permezz ta’ link maġika bl-email — qatt qabel ma t-tifel ikun jista’ juża l-għodda.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'L-esperjenza',
        title: 'Tliet mumenti, l-ebda tfixkil.',
        steps: [
          {
            title: 'Iftaħ il-link',
            body: 'Min jieħu ħsieb jaqsam link, iżommu fil-favoriti, jew jinstalla l-app mill-App Store. M’hemm xejn x’tilliċenzja u ħadd x’titlob.',
          },
          {
            title: 'Użaha mill-ewwel',
            body: 'L-app hija lesta: l-ebda login, l-ebda tutorial u l-ebda proċess ta’ merħba. It-tifel jara l-għodda nnifisha, mill-ewwel.',
          },
          {
            title: 'Irkupra wara, jekk trid',
            body: 'Jekk min jieħu ħsieb irid li s-settings jimxu miegħu fuq apparat ieħor, iżid email u jikkonfermaha darba. Dan huwa fakultattiv, isir wara, u t-tifel qatt ma jarah.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identità fuq l-apparat',
        title: 'Qatt passwords.',
        body: [
          'Kull app ta’ Tiko toħloq sessjoni tal-apparat l-ewwel darba li tinfetaħ. Tinħoloq lokalment, tappartjeni lil dak l-apparat, u hija biżżejjed għal kulma tagħmel l-app. L-ebda email, l-ebda password, l-ebda kont.',
          'Din hija l-parti li ħafna software tal-komunikazzjoni jaqleb bil-kontra. Kont jeżisti biex kumpanija tagħrfek bejn apparati differenti — bżonn reali, imma tal-adulti, u ġeneralment jitqiegħed quddiem it-tifel bħala l-prezz tad-dħul. Tiko jittrattah għal dak li hu: kumdità fakultattiva għal min jieħu ħsieb, offruta aktar tard.',
        ],
        points: [
          {
            title: 'Sessjoni tal-apparat',
            body: 'Tinħoloq awtomatikament mal-ewwel ftuħ, tinżamm lokalment, u qatt ma titlob login.',
          },
          {
            title: 'Irkupru b’link maġika',
            body: 'Fakultattiv. Min jieħu ħsieb iżid email u jikkonfermaha darba biex jattiva s-sinkronizzazzjoni bejn apparati.',
          },
          {
            title: 'L-ebda proċedura għat-tifel',
            body: 'L-irkupru u l-amministrazzjoni huma għall-adulti biss. Lil tifel qatt ma tintwera formola ta’ kont.',
          },
          {
            title: 'L-istess fuq kull pjattaforma',
            body: 'Is-sessjonijiet jaħdmu l-istess fuq il-web, iOS u Android, allura app iġġib ruħha identika kull fejn taħdem.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Affidabbiltà',
        title: 'Tibqa’ taħdem meta n-netwerk ma jaħdimx.',
        body: [
          'L-apps ta’ Tiko jniżżlu l-kontenut ewlieni fuq l-apparat u jaħdmu minn hemm. Konnessjoni li taqta’, netwerk tal-iskola li jimblokka nofs l-internet, jew vjaġġ bil-karozza bla sinjal ma jneħħux mit-tifel il-ħila li jwieġeb mistoqsija.',
          'Kulma tabilħaqq għandu bżonn in-netwerk — sinkronizzazzjoni tas-settings, tniżżil ta’ sett ġdid ta’ stampi — huwa żieda. Jekk jonqos, l-app tkompli tagħmel dak li kienet qed tagħmel.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'X’jinġabar',
        title: 'Kważi xejn, u qatt mit-tifel.',
        body: [
          'Ħafna mill-apps ta’ Tiko ma jiġbru xejn. M’hemmx analitika li ssegwi t-tapping ta’ tifel, l-ebda identifikaturi tar-reklamar, u l-ebda trackers ta’ terzi. L-għarfien tal-vuċi, fejn app tużah, jaħdem fuq l-apparat kull fejn il-pjattaforma tippermetti, u r-reġistrazzjonijiet qatt ma jinżammu jew jintbagħtu.',
          'Fejn app tabilħaqq iżżomm xi ħaġa — karti maħluqa minn min jieħu ħsieb, rutina li bena, sentenza salvata — dak huwa kontenut li l-adult ħoloq apposta, u jibqa’ fuq l-apparat sakemm ma jixgħelx is-sinkronizzazzjoni.',
        ],
        points: [
          {
            title: 'L-ebda reklami, qatt',
            body: 'L-ebda reklamar, l-ebda netwerks tar-reklami, u l-ebda traċċar għar-reklamar f’ebda app ta’ Tiko.',
          },
          {
            title: 'L-ebda ħajt ta’ login',
            body: 'L-apps għat-tfal jinfetħu u jaħdmu mingħajr ebda tip ta’ kont.',
          },
          {
            title: 'Fuq l-apparat fejn possibbli',
            body: 'L-għarfien tal-vuċi juża l-magna lokali tal-pjattaforma fejn teżisti. Ir-reġistrazzjonijiet ma jinżammux.',
          },
          {
            title: 'Jista’ jiġi vverifikat',
            body: 'L-apps huma open source, allura dak li tgħid din il-paġna jista’ jiġi ċċekkjat minflok ma jiġi maħsub tajjeb fuq kelma.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Tiko wieħed, ħafna skrins',
        title: 'L-istess esperjenza, kullimkien.',
        body: [
          'Il-web huwa l-aktar mod mgħaġġel biex tipprova Tiko: link biss hemm bżonn. L-apps native jżidu dak li browser jagħmel inqas tajjeb — affidabbiltà offline, ikona fuq l-iskrin prinċipali li t-tifel jagħraf, u appoġġ aħjar għall-vuċi.',
          'Ikun x’ikun li tuża, l-app iġġib ruħha l-istess. Taħthom hemm l-istess kuntratti, allura rutina mibnija fuq tablet hija l-istess rutina fuq telefon.',
        ],
      },
    ],
    cta: {
      title: 'Trid id-dettall tekniku?',
      body: 'Id-dokumentazzjoni tal-arkitettura u tal-API tispjega kif jitqabblu l-workers, il-ħażna u l-klijenti.',
      primaryLabel: 'Dokumentazzjoni tal-arkitettura',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'Kuntratti API',
      secondaryPath: '/docs/apis',
    },
  },
}
