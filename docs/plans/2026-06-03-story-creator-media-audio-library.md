# Story Creator + Media Audio Library Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn the current admin Stories/Library pages into a proper creator workflow: story generation with chapters, selectable sampled voices, cover/media assignment, album-aware audio library management, and Radio consumption.

**Architecture:** Use D1 as source of truth, R2 for bytes, and keep public playback separate from admin mutation. `media-api` owns generic media/audio/album/catalog records and upload metadata. `generation-api` owns story draft/render jobs and voice samples. `admin-api` remains the narrow admin gate/config surface. `apps/admin/web` becomes the creator UI. `apps/radio/web` consumes only promoted public audio/story/album records.

**Tech Stack:** TypeScript, Vue 3 + Vite, Cloudflare Workers, D1, R2, OpenAI TTS/image where configured, Vitest/Cypress.

**Repo:** `tiko-universe`, latest `origin/development` at investigation time: `52d62f4`.

---

## Investigation Summary

Live/admin status checked on 2026-06-03:

- `https://admin.tikoapps.org/`: live, HTTP 200, title `Tiko Media Admin`, served asset `assets/index-TsooSwBS.js`.
- Live admin asset contains sidebar strings for `Stories` and `Library`, but did **not** expose the current source strings `Create new story`, `Render full story`, or the voice list in a simple asset grep. Treat production admin as possibly behind latest `development` or minified enough to require browser/login verification.
- `https://media.tikoapi.org/v1/media?limit=3`: live, HTTP 200, returns existing media records.
- `https://generation.tikoapi.org/v1/generation/stories?limit=3`: live, HTTP 200, returns `data: []` for promoted stories.
- `https://generation.tikoapi.org/v1/generation/health`: HTTP 404; no explicit health route.

Current source state on latest `development`:

- Admin has `Stories` page: `apps/admin/web/src/pages/StoryNarratorPage.vue`.
  - Tabs: `Library`, `Drafts`, `Create`.
  - Can enter title/description/language/voice/model/speed/tags/category.
  - Can create multiple segments with pause settings.
  - Can try out one segment and render a full story.
  - Can promote/delete story records.
- Admin voices are hardcoded OpenAI names: `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse`.
- `generation-api` has story routes:
  - `POST /v1/generation/stories/tryout`
  - `POST /v1/generation/stories/render`
  - `GET /v1/generation/stories?status=draft|promoted`
  - `GET /v1/generation/stories/:id/audio`
  - `POST /v1/generation/stories/:id/promote`
  - `DELETE /v1/generation/stories/:id`
- `generation-api` story schema stores title/description/voice/speed/segments/audio R2 key/public flag, but has no chapters table, no cover media, no per-chapter metadata, no voice-sample catalog, no render queue/job state beyond a synchronous render request.
- `media-api` lists existing media and accepts uploads, but upload currently returns metadata and does not obviously persist a new media row in D1 in `handleMediaUpload()`. That must be fixed before calling it a real library.
- Admin Media Library page can upload image/audio/video and optional thumbnail, but UI labels the thumbnail as `Video thumbnail`; it is not yet a general audio/story cover assignment flow.
- Radio web already fetches promoted stories from `generation-api` and merges them into category `stories` as `generated-story:<id>` tracks. Good start, but it has no album settings/cover data and only sees promoted story records, not a unified audio library.

Backend issues I would not ship past:

1. Story render endpoints are public in source; the worker ignores admin bearer auth. That is fine for public `GET` promoted stories, not for `POST render`, `POST promote`, or `DELETE`.
2. Story rendering is synchronous. Long stories with many chapters will hit Worker CPU/time limits and produce a bad admin UX.
3. MP3 concatenation is a byte concat with empty padding (`makeSilentMp3Padding()` returns empty bytes). That can fail or create malformed audio depending on provider output. Use a real render/composition strategy.
4. Stories are modeled separately from media. Radio needs a durable audio library model, not special-case story glue forever.
5. There is no cover relation, album settings, or ownership/status workflow.

---

## Target Product Shape

Admin should have four connected tools, not one overloaded page:

1. **Media Library**
   - Upload images/audio/video.
   - Edit title, description, tags, categories, visibility.
   - Attach/change cover images for audio/story items.
   - Search/filter by type, category, usage, visibility.

