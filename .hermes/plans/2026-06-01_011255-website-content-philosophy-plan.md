# TikoTalks Website Content Philosophy Plan

> **For Hermes:** Planning only. Do not implement until Sil approves the content direction.

**Goal:** Rework the public TikoTalks website content so it explains the philosophy behind Tiko — why free, why small apps, why no login wall, why child-first, why device-first — before it dives into technical architecture.

**Architecture:** Keep the current Vue 3 website structure and data-driven content model, but shift the top-level journey from “what apps exist / how the platform works” toward “why Tiko exists / what it believes / how the apps express that.” Technical docs remain available, but they should no longer dominate the first impression.

**Tech Stack:** Vue 3 `<script setup>`, Vite, TypeScript, current `apps/website/web` content files, `@tiko` website routes, existing Cloudflare Pages development deployment.

---

## Current Context

The website is visually improved, but the content still feels too technical in several places:

- The homepage has good child-first fragments, but it jumps quickly from hero → app grid → media/platform details.
- `docsContent.ts` contains strong philosophy language, but it is buried in `/docs/philosophy` instead of shaping the public homepage.
- The FAQ includes “Why separate tiny apps?” but does not strongly answer “Why free?” or “Why does this exist?”
- The site currently explains the platform more than the emotional/product reason behind the products.
- Header layout still needs another visual pass, but that should be handled as a separate implementation item after the content direction is approved.

## Content Strategy

### Core Message

Tiko should present as:

> Tiko exists because support should be available in the moment: small, free, no-ad apps that help children communicate, choose, understand routines, and move through everyday moments without setup, payment pressure, or adult SaaS complexity.

### Website vs Docs Split

- The **website** answers: what Tiko is, why it exists in the first place, who it helps, and what values are non-negotiable.
- The **docs** answer: why Tiko is shaped this way from a technical/product-architecture perspective — identity, APIs, Cloudflare, D1/R2, app contracts, domains, native clients, and implementation doctrine.
- Do not let technical doctrine dominate the homepage. The homepage should be understandable before someone knows or cares about Workers, APIs, identity models, or app contracts.

### Tone

- Warm, plain, human.
- Product/founder philosophy first, technical architecture later.
- Confident but not grandiose.
- Absolute about the values Sil confirmed: free, always; no ads, ever.
- Avoid medical claims and therapy-outcome promises.
- Avoid startup/sales language: no “platform for teams,” “book a demo,” “talk to sales,” “enterprise,” “growth,” “conversion,” “upgrade,” or ad-supported framing.

### Content Pillars

1. **Immediate help**
   - Tiko apps should open and work right away.
   - The first moment should not be a login form.
   - A child/caregiver may need help *now*, not after setup.

2. **Small apps, not one giant dashboard**
   - Each app has one clear job.
   - Small tools are easier for children to understand and easier for caregivers to trust.
   - Separate apps reduce clutter and decision fatigue.

3. **Free by design — always**
   - Communication support should not start with payment pressure.
   - Free removes hesitation in urgent everyday moments.
   - The core child-facing tools should be free, always.
   - Do not frame Tiko as freemium, trial-based, ad-supported, or upgrade-driven.

4. **No ads — ever**
   - No ads in child-facing flows.
   - No attention extraction.
   - No sponsored prompts, promoted content, tracking-for-monetization, or ad-funded compromise.
   - Tiko should feel safe to open beside a child without wondering what commercial content appears next.

5. **Child-first, caregiver-respectful**
   - Child screens stay simple, big, and calm.
   - Caregiver controls are useful but secondary.
   - Adults get trust/data/recovery information without making the child flow adult-shaped.

5. **Device-first and recoverable later**
   - Apps work on the device immediately.
   - Recovery/sync can be added later when useful.
   - Identity exists to preserve continuity, not to create a login wall.

6. **Not medical, not magic**
   - Tiko can support communication, routines, and learning moments.
   - It does not diagnose, treat, or promise outcomes.
   - The promise is thoughtful, accessible tooling — not a cure.

