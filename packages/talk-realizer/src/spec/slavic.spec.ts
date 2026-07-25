import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * The Slavic family and its Baltic neighbours, tested together, because what varies
 * between these twelve languages is exactly what the golden lists have to pin down:
 *
 * - **the copula**: Polish, Serbian, Croatian, Czech and Slovak have one; Russian
 *   and Ukrainian do not — "Я щасливий" is a complete sentence;
 * - **negation**: a word before the verb in most, written onto it in Czech and
 *   Slovak ("nechci"), and fused into an irregular form with the copula
 *   ("нисам", "není", "nie som");
 * - **the genitive of negation**: obligatory in Russian, Polish and Ukrainian,
 *   absent in the rest — "Я не хочу яблука" but "Ja ne želim jabuku";
 * - **the paucal**: after two, East and South Slavic take the genitive singular
 *   ("два кекса"), while Czech, Slovak, Polish, Belarusian and the Baltic pair take
 *   the plural ("dvě sušenky", "du sausainiai");
 * - **animacy**, everywhere: "Я бачу друга", not "друг".
 */
const golden: Array<[string, string[], string]> = [
  // Ukrainian: Russian's shape with its own endings, and no copula.
  ['uk', ['i', 'want', 'apple'], 'Я хочу яблуко.'],
  ['uk', ['i', 'want', 'water'], 'Я хочу воду.'],
  ['uk', ['i', 'want', 'the', 'apple'], 'Я хочу яблуко.'],
  ['uk', ['i', 'want', 'big', 'apple'], 'Я хочу велике яблуко.'],
  ['uk', ['i', 'happy'], 'Я щасливий.'],
  ['uk', ['we', 'happy'], 'Ми щасливі.'],
  ['uk', ['the', 'apple', 'is', 'big'], 'Яблуко велике.'],
  ['uk', ['i', 'not', 'want', 'apple'], 'Я не хочу яблука.'],
  ['uk', ['i', 'see', 'the', 'friend'], 'Я бачу друга.'],
  ['uk', ['you', 'help', 'me'], 'Ти допомагаєш мені.'],
  ['uk', ['we', 'go', 'to', 'the', 'park'], 'Ми йдемо до парку.'],
  ['uk', ['i', 'want', 'two', 'cookie'], 'Я хочу два печива.'],
  ['uk', ['what', 'you', 'want'], 'Що ти хочеш?'],

  // Macedonian: Bulgarian's suffixed article, with one masculine form.
  ['mk', ['i', 'want', 'apple'], 'Јас сакам јаболко.'],
  ['mk', ['i', 'want', 'the', 'apple'], 'Јас сакам јаболкото.'],
  ['mk', ['i', 'want', 'the', 'big', 'apple'], 'Јас сакам големото јаболко.'],
  ['mk', ['i', 'happy'], 'Јас сум среќен.'],
  ['mk', ['we', 'happy'], 'Ние сме среќни.'],
  ['mk', ['the', 'apple', 'is', 'big'], 'Јаболкото е големо.'],
  ['mk', ['i', 'not', 'want', 'apple'], 'Јас не сакам јаболко.'],
  ['mk', ['you', 'help', 'me'], 'Ти ми помагаш.'],
  ['mk', ['i', 'want', 'my', 'ball'], 'Јас сакам мојата топка.'],

  // Serbian: cases like Russian, a copula like Polish, no genitive of negation.
  ['sr', ['i', 'want', 'apple'], 'Ја желим јабуку.'],
  ['sr', ['i', 'want', 'big', 'apple'], 'Ја желим велику јабуку.'],
  ['sr', ['i', 'happy'], 'Ја сам срећан.'],
  ['sr', ['we', 'happy'], 'Ми смо срећни.'],
  ['sr', ['i', 'not', 'happy'], 'Ја нисам срећан.'],
  ['sr', ['i', 'not', 'want', 'apple'], 'Ја не желим јабуку.'],
  ['sr', ['i', 'see', 'the', 'friend'], 'Ја видим пријатеља.'],
  ['sr', ['you', 'help', 'me'], 'Ти ми помажеш.'],
  ['sr', ['i', 'want', 'two', 'cookie'], 'Ја желим два колача.'],

  // Croatian: the same grammar, its own words, Latin script.
  ['hr', ['i', 'want', 'apple'], 'Ja želim jabuku.'],
  ['hr', ['i', 'want', 'bread'], 'Ja želim kruh.'],
  ['hr', ['i', 'happy'], 'Ja sam sretan.'],
  ['hr', ['we', 'happy'], 'Mi smo sretni.'],
  ['hr', ['i', 'not', 'happy'], 'Ja nisam sretan.'],
  ['hr', ['you', 'help', 'me'], 'Ti mi pomažeš.'],
  ['hr', ['i', 'want', 'two', 'cookie'], 'Ja želim dva keksa.'],

  // Czech: the negation is a prefix, and the negated copula is irregular.
  ['cs', ['i', 'want', 'apple'], 'Já chci jablko.'],
  ['cs', ['i', 'want', 'water'], 'Já chci vodu.'],
  ['cs', ['i', 'not', 'want', 'apple'], 'Já nechci jablko.'],
  ['cs', ['i', 'happy'], 'Já jsem šťastný.'],
  ['cs', ['we', 'happy'], 'My jsme šťastní.'],
  ['cs', ['i', 'not', 'happy'], 'Já nejsem šťastný.'],
  ['cs', ['i', 'see', 'the', 'friend'], 'Já vidím kamaráda.'],
  ['cs', ['you', 'help', 'me'], 'Ty mi pomáháš.'],
  ['cs', ['we', 'go', 'to', 'the', 'park'], 'My jdeme do parku.'],
  ['cs', ['i', 'want', 'two', 'cookie'], 'Já chci dvě sušenky.'],

  // Slovak: Czech's shape, and "nie som" as two words.
  ['sk', ['i', 'want', 'apple'], 'Ja chcem jablko.'],
  ['sk', ['i', 'not', 'want', 'apple'], 'Ja nechcem jablko.'],
  ['sk', ['i', 'happy'], 'Ja som šťastný.'],
  ['sk', ['i', 'not', 'happy'], 'Ja nie som šťastný.'],
  ['sk', ['we', 'happy'], 'My sme šťastní.'],
  ['sk', ['you', 'help', 'me'], 'Ty mi pomáhaš.'],
  ['sk', ['i', 'want', 'my', 'ball'], 'Ja chcem moju loptu.'],
  // Slovenian: a copula, clitics, and the dual it is not asked to produce.
  ['sl', ['i', 'want', 'apple'], 'Jaz hočem jabolko.'],
  ['sl', ['i', 'want', 'water'], 'Jaz hočem vodo.'],
  ['sl', ['i', 'happy'], 'Jaz sem srečen.'],
  ['sl', ['we', 'happy'], 'Mi smo srečni.'],
  ['sl', ['i', 'not', 'happy'], 'Jaz nisem srečen.'],
  ['sl', ['you', 'help', 'me'], 'Ti mi pomagaš.'],
  ['sl', ['i', 'see', 'the', 'friend'], 'Jaz vidim prijatelja.'],
  ['sl', ['i', 'want', 'two', 'cookie'], 'Jaz hočem dva piškota.'],

  // Bosnian: Croatian's grammar, Bosnian's words.
  ['bs', ['i', 'want', 'apple'], 'Ja želim jabuku.'],
  ['bs', ['i', 'want', 'bread'], 'Ja želim hljeb.'],
  ['bs', ['i', 'not', 'happy'], 'Ja nisam sretan.'],
  ['bs', ['you', 'help', 'me'], 'Ti mi pomažeš.'],
  ['bs', ['what', 'you', 'want'], 'Šta ti želiš?'],

  // Belarusian: East Slavic, no copula, the genitive of negation.
  ['be', ['i', 'want', 'apple'], 'Я хачу яблык.'],
  ['be', ['i', 'want', 'water'], 'Я хачу ваду.'],
  ['be', ['i', 'not', 'want', 'apple'], 'Я не хачу яблыка.'],
  ['be', ['i', 'happy'], 'Я шчаслівы.'],
  ['be', ['we', 'happy'], 'Мы шчаслівыя.'],
  ['be', ['i', 'see', 'the', 'friend'], 'Я бачу друга.'],
  ['be', ['you', 'help', 'me'], 'Ты дапамагаеш мне.'],

  // Lithuanian: Baltic, and "norėti" governs the genitive.
  ['lt', ['i', 'want', 'apple'], 'Aš noriu obuolio.'],
  ['lt', ['i', 'want', 'big', 'apple'], 'Aš noriu didelio obuolio.'],
  ['lt', ['i', 'not', 'want', 'apple'], 'Aš nenoriu obuolio.'],
  ['lt', ['i', 'happy'], 'Aš esu laimingas.'],
  ['lt', ['we', 'happy'], 'Mes esame laimingi.'],
  ['lt', ['i', 'not', 'happy'], 'Aš nesu laimingas.'],
  ['lt', ['i', 'see', 'the', 'friend'], 'Aš matau draugą.'],
  ['lt', ['you', 'help', 'me'], 'Tu padedi man.'],
  ['lt', ['i', 'play', 'in', 'the', 'garden'], 'Aš žaidžiu sode.'],
  ['lt', ['i', 'want', 'two', 'cookie'], 'Aš noriu du sausainiai.'],

  // Latvian: the same shape with shorter endings.
  ['lv', ['i', 'want', 'apple'], 'Es gribu ābolu.'],
  ['lv', ['i', 'want', 'big', 'apple'], 'Es gribu lielu ābolu.'],
  ['lv', ['i', 'not', 'want', 'apple'], 'Es negribu ābolu.'],
  ['lv', ['i', 'happy'], 'Es esmu laimīgs.'],
  ['lv', ['we', 'happy'], 'Mēs esam laimīgi.'],
  ['lv', ['i', 'not', 'happy'], 'Es neesmu laimīgs.'],
  ['lv', ['you', 'help', 'me'], 'Tu palīdzi man.'],
  ['lv', ['we', 'go', 'to', 'the', 'park'], 'Mēs ejam pie parka.'],
  ['lv', ['i', 'play', 'in', 'the', 'garden'], 'Es spēlēju dārzā.'],
]

describe('Slavic and Baltic realizers', () => {
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('Ukrainian explains the genitive of negation', () => {
    const result = realize(select('uk', ['i', 'not', 'want', 'apple']), { locale: 'uk' })
    expect(result.notes.join(' ')).toContain('genitive of negation')
  })

  it('Serbian does not use the genitive of negation', () => {
    const result = realize(select('sr', ['i', 'not', 'want', 'apple']), { locale: 'sr' })
    expect(result.notes.join(' ')).not.toContain('genitive of negation')
  })

  it('Czech folds the negation into the verb, keeping the tile', () => {
    const result = realize(select('cs', ['i', 'not', 'want', 'apple']), { locale: 'cs' })
    const verb = result.tokens.find((token) => token.text === 'nechci')
    expect(verb?.from).toBe('want')
    expect(result.notes.join(' ')).toContain('prefix on the verb')
  })

  it('Macedonian says which article it used', () => {
    const result = realize(select('mk', ['i', 'want', 'the', 'apple']), { locale: 'mk' })
    expect(result.notes.join(' ')).toContain('definite article')
  })
})
