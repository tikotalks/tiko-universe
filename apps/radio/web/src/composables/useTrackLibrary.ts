import { watch, computed, shallowRef, type ShallowRef, type ComputedRef } from 'vue'
import type { RadioTrack, TrackSource } from '@tiko/data'

type NewTrackInput = {
  title: string
  artist?: string
  source: TrackSource
  youtubeVideoId?: string
  audioUrl?: string
  thumbnailUrl?: string
  duration?: number
  categoryId?: string
}

function hasPersistentAudioUrl(track: RadioTrack): boolean {
  return typeof track.audioUrl !== 'string' || !track.audioUrl.startsWith('blob:')
}

export function getPersistableRadioTracks(tracks: RadioTrack[]): RadioTrack[] {
  return tracks.filter(hasPersistentAudioUrl)
}

export function useTrackLibrary(storageKey: string = 'tiko:radio:tracks') {
  const tracks: ShallowRef<RadioTrack[]> = shallowRef(loadTracks())

  function loadTracks(): RadioTrack[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw ? getPersistableRadioTracks(JSON.parse(raw)) : []
    } catch {
      return []
    }
  }

  function saveTracks() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(getPersistableRadioTracks(tracks.value)))
  }

  function addTrack(track: NewTrackInput): RadioTrack {
    const newTrack: RadioTrack = {
      ...track,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString()
    }
    tracks.value = [...tracks.value, newTrack]
    return newTrack
  }

  function mergeTracks(nextTracks: RadioTrack[]) {
    const existing = new Map(tracks.value.map(track => [track.id, track]))
    for (const track of nextTracks) existing.set(track.id, { ...existing.get(track.id), ...track })
    tracks.value = Array.from(existing.values())
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

  function clearAll() {
    tracks.value = []
  }

  const isEmpty: ComputedRef<boolean> = computed(() => tracks.value.length === 0)
  const count: ComputedRef<number> = computed(() => tracks.value.length)

  watch(tracks, saveTracks, { deep: true })

  return { tracks, addTrack, mergeTracks, removeTrack, removeTrackByIndex, moveTrack, clearAll, isEmpty, count }
}
