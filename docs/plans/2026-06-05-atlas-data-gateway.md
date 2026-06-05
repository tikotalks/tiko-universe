# Atlas Data Gateway Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build Atlas, Tiko's unified data/intelligence gateway for model routing, generated media, provider-backed metadata, and future knowledge/data requests.

**Architecture:** Atlas is a Cloudflare Worker with a typed `@tiko/atlas` client. P0 creates the contract, D1 schema, capability registry, health/capability routes, and a guarded generic `/run` scaffold. Later slices add speech, image, text, and data provider adapters.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, KV, R2, Workers AI, npm workspaces.

---

## Task 1: Commit Atlas docs and API contract

**Objective:** Establish Atlas as the source-of-truth design before implementation.

**Files:**
- Create: `docs/architecture/atlas.md`
- Create: `docs/api/atlas.openapi.yaml`
- Create: `docs/plans/2026-06-05-atlas-data-gateway.md`

**Steps:**
1. Review the architecture doc for the Atlas naming doctrine.
2. Review the OpenAPI contract for P0 and planned typed routes.
3. Verify no `external-api` naming leaked into file names or binding names.
4. Commit:

```bash
git add docs/architecture/atlas.md docs/api/atlas.openapi.yaml docs/plans/2026-06-05-atlas-data-gateway.md
git commit -m "docs: add atlas data gateway spec"
```

## Task 2: Scaffold `workers/atlas-api`

**Objective:** Add a minimal Cloudflare Worker with health, capabilities, and guarded `/run` routes.

**Files:**
- Create: `workers/atlas-api/package.json`
- Create: `workers/atlas-api/wrangler.toml`
- Create: `workers/atlas-api/src/index.ts`
- Create: `workers/atlas-api/src/types.ts`
- Create: `workers/atlas-api/src/response.ts`
- Create: `workers/atlas-api/src/capabilities/registry.ts`

**Validation:**

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
```

**Commit:**

```bash
git add workers/atlas-api
git commit -m "feat: scaffold atlas api worker"
```

## Task 3: Add Atlas D1 schema

**Objective:** Create the durable audit/cache/provider metadata schema.

**Files:**
- Create: `workers/atlas-api/migrations/0001_atlas_gateway.sql`

**Validation:**

```bash
npx -y -p node@22 -p wrangler wrangler d1 migrations apply tiko-atlas --local --cwd workers/atlas-api
```

**Commit:**

```bash
git add workers/atlas-api/migrations/0001_atlas_gateway.sql
git commit -m "feat: add atlas gateway schema"
```

## Task 4: Scaffold `packages/atlas`

**Objective:** Add the typed client package that apps/workers will consume.

**Files:**
- Create: `packages/atlas/package.json`
- Create: `packages/atlas/tsconfig.json`
- Create: `packages/atlas/src/index.ts`
- Create: `packages/atlas/src/client.ts`
- Create: `packages/atlas/src/types.ts`

**Validation:**

```bash
npm run typecheck --workspace @tiko/atlas
```

**Commit:**

```bash
git add packages/atlas
git commit -m "feat: add atlas client package"
```

## Task 5: Implement speech through Atlas

**Objective:** Move the first real provider-backed capability behind Atlas.

**Files:**
- Create: `workers/atlas-api/src/domains/speech.ts`
- Create: `workers/atlas-api/src/adapters/openai.ts`
- Create: `workers/atlas-api/src/adapters/elevenlabs.ts`
- Create: `workers/atlas-api/src/cache/r2-assets.ts`
- Modify: `packages/atlas/src/client.ts`
- Modify: one low-risk caller after the route is validated

**Validation:**

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
npm run typecheck --workspace @tiko/atlas
npm run build
```

**Commit:**

```bash
git add workers/atlas-api packages/atlas
git commit -m "feat: add atlas speech synthesis"
```

## Task 6: Add image generation through Atlas

**Objective:** Route GPT image generation and future image providers through Atlas.

**Files:**
- Create: `workers/atlas-api/src/domains/images.ts`
- Extend: `workers/atlas-api/src/adapters/openai.ts`
- Modify: `packages/atlas/src/client.ts`

**Validation:**

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
npm run test --workspace @tiko-worker/atlas-api --if-present
```

**Commit:**

```bash
git add workers/atlas-api packages/atlas
git commit -m "feat: add atlas image generation"
```

## Task 7: Add text/classification routing

**Objective:** Route simple model requests to Workers AI by default and high-quality requests to OpenAI by policy.

**Files:**
- Create: `workers/atlas-api/src/domains/text.ts`
- Create: `workers/atlas-api/src/adapters/cloudflare-ai.ts`
- Modify: `packages/atlas/src/client.ts`

**Validation:**

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
```

**Commit:**

```bash
git add workers/atlas-api packages/atlas
git commit -m "feat: add atlas text routing"
```

## Task 8: Add provider-backed data fetches

**Objective:** Prove Atlas as a data gateway with a first non-AI provider-backed source.

**Recommended first source:** Radio YouTube metadata.

**Files:**
- Create: `workers/atlas-api/src/domains/data.ts`
- Create: `workers/atlas-api/src/adapters/youtube.ts`
- Modify: `packages/atlas/src/client.ts`

**Validation:**

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
npm run typecheck --workspace @tiko/atlas
```

**Commit:**

```bash
git add workers/atlas-api packages/atlas
git commit -m "feat: add atlas data fetch"
```
