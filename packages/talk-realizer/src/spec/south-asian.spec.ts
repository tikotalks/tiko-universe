import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Bengali and Hindi — the two largest languages in this package after English and
 * Chinese, and a study in how differently two neighbours can be built.
 *
 * **Bengali has no gender at all.** Nothing agrees with anything, so nothing needs
 * to know who is speaking. Its work is elsewhere: a suffixed definite article
 * ("আপেলটা"), a locative ending chosen by the noun's final sound ("পার্কে" but
 * "বাড়িতে"), negation after the verb, no copula, and -কে on an object that is a
 * person.
 *
 * **Hindi agrees with the speaker.** "मैं सेब चाहता हूँ" from a boy, "मैं सेब चाहती
 * हूँ" from a girl — the same tiles, a different sentence, and Tiko does not know
 * which. The tests below pin down both forms *and* the note that appears when the
 * realizer had to guess, because that note is the only thing standing between this
 * language and being quietly wrong for half its users.
 */
const bengali: Array<[string[], string]> = [
  [['i', 'want', 'apple'], 'আমি আপেল চাই।'],
  [['i', 'want', 'the', 'apple'], 'আমি আপেলটা চাই।'],
  [['i', 'want', 'water'], 'আমি জল চাই।'],
  [['i', 'not', 'want', 'apple'], 'আমি আপেল চাই না।'],
  [['i', 'happy'], 'আমি খুশি।'],
  [['we', 'happy'], 'আমরা খুশি।'],
  [['the', 'apple', 'is', 'big'], 'আপেলটা বড়।'],
  [['i', 'not', 'happy'], 'আমি খুশি না।'],
  [['you', 'help', 'me'], 'তুমি আমাকে সাহায্য করো।'],
  [['i', 'see', 'the', 'friend'], 'আমি বন্ধুকে দেখি।'],
  [['we', 'go', 'to', 'the', 'park'], 'আমরা পার্কে যাই।'],
  [['i', 'play', 'in', 'the', 'garden'], 'আমি বাগানে খেলি।'],
  [['what', 'you', 'want'], 'তুমি কী চাও?'],
  [['i', 'read', 'the', 'book'], 'আমি বইটা পড়ি।'],
]

const hindi: Array<[string[], string]> = [
  [['i', 'want', 'apple'], 'मैं सेब चाहता हूँ।'],
  [['i', 'want', 'big', 'apple'], 'मैं बड़ा सेब चाहता हूँ।'],
  [['i', 'not', 'want', 'apple'], 'मैं सेब नहीं चाहता हूँ।'],
  [['i', 'happy'], 'मैं खुश हूँ।'],
  [['we', 'happy'], 'हम खुश हैं।'],
  [['the', 'apple', 'is', 'big'], 'सेब बड़ा है।'],
  [['you', 'help', 'me'], 'तुम मुझे मदद करते हो।'],
  [['i', 'see', 'the', 'friend'], 'मैं दोस्त को देखता हूँ।'],
  [['we', 'go', 'to', 'the', 'park'], 'हम पार्क जाते हैं।'],
  [['i', 'play', 'in', 'the', 'garden'], 'मैं बगीचे में खेलता हूँ।'],
  [['what', 'you', 'want'], 'तुम क्या चाहते हो?'],
  [['i', 'read', 'the', 'book'], 'मैं किताब पढ़ता हूँ।'],
]

describe('Bengali realizer', () => {
  for (const [ids, expected] of bengali) {
    it(`${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('bn', ids), { locale: 'bn' }).text).toBe(expected)
    })
  }

  it('needs no speaker gender, because nothing agrees with it', () => {
    const asBoy = realize(select('bn', ['i', 'want', 'apple']), { locale: 'bn' })
    const asGirl = realize(select('bn', ['i', 'want', 'apple']), { locale: 'bn', speakerGender: 'feminine' })
    expect(asGirl.text).toBe(asBoy.text)
    expect(asBoy.notes.some((note) => note.includes('speaker'))).toBe(false)
  })

  it('chooses the locative ending by the noun\'s last sound', () => {
    // A consonant takes -ে, a vowel takes -তে.
    expect(realize(select('bn', ['we', 'go', 'to', 'the', 'park']), { locale: 'bn' }).text)
      .toContain('পার্কে')
    expect(realize(select('bn', ['i', 'go', 'to', 'the', 'home']), { locale: 'bn' }).text)
      .toContain('বাড়িতে')
  })
})

describe('Hindi realizer', () => {
  for (const [ids, expected] of hindi) {
    it(`${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('hi', ids), { locale: 'hi' }).text).toBe(expected)
    })
  }

  it('says a different sentence for a girl', () => {
    const asGirl = realize(select('hi', ['i', 'want', 'apple']), { locale: 'hi', speakerGender: 'feminine' })
    expect(asGirl.text).toBe('मैं सेब चाहती हूँ।')
  })

  it('warns when it had to assume the speaker\'s gender, and not when it was told', () => {
    const assumed = realize(select('hi', ['i', 'want', 'apple']), { locale: 'hi' })
    expect(assumed.notes.join(' ')).toContain('wrong for a girl')

    const told = realize(select('hi', ['i', 'want', 'apple']), { locale: 'hi', speakerGender: 'feminine' })
    expect(told.notes.join(' ')).not.toContain('not recorded')
  })

  it('does not warn where the speaker\'s gender makes no difference', () => {
    // A third-person sentence has nothing to agree with the speaker.
    const third = realize(select('hi', ['he', 'want', 'apple']), { locale: 'hi' })
    expect(third.notes.some((note) => note.includes('wrong for a girl'))).toBe(false)
  })

  it('puts a noun in the oblique before a postposition', () => {
    const result = realize(select('hi', ['i', 'play', 'in', 'the', 'garden']), { locale: 'hi' })
    expect(result.text).toContain('बगीचे में')
    expect(result.notes.join(' ')).toContain('the oblique, before a postposition')
  })
})