---

## Proposed Site Journey

### 1. Homepage Hero: answer what Tiko is and why it exists immediately

**Current issue:** Hero says “Small tools for big moments” and “communicate calmly,” which is good, but it does not explain the deeper reason.

**Proposed direction:**

Headline options:

- “Tiko exists because support should be available in the moment.”
- “Small free apps for moments when communication needs to be simple.”
- “Tiny no-ad tools for everyday support.”

Lede direction:

- “Tiko is a family of small, free apps that help children answer, choose, type, follow routines, and understand time. No ads. No account wall. No payment step. Just simple tools that open when they are needed.”

CTA direction:

- Primary: “Try Yes No free”
- Secondary: “Why Tiko exists”

### 2. Add a “Why Tiko exists” section near the top

Place this before the app grid.

Purpose: explain the origin/philosophy in plain language.

Draft structure:

- Eyebrow: “Why Tiko exists”
- Heading: “Because support tools should be available in the moment.”
- Body:
  - “A child may need a way to say yes or no, ask for food, choose an activity, or understand what happens next. Those moments should not depend on creating an account, choosing a plan, or learning a complicated app.”
  - “Tiko is built as a set of tiny tools because small, focused screens are often kinder than one giant system.”

Possible proof cards:

- “Open first” — no login wall before use.
- “One job per app” — less clutter, clearer intent.
- “Free child-facing tools” — no payment pressure in the moment.

### 3. Reframe the app universe section around product philosophy

**Current section:** “Tiny apps. One clear job each.”

Keep the visual app cards, but add why each app exists, not just what it does.

Suggested framing:

- Yes No: “For moments where two choices are enough.”
- Type: “For thoughts that need a voice.”
- Cards: “For choosing with pictures, not words.”
- Sequence: “For making the next step visible.”
- Timer: “For making time feel concrete.”

The cards can still link to details, but their homepage copy should feel like human use cases, not technical product listings.

### 4. Replace or soften the “Built-in media library” homepage emphasis

**Current issue:** “Hundreds of 4K images” feels technical/product-feature heavy.

Options:

A. Keep media visually, but reframe it:
- Eyebrow: “Familiar pictures help”
- Heading: “Images make choices easier to understand.”
- Body: “Cards can use simple, recognizable images so children can choose without needing the right words first.”

B. Move media gallery lower or to Cards detail page if homepage feels crowded.

Recommendation: keep a small media strip because it is visually strong, but make the copy about communication and recognition, not image quantity/resolution.

### 5. Add a clear “Why free?” section

This should be top-level, not hidden in FAQ.

Suggested section:

- Eyebrow: “Why free?”
- Heading: “Because basic support should not wait behind payment.”
- Body:
  - “Tiko is free because the first job is access. A caregiver should be able to open a tool, try it with a child, and decide whether it helps without pressure.”
  - “The child-facing core is not a trial, a teaser, or an ad-supported funnel. It should stay free.”

Important commitment:

- Sil confirmed: free, always.
- No ads, ever.
- Avoid language that implies freemium upgrades, payment gates, or ad-funded access.

### 6. Rework caregiver trust content

Current trust principles are good, but they read like constraints. Add emotional explanation.

Possible heading:

- “Trust starts before account setup.”

Add body:

- “Caregivers should be able to see what a tool does, how it behaves, and whether it fits their child before handing over personal information.”

Keep principles:

- No passwords.
- No login walls before use.
- No child-facing account ceremony.
- No dark patterns or upgrade pressure.
- No medical/diagnostic claims.

Add one more confirmed principle:

- “No ads. Ever.”

### 7. Create or promote a public Philosophy page

There is already `/docs/philosophy`, but it is under Docs and has engineering language.

Options:

A. Keep `/docs/philosophy` but make the nav/CTA label more public-friendly: “Philosophy”.
B. Add `/philosophy` as a public page and keep `/docs/philosophy` for technical doctrine.

