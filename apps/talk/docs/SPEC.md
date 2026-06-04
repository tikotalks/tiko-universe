# Talk App — Product Specification

> Source of truth for Talk product direction. Architecture detail lives in ARCHITECTURE.md.

## Purpose

Talk is a sentence-building communication app for children. It helps children compose and speak full sentences by combining word tiles, guided by backend intelligence that learns from usage patterns.

---

## Problem

Children who can identify individual words (via picture cards, labeling, or basic vocabulary) often cannot yet compose those words into sentences. The gap between "I know the word *juice*" and "I can say *I want juice*" is significant for children with communication difficulties, language delays, or young age.

Current Tiko apps do not bridge this gap:

- **Cards** speaks one word per tap. No sentence assembly.
- **Type** requires letter-by-letter spelling with a virtual keyboard. Not tile-based. Not scaffolded.

There is no app in Tiko where a child taps word tiles in sequence and the system helps them build a grammatically valid, speakable sentence.

---

## Vision

Every child should be able to express a complete thought — not just label things, not just spell words, but say what they mean. Talk makes sentence construction as easy as tapping tiles, with a backend engine that gets smarter every day from the sentences children actually build.

The intelligence lives on the server. The frontend is a thin render layer. This means:
- Apps stay simple and small.
- The engine improves without requiring app updates.
- New languages are deployed server-side.
- Suggestion quality grows with usage.

---

## Target Audience

**Primary**
- Children aged 3–10 who can identify words but struggle with sentence composition
- Children with communication difficulties (speech delays, autism, AAC users)
- Children learning a second language who need scaffolded sentence construction

**Secondary**
- Parents, speech therapists, teachers, caregivers who want to customize vocabulary and phrases

---

## Core Concepts

### 1. Sentence Strip

A horizontal bar at the top of the screen showing the sentence being built, word by word. Each word is a removable tile. The child taps tiles from the grid below to add words to the strip. Tap a strip tile to remove it. Drag to reorder.

The strip is the child's sentence. It grows left to right. When ready, the child hits Speak and the whole strip is voiced.

### 2. Word Tiles

Visual tiles organized by grammatical category (not topic like Cards). Categories include:
- **Pronouns** — I, you, he, she, it, we, they
- **Actions** — want, need, go, eat, drink, play, see, like, feel, come, help, stop
- **Things** — food, drink, people, places, body, animals, toys (sub-categorized)
- **Descriptions** — big, small, hot, cold, happy, sad, tired, hungry, more
- **Questions** — what, where, who, when, why, how
- **Connectors** — and, but, because, then
- **Extra** — please, thank you, yes, no, not

Each tile shows the word text and an optional icon. Tiles come from the backend — the frontend does not hardcode vocabulary.

### 3. Templates

Pre-built sentence frames that scaffold common patterns:
- "I want ___"
- "I feel ___"
- "Can I have ___?"
- "Where is ___?"
- "I don't want ___"
- "More ___ please"
- "I need help"
- "I like ___"

Templates appear as one-tap starters. When selected, the strip pre-fills with the fixed words and the backend suggests tiles that fill the empty slots.

### 4. Smart Suggestions

After each word the child adds, the backend suggests the most relevant next words. The suggestions are:
- **Grammar-aware** — after "I", suggest verbs (not nouns)
- **Frequency-weighted** — common combinations rank higher
- **Learned from usage** — popular sequences among all users get boosted
- **Personally adapted** — this child's frequent patterns get a bonus

Suggestions appear as a horizontal row of tiles above the main grid. The child can tap a suggestion or browse the full grid.

### 5. Speak

When the sentence strip is complete, the child taps Speak. The backend:
1. Formats the sentence properly (capitalization, punctuation)
2. Returns a TTS audio URL (cached or freshly generated)
3. Logs the sentence for learning

The child hears the sentence spoken aloud.

### 6. Saved Phrases

Sentences the child builds frequently are automatically saved as one-tap phrases. The child can also manually save any sentence. Saved phrases appear on the home screen for instant access.

---

## Child Experience

### Home Screen

1. **Saved phrases** — one-tap speak for frequent sentences
2. **Templates** — common sentence frames as starting points
3. **Start building** — empty sentence strip, grid of initial word categories

