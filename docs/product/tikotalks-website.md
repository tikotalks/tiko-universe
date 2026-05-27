# TikoTalks.com Website Concept

## Purpose

TikoTalks.com should be the calm public front door for Tiko: a child-first universe of small communication and learning tools that open immediately, work across devices, and do not make families pass through account ceremony before a child can use them.

The site is not a SaaS conversion funnel. It is a trust-building explanation for caregivers, parents, teachers, and support adults who need to understand what Tiko is, why it is safe to try, and which tiny app to open first.

## Audience

### Primary audience

- Caregivers and parents looking for simple communication support that can be tried immediately.
- Teachers, aides, and support workers who need low-friction tools in a classroom or care setting.
- Families who may be overwhelmed by medicalized, expensive, or account-heavy assistive products.

### Secondary audience

- Clinicians and therapists who may recommend a simple tool, but are not the primary buyer persona for the site.
- Developers or partners who need to understand that Tiko is API-first and portable across web, iOS, and Android.

### Emotional state on arrival

Visitors may be tired, cautious, hopeful, skeptical, or in a hurry. The website should not raise their cognitive load. It should make Tiko feel safe to open, easy to explain, and honest about what it is not.

## Positioning

Tiko is a small universe of calm communication tools for children and caregivers.

Short positioning options:

1. Tiny communication tools for children and caregivers.
2. Calm tools for saying, choosing, learning, and sharing.
3. Open a tool. Help a child communicate. No account required.

Recommended main line:

> Tiny communication tools for children and caregivers.

Supporting line:

> Tiko apps open quickly, work gently, and do not require passwords or a login wall before a child can start.

## What Tiko believes

- A child should not wait for adult account setup before a communication tool works.
- Device-first use is a valid starting point, not a trial failure state.
- Caregivers need recovery and transfer, but recovery should happen through optional magic links, not passwords.
- Apps should be small enough to understand in seconds.
- Web, iOS, and Android should feel like equal doors into the same tools.
- The platform exists to make child-facing apps calmer, not more complicated.

## What the website must refuse

- No adult SaaS dashboard framing.
- No enterprise productivity language.
- No medical, therapy, diagnosis, or outcome claims.
- No implication that Tiko replaces professional support.
- No login-wall messaging such as “sign up to get started”.
- No fear-based parent marketing.
- No “AI companion” hype.
- No fake breadth. Show the small app universe honestly.

## Main calls-to-action

Primary CTA:

- Open a Tiko tool

Secondary CTAs:

- See the tools
- How Tiko works
- For caregivers

Avoid:

- Get started
- Start free trial
- Book a demo
- Create account
- Join waitlist, unless a specific unavailable app truly needs it

## Site structure / information architecture

Recommended first version:

```text
/
  Homepage: positioning, app universe, trust/safety, platform story, FAQ
/tools
  All Tiko apps, with one card per app and clear availability state
/tools/yes-no
  Product page for Yes No once it is the first proof app
/tools/type
  Product page for Type once it enters active build
/how-it-works
  Device-first identity, optional caregiver recovery, web/native parity
/caregivers
  Plain-language trust, safety, privacy, and setup guidance
/faq
  Repeated concerns: accounts, passwords, data, devices, professional claims
```

Do not create a docs-heavy marketing site at first. The homepage plus `/tools` and `/how-it-works` are enough until product pages have real shipped behavior to describe.

## Where the site should live

TikoTalks.com should live inside `tiko-universe` as `apps/website/web`, not as a separate repository.

Reasoning:

- The website must stay synchronized with doctrine, app priority, API availability, and native parity.
- It should share the same workspace conventions, CI, linting, and eventual Tiko visual primitives.
- A separate repository would make public messaging drift faster than the product foundation.
- The website is a client of the Tiko universe, not a separate marketing business.

Constraints for the future implementation:

- It should be a static-first Vue/Vite web app.
- It should not require backend state for v1.
- If app availability becomes dynamic later, read from a small published content contract rather than inventing website-only backend behavior.
- It may link directly to app web clients when they are production-ready.

## Homepage draft

### Hero

Eyebrow:

> TikoTalks.com

Headline:

> Tiny communication tools for children and caregivers.

Body:

> Tiko is a calm universe of small apps for choosing, speaking, typing, sequencing, and learning. Each tool opens quickly, works clearly, and avoids passwords or login walls before a child can begin.

Primary CTA:

> Open a Tiko tool

Secondary CTA:

> See how Tiko works

Small trust line:

> Device-first by default. Optional caregiver recovery. No passwords.

### Short product explanation

Headline:

> Small tools, not a giant platform.

Body:

> Tiko apps are intentionally focused. One app may help a child answer yes or no. Another may help them type and speak a sentence. Another may help with cards, sequences, or timers. The tools share a foundation, but each screen stays simple enough to understand without training.

Principles to show as short cards:

- Opens immediately
- Big, clear controls
- Calm colors and motion
- Web and native clients
- Optional caregiver recovery
- No password accounts

### App universe section

Headline:

> A small universe of helpful tools.

Intro:

> Tiko grows one careful app at a time. Each app does one job and shares the same child-first foundation.

App cards:

#### Yes No

> A simple way to answer, choose, and be heard with two clear buttons.

Status label:

> First proof app

CTA:

> View Yes No

#### Type

> A calm typing space for writing and speaking words or sentences.

