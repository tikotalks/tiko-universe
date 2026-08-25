# @tiko/talk-realizer

Turns a child's tile selection into a grammatical sentence — deterministically,
offline, and without a model.

**28 languages · 784 tests · typecheck and lint clean.**

## Why this exists

`workers/sentence-api` currently builds Talk's sentence with:

```ts
words.map((word) => word.text).join(' ')
```

So `I` + `want` + `apple` becomes **"I want apple"**. In the Romance packs it is
worse, because those store infinitives: the Spanish tiles read **"yo querer
manzana"**. Every suggestion request also makes a live LLM call to Atlas to rank
next words, putting latency, cost and an online dependency on a child's critical
path.

This package is the missing layer. Same tiles in, a sentence out:

| tiles | today | with the realizer |
|---|---|---|
| i + want + apple | `I want apple` | **I want an apple.** |
| i + want + apple (nl) | `ik wil appel` | **Ik wil een appel.** |
| i + want + apple (de) | `ich will Apfel` | **Ich will einen Apfel.** |
| i + want + apple (es) | `yo querer manzana` | **Yo quiero una manzana.** |
| i + not + want + apple (nl) | `ik niet wil appel` | **Ik wil geen appel.** |
| i + not + want + apple (mt) | `jien not irrid tuffieħa` | **Jien ma rridx tuffieħa.** |
| what + you + want (ja) | `なに あなた ほしい` | **あなたはなにがほしいか？** |
| i + want + two + big + cookie (de) | `ich will zwei groß Keks` | **Ich will zwei große Kekse.** |
| i + hungry (fr) | `je faim` | **J'ai faim.** |
| i + cold (de) | `ich kalt` | **Mir ist kalt.** |
| the + apple + is + big (ru) | `этот яблоко есть большой` | **Яблоко большое.** |
| i + want + the + big + apple (bg) | `аз искам този голям ябълка` | **Аз искам голямата ябълка.** |

The child is not choosing from a list of sentences: 295 tiles yield **2.8 million
grammatical three-tile combinations and 316 million four-tile ones**. That is why
this generalises instead of enumerating.

## Languages

