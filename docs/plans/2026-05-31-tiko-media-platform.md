# Tiko Media Platform — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a unified media platform for Tiko — a public-facing media browser for discovering/searching/downloading all Tiko assets, plus an admin dashboard for generating images and narrating stories with TTS, with generated content flowing into Tiko Radio.

**Architecture:** Two Vue 3 apps + backend workers. A public **media gallery** app (`apps/media/web`) for browsing, searching, and downloading assets. A protected **admin dashboard** app (`apps/admin/web`) for image generation, story narration with TTS, and asset management. Both consume the existing `generation-api`, `media-api`, and Atlas speech path. Admin is gated to `me@sil.mt` only via the `admin-api` worker.

**Tech Stack:** Vue 3 + Vite + TypeScript, `@tiko/ui` (wraps `@sil/ui`), Cloudflare Workers (D1 + R2), OpenAI (DALL-E 3 for images, TTS-1 for audio), Vitest for testing.

**Repo:** `tiko-universe` (`/home/hermes/workspace/tiko-universe`), branch from `development`.

---

## What Already Exists

### Workers (in tiko-universe)
- **`workers/tts-api/`** — Atlas-only speech adapter for `POST /generate`. It does not serve `/audio`, call providers directly, or own D1/R2 speech storage.
- **`workers/generation-api/`** — New versioned generation worker. `POST /v1/generation/tts`, `GET /v1/generation/audio/{id}`. D1 `GENERATION_DB`, R2 `GENERATED_MEDIA_BUCKET`. Placeholder D1 ID (not deployed yet).
- **`workers/media-api/`** — Unified media worker. D1 (`MEDIA_DB`, `ASSETS_DB`), R2 (`MEDIA_BUCKET`, `ASSETS_BUCKET`, `USER_MEDIA_BUCKET`). Routes scaffolded but scripts are `echo scaffold-only`.
- **`workers/admin-api/`** — Scaffold only, empty `src/index.ts`.
- **`workers/content-api/`** — Scaffold only, empty `src/index.ts`.
- **`workers/shared/auth.ts`** — Bearer session token + scoped API key auth backed by the identity database/service.

### Packages
- **`@tiko/media`** — Contracts: generated media, audio assets, and generation request helpers.
- **`@tiko/ui`** — TikoAppShell, TikoHeader, TikoTtsClient, tikoAppColors (including `radio` color). Wraps `@sil/ui`.

### Apps
- **`apps/radio/web/`** — Working radio app with `useTrackLibrary`, `useAudioPlayer`, `useCategories`, YouTube integration, R2 audio. Already uses TikoAppShell.

### Reference from tiko-mono
- **`image-generation` worker** — DALL-E 3, queued generation with status tracking (`queued` → `generating` → `generated`/`failed`), R2 storage, CDN URLs via `tikocdn.org`. Schema with `media` + `user_media` tables. SSE progress endpoint.

---

## Phase 1: Media Gallery (Public Frontend)

Browse, search, filter, and download all Tiko media assets — images, audio, generated content.

### Task 1.1: Scaffold `apps/media/web`

**Objective:** Create the media gallery Vue app with Vite, `@tiko/ui` shell, and basic routing.

**Files:**
- Create: `apps/media/web/package.json`
- Create: `apps/media/web/vite.config.ts`
- Create: `apps/media/web/tsconfig.json`
- Create: `apps/media/web/index.html`
- Create: `apps/media/web/src/main.ts`
- Create: `apps/media/web/src/App.vue`
- Create: `apps/media/web/src/styles/_tokens.scss`
- Create: `apps/media/web/src/router.ts`

**Notes:**
- Use `@tiko/ui` TikoAppShell with `appColor="tiko"` (or a new `"media"` color token).
- Routes: `/` (gallery grid), `/asset/:id` (detail view).
- Follow existing app scaffold pattern from `apps/radio/web/`.
- Vite plugins: `vue()`, `ui()` from `@sil/ui/vite`.
- Add `"media"` to `TikoAppColor` union in `packages/ui/src/index.ts` with a distinctive color (e.g., teal `#2dd4bf`).

### Task 1.2: Media API client composable

**Objective:** Create a composable that fetches media from `media-api` with search, pagination, and filtering.

**Files:**
- Create: `apps/media/web/src/composables/useMediaLibrary.ts`
- Create: `apps/media/web/src/types/media.ts`

