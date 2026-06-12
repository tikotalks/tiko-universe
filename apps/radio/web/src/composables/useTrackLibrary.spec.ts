import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { getPersistableRadioTracks, useTrackLibrary } from './useTrackLibrary'
import type { RadioTrack } from '@tiko/data'

function createLocalStorageMock(initialData?: Record<string, string>) {
  const store: Record<string, string> = { ...initialData }
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() { return Object.keys(store).length },
    get store() { return store },
  } satisfies Storage
}

describe('useTrackLibrary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not persist session-only blob audio URLs', async () => {
    const storage = createLocalStorageMock()
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true, configurable: true })
    const scope = effectScope()
    const library = scope.run(() => useTrackLibrary('radio-test-tracks'))
    if (!library) throw new Error('Failed to create library')

    library.addTrack({
      title: 'Recorded in this session',
      source: 'upload',
      audioUrl: 'blob:http://localhost/audio-id',
    })
    library.addTrack({
      title: 'Uploaded media',
      source: 'upload',
      audioUrl: 'https://media.tikoapi.org/v1/media/audio/download',
    })
    await nextTick()

    const persisted = JSON.parse(storage.store['radio-test-tracks'])
    expect(persisted).toHaveLength(1)
    expect(persisted[0].title).toBe('Uploaded media')
    expect(persisted[0].audioUrl).not.toMatch(/^blob:/)

    scope.stop()
  })

  it('filters existing blob tracks before loading or remote persistence', () => {
    const tracks: RadioTrack[] = [
      { id: 'blob-track', title: 'Blob', source: 'upload', audioUrl: 'blob:http://localhost/audio-id' },
      { id: 'remote-track', title: 'Remote', source: 'upload', audioUrl: 'https://media.tikoapi.org/audio.mp3' },
      { id: 'youtube-track', title: 'YouTube', source: 'youtube', youtubeVideoId: 'abcdefghijk' },
    ]
    const storage = createLocalStorageMock({ 'radio-test-tracks': JSON.stringify(tracks) })
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true, configurable: true })
    const scope = effectScope()
    const library = scope.run(() => useTrackLibrary('radio-test-tracks'))
    if (!library) throw new Error('Failed to create library')

    expect(library.tracks.value.map(track => track.id)).toEqual(['remote-track', 'youtube-track'])
    expect(getPersistableRadioTracks(tracks).map(track => track.id)).toEqual(['remote-track', 'youtube-track'])

    scope.stop()
  })
})
