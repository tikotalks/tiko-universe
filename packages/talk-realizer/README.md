# @tiko/talk-realizer

Turns a child's tile selection into a grammatical sentence — deterministically,
offline, and without a model.

**Prototype status:** English and Dutch, 93 tests green. Built to answer one
question before we invest in a model: *how far do rules actually get?*

## Why this exists

`workers/sentence-api` currently builds Talk's sentence with:

```ts
words.map((word) => word.text).join(' ')
```

So the tiles `I` + `want` + `apple` become **"I want apple"**, and the Dutch pack
says **"ik wil appel"**. Every suggestion request also makes a live LLM call to
Atlas to rank next words, which means latency, cost and an online dependency on
the child's critical path.

This package is the missing layer. Same input, correct output:

| tiles | today | realizer (en) | realizer (nl) |
|---|---|---|---|
| i + want + apple | I want apple | **I want an apple.** | **Ik wil een appel.** |
| he + want + apple | he want apple | **He wants an apple.** | Hij wil een appel. |
| i + want + the + bread | ik wil de brood | I want the bread. | **Ik wil het brood.** |
| i + want + big + book | I want big book | **I want a big book.** | **Ik wil een groot boek.** |
| i + want + two + cookie | ik wil twee koekje | **I want two cookies.** | **Ik wil twee koekjes.** |
| i + happy | I happy | **I am happy.** | **Ik ben blij.** |
| what + you + want | wat jij wil | **What do you want?** | **Wat wil jij?** |
| i + not + want + apple | ik niet wil appel | **I do not want an apple.** | **Ik wil geen appel.** |
| we + go + to + school | wij ga naar school | We go to school. | **Wij gaan naar school.** |
| you + help + me | jij help mij | You help me. | **Jij helpt mij.** |

## What it handles

**Both languages** — subject–verb agreement; article insertion (and suppression
for mass, proper and institutional nouns); quantifiers forcing the plural;
possessives and demonstratives blocking the article; copula insertion when the
child gives a subject and a predicate but no verb (there is no "be" tile in the
packs at all); object pronoun forms; questions; past tense; trailing socials;
capitalisation and punctuation.

**English** — `a` vs `an` by *sound*, not spelling, and keyed to whatever comes
next ("a big apple", not "an big apple"); do-support for negation and questions
("He **does not** want an apple", "What **do** you want?").

**Dutch** — three rules that plain concatenation can never get right:

- **de/het** by the noun's gender: `het brood`, `de appel`. Not derivable; a
  lexical fact per noun.
- **The attributive -e**: `de grote appel`, `een grote appel`, `het grote boek` —
  but `een groot boek`. No -e before a singular indefinite neuter noun.
- **niet vs geen**: negating an indefinite object replaces its article
  (`Ik wil geen appel`), and `niet` sits before a predicate (`Ik ben niet blij`)
  but after a definite object (`Ik wil de appel niet`).

Plus verb-second inversion in questions, which also drops the second-person -t:
`jij wilt` → `wil jij?`.

## Safety properties

In an AAC app a clumsy sentence is a nuisance; an *invented* one puts words in a
child's mouth. These are enforced by tests, and they are the interface any future
model would have to satisfy:

- **It cannot invent content.** Every output token either traces back to a tile
  the child chose or comes from that language's closed function-word list
  (`functionWords.en`, `functionWords.nl`). `Realization.inserted` exposes what
  was added.
- **It never drops a tile.** Anything the child selected appears in the output
  (negation excepted, since it is realized as `do not` / `geen`).
- **It is deterministic.** Same tiles, same sentence, every time.
- **It never returns silence.** A selection it cannot build a sentence from is
  spoken as the child's own tiles.
- **Unknown language → honest concatenation**, not guessed grammar. Maltese
  currently falls through to exactly what the app does today, until someone
  authors the overlay.

## Structure

```
src/
├── features.ts        # the lexical features packs are missing, and why
├── chunk.ts           # the shallow parse both languages share
├── languages/en.ts    # English rules + its function-word whitelist
├── languages/nl.ts    # Dutch rules + its function-word whitelist
├── lexicon/en.ts      # feature overlay, keyed by pack concept id
├── lexicon/nl.ts      # same keys, Dutch facts (gender!)
└── spec/              # golden lists per language + invariants
```

Run the suite from the repo root:

```bash
npx vitest run packages/talk-realizer/src
```

Golden tests load the **real packs** from `workers/sentence-api/data`, so a
change to a tile's text or part of speech breaks a test rather than a child's
sentence.

## What the prototype proved

1. **Rules cover the common case comfortably.** Every sentence pattern in Talk's
   24 bundled templates is reachable with the rules above and roughly 400 lines
   per language.
2. **The work is data, not modelling.** Adding a language is a feature overlay,
   authored once against the shared concept ids. That is the only path that works
   for Maltese at all.
3. **The packs are missing lexical facts, not intelligence.** 23 of 295 words
   carry an inflection today, and it is always `past`. Gender, plurals, verb
   persons and mass/count are what the realizer needs — an afternoon of data
   entry per language, and `Features` is the schema for it.
4. **Two data bugs surfaced immediately.** The English pack files `big` as a
   determiner, and `two`/`three` as determiners rather than quantifiers. The
   overlay corrects them (`Features.pos`), but the packs should be fixed.
5. **Talk cannot express negation.** There is no `not` tile — only the social
   "no" — so a child cannot say "I don't want that", which is among the first
   things they need. The realizer handles negation the moment that tile exists.

## Next, if this is worth continuing

- Complete the two overlays across all 295 words, then a third language.
- Move the LLM offline: generate next-word priors at pack-build time instead of
  per request, and delete `fetchAiPredictions` from the hot path.
- Port to Swift in TikoKit so Talk works offline like Say, Sum and First. The
  rules are pure functions over data, which is why this is a port and not a
  rewrite. Note this contradicts Talk's current doctrine that the frontend holds
  no grammar logic — that doctrine is what forces the network round trip.
- Only then consider a fine-tuned small model, measured against these same
  golden lists and held to the same invariants.
