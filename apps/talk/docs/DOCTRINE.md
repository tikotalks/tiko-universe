# Talk App Doctrine

## Core belief

Talk is a sentence-building communication app for children. It does not label things (that's Cards) or spell letters (that's Type). It answers one question: **"How do I say what I mean?"**

The app is intentionally thin. The backend is the brain. Every interaction flows through the Sentence API. The frontend renders what the backend tells it to render.

## Why Talk exists

Cards speaks one word at a time. Type requires letter-by-letter spelling. Neither builds sentences. A child who can identify "juice" and "want" but cannot yet compose "I want juice" has no app in Tiko that bridges that gap. Talk is that bridge.

## Non-negotiables

- **Dumb frontend, smart backend.** The frontend does not know what a verb is. It does not know grammar rules. It does not contain language packs. It asks the Sentence API and renders the response.
- **API-first.** Every sentence-building interaction is an HTTP call. The sentence strip, tile suggestions, templates, completions, and saved phrases all come from the backend.
- **No login wall.** Opens and works immediately, like every Tiko app.
- **No passwords.** Device-first identity, optional caregiver email recovery.
- **No Supabase runtime.** Cloudflare Workers, D1, KV, R2 only.
- **Backend gets smarter without app updates.** The Sentence API learns from usage. Suggestion quality improves over time. New language packs are deployed server-side. Apps never need updating for intelligence improvements.
- **No real-time AI at child-facing runtime.** Language packs are pre-built structured data. AI generates packs at build/admin time only. The child-facing app never calls an LLM.
- **Cache everything.** Transition suggestions, vocabulary lookups, and TTS audio are aggressively cached. A repeated sequence returns in milliseconds from KV or D1.
- **Offline-first frontend.** Language packs can be bundled for offline fallback. But the canonical intelligence lives server-side. *Scoped exception:* the offline fallback pack (~50 words) includes minimal grammar rules for local suggestion computation — this is a degraded offline-only mode, never the online path. The frontend does not contain grammar logic for the primary (online) experience.

## Product philosophy

- **Sentence over word.** Talk's unit of communication is the sentence, not the individual word.
- **Scaffold, not teach.** Talk helps children build sentences they need right now. It is not a grammar lesson.
- **Learn from use.** Every completed sentence makes the engine better for everyone. Usage patterns drive suggestion quality, not editorial decisions alone.
- **Progressive complexity.** Start with templates and core words. Grow into free-form construction as the child's vocabulary and confidence expand.
- **Calm and immediate.** No animations for animation's sake. No gamification. Open, build, speak, done.

## Target audience

- Children who can identify words (via Cards-level skills) but cannot yet compose sentences independently
- Children with communication difficulties who need scaffolded sentence construction
- Children learning to express needs, feelings, and questions
- Caregivers who want to customize vocabulary and phrases

## Relationship to other Tiko apps

| App | Answers | Unit |
|-----|---------|------|
| Cards | "What is this called?" | Single word |
| Type | "How do I spell it?" | Letter-by-letter text |
| **Talk** | **"How do I say what I mean?"** | **Sentence** |
| Yes No | "Yes or no?" | Binary choice |
| Sequence | "What steps do I follow?" | Ordered list |
| Timer | "How long until this ends?" | Duration |

Talk does not replace Cards or Type. It sits between them — children who can label things (Cards) and recognize letters (Type) graduate to building full thoughts (Talk).

## V1 constraints

- English only in v1. Dutch is a v2 goal.
- ~200-300 core words per language.
- ~20-30 sentence templates per language.
- New `workers/sentence-api/` Worker. New D1 database. KV cache namespace.
- No real-time LLM calls in the child-facing flow.
- No parent vocabulary editing in v1 (v2).
- No typed/free-text input in v1 (that's Type's job).

## Veto points

- Do not put grammar logic in the frontend.
- Do not call an LLM during child-facing interactions.
- Do not duplicate Cards' word-labeling job.
- Do not duplicate Type's letter-typing job.
- Do not ship language packs embedded in app bundles as the primary path (they are offline fallback only; the API is canonical).
- Do not build a chatbot or conversational AI.
- Do not build a grammar teaching tool.
- Do not store per-child raw sentence logs indefinitely — aggregate and anonymize usage statistics.