2. **Audio Library**
   - Manage audio items regardless of source: uploaded audio, generated TTS clips, rendered stories.
   - Create albums/collections with settings: title, description, cover, sort order, visibility, Radio availability, autoplay/shuffle defaults if needed.
   - Assign audio items to albums.

3. **Story Creator**
   - Create/edit story drafts.
   - Add chapters, each with title, narration text, optional notes, pause/transition, optional cover/illustration prompt.
   - Choose narrator voice from sampled voice cards, not a blind select.
   - Generate voice samples for each voice/model/speed with the current sample text.
   - Render per chapter, preview, then render/publish full story.
   - Assign cover media or generate/upload cover.
   - Promote to Audio Library/Radio album.

4. **Radio Integration**
   - Radio reads promoted public audio library/albums.
   - Generated stories remain additive; Radio keeps working if API is offline.
   - Cover/artwork and album grouping appear in Radio, not just bare tracks.

---

## API Contract First

### Media API: Catalog + Upload

Public read routes:

```http
GET /v1/media/media?type=image|audio|video&search=&category=&tags=&visibility=public&page=&limit=
GET /v1/media/media/:id
GET /v1/media/media/:id/download
```

Admin mutation routes, bearer admin required:

```http
POST /v1/media/media/upload
PATCH /v1/media/media/:id
DELETE /v1/media/media/:id
POST /v1/media/media/:id/cover
```

Media item shape:

```ts
interface MediaItem {
  id: string
  type: 'image' | 'audio' | 'video'
  title: string
  description: string | null
  fileName: string
  mimeType: string
  fileSizeBytes: number
  r2Key: string
  url: string
  thumbnailUrl: string | null
  coverMediaId: string | null
  durationSeconds: number | null
  width: number | null
  height: number | null
  source: 'upload' | 'generated-image' | 'tts-clip' | 'story-render'
  visibility: 'private' | 'public'
  categories: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

### Audio Library API

Public read routes for Radio:

```http
GET /v1/media/audio/albums?visibility=public
GET /v1/media/audio/albums/:id
GET /v1/media/audio/albums/:id/tracks
GET /v1/media/audio/tracks?albumId=&source=&search=&page=&limit=
```

Admin mutation routes, bearer admin required:

```http
POST /v1/media/audio/albums
PATCH /v1/media/audio/albums/:id
DELETE /v1/media/audio/albums/:id
POST /v1/media/audio/albums/:id/tracks
PATCH /v1/media/audio/albums/:id/tracks/:trackId
DELETE /v1/media/audio/albums/:id/tracks/:trackId
```

Album shape:

```ts
interface AudioAlbum {
  id: string
  title: string
  description: string | null
  coverMediaId: string | null
  coverUrl: string | null
  visibility: 'private' | 'public'
  radioEnabled: boolean
  sortMode: 'manual' | 'created_desc' | 'title_asc'
  settings: {
    defaultShuffle?: boolean
    defaultRepeat?: boolean
    childSafe?: boolean
    color?: string
  }
  createdAt: string
  updatedAt: string
}
```

Track shape:

```ts
interface AudioTrack {
  id: string
  mediaId: string
  albumId: string | null
  title: string
  artist: string | null
  audioUrl: string
  coverUrl: string | null
  source: 'upload' | 'story' | 'tts-clip'
  durationSeconds: number | null
  orderIndex: number
  visibility: 'private' | 'public'
  createdAt: string
}
```

### Generation API: Voices + Stories

Public routes:

```http
GET /v1/generation/voices
GET /v1/generation/stories?status=promoted&page=&limit=
GET /v1/generation/stories/:id/audio
```

Admin routes, bearer admin required:

```http
POST /v1/generation/voices/samples
POST /v1/generation/stories
GET /v1/generation/stories/:id
PATCH /v1/generation/stories/:id
POST /v1/generation/stories/:id/chapters
PATCH /v1/generation/stories/:id/chapters/:chapterId
DELETE /v1/generation/stories/:id/chapters/:chapterId
POST /v1/generation/stories/:id/render-jobs
GET /v1/generation/story-render-jobs/:jobId
POST /v1/generation/stories/:id/promote
DELETE /v1/generation/stories/:id
```

Voice sample shape:

```ts
interface VoiceOption {
  id: string
  provider: 'openai'
  model: string
  voice: string
  label: string
  description: string | null
  sampleText: string
  sampleAudioUrl: string | null
  speedRange: { min: number; max: number; default: number }
}
```

Story shape:

```ts
interface StoryDraft {
  id: string
  title: string
  description: string | null
  language: string
  narrator: { provider: 'openai'; model: string; voice: string; speed: number }
  coverMediaId: string | null
  targetAlbumId: string | null
  status: 'draft' | 'rendering' | 'rendered' | 'published' | 'error'
  chapters: StoryChapter[]
  renderedAudioMediaId: string | null
  createdAt: string
  updatedAt: string
}

