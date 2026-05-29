import { ref } from 'vue'

export interface YouTubeVideoMeta {
  videoId: string
  title: string
  thumbnailUrl: string
  duration: number // seconds, estimated from oEmbed if available, 0 if unknown
}

export function useYouTubeMeta() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMeta(videoId: string): Promise<YouTubeVideoMeta | null> {
    loading.value = true
    error.value = null
    try {
      const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      return {
        videoId,
        title: data.title || `Video ${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration: 0, // noembed doesn't provide duration; we could use a backend for this later
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch video info'
      return null
    } finally {
      loading.value = false
    }
  }

  function getVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  return {
    loading,
    error,
    fetchMeta,
    getVideoId,
  }
}
