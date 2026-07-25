# @tiko/talk-realizer

Turns a child's tile selection into a grammatical sentence — deterministically,
offline, and without a model.

**14 languages · 399 tests · typecheck and lint clean.**

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

The child is not choosing from a list of sentences: 295 tiles yield **2.8 million
grammatical three-tile combinations and 316 million four-tile ones**. That is why
this generalises instead of enumerating.

## Languages

| language | maturity | what it needed |
|---|---|---|
| **en** English | production | `a`/`an` by sound, do-support for negation and questions |
| **nl** Dutch | production | de/het gender, the attributive `-e`, niet vs geen |
| **de** German | production | three genders × two cases, weak/mixed/strong adjectives, kein vs nicht, dative verbs |
| **fr** French | production | conjugation from infinitives, elision and contraction, the partitive, `ne … pas de` |
| **es** Spanish | production | stem-changing verbs, `estar` for states, **gustar inverting the clause** |
| **it** Italian | production | article allomorphy by sound (il/lo/l'/i/gli/le), piacere inverting, article before possessives |
| **pt** Portuguese | production | conjugation, gostar carrying `de`, contractions (do/da/ao) |
| **zh** Chinese | production | no articles at all, measure words for counting, 不 vs 没 |
| **mt** Maltese | beta | article assimilation (il-/id-/ir-/is-/it-/ix-/iż-/l-), `ma … x`, no copula, postposed possessives |
| **ja** Japanese | beta | は/を/が particles, verb-final, negation in the verb or the adjective |
| **ko** Korean | beta | particles chosen by final sound (batchim), glued, 안 before the predicate |
| **ar** Arabic | beta | prefixed article, adjectives agreeing in definiteness, agreeing ليس |
| **hy** Armenian | beta | participle + auxiliary present, suffixed article, negation fronting the auxiliary |
| **sv** Swedish | beta | en/ett, **a suffixed definite article**, three adjective forms, verb tails |

`production` means golden-tested across the constructions Talk's templates
produce. `beta` means the core is right and tested but the language has
morphology we do not fully model, or (for Swedish) a generated vocabulary — every
`beta` profile states its own limits, and a test enforces that it does.

Swedish is the interesting one: **it had no pack at all.** Its 295-word
vocabulary was authored here against the same concept ids, which is the proof
that adding a language is data plus one grammar file rather than a new engine.

## How it is built

```
src/
├── engine.ts            # the one sentence-building flow, shared by all 14
├── profile.ts           # what a language declares, and the hooks it implements
├── chunk.ts             # the shallow parse: subject, verb, complements
├── features.ts          # the lexical features packs are missing, and why
├── coverage.ts          # coverage measured, not claimed
├── morphology/romance.ts # conjugation, agreement and elision shared by fr/es/it/pt
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
child's mouth. These are enforced by tests for all 14 languages, and they are the
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

| language | curated | induced | closed class |
|---|---|---|---|
| en | 70 | 0 | 26/26 |
| nl | 69 | 0 | 26/26 |
| de | 174 | 0 | 26/26 |
| fr | 77 | 103 | 26/26 |
| es | 65 | 103 | 26/26 |
| it | 60 | 105 | 26/26 |
| pt | 59 | 104 | 26/26 |
| mt | 61 | 109 | 26/26 |
| zh | 39 | 114 | 26/26 |
| ja | 34 | 26 | 26/26 |
| ko | 30 | 0 | 26/26 |
| ar | 48 | 115 | 26/26 |
| hy | 41 | 0 | 26/26 |
| sv | 77 | 85 | 26/26 |

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
2. **Three tiles are filed wrongly in every pack.** `is` and `are` are copulas
   and `can` is a modal, not question words. Left as questions they turn any
   sentence containing them into a question. `lexicon/shared.ts` reclassifies
   them; the packs should be fixed at source.
3. **`big` is a determiner in every pack**, and `two`/`three` are not marked as
   quantifiers.
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
- **Native review** for the six `beta` languages, and for the Swedish
  vocabulary.
- **More languages** are now roughly a day each: author the pack against the
  shared concept ids, write one grammar module, add a golden list. Turkish
  (agglutinative, vowel harmony) and Polish (seven cases) are the interesting
  next tests of the engine's shape.
- **Only then** consider a fine-tuned small model, measured against these same
  golden lists and held to the same invariants.
