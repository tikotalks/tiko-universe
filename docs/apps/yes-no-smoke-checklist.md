# Yes-No P0 Smoke Checklist

Use this checklist after any Yes-No proof-app/API wiring change. Every line must be answered with `yes` or `no`; attach the request URL, response status, browser observation, or test name as evidence.

| Check | Yes/No | Evidence to capture |
| --- | --- | --- |
| No login wall: the Yes-No app shell renders immediately before caregiver recovery or account UI. | yes / no | Browser route and screenshot/test name proving the child-facing controls are visible without auth setup. |
| Device bootstrap hook/client path: the app can call `POST /v1/identity/device` and receive a device user, device secret, and bearer session. | yes / no | Request URL, status, and redacted response shape. Do not paste raw session/device secrets. |
| Settings path: the app can call `GET /v1/apps/yes-no/settings` with the bearer session and receive defaults or saved settings. | yes / no | Request URL, status, and response keys: `app`, `settings`, `updatedAt`, `version`. |
| State path: the app can call `GET` and/or `PUT /v1/apps/yes-no/state` with the bearer session and receive versioned state. | yes / no | Request URL, status, response keys, and version/conflict behavior if writing. |
| TTS fallback path: when platform/API TTS is unavailable, the app falls back without blocking the Yes/No interaction. | yes / no | Generation API response or fallback mode (`browser-speech` or `silent-noop`) plus the UI behavior observed. |

Automated helper: `createAppSmokeChecklist('yes-no', evidence)` from `@tiko/testing` produces the same hard yes/no checklist for contract and proof-app tests.