interface StoryChapter {
  id: string
  storyId: string
  orderIndex: number
  title: string
  text: string
  pauseAfterMs: number
  renderStatus: 'draft' | 'rendering' | 'rendered' | 'error'
  audioMediaId: string | null
  durationSeconds: number | null
}
```

---

## Database Direction

### `workers/media-api/migrations/000x_audio_library.sql`

Create or evolve toward these tables. Prefer additive migrations from the live `media` table; do not drop existing records.

```sql
CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  cover_media_id TEXT,
  duration_seconds REAL,
  width INTEGER,
  height INTEGER,
  source TEXT NOT NULL DEFAULT 'upload',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  categories TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  radio_enabled INTEGER NOT NULL DEFAULT 0 CHECK (radio_enabled IN (0, 1)),
  sort_mode TEXT NOT NULL DEFAULT 'manual',
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_album_tracks (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  title_override TEXT,
  artist_override TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(album_id, media_id)
);

CREATE INDEX IF NOT EXISTS media_items_type_idx ON media_items(type, created_at DESC);
CREATE INDEX IF NOT EXISTS media_items_visibility_idx ON media_items(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS audio_albums_radio_idx ON audio_albums(radio_enabled, visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS audio_album_tracks_album_idx ON audio_album_tracks(album_id, order_index);
```

### `workers/generation-api/migrations/000x_story_creator.sql`

```sql
CREATE TABLE IF NOT EXISTS story_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'tts-1',
  voice TEXT NOT NULL DEFAULT 'nova',
  speed REAL NOT NULL DEFAULT 1.0,
  cover_media_id TEXT,
  target_album_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  rendered_audio_media_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  pause_after_ms INTEGER NOT NULL DEFAULT 350,
  audio_media_id TEXT,
  duration_seconds REAL,
  render_status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_render_jobs (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  result_audio_media_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_samples (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  voice TEXT NOT NULL,
  label TEXT NOT NULL,
  sample_text TEXT NOT NULL,
  audio_url TEXT,
  r2_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, model, voice, sample_text)
);
```

---

## Implementation Phases

## Phase 0: Safety, Auth, and Live Drift

### Task 0.1: Verify live admin vs latest source

**Objective:** Prove whether `admin.tikoapps.org` is serving current `development` or stale production.

**Files:** none.

**Steps:**
1. Build admin locally on latest `development`.
2. Compare source route strings and built asset strings against live asset.
3. Check Pages deployment records for `tiko-admin` production branch vs dev branch.
4. Report drift separately from implementation readiness.

**Validation:**
```bash
cd /home/hermes/workspace/tiko-universe
CI=1 NODE_ENV=production node /home/hermes/workspace/tiko-universe/node_modules/vite/bin/vite.js build --mode production
curl -sL https://admin.tikoapps.org/ | grep -o 'assets/index-[^" ]*\.js'
```

### Task 0.2: Protect generation mutation endpoints

**Objective:** Require admin auth for story/image generation mutations while keeping public reads for Radio.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Test: `workers/generation-api/src/index.spec.ts` or equivalent worker-local test file.

**Steps:**
1. Add failing tests: unauthenticated `POST /stories/render`, `POST /stories/:id/promote`, `DELETE /stories/:id` return 401/403.
2. Add admin auth helper compatible with current identity/admin bearer session validation.
3. Apply auth only to mutation routes.
4. Keep `GET /stories`, `GET /stories/:id/audio`, `GET /voices` public.

**Validation:**
```bash
npm --workspace @tiko-worker/generation-api run test -- --run
npm --workspace @tiko-worker/generation-api run typecheck
```

### Task 0.3: Add generation health route

**Objective:** Make deployment smoke checks boring.

**Files:**
- Modify: `workers/generation-api/src/index.ts`

**Route:**
```http
GET /v1/generation/health -> { data: { ok: true, service: 'generation-api' } }
```

**Validation:**
```bash
curl -sS https://generation.tikoapi.org/v1/generation/health
```

## Phase 1: Real Media Library Persistence

### Task 1.1: Normalize media item contract

**Objective:** Define shared TypeScript contracts for media items/albums/tracks.

**Files:**
- Create or modify: `packages/media/src/types.ts`
- Modify exports: `packages/media/src/index.ts`
- Test: `packages/media/src/types.spec.ts` if package has tests.

**Validation:**
```bash
npm --workspace @tiko/media run typecheck
```

### Task 1.2: Persist uploads into D1

**Objective:** `POST /v1/media/media/upload` must create a durable media row, not only return upload metadata.

**Files:**
- Modify: `workers/media-api/src/index.ts`
- Add migration: `workers/media-api/migrations/000x_media_items_audio_library.sql`
- Test: `workers/media-api/src/index.spec.ts`

**Steps:**
1. Add failing test: upload audio file -> response has `data.id`; subsequent list returns the item.
2. Store R2 key, mime, file size, title fallback, categories/tags, source `upload`, visibility `private` by default.
3. Let upload accept form fields: `title`, `description`, `tags`, `categories`, `visibility`, `durationSeconds`, `coverMediaId`.
4. Return normalized camelCase and legacy-compatible snake_case fields while the admin frontend catches up.

**Validation:**
```bash
npm --workspace @tiko-worker/media-api run test -- --run
npm --workspace @tiko-worker/media-api run typecheck
```

### Task 1.3: Generalize cover uploads

**Objective:** Cover assignment works for audio/story/video, not just video thumbnail.

**Files:**
- Modify: `workers/media-api/src/index.ts`
- Modify: `apps/admin/web/src/composables/useAdminMediaLibrary.ts`
- Modify: `apps/admin/web/src/pages/MediaLibraryPage.vue`

**Steps:**
1. Rename UI copy from `Video thumbnail` to `Cover image`.
2. Accept cover image for audio/video/story-linked media.
3. Store cover image as a normal `media_items` image record or R2 key and set `cover_media_id`/`thumbnail_url`.
4. Show audio rows with cover thumbnail when present.

**Validation:**
```bash
npm --workspace @tiko-web/admin run typecheck
CI=1 NODE_ENV=production node /home/hermes/workspace/tiko-universe/node_modules/vite/bin/vite.js build
```

## Phase 2: Audio Albums

### Task 2.1: Add album/track D1 schema and API routes

**Objective:** Create the backend source of truth for albums and album tracks.

**Files:**
- Add migration: `workers/media-api/migrations/000x_audio_albums.sql`
- Modify: `workers/media-api/src/index.ts`
- Test: `workers/media-api/src/audio-albums.spec.ts`

**Tests:**
- Create album requires admin auth.
- Public list only returns `visibility=public` and `radio_enabled=1` when requested by Radio.
- Add track rejects non-audio media.
- Manual ordering is stable.

**Validation:**
```bash
npm --workspace @tiko-worker/media-api run test -- --run
npm --workspace @tiko-worker/media-api run typecheck
```

### Task 2.2: Admin album manager UI

**Objective:** Add an Audio Library page to admin for albums and tracks.

**Files:**
- Create: `apps/admin/web/src/pages/AudioLibraryPage.vue`
- Create: `apps/admin/web/src/composables/useAudioLibrary.ts`
- Modify: `apps/admin/web/src/main.ts`
- Modify: `apps/admin/web/src/App.vue`

**UI:**
- Albums list with title, visibility, Radio enabled, cover.
- Create/edit album form.
- Track picker from audio media items.
- Reorder/remove tracks.
- Toggle `Radio enabled`.

**Validation:**
```bash
npm --workspace @tiko-web/admin run typecheck
npm --workspace @tiko-web/admin run test -- --run
```

## Phase 3: Story Creator Data Model

### Task 3.1: Split story draft/chapter storage

**Objective:** Move from JSON segment blob to editable story drafts + chapters.

**Files:**
- Add migration: `workers/generation-api/migrations/000x_story_creator.sql`
- Modify: `workers/generation-api/src/index.ts`
- Test: `workers/generation-api/src/story-creator.spec.ts`

**Steps:**
1. Add create/read/update story draft routes.
2. Add chapter CRUD with order indexes.
3. Keep old `/stories/render` compatibility for one release by mapping old segments to chapters internally.
4. Return normalized `StoryDraft` shape.

**Validation:**
```bash
npm --workspace @tiko-worker/generation-api run test -- --run
npm --workspace @tiko-worker/generation-api run typecheck
```

### Task 3.2: Add voice options and samples

**Objective:** Admin chooses voices from audible sample cards.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Modify: `apps/admin/web/src/composables/useStoryNarration.ts`
- Modify: `apps/admin/web/src/pages/StoryNarratorPage.vue` or replacement components.

**Steps:**
1. `GET /v1/generation/voices` returns provider/model/voice labels and any cached sample URLs.
2. `POST /v1/generation/voices/samples` renders/caches sample text for one voice.
3. Admin UI shows voice cards with play buttons and selected state.
4. Cache samples by provider/model/voice/sampleText hash; never regenerate every page load.

**Validation:**
```bash
npm --workspace @tiko-worker/generation-api run test -- --run
npm --workspace @tiko-web/admin run test -- --run
```

### Task 3.3: Replace segment UI with chapter editor

**Objective:** Story creator feels like a real authoring tool.

**Files:**
- Create: `apps/admin/web/src/components/story/StoryChapterList.vue`
- Create: `apps/admin/web/src/components/story/StoryChapterEditor.vue`
- Create: `apps/admin/web/src/components/story/VoiceSamplePicker.vue`
- Modify: `apps/admin/web/src/pages/StoryNarratorPage.vue`

**UI:**
- Left: chapter list with title/order/render status.
- Main: title, text, pause, try chapter, duplicate/remove.
- Right: story settings: narrator, speed, cover, target album, tags, visibility.
- Autosave draft after debounce; explicit Save button as fallback.

**Validation:**
```bash
npm --workspace @tiko-web/admin run test -- --run
npm --workspace @tiko-web/admin run typecheck
```

## Phase 4: Rendering Jobs and Audio Media Promotion

### Task 4.1: Render by job, not synchronous request

**Objective:** Rendering long multi-chapter stories is reliable and inspectable.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Add queue config if available: `workers/generation-api/wrangler.toml`
- Test: `workers/generation-api/src/story-render-jobs.spec.ts`

**Steps:**
1. `POST /stories/:id/render-jobs` creates queued job.
2. Worker processes chapters one by one.
3. Store chapter audio media IDs or R2 keys.
4. Compose final audio using a real strategy. If Worker-side audio composition is not safe, store chapter tracks and introduce a later composition worker instead of pretending byte concat is correct.
5. Job status supports `queued`, `rendering`, `complete`, `error` with progress.

**Validation:**
```bash
npm --workspace @tiko-worker/generation-api run test -- --run
npx wrangler deploy --dry-run --config workers/generation-api/wrangler.toml
```

### Task 4.2: Register rendered stories in media/audio library

**Objective:** A rendered story becomes a normal audio library item with cover and album assignment.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Modify or bind to: `workers/media-api` contract/client package.
- Test: integration-style worker tests with fake media client.

**Steps:**
1. On completed render, create audio `media_item` with source `story-render`.
2. Set `cover_media_id` from story draft.
3. If `targetAlbumId` exists, add track to album.
4. `promote` marks story/audio/album track public according to explicit admin choice.

**Validation:**
```bash
npm --workspace @tiko-worker/generation-api run test -- --run
npm --workspace @tiko-worker/media-api run test -- --run
```

## Phase 5: Radio Consumption

### Task 5.1: Add audio album client in Radio

**Objective:** Radio uses the audio library/albums contract, while keeping existing generated-story fallback until migration is complete.

**Files:**
- Create: `apps/radio/web/src/composables/useRadioAudioLibrary.ts`
- Modify: `apps/radio/web/src/App.vue`
- Test: `apps/radio/web/src/App.spec.ts`

**Steps:**
1. Fetch `GET /v1/media/audio/albums?visibility=public&radioEnabled=true`.
2. Fetch tracks for each album or a combined public tracks endpoint.
3. Map albums to Radio categories/collections with cover/color/settings.
4. Map tracks to `RadioTrack` with `source: 'r2'`, `audioUrl`, `thumbnailUrl`, `categoryId`.
5. Keep current `syncGeneratedStories()` fallback if album API is offline or empty.

**Validation:**
```bash
npm --workspace @tiko-web/radio run test -- --run
npm --workspace @tiko-web/radio run typecheck
```

### Task 5.2: Cover/artwork support in Radio tiles

**Objective:** Radio shows album/story covers, not only generic category cards.

**Files:**
- Modify: `apps/radio/web/src/App.vue`
- Modify components if split exists.
- Test: `apps/radio/web/src/App.spec.ts`

**Validation:**
- Unit test: album cover URL renders on category tile.
- Unit test: track cover URL renders on track tile/player.

## Phase 6: Admin E2E and Deployment

### Task 6.1: Admin creator Cypress flow

**Objective:** Prevent regressions in the real browser flow.

**Files:**
- Add/modify: `apps/admin/web/cypress/e2e/story-creator.cy.ts`

**Test with mocked APIs:**
1. Login/mocked admin auth loads config.
2. Open Stories.
3. Pick voice from sample card.
4. Create chapters.
5. Assign cover and target album.
6. Start render job and poll complete.
7. Promote to Radio.

**Validation:**
```bash
npm --workspace @tiko-web/admin run test:e2e -- --spec cypress/e2e/story-creator.cy.ts
```

### Task 6.2: CI deploy and live smoke

**Objective:** Ship via CI to dev first, smoke exact dev domains, then prepare production promotion PR only after approval.

**Steps:**
1. Commit focused slices to feature branches/PRs into `development`.
2. Let Deploy workflow publish dev Pages/Workers.
3. Smoke:
   - `https://dev.admin.tikoapps.org/`
   - `https://dev.media.tikoapi.org/v1/media/...`
   - `https://dev.generation.tikoapi.org/v1/generation/health`
   - `https://dev.radio.tikoapps.org/`
4. Only promote `development` -> `main` with Sil approval.

---

## Suggested Builder Slices

Do not hand this off as one giant task. Use these independent cards:

1. `generation-api: protect mutation routes + health route`
2. `media-api: persist uploads as normalized media items`
3. `media-api: audio albums + track assignment API`
4. `admin: media library cover upload/edit UI`
5. `generation-api: voice catalog/sample cache endpoints`
6. `generation-api: story draft/chapter CRUD`
7. `admin: story creator chapter editor + voice sample picker`
8. `generation-api: render jobs + final audio registration`
9. `admin: audio album manager + story publish workflow`
10. `radio: consume public audio albums with cover artwork`
11. `admin/radio: Cypress and smoke coverage`

---

## Acceptance Criteria

- Admin can upload an audio file with a cover and later find/edit it in the library.
- Admin can create an album, set cover/settings, assign uploaded or generated audio, and mark it Radio-enabled.
- Admin can create a story draft with chapters.
- Admin can choose narrator voice by listening to samples.
- Admin can render a chapter preview and a full story through a tracked render job.
- Admin can assign a story cover and target album.
- Promoted story/audio appears in Radio without manual localStorage edits.
- Public Radio reads only public/Radio-enabled albums/tracks.
- Generation mutation routes are not publicly callable.
- Existing public media gallery and Radio local fallback keep working if generation/media APIs are offline.

## Validation Matrix

Per slice:

```bash
npm --workspace @tiko-worker/media-api run test -- --run
npm --workspace @tiko-worker/media-api run typecheck
npm --workspace @tiko-worker/generation-api run test -- --run
npm --workspace @tiko-worker/generation-api run typecheck
npm --workspace @tiko-web/admin run test -- --run
npm --workspace @tiko-web/admin run typecheck
npm --workspace @tiko-web/radio run test -- --run
npm --workspace @tiko-web/radio run typecheck
```

Before handoff/PR:

```bash
npm run typecheck
npm run test -- --run
npm run build
```

Report unrelated repo-wide blockers separately from targeted slice results.