**API shape (from media-api):**
```
GET /v1/media?type=image|audio&category=...&tags=...&search=...&page=1&limit=24
Response: { data: MediaItem[], meta: { total, page, limit } }
```

**Types:**
```typescript
interface MediaItem {
  id: string
  title: string
  description?: string
  fileName: string
  fileType: 'image' | 'audio' | 'video'
  mimeType: string
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  duration?: number
  fileSizeBytes: number
  category: string
  tags: string[]
  createdAt: string
}
```

### Task 1.3: Gallery grid page

**Objective:** Build the main gallery view — responsive grid of media cards with type icons, lazy loading, and infinite scroll.

**Files:**
- Create: `apps/media/web/src/pages/GalleryPage.vue`
- Create: `apps/media/web/src/components/MediaCard.vue`
- Create: `apps/media/web/src/components/MediaGrid.vue`
- Create: `apps/media/web/src/components/TypeFilter.vue`
- Create: `apps/media/web/src/components/SearchBar.vue`
- Create: `apps/media/web/src/components/CategoryFilter.vue`

**UI:**
- Search bar at top.
- Filter pills: All | Images | Audio | Stories.
- Category sidebar/dropdown (generated, uploaded, stories, etc.).
- Responsive card grid (2 cols mobile, 3 tablet, 4+ desktop).
- Each card: thumbnail/icon, title, type badge, download button.
- Click card → detail view.

### Task 1.4: Asset detail view

**Objective:** Full detail page for a single asset with preview, metadata, and download options.

**Files:**
- Create: `apps/media/web/src/pages/AssetDetailPage.vue`
- Create: `apps/media/web/src/components/AudioPreview.vue`
- Create: `apps/media/web/src/components/ImagePreview.vue`

**Features:**
- Full preview (image lightbox or audio player).
- Metadata display: title, description, tags, dimensions, duration, file size, created date.
- Download button — multiple formats if applicable (PNG, JPG, WebP for images; MP3, WAV for audio).
- "Use in Radio" link (deep link to radio app if applicable).
- Back to gallery.

### Task 1.5: Media API list/query endpoints

**Objective:** Flesh out `workers/media-api` to serve the gallery with search, pagination, and filtering.

**Files:**
- Modify: `workers/media-api/src/index.ts`
- Create: `workers/media-api/migrations/0001_media_catalog.sql`

**Endpoints:**
```
GET /v1/media?type=image|audio&category=...&tags=a,b&search=...&page=1&limit=24&sort=created_at|file_size&order=desc
  → { data: MediaItem[], meta: { total, page, limit, totalPages } }

GET /v1/media/:id
  → { data: MediaItem }

GET /v1/media/:id/download?format=png|jpg|webp|mp3|wav
  → Redirect to R2 signed URL or stream bytes
```

**D1 schema (`media_catalog` table):**
```sql
CREATE TABLE media_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'audio', 'video')),
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds REAL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'upload', -- 'upload' | 'generated' | 'tts-story'
  generation_prompt TEXT,
  generation_metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_media_catalog_type ON media_catalog(file_type);
CREATE INDEX idx_media_catalog_category ON media_catalog(category);
CREATE INDEX idx_media_catalog_source ON media_catalog(source);
CREATE INDEX idx_media_catalog_created ON media_catalog(created_at DESC);
```

---

## Phase 2: Admin Dashboard

Protected admin for generating images, narrating stories with TTS, and managing media. Only accessible to `me@sil.mt`.

### Task 2.1: Admin auth gate

**Objective:** Implement admin auth in `workers/admin-api` — hardcode allowlist to `me@sil.mt`.

**Files:**
- Modify: `workers/admin-api/src/index.ts`
- Modify: `workers/admin-api/package.json`
- Create: `workers/admin-api/wrangler.toml`

**Logic:**
```typescript
// Admin auth: verify Bearer session token against identity-api
// Then check the session's user email === 'me@sil.mt'
// If not, return 403 Forbidden
// Uses workers/shared/auth.ts for session validation
// Then calls identity-api GET /v1/identity/session to get user email
```

**Wrangler bindings:**
- `AUTH_DB` → same `tiko-identity` D1
- `IDENTITY_BASE_URL` env var

**Endpoints:**
```
GET /v1/admin/session  → { data: { email, role } }  (verify admin access)
```

### Task 2.2: Scaffold `apps/admin/web`

**Objective:** Create the admin Vue app with auth gate, sidebar navigation, and dashboard layout.

