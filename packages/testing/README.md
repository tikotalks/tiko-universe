# @tiko/testing

Shared test foundation for Tiko Universe API contract and smoke tests.

## Helpers

- `requestBuilder` and `createJsonRequest` build Cloudflare Worker `Request` objects with JSON defaults and bearer-session auth support.
- `bearerAuth` and `jsonHeaders` standardize auth/session request headers.
- `parseJsonResponse`, `assertJsonResponse`, and `assertApiError` enforce success and error-envelope shapes.
- `createDeviceSessionFixture` provides reusable device-first identity/session fixture data for client and worker tests.
- `mockD1` provides strict Cloudflare-style D1 statement mocks with SQL history and handler-based rows/runs.
- `mockR2` provides in-memory R2 object storage for generated media tests.
- `createAppSmokeChecklist` and `createTtsFallbackSmoke` capture the P0 Yes-No smoke checklist as structured yes/no evidence.

## Commands

From the repo root:

```sh
npm run test:contracts
npm run test:services
npm run typecheck -w @tiko/testing
```

These run locally against worker modules with mocked D1/R2/fetch; no Cloudflare deployment is required.
