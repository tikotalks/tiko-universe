# @tiko/atlas

Typed client for Atlas, Tiko's unified gateway for data, knowledge, generation, and provider-backed intelligence.

## Usage

```ts
import { createAtlasClient } from '@tiko/atlas'

const atlas = createAtlasClient({
  baseUrl: 'https://api.tikotalks.com/v1/atlas',
  getSessionToken,
})

await atlas.run({
  capability: 'data.fetch',
  app: 'radio',
  purpose: 'add-track',
  input: {
    source: 'youtube',
    operation: 'video.metadata',
    url,
  },
})
```

P0 exposes only the generic `run` client. Typed helpers for speech, images, text, and data should be added with their implementation slices.
