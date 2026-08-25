import type { SiteCopy } from '../..'

/**
 * Maltese privacy policy. Anchors (`id`) are never translated.
 *
 * NOTE: not reviewed by a native Maltese speaker — see the note in `pages.ts`.
 * The English original remains the authoritative text.
 */
export const mtPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Politika tal-privatezza',
  description: 'Kif l-apps ta’ Tiko u tikotalks.com jittrattaw id-data, b’lingwa ċara.',
  eyebrow: 'Politika tal-privatezza',
  title: 'X’niġbru, u x’ma niġbrux.',
  lede: 'Tiko jagħmel apps kalmi u aċċessibbli għat-tfal. Il-privatezza mhijiex ħsieb ta’ wara — hija parti mid-disinn. Din il-politika tispjega, b’lingwa ċara, kif l-apps ta’ Tiko u tikotalks.com jittrattaw id-data.',
  lastUpdatedLabel: 'L-aħħar aġġornament',
  lastUpdated: 'Ġunju 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'Il-wegħda tagħna',
      bullets: [
        'Bla ħlas, dejjem. Qatt ma nbigħu d-data tiegħek jew l-attenzjoni ta’ tifel bi skambju għall-aċċess.',
        'L-ebda reklami. Qatt. Fl-apps ta’ Tiko m’hemmx reklamar, traċċar għar-reklamar, jew netwerks tar-reklami ta’ terzi.',
        'L-ebda ħitan ta’ login. L-apps għat-tfal jinfetħu u jaħdmu mingħajr kont.',
        'Niġbru l-inqas possibbli, u biss dak li app tabilħaqq għandha bżonn biex taħdem.',
      ],
    },
    {
      id: 'device-first',
      title: 'Fuq l-apparat b’mod awtomatiku',
      body: [
        'L-apps ta’ Tiko huma mibnija biex jaħdmu fuq l-apparat. Is-settings, is-sentenzi salvati, l-abbozzi u l-kontenut riċenti tiegħek jinżammu lokalment biex l-apps jibqgħu mgħaġġla u jaħdmu offline. Meta tuża app mingħajr ma tidħol, dak il-kontenut jibqa’ fuq l-apparat tiegħek.',
      ],
    },
    {
      id: 'accounts',
      title: 'Kontijiet u sinkronizzazzjoni fakultattivi',
      body: [
        'Tiko juża identità marbuta mal-apparat minflok passwords. Jekk tagħżel li tixgħel l-irkupru għal min jieħu ħsieb jew is-sinkronizzazzjoni bejn apparati, jista’ jkun li nżommu indirizz tal-email biex nibagħtulek link ta’ dħul u norbtu l-apparati tiegħek. Dan huwa dejjem fakultattiv u dejjem trasparenti — l-app tat-tfal qatt ma tibda bil-ħolqien ta’ kont.',
      ],
    },
    {
      id: 'speech',
      title: 'Vuċi u kontenut',
      body: [
        'Xi apps, bħal Tiko Type u Tiko Talk, jistgħu jaqraw test b’leħen għoli. Biex tinħoloq vuċi naturali, it-test li titlob li jinqara jista’ jintbagħat lis-servizz tal-vuċi tagħna u jiġi pproċessat biss biex jirritorna awdjo. Ma nużawx dak il-kontenut biex nibnu profili tar-reklamar, u ma nbigħuhx.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'X’ma nagħmlux',
      bullets: [
        'Ma nurux reklami u ma nużawx trackers tar-reklamar.',
        'Ma nbigħux u ma nikrux data personali.',
        'Ma nitolbux lil tifel joħloq kont jew jaqsam dettalji personali biex juża app.',
        'Ma nagħmlu l-ebda affermazzjoni medika, dijanjostika jew terapewtika, u ma niġbru l-ebda data tas-saħħa għal dawk l-iskopijiet.',
      ],
    },
    {
      id: 'children',
      title: 'Il-privatezza tat-tfal',
      body: [
        'L-apps ta’ Tiko huma maħsuba biex tkun tista’ tiftaħhom bla biża’ ħdejn tifel. Għax jaħdmu bla kontijiet u bla reklami, tifel jista’ jużahom mingħajr ma jaqsam informazzjoni personali. Fejn min jieħu ħsieb jagħżel li jissettja l-irkupru fakultattiv, dik l-informazzjoni tal-kont tappartjeni lill-adult, mhux lit-tifel.',
      ],
    },
    {
      id: 'retention',
      title: 'Żamma u tħassir tad-data',
      body: [
        'Il-kontenut maħżun lokalment jibqa’ fuq l-apparat sakemm tħassru jew tneħħi l-app. Jekk ħloqt kont fakultattiv, tista’ titlobna nħassruh flimkien mad-data marbuta miegħu f’kull ħin billi tibgħat email lil {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Bidliet f’din il-politika',
      body: [
        'Jekk nibdlu kif nittrattaw id-data, naġġornaw din il-paġna u nibdlu d-data ta’ hawn fuq. Il-bidliet importanti jiġu spjegati b’mod ċar.',
      ],
    },
    {
      id: 'contact',
      title: 'Ikkuntattjana',
      body: [
        'Mistoqsijiet dwar il-privatezza jew id-data tiegħek? Ibgħat email lil {email} u persuna vera tgħinek.',
      ],
    },
  ],
}
