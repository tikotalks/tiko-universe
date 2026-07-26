import { describe, expect, it } from 'vitest'
import { languages, realize } from '../index'
import { select } from './pack'

/**
 * Welsh, Irish, Basque and Georgian — the four languages that needed something the
 * engine did not have, and the reason they are worth testing side by side:
 *
 * - **Welsh and Irish are verb-first**, and both split the verb in two: an
 *   auxiliary before the subject and the meaning after it. "Dwi'n bwyta afal" and
 *   "Tá mé ag ithe úll" are the same sentence with the same shape.
 * - **Both mutate the start of a word.** Welsh softens ("y gadair"), Irish lenites
 *   ("an bhean") and prefixes ("an t-úll"). Every other language in this package
 *   changes only endings.
 * - **Basque is ergative**: "Ni pozik nago" but "Nik sagarra nahi dut" — the subject
 *   changes case because the sentence acquired an object, and the auxiliary agrees
 *   with both at once.
 * - **Georgian is a draft**, and the test proves it: asked for normally, it returns
 *   the tiles joined, not grammar.
 */
const golden: Array<[string, string[], string]> = [
  // Welsh
  ['cy', ['i', 'want', 'apple'], 'Dwi eisiau afal.'],
  ['cy', ['i', 'want', 'the', 'apple'], "Dwi eisiau'r afal."],
  ['cy', ['i', 'not', 'want', 'apple'], 'Dwi ddim eisiau afal.'],
  ['cy', ['i', 'happy'], "Dwi'n hapus."],
  ['cy', ['the', 'apple', 'is', 'big'], "Mae'r afal yn fawr."],
  ['cy', ['i', 'see', 'the', 'friend'], "Dwi'n gweld y ffrind."],
  ['cy', ['i', 'play', 'in', 'the', 'garden'], "Dwi'n chwarae yn yr ardd."],
  ['cy', ['we', 'go', 'to', 'the', 'park'], "Dyn ni'n mynd i'r parc."],
  ['cy', ['i', 'want', 'two', 'cookie'], 'Dwi eisiau dwy fisgeden.'],
  ['cy', ['what', 'you', 'want'], 'Beth rwyt ti eisiau?'],

  // Irish
  ['ga', ['i', 'want', 'apple'], 'Tá mé ag iarraidh úll.'],
  ['ga', ['i', 'want', 'the', 'apple'], 'Tá mé ag iarraidh an t-úll.'],
  ['ga', ['i', 'not', 'want', 'apple'], 'Níl mé ag iarraidh úll.'],
  ['ga', ['i', 'happy'], 'Tá mé sásta.'],
  ['ga', ['i', 'hungry'], 'Tá ocras orm.'],
  ['ga', ['you', 'help', 'me'], 'Tá tú ag cabhrú liom.'],
  ['ga', ['i', 'play', 'in', 'the', 'garden'], 'Tá mé ag imirt sa ghairdín.'],
  ['ga', ['i', 'want', 'two', 'cookie'], 'Tá mé ag iarraidh dhá bhriosca.'],
  ['ga', ['what', 'you', 'want'], 'Cad atá tú ag iarraidh?'],

  // Basque
  ['eu', ['i', 'want', 'apple'], 'Nik sagar bat nahi dut.'],
  ['eu', ['i', 'want', 'the', 'apple'], 'Nik sagarra nahi dut.'],
  ['eu', ['i', 'want', 'water'], 'Nik ura nahi dut.'],
  ['eu', ['i', 'want', 'big', 'apple'], 'Nik sagar handi bat nahi dut.'],
  ['eu', ['i', 'not', 'want', 'apple'], 'Nik ez dut sagar bat nahi.'],
  ['eu', ['i', 'happy'], 'Ni pozik nago.'],
  ['eu', ['i', 'not', 'happy'], 'Ni ez nago pozik.'],
  ['eu', ['the', 'apple', 'is', 'big'], 'Sagarra handia da.'],
  ['eu', ['you', 'help', 'me'], 'Zuk ni lagundu nauzu.'],
  ['eu', ['we', 'go', 'to', 'the', 'park'], 'Gu parkera joan gara.'],
  ['eu', ['i', 'play', 'in', 'the', 'garden'], 'Ni lorategian jolastu naiz.'],
  ['eu', ['what', 'you', 'want'], 'Zuk zer nahi duzu?'],
  ['eu', ['i', 'want', 'two', 'cookie'], 'Nik bi gaileta nahi dut.'],
]

describe('Welsh, Irish, Basque and Georgian', () => {
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('Welsh keeps the pronoun that lives inside the auxiliary', () => {
    const result = realize(select('cy', ['i', 'want', 'apple']), { locale: 'cy' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('i')
  })

  it('Basque marks the subject only when there is an object', () => {
    const intransitive = realize(select('eu', ['i', 'happy']), { locale: 'eu' })
    const transitive = realize(select('eu', ['i', 'want', 'apple']), { locale: 'eu' })
    expect(intransitive.text.startsWith('Ni ')).toBe(true)
    expect(transitive.text.startsWith('Nik ')).toBe(true)
    expect(transitive.notes.join(' ')).toContain('the ergative')
  })

  it('Georgian is a draft, and realize() will not use it', () => {
    expect(languages.ka.profile.maturity).toBe('draft')
    const gated = realize(select('ka', ['i', 'want', 'apple']), { locale: 'ka' })
    expect(gated.notes[0]).toContain('below the requested beta')
    // Asked for explicitly, it does produce Georgian.
    const draft = realize(select('ka', ['i', 'want', 'apple']), { locale: 'ka', minMaturity: 'draft' })
    expect(draft.text).toBe('მე ვაშლი მინდა.')
  })
})
