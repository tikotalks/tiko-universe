# @tiko/atlas

Typed client for Atlas, Tiko's unified gateway for data, knowledge, generation, and provider-backed intelligence.

## Usage

```ts
import { createAtlasClient } from '@tiko/atlas'

const atlas = createAtlasClient({
  baseUrl: 'https://api.tikotalks.com/v1/atlas',
  getSessionToken,
})

await atlas.speech.synthesize({
  text: 'Yes',
  locale: 'en',
  app: 'yes-no',
  purpose: 'child-button',
})

await atlas.images.generate({
  prompt: 'A soft illustrated bedtime story cover',
  app: 'admin',
  purpose: 'story-cover',
})

await atlas.text.generate({
  input: 'Summarize this draft for an admin.',
  app: 'admin',
  purpose: 'internal-summary',
})

await atlas.data.fetch({
  source: 'youtube',
  operation: 'video.metadata',
  app: 'radio',
  purpose: 'add-track',
  input: { url },
})
```

The generic `run` method remains available for internal worker orchestration:

```ts
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

## Admin observability

Admin helpers call service-token-only Atlas endpoints. Configure `getSessionToken` with a service token for these calls.

```ts
const usage = await atlas.admin.usage({ app: 'radio', limit: 50 })
const byProvider = await atlas.admin.usageByProvider()
const providers = await atlas.admin.providerStatus()
const request = await atlas.admin.request('req_abc123')
```
