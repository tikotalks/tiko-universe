# Repository Structure

## `apps/<product>/<platform>`

Tiko apps are organized product-first, then platform. This keeps web, native iOS, and future Android clients for the same app together, which makes product parity and app-specific assets easier to manage.

Initial app order:

- `apps/yes-no/web`
- `apps/yes-no/ios`
- `apps/type/web`
- `apps/cards/web`
- `apps/sequence/web`
- `apps/timer/web`

Expected product shape:

```text
apps/
  yes-no/
    web/      # Vue/Vite client
    ios/      # SwiftUI client, XcodeGen project definition
    README.md # product-specific notes and parity status
```

Web clients should remain thin and consume shared packages plus documented APIs. Native clients consume the same HTTPS API contracts and native TikoKit components.

## `packages/*`

Shared packages used across clients and API tests:

- `packages/ui` — TikoKit for web, composed from low-level `@sil/ui` primitives.
- `packages/tikokit-ios` — TikoKit for SwiftUI/native iOS.
- `packages/identity`, `packages/data`, `packages/i18n`, `packages/media`, `packages/testing` — API clients, contracts, helpers, and shared test utilities.

Native apps should not import web packages directly. Shared behavior belongs in documented API contracts and mirrored platform-specific TikoKit components.

## `workers/*`

Cloudflare Workers, one per bounded backend domain.

## `docs/*`

Doctrine, architecture, API contracts, app specs, parity checklists, and migration notes.
