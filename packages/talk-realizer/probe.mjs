import { realize } from '/Users/silvandiepen/Repositories/_tiko/tiko-universe/packages/talk-realizer/src/index.ts'
import { readFileSync } from 'node:fs'
const packs = {}
function select(lang, ids) {
  packs[lang] ??= JSON.parse(readFileSync(`/Users/silvandiepen/Repositories/_tiko/tiko-universe/workers/sentence-api/data/${lang}-v1.json`, 'utf8'))
  return ids.map((id) => {
    if (id === 'not') return { id: 'not', text: 'not', pos: 'negation' }
    const w = packs[lang].words.find((x) => x.id === id)
    if (!w) throw new Error(`${lang}: no ${id}`)
    return { id: w.id, text: w.text, pos: w.pos, category: w.category }
  })
}
const cases = [
  ['i','want','apple'], ['i','want','the','apple'], ['i','want','water'],
  ['i','want','big','apple'], ['i','not','want','apple'], ['i','happy'], ['we','happy'],
  ['he','tired'], ['the','apple','is','big'], ['i','not','happy'], ['you','help','me'],
  ['i','see','the','friend'], ['we','go','to','the','park'], ['i','play','in','the','garden'],
  ['what','you','want'], ['i','want','two','cookie'], ['i','read','the','book'], ['i','want','apple','please'],
]
const langs = process.argv.slice(2)
for (const lang of langs) {
  console.log('==', lang)
  for (const ids of cases) console.log(JSON.stringify(ids).padEnd(44), realize(select(lang, ids), { locale: lang }).text)
}