**Files:**
- Create: `apps/admin/web/package.json`
- Create: `apps/admin/web/vite.config.ts`
- Create: `apps/admin/web/tsconfig.json`
- Create: `apps/admin/web/index.html`
- Create: `apps/admin/web/src/main.ts`
- Create: `apps/admin/web/src/App.vue`
- Create: `apps/admin/web/src/styles/_tokens.scss`
- Create: `apps/admin/web/src/router.ts`
- Create: `apps/admin/web/src/composables/useAdminAuth.ts`
- Create: `apps/admin/web/src/pages/LoginPage.vue`

**Routes:**
- `/login` — identity session bootstrap (device + email magic link, check `me@sil.mt`)
- `/` — dashboard overview
- `/images` — image generator
- `/stories` — story narrator (TTS)
- `/library` — all media management
- `/settings` — settings

**Auth flow:**
1. App loads → check for existing session in localStorage.
2. No session → redirect to `/login`.
3. Bootstrap device session via identity-api.
4. Attach email `me@sil.mt` via magic link.
5. Store session bundle.
6. Every admin API call includes `Authorization: Bearer <token>`.
7. Admin API verifies session + email allowlist.

### Task 2.3: Image Generator page

**Objective:** Build the image generation UI — prompt input, style/size controls, generate button, results grid.

**Files:**
- Create: `apps/admin/web/src/pages/ImageGeneratorPage.vue`
- Create: `apps/admin/web/src/components/PromptInput.vue`
- Create: `apps/admin/web/src/components/ImageStylePicker.vue`
- Create: `apps/admin/web/src/components/ImageSizePicker.vue`
- Create: `apps/admin/web/src/components/GeneratedImagesGrid.vue`
- Create: `apps/admin/web/src/components/ImageResultCard.vue`

**Generation flow:**
1. User types prompt, selects style (`vivid` | `natural`), size (`1024x1024`, `1024x1792`, `1792x1024`).
2. Click Generate → `POST /v1/admin/generation/image` on admin-api.
3. Admin-api proxies to generation-api (or calls OpenAI directly), stores in R2, records in D1.
4. Return generated image record.
5. Show in results grid with download, add-to-library, regenerate options.

**Backend endpoints (admin-api):**
```
POST /v1/admin/generation/image
  Body: { prompt, style?, size?, category?, tags?[] }
  → { data: { id, url, thumbnailUrl, prompt, revisedPrompt, status } }

GET /v1/admin/generation/images?page=1&limit=24&status=...
  → { data: GeneratedImageRecord[], meta: { ... } }
```

### Task 2.4: Story Narrator page

**Objective:** Build the TTS story narration studio — voice selection, text segments, preview play, and full render.

**Files:**
- Create: `apps/admin/web/src/pages/StoryNarratorPage.vue`
- Create: `apps/admin/web/src/components/VoiceSelector.vue`
- Create: `apps/admin/web/src/components/StoryEditor.vue`
- Create: `apps/admin/web/src/components/StorySegment.vue`
- Create: `apps/admin/web/src/components/AudioPreviewPlayer.vue`
- Create: `apps/admin/web/src/components/StoryTimeline.vue`
- Create: `apps/admin/web/src/composables/useStoryNarrator.ts`
- Create: `apps/admin/web/src/composables/useTtsPreview.ts`

**Story Narrator concept:**
A story is a sequence of text segments, each rendered with a chosen voice and settings.

**UI flow:**
1. **Voice selection panel** — dropdown/list of available TTS voices. Each voice has a name, a language, and a brief description. Click a voice to select it as default for new segments.
   - Voices from OpenAI: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse.
   - Show a small waveform icon per voice. Allow "tryout" — type a sentence, click play to hear it with that voice.

2. **Story editor** — add/edit/remove text segments. Each segment has:
   - Text content (textarea).
   - Voice override (optional, defaults to story voice).
   - Speed slider (0.5x – 2.0x).
   - Preview button (generates short preview audio).
   - Play/pause controls.

3. **Tryout panel** — quick experimentation area:
   - Type any text.
   - Pick a voice.
   - Adjust speed.
   - Click "Try It" → `POST /v1/generation/tts` → play audio inline.
   - No saving, just quick hearing.

4. **Full render** — renders all segments sequentially:
   - Concatenates audio segments into one file.
   - Stores in R2 as a single audio asset.
   - Adds to media library with `source: 'tts-story'`.
   - Available immediately in Tiko Radio.

