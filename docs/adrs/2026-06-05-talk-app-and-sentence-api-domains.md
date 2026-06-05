# ADR: Talk app and Sentence API domains

Date: 2026-06-05

## Status

Accepted for v1 implementation planning. Production binding still requires explicit deployment approval.

## Context

Talk is a sentence-building child-facing Tiko app. Unlike the first simple apps, Talk's backend is the product: `workers/sentence-api/` owns vocabulary packs, grammar-aware suggestions, templates, statistical learning, saved phrases, and completion/TTS orchestration.

Tiko domain doctrine separates public/product surfaces, child-facing app runtime, API authority, and byte delivery:

- `*.tikoapps.org` is the app runtime family.
- `*.tikoapi.org` is the API family.
- `*.tikocdn.org` is for CDN/media/audio bytes only.
- New app/runtime domains require an ADR before dashboard exposure or provisioning.

The `tikoapi.org` and `tikoapps.org` zones currently live in the older production-domain Cloudflare account (`dc2b7d14a69351375cab6de9a13ddee9`). Custom-domain Worker and Pages bindings for these hostnames must be deployed in that account while the zones remain there. Generated preview URLs may exist in the newer clean-rebuild account, but they are not the canonical custom-domain surfaces.

## Decision

Talk uses these canonical domains:

- Production app: `talk.tikoapps.org`
- Development app: `dev.talk.tikoapps.org`
- Production Sentence API: `sentence.tikoapi.org`
- Development Sentence API: `dev.sentence.tikoapi.org`
- Pages project: `tiko-talk`
- Worker project: `tiko-sentence-api` / `tiko-sentence-api-dev`

The frontend must call the Sentence API through the configured API base URL. The web, iOS, and Android clients all consume the same HTTPS JSON contract and must not embed Talk intelligence locally except the explicitly generated offline fallback pack.

## Consequences

- Talk keeps a clean app/API split: app runtime under `tikoapps.org`, API authority under `tikoapi.org`.
- The Sentence API can evolve independently of clients; suggestions and packs improve without app updates.
- `dev.sentence.tikoapi.org` requires custom-domain DNS/route provisioning in the zone-owning Cloudflare account. If that is unavailable during early development, workers.dev may be used only as a temporary preview URL and must not be documented as canonical.
- Production binding to `talk.tikoapps.org` or `sentence.tikoapi.org` is not part of implementation unless Sil explicitly approves production promotion.
- No new CDN domain is needed for Talk v1. TTS audio remains owned by the existing generation/audio delivery pipeline.

## Non-goals

- Do not use `tikotalks.com` for app runtime or API authority.
- Do not add a `talk.tiko.mt` runtime surface.
- Do not put Sentence API routes under the child-facing app host.
- Do not create a separate TTS/audio API for Talk.
