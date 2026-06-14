import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useImageGeneration } from './useImageGeneration'
import { useToast } from './useToast'
import type { JobDto } from '../components/images/imageGenerationQueueTypes'
import { extractJobResults } from '../components/images/imageGenerationQueueTypes'

const POLL_INTERVAL = 3000

export function useJobQueue() {
  const { listJobs, processJobs, enrichImage } = useImageGeneration()
  const toast = useToast()

  const jobs = ref<JobDto[]>([])
  const processing = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let seenJobStatuses = new Map<string, string>()
  let initialized = false

  const activeCount = computed(() =>
    jobs.value.filter((j) => j.status === 'pending' || j.status === 'processing').length,
  )
  const hasActiveJobs = computed(() => activeCount.value > 0)

  async function loadJobs() {
    try {
      jobs.value = await listJobs()
    } catch (e) {
      console.error('[jobs] Failed to load jobs', e)
    }
  }

  async function refresh() {
    const prev = new Map(seenJobStatuses)
    await loadJobs()

    let newDone = false
    let newError = false
    let processedImageCount = 0
    let enriched = false

    for (const job of jobs.value) {
      const prevStatus = prev.get(job.id)
      const wasActive = prevStatus === 'pending' || prevStatus === 'processing'

      if (wasActive && job.status === 'done') {
        newDone = true
        if (job.type === 'generate') {
          processedImageCount += extractJobResults(job).length
          if (!seenJobStatuses.has(job.id)) {
            for (const res of extractJobResults(job)) {
              if (res?.id) {
                enriched = true
                void enrichImage(res.id).catch(() => {})
              }
            }
          }
        } else {
          processedImageCount += 1
        }
      }
      if (wasActive && job.status === 'error') {
        newError = true
        toast.error(`${job.label} failed: ${job.error?.message ?? 'Unknown error'}`)
      }

      seenJobStatuses.set(job.id, job.status)
    }

    if (newDone) {
      if (processedImageCount > 0) {
        toast.success(`${processedImageCount} image${processedImageCount > 1 ? 's' : ''} generated — check Drafts`)
      } else {
        toast.success('Job completed')
      }
    }

    if (enriched) {
      setTimeout(() => toast.info('Auto-enriching generated images...'), 500)
    }
  }

  async function poll() {
    if (!hasActiveJobs.value) {
      stopPolling()
      return
    }
    await refresh()
    if (hasActiveJobs.value) {
      try {
        processing.value = true
        await processJobs()
      } catch (e) {
        console.error('[jobs] Processing failed', e)
      } finally {
        processing.value = false
      }
    }
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(poll, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function initWithToast(message: string) {
    if (!initialized) {
      initialized = true
      await loadJobs()
      for (const job of jobs.value) {
        seenJobStatuses.set(job.id, job.status)
      }
    }
    toast.info(message)
    if (hasActiveJobs.value) startPolling()
  }

  onMounted(() => {
    if (!initialized) {
      initialized = true
      void loadJobs().then(() => {
        for (const job of jobs.value) {
          seenJobStatuses.set(job.id, job.status)
        }
        if (hasActiveJobs.value) startPolling()
      })
    } else if (hasActiveJobs.value) {
      startPolling()
    }
  })

  onUnmounted(() => stopPolling())

  return {
    jobs,
    activeCount,
    hasActiveJobs,
    processing,
    loadJobs,
    refresh,
    startPolling,
    stopPolling,
    initWithToast,
  }
}