Recommendation: add `/philosophy` or promote the existing page in navigation as “Why Tiko”. The page should be less technical than docs.

Suggested sections:

1. “Why small apps?”
2. “Why free?”
3. “Why no login wall?”
4. “Why device-first?”
5. “Why not one big platform?”
6. “What Tiko does not claim to be”

### 8. Improve FAQ content

Add/expand FAQs:

- “Why is Tiko free?”
- “Will Tiko stay free?”
- “Why are there separate apps?”
- “Why not make one big app?”
- “Why does Tiko avoid accounts at the start?”
- “Is Tiko for autism / AAC / therapy?”
- “Can schools or professionals use it?”
- “What data is stored?”
- “Will there be native apps?”

Keep answers short and plain, with links to deeper pages.

### 9. App detail pages: add “the moment this helps”

Each app detail page should start with the human moment before features.

For every app:

- “The moment” — real-world context.
- “Why it is small” — what it intentionally does not do.
- “How it stays calm” — UI/interaction choices.
- “Caregiver notes” — optional setup/recovery/sync boundaries.

Example for Yes No:

- “Sometimes the best communication tool is just two giant answers.”
- “Yes No is for moments where asking less is kinder: Are you hungry? Do you want a break? Should we keep going?”

### 10. Keep technical architecture, but move it deeper

Docs should remain, but top-level public pages should not feel like an architecture pitch.

Recommended hierarchy:

- Homepage: philosophy + app overview + trust.
- Apps: what each tool helps with.
- Why Tiko / Philosophy: human doctrine.
- Caregivers: trust, data, recovery, no claims.
- FAQ: practical objections.
- Docs: architecture/API details for builders.

---

## Likely Files to Change Later

No implementation in this plan step, but likely files are:

- `apps/website/web/src/pages/HomePage.vue`
  - Add “Why Tiko exists” and “Why free?” sections.
  - Reframe media section copy.
  - Adjust hero CTA.

- `apps/website/web/src/siteContent.ts`
  - Add content arrays for philosophy pillars, why-free copy, expanded FAQ.
  - Possibly add route metadata for a new public philosophy page.

- `apps/website/web/src/content/appUniverse.ts`
  - Rework app summaries/headlines/use cases to focus on human moments.
  - Add optional fields like `moment`, `whySmall`, or `philosophy` if needed.

- `apps/website/web/src/pages/AppDetailPage.vue`
  - Add “moment this helps” and “why it stays small” sections.

- `apps/website/web/src/pages/CaregiversPage.vue`
  - Make trust/data/recovery content warmer and less technical.

- `apps/website/web/src/pages/FaqPage.vue`
  - No structural change likely; content expansion mostly via `siteContent.ts`.

- `apps/website/web/src/docsContent.ts`
  - Either soften `/docs/philosophy` or keep it technical and create/promote a separate public philosophy route.

- `apps/website/web/src/components/SiteHeader.vue`
  - Separate follow-up: fix header layout/navigation once content direction is approved.

- `apps/website/web/src/main.ts`
  - Add `/philosophy` or `/why-tiko` route if approved.

---

## Implementation Plan After Approval

### Phase 1: Content model and copy draft

1. Add reusable content objects for:
   - `whyTikoPillars`
   - `whyFreeContent`
   - `expandedFaqs`
   - optional app philosophy fields.
2. Update tests or add content guard tests that prevent adult SaaS/sales/medical framing.
3. Keep copy concise enough for homepage scanning.

### Phase 2: Homepage restructure

1. Update hero copy and CTA.
2. Insert “Why Tiko exists” section before app cards.
3. Reframe app cards around “the moment this helps.”
4. Reframe media section from “4K media library” to “familiar pictures help communication.”
5. Add “Why free?” section before final CTA.

### Phase 3: Public “Why Tiko” route

Decision: add a public route that is separate from technical docs.

