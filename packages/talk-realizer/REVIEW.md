# Vocabulary review status

The realizer's **grammar** is tested: every language has a golden list, and 49 of the
52 produce no "needs curation" note for any of the 295 tiles in any sentence shape Talk
builds. That is a claim about rules.

This file is about the other half: **the words themselves.** 41 of the 54 packs
contain vocabulary generated against the shared concept ids and read by no native
speaker. The grammar around those words is right; whether "kuki" is what a Curaçaoan
child calls a biscuit is not something this package can know.

**Reviewing one language means checking 295 words and one sample sentence.** Both are
below. The sample is what the realizer produces for , which
exercises the article, the object case and the verb at once — if that reads wrong to a
speaker, the grammar file needs attention as well as the pack.

## Needs a native reader (41)

| | language | grammar | sample: "I want the apple" |
|---|---|---|---|
| `af` | Afrikaans | beta | Ek wil die appel hê. |
| `sq` | Albanian | beta | Unë dua mollën. |
| `eu` | Basque | beta | Nik sagarra nahi dut. |
| `be` | Belarusian | beta | Я хачу яблык. |
| `bn` | bn | beta | আমি আপেলটা চাই। |
| `bs` | Bosnian | beta | Ja želim jabuku. |
| `bg` | Bulgarian | beta | Аз искам ябълката. |
| `ca` | Catalan | beta | Jo vull la poma. |
| `hr` | Croatian | beta | Ja želim jabuku. |
| `cs` | Czech | beta | Já chci jablko. |
| `da` | Danish | beta | Jeg vil have æblet. |
| `et` | Estonian | beta | Mina tahan õuna. |
| `fi` | Finnish | beta | Minä haluan omenaa. |
| `gl` | Galician | beta | Eu quero a mazá. |
| `ka` | Georgian | draft | მე ვაშლი მინდა. |
| `el` | Greek | beta | Εγώ θέλω το μήλο. |
| `hi` | hi | beta | मैं सेब चाहता हूँ। |
| `hu` | Hungarian | beta | Én akarom az almát. |
| `is` | Icelandic | beta | Ég vil eplið. |
| `id` | Indonesian | beta | Saya mau apel itu. |
| `ga` | Irish | beta | Tá mé ag iarraidh an t-úll. |
| `lv` | Latvian | beta | Es gribu ābolu. |
| `lt` | Lithuanian | beta | Aš noriu obuolio. |
| `lb` | Luxembourgish | beta | Ech wëll den Apel. |
| `mk` | Macedonian | beta | Јас сакам јаболкото. |
| `ms` | Malay | beta | Saya nak apel itu. |
| `cnr` | Montenegrin | beta | Ja želim jabuku. |
| `nb` | Norwegian | beta | Jeg vil ha eplet. |
| `pap` | Papiamentu | beta | Mi ke e apel. |
| `pl` | Polish | beta | Ja chcę jabłko. |
| `ro` | Romanian | beta | Eu vreau mărul. |
| `ru` | Russian | beta | Я хочу яблоко. |
| `sr` | Serbian | beta | Ја желим јабуку. |
| `sk` | Slovak | beta | Ja chcem jablko. |
| `sl` | Slovenian | beta | Jaz hočem jabolko. |
| `sv` | Swedish | beta | Jag vill ha äpplet. |
| `tr` | Turkish | beta | Ben elmayı istiyorum. |
| `uk` | Ukrainian | beta | Я хочу яблуко. |
| `vi` | Vietnamese | beta | Tôi muốn quả táo. |
| `cy` | Welsh | beta | Dwi eisiau'r afal. |
| `fy` | West Frisian | beta | Ik wol de apel. |

## Authored with the app (13)

These packs came with Talk and have been in front of users; they are not part of this
review.

| | language | grammar | sample |
|---|---|---|---|
| `ar` | Arabic | beta | أنا أريد التفاحة. |
| `hy` | Armenian | production | Ես խնձորը ուզում եմ։ |
| `zh` | Chinese | production | 我要这个苹果。 |
| `nl` | Dutch | production | Ik wil de appel. |
| `en` | English | production | I want the apple. |
| `fr` | French | production | Je veux la pomme. |
| `de` | German | production | Ich will den Apfel. |
| `it` | Italian | production | Io voglio la mela. |
| `ja` | Japanese | beta | わたしはそのりんごがほしい。 |
| `ko` | Korean | beta | 나는 그 사과를 원해. |
| `mt` | Maltese | beta | Jien irrid it-tuffieħa. |
| `pt` | Portuguese | production | Eu quero a maçã. |
| `es` | Spanish | production | Yo quiero la manzana. |

## Where to look

- **The words**: `workers/sentence-api/data/<code>-v1.json`, 295 entries, each with an
  `id` shared across every language. Fixing a word means editing `text`; the ids must
  not change. Re-run `node tools/generate-talk-seeds.mjs` afterwards, because the API
  reads the generated SQL rather than the JSON.
- **The grammar**: `packages/talk-realizer/src/languages/<code>.ts` for the rules and
  `lexicon/<code>.ts` for the per-word facts a rule cannot derive (gender, verb
  persons, irregular cases).
- **The tests**: `packages/talk-realizer/src/spec/`. A corrected word will break a
  golden expectation, and that is the point — update the expectation in the same commit
  so the next reader can see what changed.

## Georgian is different

`ka` is marked `draft` and `needs-correction` rather than `needs-native-review`: its
vocabulary is known to contain errors, not merely unverified ones, and its verb
morphology (which agrees with subject and object at once) is not modelled. `realize()`
will not use it — a caller gets the tiles joined, with a note — until someone promotes
it. Do not promote it without a speaker.
