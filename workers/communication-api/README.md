# communication-api

Cloudflare Worker for outbound Tiko communication.

The service owns provider-specific delivery details, starting with Resend email. Other workers should ask this service to send a templated message instead of calling Resend directly.

## Runtime

- `COMMUNICATION_API_KEY` is required and must be set as a Wrangler secret. Service callers send it as `Authorization: Bearer <key>`.
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
