# communication-api

Cloudflare Worker for outbound Tiko communication.

The service owns provider-specific delivery details, starting with Resend email. Other workers should ask this service to send a templated message instead of calling Resend directly.

## Runtime

- `AUTH_DB` must bind to the identity D1 database so bearer tokens can be validated against `identity_api_keys`.
- `TOKEN_PEPPER` must match identity-api so scoped service API keys can be hashed and verified.
- Service callers send an identity API key with the `communication.send` scope as `Authorization: Bearer <key>`.
- `RESEND_API_KEY` is required in deployed environments to send email through Resend.
- `MAGIC_LINK_FROM_EMAIL` controls the sender address, defaulting to `Tiko <noreply@tikotalks.com>`.
- `ALLOWED_ORIGINS` is an optional comma-separated CORS allowlist.

## Endpoints

- `GET /v1/communication/health`
- `POST /v1/communication/email/magic-link`

`POST /v1/communication/email/magic-link` body:

```json
{
  "to": "caregiver@example.com",
  "magicLinkUrl": "https://api.tikotalks.com/v1/identity/magic?token=..."
}
```

## Local checks

```sh
npm test -- tests/communication-api.test.ts
npm run typecheck -w @tiko-worker/communication-api
```
