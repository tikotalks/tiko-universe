# Yes No

Yes No is the first proof app for the API-first Tiko rebuild.

## Platforms

- `web/` — Vue/Vite app using web TikoKit from `packages/ui`.
- `ios/` — SwiftUI app using native TikoKit from `packages/tikokit-ios`.

## Product contract

Both clients should preserve the same core behavior:

- Opens immediately without a login wall.
- Shows direct Yes/No child-facing choices without decorative content cards.
- Uses the Yes No primary app color from TikoKit.
- Speaks Yes/No answers and custom sentence prompts through the shared TTS API contract.
- Keeps settings/history secondary to immediate play.