| language | maturity | what it needed |
|---|---|---|
| **en** English | production | `a`/`an` by sound, do-support for negation and questions |
| **nl** Dutch | production | de/het gender, the attributive `-e`, niet vs geen, "ik heb honger" |
| **de** German | production | three genders × two cases, weak/mixed/strong adjectives, kein vs nicht, dative verbs, **"mir ist kalt"** with no subject at all |
| **fr** French | production | conjugation from infinitives, elision and contraction, the partitive, `ne … pas de`, "j'ai faim" |
| **es** Spanish | production | stem-changing verbs, **ser vs estar** by quality or state, gustar inverting the clause, "el agua" not "la agua" |
| **it** Italian | production | article allomorphy by sound (il/lo/l'/i/gli/le), piacere inverting, article before possessives |
| **pt** Portuguese | production | conjugation, gostar carrying `de`, contractions (do/da/ao) |
| **zh** Chinese | production | no articles at all, measure words for counting, 不 vs 没, 很 before a bare predicate |
| **hy** Armenian | production | participle + auxiliary present, suffixed article, negation fronting the auxiliary |
| **mt** Maltese | beta | article assimilation (il-/id-/ir-/is-/it-/ix-/iż-/l-), `ma … x`, no copula, postposed possessives |
| **ja** Japanese | beta | は/を/が particles, verb-final, negation in the verb or the adjective |
| **ko** Korean | beta | particles chosen by final sound (batchim), glued, 안 before the predicate |
| **ar** Arabic | beta | prefixed article, adjectives agreeing in definiteness, no present copula |
| **sv** Swedish | beta | en/ett, a suffixed definite article, three adjective forms, verb tails |
| **da** Danish | beta | the Swedish shape without double definiteness |
| **nb** Norwegian | beta | the Swedish shape with its own endings |
| **id** Indonesian | beta | no inflection at all: reduplication for plurals, "itu" for definiteness |
| **ms** Malay | beta | Indonesian's grammar with its own vocabulary |
| **vi** Vietnamese | beta | classifiers carrying definiteness, no inflection, no copula before an adjective |
| **ro** Romanian | beta | Romance conjugation **plus** a suffixed article, a plăcea inverting |
| **el** Greek | beta | four cases in the article, adjectives agreeing in case, αρέσει inverting |
| **ca** Catalan | beta | its own conjugation and elision (el/la vs em/et), invariable adjectives |
| **gl** Galician | beta | its own endings, agradar inverting |
| **af** Afrikaans | beta | `nie … nie`, the clause-final verb tail, no verb inflection |
| **ru** Russian | beta | three cases, the **genitive of negation**, animacy, no copula |
| **pl** Polish | beta | the Russian case system with a present copula |
| **bg** Bulgarian | beta | Slavic **without** cases: a suffixed article that lands on the first word of the phrase |
| **sq** Albanian | beta | a suffixed article with an accusative in -n, adjectives behind an agreeing linker |

`production` means golden-tested across the constructions Talk's templates
produce. `beta` means the core is right and tested but the language has morphology
we do not fully model, or a generated vocabulary that no native speaker has read
yet — every `beta` profile states its own limits, and a test enforces that it
does. Callers choose what they will accept:

```ts
realize(words, { locale: 'bg', minMaturity: 'production' })
// → falls back to today's concatenation, with a note saying why
```

**Fourteen of these languages had no pack at all.** Their 295-word vocabularies
were authored here against the same concept ids, which is the proof that adding a
language is data plus one grammar file rather than a new engine — and also the
reason they are `beta`: generated vocabulary needs a native reader.

## How it is built

```
src/
├── engine.ts            # the one sentence-building flow, shared by all 28
├── profile.ts           # what a language declares, and the hooks it implements
├── chunk.ts             # the shallow parse: subject, verb, complements
├── features.ts          # the lexical features packs are missing, and why
├── coverage.ts          # coverage measured, not claimed
├── morphology/romance.ts     # conjugation, agreement, elision: fr/es/it/pt/ca/gl/ro
├── morphology/scandinavian.ts # sv/da/nb from one factory with two dials
├── morphology/slavic.ts       # the case system ru/pl share
├── morphology/clitic.ts       # preverbal object clitics, wherever they appear
├── languages/*.ts       # one module per language: a profile plus small hooks
├── lexicon/shared.ts    # closed-class facts true in every language
├── lexicon/*.ts         # per-language facts a rule cannot know
└── spec/                # golden lists per language, invariants, coverage
```

The engine owns *structure* — order, where negation lands, when a copula is
needed, punctuation, spacing — and each language contributes a declarative
profile plus a handful of hooks (`verbForm`, `determiner`, `adjective`, `noun`,
`pronoun`, `negation`, optionally `particle`, `transform`, `postprocess`).

Two decisions make this scale:

**The closed classes are language-independent.** `i` is first-person singular in
every pack; `two` forces a plural everywhere; `the` is definite everywhere. That
lives in `lexicon/shared.ts`, authored once, so a new language starts with its
whole closed class described.

**The rest is induced, then corrected.** Each language's `induce` hook derives
regular morphology from the tile's own form — Romance gender from its ending,
Swedish plurals, Japanese negatives, Arabic gender from the ta marbuta — and a
curated map states only what a rule cannot know. German is the extreme case: all
123 pack nouns are curated, because gender is not derivable. Chinese needs almost
nothing.

## Safety properties

In an AAC app a clumsy sentence is a nuisance; an *invented* one puts words in a
child's mouth. These are enforced by tests for all 28 languages, and they are the
interface any future model would have to satisfy:

- **It cannot invent content.** Every token traces to a tile the child chose or
  to that language's closed function-word list. `Realization.inserted` exposes
  the additions; `token.merged` keeps the trail when elision fuses words
  (`tu m'aides`, `il-ħobż`, `äpplet`).
- **It never drops a tile.**
- **It is deterministic.** Same tiles, same sentence, always.
- **It never returns silence.**
- **Every one of the 295 tiles realizes in every language.**
- **An unknown language falls through to today's concatenation**, not to guessed
  grammar.

## Coverage

Measured by `coverageFor()`, asserted in `spec/coverage.spec.ts`:

| language | curated | induced | bare | closed class |
|---|---|---|---|---|
| en | 105 | 0 | 190 | 26/26 |
| nl | 107 | 0 | 188 | 26/26 |
| de | 206 | 0 | 89 | 26/26 |
| fr | 116 | 93 | 86 | 26/26 |
| es | 108 | 93 | 94 | 26/26 |
| it | 103 | 95 | 97 | 26/26 |
| pt | 102 | 94 | 99 | 26/26 |
| mt | 98 | 99 | 98 | 26/26 |
| zh | 77 | 104 | 114 | 26/26 |
| ja | 72 | 26 | 197 | 26/26 |
| ko | 68 | 0 | 227 | 26/26 |
| ar | 86 | 105 | 104 | 26/26 |
| hy | 79 | 0 | 216 | 26/26 |
| sv | 109 | 75 | 111 | 26/26 |
| da | 118 | 65 | 112 | 26/26 |
| nb | 118 | 65 | 112 | 26/26 |
| id | 75 | 0 | 220 | 26/26 |
| vi | 88 | 93 | 114 | 26/26 |
| ro | 101 | 94 | 100 | 26/26 |
| el | 98 | 93 | 104 | 26/26 |
| ms | 68 | 0 | 227 | 26/26 |
| ca | 105 | 92 | 98 | 26/26 |
| gl | 102 | 94 | 99 | 26/26 |
| af | 92 | 0 | 203 | 26/26 |
| ru | 109 | 94 | 92 | 26/26 |
| pl | 107 | 91 | 97 | 26/26 |
| bg | 108 | 94 | 93 | 26/26 |
| sq | 108 | 93 | 94 | 26/26 |

A tile that is neither curated nor induced still works — it falls through to its
own text, which is what the app does today. "Bare" is a coverage figure, not a
failure.

## Running it

```bash
npx vitest run packages/talk-realizer/src
```

Golden tests load the **real packs** from `workers/sentence-api/data`, so a change
to a tile's text or part of speech breaks a test rather than a child's sentence.

## What building this found

1. **Talk cannot express negation.** There is no `not` tile — only the social
   "no" — so a child cannot say "I don't want that", which is among the first
   things they need. Every language here already handles negation; the tile is a
   product decision away.
2. **Several tiles are filed wrongly in every pack.** `is` and `are` are copulas
   and `can` is a modal, not question words — left as questions they turn any
   sentence containing them into a question. `big` is an adjective, not a
   determiner. `more` and `again` are adverbs, not socials, and as socials they
   made every language say "I want, more." `lexicon/shared.ts` reclassifies them
   all; the packs should be fixed at source.
3. **Spanish and Portuguese store "con frío" and "com fome" where adjectives
   belong**, because the tile has to serve both "I am cold" and "the water is
   cold" — which those languages say with different words. Fixed in the packs and
   handled properly: a sensation takes have and a noun, a description takes a
   copula and an adjective.
4. **The packs are missing lexical facts, not intelligence.** 23 of 295 words
   carry an inflection, and it is always `past`. Gender, plurals, verb persons
   and mass/count are what a sentence needs.
5. **Maltese settles the model question.** No small multilingual model handles it
   and no grammar framework ships it, but its rules are systematic and now
   tested. Any language plan that cannot serve Maltese cannot serve Tiko.

## Next

- **Move the LLM offline.** Generate next-word priors at pack-build time instead
  of per request, and delete `fetchAiPredictions` from the hot path. This is the
  single biggest win left: it removes latency, cost and the online dependency.
- **Port the engine to Swift** in TikoKit so Talk works offline like Say, Sum and
  First. The rules are pure functions over data, so this is a port, not a
  rewrite. Note it contradicts Talk's current doctrine that the frontend holds no
  grammar logic — that doctrine is what forces the round trip.
- **Native review** for the nineteen `beta` languages and the fourteen generated
  vocabularies. This is the gate on promoting any of them, and it is the one thing
  no amount of engineering here can replace.
- **Fill the app's own i18n gap.** The realizer serves 28 languages; Talk's
  interface is translated into 6, so a child using a Bulgarian pack still reads
  English menus around it.
- **More languages** are now roughly a day each: author the pack against the
  shared concept ids, write one grammar module, add a golden list. Turkish
  (agglutinative, vowel harmony) is the interesting next test of the engine's
  shape. Thai is blocked on a product decision rather than on grammar: its
  politeness particles depend on the speaker's gender, which the tiles do not
  record.
- **Only then** consider a fine-tuned small model, measured against these same
  golden lists and held to the same invariants.
