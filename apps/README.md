# Apps

Tiko apps are organized by product first, then platform.

Each product owns its web and native clients side by side so parity work stays local to the app:

```text
apps/
  yes-no/
    web/
    ios/
  type/
    web/
    ios/
  cards/
    web/
    ios/
```

Shared product UI and API clients live in `packages/*`. Cloudflare Workers live in `workers/*`.
