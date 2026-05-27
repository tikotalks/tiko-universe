# Repository Structure

## `apps/web/*`

Vue/Vite web apps. Each app is a thin client around shared packages and documented APIs.

Initial app order:

- `apps/web/yes-no`
- `apps/web/type`
- `apps/web/cards`
- `apps/web/sequence`
- `apps/web/timer`

## `apps/ios/*`

SwiftUI native apps. Use XcodeGen project definitions. Do not commit generated `.xcodeproj` files.

## `apps/android/*`

Native Android apps using Kotlin and Jetpack Compose. Android is a first-class client, but should follow the API once web/iOS proof app contracts are stable.

## `packages/*`

Shared TypeScript packages used by web apps and API tests. Native apps consume API contracts rather than importing these packages directly.

## `workers/*`

Cloudflare Workers, one per bounded backend domain.

## `docs/*`

Doctrine, architecture, API contracts, app specs, parity checklists, and migration notes.