**Backend endpoints (admin-api, proxying to generation-api):**
```
POST /v1/admin/tts/preview
  Body: { text, voice, speed?, language? }
  → { data: { audioUrl, duration, cached } }

POST /v1/admin/stories
  Body: { title, segments: [{ text, voice, speed, language }], voice?: string, language?: string }
  → { data: { id, audioUrl, duration, segmentCount, totalSize } }

GET /v1/admin/stories
  → { data: StoryRecord[], meta: { ... } }

GET /v1/admin/stories/:id
  → { data: StoryRecord }
```

### Task 2.5: Media Library management page

**Objective:** Full CRUD management of all media in the library — edit metadata, delete, change categories/tags.

**Files:**
- Create: `apps/admin/web/src/pages/LibraryPage.vue`
- Create: `apps/admin/web/src/components/LibraryTable.vue`
- Create: `apps/admin/web/src/components/EditMediaModal.vue`
- Create: `apps/admin/web/src/components/BulkActions.vue`

**Backend endpoints (admin-api):**
```
GET /v1/admin/media?type=...&category=...&search=...&page=1&limit=50
  → { data: MediaItem[], meta: { ... } }

PUT /v1/admin/media/:id
  Body: { title?, description?, category?, tags?[], isPublic? }
  → { data: MediaItem }

DELETE /v1/admin/media/:id
  → { success: true }

POST /v1/admin/media/upload
  Multipart: file + metadata
  → { data: MediaItem }
```

---

## Phase 3: Generation API Expansion (Image Generation)

### Task 3.1: Add image generation to generation-api

**Objective:** Extend `workers/generation-api` with image generation alongside TTS. DALL-E 3 via OpenAI.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Create: `workers/generation-api/migrations/0002_generation_images.sql`

**New endpoint:**
```
POST /v1/generation/image
  Body: { prompt, style?: 'vivid'|'natural', size?: '1024x1024'|'1024x1792'|'1792x1024', category?, tags?[] }
  → { data: { id, imageUrl, thumbnailUrl, revisedPrompt, status: 'generating'|'generated' } }

GET /v1/generation/image/:id
  → { data: GeneratedImageRecord }

GET /v1/generation/images?page=1&limit=24&status=...
  → { data: GeneratedImageRecord[], meta: { ... } }
```

**D1 schema addition:**
```sql
CREATE TABLE generated_images (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  style TEXT NOT NULL DEFAULT 'vivid',
  size TEXT NOT NULL DEFAULT '1024x1024',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  category TEXT NOT NULL DEFAULT 'generated',
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'generated',
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_generated_images_status ON generated_images(status);
CREATE INDEX idx_generated_images_category ON generated_images(category);
CREATE INDEX idx_generated_images_created ON generated_images(created_at DESC);
```

**Implementation notes:**
- Use OpenAI DALL-E 3 API (`openai.images.generate`).
- Store generated image bytes in R2 `GENERATED_MEDIA_BUCKET`.
- CDN URL via `tikocdn.org` or worker-served route.
- Async: queue → generate → update status (like tiko-mono pattern).
- For v1, synchronous generation is fine (DALL-E returns within ~10s).

### Task 3.2: Story/TTS rendering pipeline in generation-api

**Objective:** Add a multi-segment story rendering endpoint that concatenates TTS segments into one audio file.

**Files:**
- Modify: `workers/generation-api/src/index.ts`
- Create: `workers/generation-api/migrations/0003_generation_stories.sql`

**New endpoints:**
```
POST /v1/generation/story
  Body: { title, segments: [{ text, voice, speed?, language? }], defaultVoice?, defaultLanguage? }
  → { data: { id, audioUrl, durationSeconds, segmentCount, totalSizeBytes, status } }

GET /v1/generation/stories
  → { data: StoryRecord[], meta: { ... } }

GET /v1/generation/story/:id
  → { data: StoryRecord }
```

**D1 schema:**
```sql
CREATE TABLE generated_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  segment_count INTEGER NOT NULL,
  total_duration_seconds REAL,
  audio_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  total_size_bytes INTEGER,
  default_voice TEXT NOT NULL,
  default_language TEXT NOT NULL,
  segments TEXT NOT NULL DEFAULT '[]', -- JSON array of { text, voice, speed, language, audioUrl, duration }
  status TEXT NOT NULL DEFAULT 'generated',
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_generated_stories_created ON generated_stories(created_at DESC);
```

