# Radio Music Player Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the radio app from a placeholder scaffold into a real kids' music player with YouTube integration, custom uploads, R2-backed storage, and curated playback.

**Architecture:** Three audio sources unified behind one player UI:
1. **YouTube playback** — IFrame Player API, hidden video, audio-only
2. **YouTube → R2** — user pastes a YouTube URL, server extracts audio and stores in R2, client plays via HTML5 `<audio>`
3. **Direct uploads** — user picks a file from device, uploaded to R2

Client: Vue 3 + Vite, composables for player + library management, localStorage fallback + API sync.
Server: Cloudflare Worker (`media-api`) with R2 bucket binding for audio storage and yt-dlp extraction.

**Tech Stack:** Vue 3, TypeScript, Vitest, Cloudflare Workers, R2, YouTube IFrame API, HTML5 Audio

---

### Task 1: Add RadioTrack type and expand RadioState in @tiko/data

**Objective:** Define the track model that all three audio sources share, and expand the radio state to hold structured tracks instead of just strings.

**Files:**
- Modify: `packages/data/src/index.ts`

**Step 1: Add RadioTrack interface and source type**

```typescript
export type TrackSource = 'youtube' | 'r2' | 'upload'

export interface RadioTrack {
  id: string
  title: string
  artist?: string
  source: TrackSource
  /** For youtube source: the video ID */
  youtubeVideoId?: string
  /** For r2/upload source: the R2 object key or public URL */
  audioUrl?: string
  /** Thumbnail URL (optional) */
  thumbnailUrl?: string
  /** Duration in seconds */
  duration?: number
  /** ISO timestamp when added */
  addedAt?: string
}
```

**Step 2: Expand RadioState to use tracks**

Replace `playlist?: string[]` with structured tracks:

```typescript
export interface RadioState extends JsonObject {
  currentTrackIndex?: number
  tracks?: RadioTrack[]
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
}
```

**Step 3: Commit**

```
git add packages/data/src/index.ts
git commit -m "feat(data): add RadioTrack type and expand RadioState"
```

---

### Task 2: Expand i18n keys for radio

**Objective:** Add all the i18n keys the radio player will need (library management, upload, YouTube add, player labels).

**Files:**
- Modify: `packages/i18n/src/index.ts`
- Modify: `packages/i18n/src/index.spec.ts`

**Step 1: Add new i18n keys**

Add under `radio:`:
- `library.title` — "Library"
- `library.empty` — "No tracks yet. Add music to get started."
- `library.addTrack` — "Add Track"
- `library.addFromYouTube` — "Add from YouTube"
- `library.addFromYouTubePlaceholder` — "Paste a YouTube link"
- `library.addFromYouTubeButton` — "Add"
- `library.adding` — "Adding..."
- `library.uploadFile` — "Upload File"
- `library.removeTrack` — "Remove"
- `player.trackArtist` — (empty, used as template)
- `player.duration` — (empty)
- `player.repeat` — "Repeat"
- `player.shuffle` — "Shuffle" (already exists)
- `settings.volume` — "Volume"

**Step 2: Add English translations**

**Step 3: Update test to expect new keys exist**

**Step 4: Commit**

```
git add packages/i18n/src/index.ts packages/i18n/src/index.spec.ts
git commit -m "feat(i18n): add radio library and player i18n keys"
```

---

### Task 3: Build useTrackLibrary composable

**Objective:** Create a composable for managing the track library — add/remove tracks, reorder, persist to localStorage + API sync.

**Files:**
- Create: `apps/radio/web/src/composables/useTrackLibrary.ts`

**Step 1: Write the composable**

```typescript
import { ref, watch, computed } from 'vue'
import type { RadioTrack } from '@tiko/data'

export function useTrackLibrary(storageKey: string = 'tiko:radio:tracks') {
  const tracks = ref<RadioTrack[]>(loadTracks())

  function loadTracks(): RadioTrack[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveTracks() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(tracks.value))
  }

  function addTrack(track: Omit<RadioTrack, 'id' | 'addedAt'>): RadioTrack {
    const newTrack: RadioTrack = {
      ...track,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString()
    }
    tracks.value = [...tracks.value, newTrack]
    return newTrack
  }

  function removeTrack(id: string) {
    tracks.value = tracks.value.filter(t => t.id !== id)
  }

  function removeTrackByIndex(index: number) {
    tracks.value = tracks.value.filter((_, i) => i !== index)
  }

  function moveTrack(fromIndex: number, toIndex: number) {
    const list = [...tracks.value]
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    tracks.value = list
  }

  const isEmpty = computed(() => tracks.value.length === 0)
  const count = computed(() => tracks.value.length)

  watch(tracks, saveTracks, { deep: true })

  return { tracks, addTrack, removeTrack, removeTrackByIndex, moveTrack, isEmpty, count }
}
```

**Step 2: Commit**

```
git add apps/radio/web/src/composables/useTrackLibrary.ts
git commit -m "feat(radio): add useTrackLibrary composable"
```

---

### Task 4: Rewrite useAudioPlayer for YouTube + HTML5

**Objective:** Enhance the audio player composable to support both YouTube IFrame playback (hidden video) and HTML5 `<audio>` for R2/uploaded files.

**Files:**
- Rewrite: `apps/radio/web/src/composables/useAudioPlayer.ts`

