import type { Lexicon } from '../features'

/**
 * Albanian overlay. Two things a rule cannot know: which nouns in -ë are
 * masculine (the ending is mostly feminine, so "ujë" and "djathë" have to be
 * told), and the feminine of an adjective, which is not always base + e.
 */
export const albanianLexicon: Lexicon = {
  need: { pos: 'verb', forms: { '1sg': 'kam nevojë', '2sg': 'ke nevojë', '3sg': 'ka nevojë', '1pl': 'kemi nevojë', '2pl': 'keni nevojë', '3pl': 'kanë nevojë' } },
  walk: { pos: 'verb', forms: { '1sg': 'shëtit', '2sg': 'shëtitesh', '3sg': 'shëtit', '1pl': 'shëtitim', '2pl': 'shëtitni', '3pl': 'shëtitin' } },
  wait: { pos: 'verb', forms: { '1sg': 'pres', '2sg': 'pret', '3sg': 'pret', '1pl': 'presim', '2pl': 'prisni', '3pl': 'presin' } },
  choose: { pos: 'verb', forms: { '1sg': 'zgjedh', '2sg': 'zgjedh', '3sg': 'zgjedh', '1pl': 'zgjedhim', '2pl': 'zgjidhni', '3pl': 'zgjedhin' } },
  open: { pos: 'verb', forms: { '1sg': 'hap', '2sg': 'hap', '3sg': 'hap', '1pl': 'hapim', '2pl': 'hapni', '3pl': 'hapin' } },
  close: { pos: 'verb', forms: { '1sg': 'mbyll', '2sg': 'mbyll', '3sg': 'mbyll', '1pl': 'mbyllim', '2pl': 'mbyllni', '3pl': 'mbyllin' } },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'më' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'të' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'na' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'e' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'e' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'i' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'më' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'ime' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'jote' },

  want: { pos: 'verb', forms: { '1sg': 'dua', '2sg': 'do', '3sg': 'do', '1pl': 'duam', '2pl': 'doni', '3pl': 'duan' } },
  // pëlqej inverts: "mua më pëlqen buka", where the bread is the subject.
  like: { pos: 'verb', experiencerDative: true, forms: { '1sg': 'pëlqej', '3sg': 'pëlqen', '3pl': 'pëlqejnë' } },
  see: { pos: 'verb', forms: { '1sg': 'shoh', '2sg': 'shikon', '3sg': 'shikon', '1pl': 'shohim', '2pl': 'shihni', '3pl': 'shohin' } },
  hear: { pos: 'verb', forms: { '1sg': 'dëgjoj', '2sg': 'dëgjon', '3sg': 'dëgjon', '1pl': 'dëgjojmë', '2pl': 'dëgjoni', '3pl': 'dëgjojnë' } },
  have: { pos: 'verb', forms: { '1sg': 'kam', '2sg': 'ke', '3sg': 'ka', '1pl': 'kemi', '2pl': 'keni', '3pl': 'kanë' } },
  eat: { pos: 'verb', forms: { '1sg': 'ha', '2sg': 'ha', '3sg': 'ha', '1pl': 'hamë', '2pl': 'hani', '3pl': 'hanë' } },
  drink: { pos: 'verb', forms: { '1sg': 'pi', '2sg': 'pi', '3sg': 'pi', '1pl': 'pimë', '2pl': 'pini', '3pl': 'pinë' } },
  go: { pos: 'verb', forms: { '1sg': 'shkoj', '2sg': 'shkon', '3sg': 'shkon', '1pl': 'shkojmë', '2pl': 'shkoni', '3pl': 'shkojnë' } },
  come: { pos: 'verb', forms: { '1sg': 'vij', '2sg': 'vjen', '3sg': 'vjen', '1pl': 'vijmë', '2pl': 'vini', '3pl': 'vijnë' } },
  play: { pos: 'verb', forms: { '1sg': 'luaj', '2sg': 'luan', '3sg': 'luan', '1pl': 'luajmë', '2pl': 'luani', '3pl': 'luajnë' } },
  read: { pos: 'verb', forms: { '1sg': 'lexoj', '2sg': 'lexon', '3sg': 'lexon', '1pl': 'lexojmë', '2pl': 'lexoni', '3pl': 'lexojnë' } },
  help: { pos: 'verb', forms: { '1sg': 'ndihmoj', '2sg': 'ndihmon', '3sg': 'ndihmon', '1pl': 'ndihmojmë', '2pl': 'ndihmoni', '3pl': 'ndihmojnë' } },
  sleep: { pos: 'verb', forms: { '1sg': 'fle', '2sg': 'fle', '3sg': 'fle', '1pl': 'flemë', '2pl': 'flini', '3pl': 'flenë' } },
  talk: { pos: 'verb', forms: { '1sg': 'flas', '2sg': 'flet', '3sg': 'flet', '1pl': 'flasim', '2pl': 'flisni', '3pl': 'flasin' } },

  // Adjectives: the feminine is not always base + e.
  big: { pos: 'adjective', feminine: 'madhe', pluralForm: 'mëdha' },
  small: { pos: 'adjective', feminine: 'vogël', pluralForm: 'vogla' },
  hot: { pos: 'adjective', feminine: 'nxehtë' },
  cold: { pos: 'adjective', feminine: 'ftohtë' },
  happy: { pos: 'adjective', feminine: 'lumtur', pluralForm: 'lumtur' },
  tired: { pos: 'adjective', feminine: 'lodhur' },
  hungry: { pos: 'adjective', feminine: 'uritur' },
  thirsty: { pos: 'adjective', feminine: 'etur' },
  new: { pos: 'adjective', feminine: 're' },
  old: { pos: 'adjective', feminine: 'vjetër' },

  // Masculine nouns in -ë, which the ending would call feminine.
  water: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'feminine', mass: true },
  bread: { pos: 'noun', gender: 'feminine', mass: true },

  apple: { pos: 'noun', gender: 'feminine', plural: 'molla' },
  book: { pos: 'noun', gender: 'masculine', plural: 'libra' },
  ball: { pos: 'noun', gender: 'masculine', plural: 'topa' },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'biskota' },
  egg: { pos: 'noun', gender: 'feminine', plural: 'vezë' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', gender: 'feminine', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  park: { pos: 'noun', gender: 'masculine' },
  table: { pos: 'noun', gender: 'feminine', plural: 'tavolina' },
  friend: { pos: 'noun', gender: 'masculine', animate: true, plural: 'shokë' },
  teddy: { pos: 'noun', gender: 'masculine', animate: true },

  not: { pos: 'negation' },
}