**Implementation:**
- For each segment, call OpenAI TTS (or use cached audio from `generated_audio`).
- Concatenate audio segments — for v1, concatenate MP3 files directly (simple byte concat works for CBR MP3, or use a lightweight approach).
- Store combined audio in R2.
- Record in D1 with full segment breakdown.

---

## Phase 4: Integration & Polish

### Task 4.1: Wire media gallery to real API

**Objective:** Connect the gallery app to the live media-api endpoints with real data flowing from generated content.

**Files:**
- Modify: `apps/media/web/src/composables/useMediaLibrary.ts` (point to real API)
- Verify end-to-end: generate image in admin → appears in gallery → downloadable.

### Task 4.2: Wire admin to generation-api

**Objective:** Connect admin image generator and story narrator to real generation-api endpoints.

**Files:**
- Modify: `apps/admin/web/src/composables/useTtsPreview.ts`
- Modify: `apps/admin/web/src/composables/useStoryNarrator.ts`

### Task 4.3: Tiko Radio integration

**Objective:** Ensure TTS stories and generated audio from the media platform appear as available tracks in Tiko Radio.

**Files:**
- Modify: `apps/radio/web/src/composables/useTrackLibrary.ts` (add source for media library tracks)
- Add a "Tiko Library" category in radio that pulls from `media-api` with `source=tts-story` or `source=generated`.

### Task 4.4: Domain & deployment wiring

**Objective:** Set up Cloudflare Pages projects, custom domains, and CI/CD for the new apps and workers.

**Domains:**
- `media.tikoapps.org` — public media gallery
- `admin.tikoapps.org` — admin dashboard (or `dash.tikoapps.org`)
- `dev.media.tikoapps.org` / `dev.admin.tikoapps.org` — dev previews
- API routes stay under `*.tikoapi.org`

**Files:**
- Create: `.github/workflows/deploy-media.yml`
- Create: `.github/workflows/deploy-admin.yml`
- Update: `package.json` workspaces if needed

---

## Implementation Order

1. **Phase 1 first** — media-api + gallery frontend. Gives us a place to see everything.
2. **Phase 3.1** — image generation in generation-api. Backend before admin UI.
3. **Phase 2.1–2.2** — admin auth + app scaffold.
4. **Phase 2.3** — image generator UI in admin.
5. **Phase 3.2** — story rendering pipeline in generation-api.
6. **Phase 2.4** — story narrator UI in admin.
7. **Phase 2.5** — library management in admin.
8. **Phase 4** — integration, radio connection, deployment.

---

## Key Decisions

- **Auth:** Admin uses existing identity system (device session + magic link). Email allowlist (`me@sil.mt`) checked server-side. No separate admin passwords.
- **Image generation:** DALL-E 3 via OpenAI API. Style presets for "Tiko style" can be added as prompt prefixes later.
- **TTS voices:** All 11 OpenAI voices available. Language auto-detected from text or explicitly set.
- **Audio concatenation:** For v1, simple MP3 byte concatenation. Can upgrade to proper ffmpeg-based merging later if needed.
- **Storage:** R2 for all media bytes. D1 for metadata. CDN delivery via `tikocdn.org` or worker-proxied URLs.
- **Download formats:** Images can be downloaded as-is (PNG from DALL-E). Audio as MP3. Format conversion (JPG, WebP, WAV) can be added later as worker-side transforms.
- **No Supabase.** No passwords. No login walls. Admin gate is identity-based.

## Pitfalls

- Don't create a separate auth system for admin. Use the existing Tiko identity + email allowlist.
- Don't deploy production directly. Use GitHub Actions → Cloudflare Pages.
- Don't reference raw palette tokens in CSS — use `color-mix()` via `--color-background`/`--color-foreground`.
- Don't use `highlight.js` — use `shiki` if syntax highlighting is ever needed.
- Node 22+ is mandatory for all JS/TS/Cloudflare work.
- `wrangler.toml` placeholder D1 IDs (`00000000-...`) must be replaced before real deployment.
- `GENERATED_MEDIA_BUCKET` R2 bucket must be created in Cloudflare dashboard before first deploy.
- The `admin-api` worker needs `OPENAI_API_KEY` set as a secret (`wrangler secret put`).
- Story audio concatenation: MP3 frames can be concatenated directly for CBR, but VBR files may have playback issues. Test with actual OpenAI TTS output.