**Key features:**
- Unified API: `play(track: RadioTrack)`, `pause()`, `resume()`, `stop()`, `seek(fraction)`
- For `source === 'youtube'`: inject a hidden YouTube IFrame and use the API
- For `source === 'r2' | 'upload'`: use HTML5 `<audio>`
- Reactive state: `isPlaying`, `currentTime`, `duration`, `progress`, `currentTrack`
- Auto-advance: emit `ended` event when track finishes
- Volume control

**Step 1: Write the enhanced composable**

The YouTube IFrame API integration:
- Dynamically inject the YouTube IFrame API script if not already loaded
- Create a hidden container div for the iframe
- Use `new YT.Player(container, { videoId, playerVars: { autoplay: 1 } })`
- Track playback state via YT player events

**Step 2: Commit**

```
git add apps/radio/web/src/composables/useAudioPlayer.ts
git commit -m "feat(radio): rewrite useAudioPlayer for YouTube + HTML5"
```

---

### Task 5: Rewrite App.vue — full player UI

**Objective:** Replace the placeholder App.vue with the full radio player interface: now-playing, transport controls, track library with YouTube add + file upload.

**Files:**
- Rewrite: `apps/radio/web/src/App.vue`
- Rewrite: `apps/radio/web/src/styles.scss`

**UI sections:**
1. **Now-playing card** — track title, artist, progress bar, time display
2. **Transport controls** — previous, play/pause, next, shuffle, repeat
3. **Library section** — track list with active highlight, remove button per track
4. **Add track panel** — collapsible panel with:
   - "Add from YouTube" — text input for URL, add button
   - "Upload file" — file input (accept audio/*)
5. **Settings panel** — existing TikoSettingsPanel (language, color mode, volume slider)

**Step 1: Write App.vue**

- Wire up `useAudioPlayer` and `useTrackLibrary`
- On mount, bootstrap identity + hydrate remote state (existing pattern)
- YouTube URL parsing: extract video ID from various YouTube URL formats
- File upload: read file as blob, POST to media-api, get back RadioTrack
- Auto-advance on track end
- Keyboard shortcuts (space = play/pause, arrows = prev/next)

**Step 2: Write styles.scss**

- BEMM naming: `.radio-app`, `.radio-app__now-playing`, `.radio-app__controls`, etc.
- Reuse existing color variables: `var(--tiko-surface)`, `var(--color-primary)`, etc.
- Hidden YouTube container: `position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px`
- Add panel with input styling
- Track items with remove button

**Step 3: Commit**

```
git add apps/radio/web/src/App.vue apps/radio/web/src/styles.scss
git commit -m "feat(radio): rewrite player UI with library and YouTube upload"
```

---

### Task 6: Rewrite App.spec.ts with full test coverage

**Objective:** Comprehensive tests for the new player: track management, YouTube URL parsing, playback controls, persistence.

**Files:**
- Rewrite: `apps/radio/web/src/App.spec.ts`

**Tests to cover:**
- App renders with player UI and library section
- Empty library shows placeholder message
- Adding a track from YouTube URL (mock the URL input)
- Adding a track via file upload (mock file input)
- Removing a track
- Play/pause toggles player state
- Next/previous cycles through tracks
- Shuffle mode randomizes
- Repeat mode loops
- Settings panel opens/closes
- localStorage persistence of tracks

**Step 1: Write tests**

**Step 2: Run tests**

```
npm run test -- --filter radio
```

**Step 3: Commit**

```
git add apps/radio/web/src/App.spec.ts
git commit -m "test(radio): add comprehensive player and library tests"
```

---

### Task 7: Update iOS RadioView

**Objective:** Update the iOS view to match the new track-based model with YouTube playback (via AVPlayer + web view fallback).

**Files:**
- Rewrite: `apps/radio/ios/Sources/RadioView.swift`

**Key changes:**
- Replace hardcoded sample tracks with RadioTrack model
- Add "Add from YouTube" functionality (present sheet with URL input)
- Add file upload via document picker
- Use WKWebView for YouTube playback (hidden, audio-only) since iOS has no standalone YouTube player SDK
- Updated UI with library, now-playing, transport controls, add panel

**Step 1: Update RadioView.swift**

**Step 2: Commit**

```
git add apps/radio/ios/
git commit -m "feat(radio): update iOS app with track library and YouTube support"
```

---

### Task 8: Add TikoMediaClient to @tiko/data for media-api contract

**Objective:** Add a client class for the media-api endpoints (upload audio, get track info, YouTube extraction).

**Files:**
- Create: `packages/data/src/media.ts` (or add to index.ts)

**Endpoints (contract):**
- `POST /media/upload` — multipart upload of audio file, returns `RadioTrack`
- `POST /media/extract` — `{ youtubeUrl: string }`, server extracts audio to R2, returns `RadioTrack`
- `GET /media/tracks/:id` — get track metadata + signed R2 URL
- `DELETE /media/tracks/:id` — remove track from R2 + metadata

**Step 1: Add TikoMediaClient class**

**Step 2: Commit**

```
git add packages/data/src/media.ts
git commit -m "feat(data): add TikoMediaClient for media-api contract"
```

---

### Task 9: Typecheck and full test suite

**Objective:** Verify everything compiles and all tests pass.

**Step 1: Run typecheck**

```
npm run typecheck
```

**Step 2: Run all tests**

```
npm run test
```

**Step 3: Fix any issues found**

**Step 4: Final commit if needed**

```
git add -A
git commit -m "fix(radio): resolve typecheck and test issues"
```