### Building a Sentence

1. Child taps "I" (pronoun tile)
   - "I" appears in the sentence strip
   - Backend suggests: want, need, feel, am, can, go
2. Child taps "want" (suggestion or action grid)
   - Strip shows: "I want ___"
   - Backend suggests: food items, drink items, toys
3. Child taps "juice" (thing grid)
   - Strip shows: "I want juice"
   - Backend confirms: can speak, suggests "please"
4. Child taps Speak
   - Audio plays: "I want juice."
   - Sentence logged for learning

### Quick Path via Template

1. Child taps "I want ___" template
2. Strip pre-fills: "I want ___"
3. Backend shows: food, drink, toys
4. Child taps "juice"
5. Speak

### Quick Path via Saved Phrase

1. Child taps saved phrase "I want juice"
2. Strip fills: "I want juice"
3. Speak (or auto-speak)

---

## Caregiver Experience (v2)

- Add custom words to the child's vocabulary
- Create custom templates
- Pin important phrases
- View the child's most-used sentences (aggregated, not raw logs)
- Set language preference

---

## Language Support

### Phase 1: Seed packs (curated)
- English (~250 words, ~25 templates)
- Dutch (~250 words, ~25 templates)

### Phase 2: AI-generated packs
- Admin tool generates new language packs using an LLM
- Human review before deployment
- Deployed server-side — no app update needed

### Phase 3: Community/Expert packs
- Speech therapists or educators can contribute packs
- Reviewed and merged via admin tools

Each language pack includes:
- Vocabulary with POS tags, categories, frequency, icons, inflections
- Sentence templates localized to the language's grammar
- Grammar rules: word order (SVO/SOV/VSO), article agreement, negation patterns

---

## Learning System

### What the backend learns

Every completed sentence contributes to:

1. **Global transition weights** — "I want" is extremely common across all users → boost its suggestions
2. **Category ordering** — after "I want", 80% of completions are food/drink → surface food tiles first
3. **Template discovery** — if many users build the same pattern independently, promote it to a template
4. **Personal patterns** — this child builds "I want juice" 20x/day → auto-save as a phrase

### How it learns

Pure statistics. Count sequences, rank by frequency, adjust weights. No LLM. No ML training. Simple SQL queries against aggregated usage data.

### Privacy

- No raw sentence logs stored long-term
- Aggregated transition counts only (locale, POS sequence, word sequence, count)
- Per-user data limited to saved phrases and usage frequency for personalization
- No sentence content shared between users
- No human review of individual sentences

---

## Acceptance Criteria

### v1 must have

- [ ] Sentence strip renders, accepts tiles, allows removal and reorder
- [ ] Word tiles organized by POS category, served from Sentence API
- [ ] Templates served from Sentence API, slot-filling works
- [ ] Grammar-aware suggestions after each word addition
- [ ] Speak button voices the full sentence via Tiko TTS pipeline
- [ ] Saved phrases: auto-save frequent sentences, manual save, one-tap speak
- [ ] English language pack with ≥200 words and ≥20 templates
- [ ] Backend learning: transition weights update from usage
- [ ] Aggressive caching: repeated sequences return from KV cache
- [ ] Works offline with bundled fallback pack (limited vocabulary)
- [ ] App opens immediately, no login wall
- [ ] Device identity bootstrap works
- [ ] i18n for UI strings (Lezu, `talk.*` namespace)

### v2 should have

- [ ] Dutch language pack
- [ ] AI-assisted language pack generation endpoint (admin)
- [ ] Caregiver custom vocabulary editing
- [ ] Keyboard fallback for words not in pack
- [ ] Personal suggestion adaptation (beyond global weights)
- [ ] Image support on word tiles (via Tiko Media)

### v3 could have

- [ ] Additional languages (French, German, Spanish)
- [ ] Community/expert pack contributions
- [ ] Speech therapist dashboard integration
- [ ] Verb tense/conjugation scaffolding
- [ ] Sentence history and review

---

## Non-Goals

- Not a grammar teaching tool
- Not a chatbot or conversational AI
- Not a replacement for Cards or Type
- Not a full AAC system (Symbols, extensive boards, scanning access)
- Not an LLM-powered real-time conversation engine
- Not an assessment or diagnostic tool