- Add `/why-tiko` as the warm public product/philosophy page.
- Keep `/docs/philosophy` for technical/product-architecture doctrine.
- The homepage should link to `/why-tiko`; docs can link deeper to `/docs/philosophy` for builders.

Suggested `/why-tiko` sections:

1. “Tiko exists because support should be available in the moment.”
2. “Why small apps?”
3. “Why free, always?”
4. “Why no ads, ever?”
5. “Why no login wall?”
6. “Why device-first?”
7. “What Tiko does not claim to be.”

### Phase 4: App detail copy pass

For each app page, add:

1. The moment this helps.
2. Why this app is intentionally small.
3. What it does not try to be.
4. Caregiver trust note.

### Phase 5: FAQ expansion

Add the “why” questions and link answers to the new philosophy page.

### Phase 6: Header/layout fix included in the implementation pass

Sil confirmed: fix the header.

Header acceptance criteria:

1. Logo and product name align cleanly on desktop and mobile.
2. Desktop navigation fits without crowding, clipping, or awkward wrapping.
3. Mobile header has a clear menu/open state and does not obscure content.
4. Active route state is visible but not visually noisy.
5. Header typography follows the site split: Inter for body/nav, Nunito only where intentionally brand/header-like.
6. No border workaround unless visually required; prefer spacing, background, and hierarchy.
7. Validate with browser screenshots/smoke on `dev.tikotalks.com` after deployment.

Implementation steps:

1. Inspect `apps/website/web/src/components/SiteHeader.vue` and current CSS.
2. Fix layout at the component/root CSS level, not per-page workarounds.
3. Test desktop width, tablet-ish width, and phone width.
4. Include the header fix in the same PR/commit as the content pass if the diff stays focused; split only if it becomes risky.

---

## Validation Plan

Before deploying content changes:

```bash
npm run test --workspace=@tiko/website-web --if-present
npm run build --workspace=@tiko/website-web
```

Also run any existing website-specific command if workspace naming differs:

```bash
npm run test --workspace=website-web --if-present
npm run build --workspace=website-web
```

Content validation:

- Search for banned sales/medical framing:
  - `free trial`
  - `book a demo`
  - `talk to sales`
  - `enterprise`
  - `clinical outcome`
  - `patient`
  - `diagnose`
  - `treat`
  - `guarantee`
- Confirm the site still includes the required disclaimer: Tiko does not diagnose, treat, or promise outcomes.
- Browser-check homepage, app list, app detail, caregivers, FAQ, and philosophy route.
- Deploy to development branch only.
- Wait for GitHub CI and Deploy to pass.
- Smoke-test `https://dev.tikotalks.com`.

---

## Open Questions for Sil

1. **Founder voice:** Should the page say “I built Tiko because…” or stay brand voice (“Tiko exists because…”)?
2. **Audience priority:** Should the homepage speak first to parents/caregivers, children, teachers, therapists, or broadly supportive adults?
3. **Paid boundary:** Since free/no-ads are absolute, should the site avoid mentioning any future paid/supporter/admin funding model entirely for now?
4. **Header implementation:** Header fix is approved and included; only open question is whether to split it if the content diff becomes large.

---

## Recommended First Draft Direction

Use this as the guiding homepage narrative:

1. Hero: “Tiko exists because support should be available in the moment.”
2. What Tiko is: a family of small, free, no-ad support apps for communication, choices, routines, and time.
3. Why Tiko exists: everyday support should not depend on setup, payment, ads, or adult dashboards.
4. Why small apps: one job per screen, less cognitive load.
5. App universe: each app maps to one everyday moment.
6. Why free, always: access before payment pressure; not a trial or funnel.
7. No ads, ever: no attention extraction in child-facing tools.
8. Trust: no login wall, no child account ceremony, no medical claims.
9. Media: familiar pictures help choices make sense.
10. CTA: try Yes No now, no account.
11. Header: fix logo/nav layout in the same implementation scope.

This should make the site feel less like a technical product catalog and more like a clear statement of intent.