Status label:

> Next foundation app

CTA:

> Learn about Type

#### Cards

> Visual cards for choices, words, routines, and shared meaning.

Status label:

> Planned

#### Sequence

> Step-by-step flows for routines, learning, and communication.

Status label:

> Planned

#### Timer

> A focused timer for transitions and waiting without noise.

Status label:

> Planned

Content rule: statuses must reflect shipped reality. Do not imply apps are available until links work.

### Caregiver trust and safety section

Headline:

> Built to be gentle before it is clever.

Body:

> Tiko avoids account pressure, noisy dashboards, and hidden setup. A child can start with a device-local identity. If a caregiver wants recovery or transfer later, Tiko can add email recovery through a magic link instead of a password.

Trust bullets:

- No password requirement.
- No login wall before first use.
- Clear caregiver settings when settings are needed.
- Device-first identity with optional recovery.
- API-first foundation so web, iOS, and Android can behave consistently.
- No therapy claims and no promise of clinical outcomes.

Plain disclaimer:

> Tiko can support communication and learning moments, but it is not medical advice, therapy, or a replacement for professional care.

### Platform/native availability story

Headline:

> One Tiko, many doors.

Body:

> Tiko is built API-first so web, iOS, and Android can share the same behavior instead of becoming separate products. The first tools may appear on web first while native clients catch up, but the goal is parity: the same child-first experience wherever a family opens Tiko.

Availability copy:

> Web opens first when speed matters. Native apps follow where offline access, device speech, and family routines need a more permanent home.

Avoid saying:

- “Download our mobile app today” unless native apps are actually released.
- “Works offline everywhere” unless each app has proven offline behavior.
- “Syncs across all devices” until identity/app-state contracts are live.

### FAQ draft

#### Do I need to create an account?

No. Tiko is designed to open without a login wall. A child can begin with a device-first identity. Caregiver recovery can be added later with a magic link.

#### Does Tiko use passwords?

No. Tiko avoids passwords. Recovery and transfer should use caregiver email magic links when needed.

#### Is Tiko therapy or medical software?

No. Tiko is a set of communication and learning tools. It does not diagnose, treat, or replace professional care.

#### Which app should I try first?

Start with the smallest tool that fits the moment. Yes No is for simple choices. Type is for writing and speaking text. Cards, Sequence, and Timer support more specific routines as they become available.

#### Will Tiko work on phones and tablets?

Tiko is designed for web, iOS, and Android to become equal clients of the same platform. Availability may roll out one app at a time.

#### Can a caregiver recover or move a setup?

That is the intended direction. Tiko starts device-first and can later make the same user recoverable with caregiver email magic links, without introducing passwords.

#### Is my child’s data public?

No. Tiko should treat child and caregiver data as private. Public sharing should only exist when a specific app intentionally creates a shareable object and explains that clearly.

#### Why is Tiko made of many small apps?

Because child-facing tools should stay obvious. A small app can do one job well without turning every session into navigation, setup, or dashboard management.

## Visual and content constraints

### Tone

- Warm, plain, and confident.
- Short sentences.
- No clinical authority voice.
- No startup hype.
- No exaggerated accessibility claims.
- Prefer “caregiver” over “admin”.
- Prefer “tool” or “app” over “solution”.

### Visual direction

- Calm, colorful, spacious.
- Large tap-like surfaces even on marketing pages.
- App cards should feel like physical objects or friendly tiles, not pricing cards.
- Use motion sparingly and never to create urgency.
- Avoid dense feature grids.
- Avoid screenshots until the apps are stable enough not to mislead.

### Accessibility/content rules

- Every page should still make sense without animation.
- Links and CTAs must say what happens next.
- Do not bury availability state.
- Do not use “free forever” or pricing language until the business model is explicit.
- Never claim support for a platform, sync behavior, offline mode, or recovery flow before it exists.

## Implementation handoff candidates for Herma

Only create these after this concept doc is accepted:

1. Create `apps/website/web` as a static Vue/Vite app for TikoTalks.com.
   - Use static content from this doc.
   - No backend dependency in v1.
   - Add route placeholders for `/tools`, `/how-it-works`, `/caregivers`, and `/faq` only if navigation is implemented.

2. Design the first homepage using Tiko-specific visual primitives.
   - Calm child-first art direction.
   - Large friendly sections.
   - No generic SaaS dashboard components.

3. Add a website availability data file.
   - Hard-coded app status list for v1.
   - Statuses: `available`, `proof-app`, `next`, `planned`.
   - No dynamic API until product availability is real.

4. Wire Cloudflare Pages/dev deployment for `dev.tikotalks.com` only after the app exists.
   - Production promotion should wait until at least one app link is real.

## Validation against doctrine and P0 foundation

This concept follows the current doctrine by preserving:

- API-first platform language.
- No passwords.
- No login walls.
- Device-first identity with optional caregiver magic-link recovery.
- Web, iOS, and Android as equal clients.
- Small, calm, focused apps.
- Tiko-specific product feel rather than generic Sil UI or adult SaaS.

It follows the P0 contract map by avoiding promises that depend on unfinished services:

- No cross-device sync promise before app state contracts are implemented.
- No native availability claim before native clients are shipped.
- No TTS/generation promise beyond describing app intent.
- No admin/dashboard framing.
- No website-specific backend service for v1.
