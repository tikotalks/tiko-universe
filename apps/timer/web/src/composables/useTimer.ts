import { ref, computed, onUnmounted, onScopeDispose } from 'vue'

export type TimerMode = 'idle' | 'running' | 'paused' | 'expired'

const MINUTE = 60_000
const SECOND = 1_000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / SECOND))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${pad2(minutes)}:${pad2(seconds)}`
}

export function useTimer() {
  const mode = ref<TimerMode>('idle')
  const totalDuration = ref(0)
  const targetMs = ref(0)
  const remainingMs = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const remaining = computed(() => {
    if (mode.value === 'idle') return 0
    if (mode.value === 'paused') return remainingMs.value
    if (mode.value === 'expired') return 0
    // running: compute from wall clock
    return Math.max(0, targetMs.value - Date.now())
  })

  const displayTime = computed(() => formatMs(remaining.value))

  const progress = computed(() => {
    if (mode.value === 'idle' || totalDuration.value === 0) return 0
    if (mode.value === 'expired') return 1
    return 1 - remaining.value / totalDuration.value
  })

  function clearTimer() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function tick() {
    const left = targetMs.value - Date.now()
    if (left <= 0) {
      remainingMs.value = 0
      mode.value = 'expired'
      clearTimer()
    }
  }

  function start(ms: number) {
    clearTimer()
    totalDuration.value = ms
    targetMs.value = Date.now() + ms
    remainingMs.value = ms
    mode.value = 'running'
    intervalId = setInterval(tick, 250)
  }

  function pause() {
    if (mode.value !== 'running') return
    remainingMs.value = Math.max(0, targetMs.value - Date.now())
    clearTimer()
    mode.value = 'paused'
  }

  function resume() {
    if (mode.value !== 'paused') return
    targetMs.value = Date.now() + remainingMs.value
    mode.value = 'running'
    intervalId = setInterval(tick, 250)
  }

  function reset() {
    clearTimer()
    mode.value = 'idle'
    totalDuration.value = 0
    targetMs.value = 0
    remainingMs.value = 0
  }

  function restoreFromState(state: { mode?: TimerMode; targetMs?: number; remainingMs?: number; startedAt?: number | null }) {
    if (state.mode === 'running' && state.targetMs) {
      const left = state.targetMs - Date.now()
      if (left > 0) {
        totalDuration.value = 0 // unknown, approximate
        targetMs.value = state.targetMs
        remainingMs.value = left
        mode.value = 'running'
        intervalId = setInterval(tick, 250)
        return
      }
      // Already expired
      mode.value = 'expired'
      return
    }
    if (state.mode === 'paused' && state.remainingMs) {
      totalDuration.value = 0
      remainingMs.value = state.remainingMs
      targetMs.value = 0
      mode.value = 'paused'
      return
    }
    if (state.mode === 'expired') {
      mode.value = 'expired'
      remainingMs.value = 0
      return
    }
    // idle or unknown
    reset()
  }

  function getState(): { mode: TimerMode; targetMs: number; remainingMs: number; startedAt: number | null } {
    if (mode.value === 'running') {
      return { mode: 'running', targetMs: targetMs.value, remainingMs: Math.max(0, targetMs.value - Date.now()), startedAt: targetMs.value - totalDuration.value || null }
    }
    return { mode: mode.value, targetMs: targetMs.value, remainingMs: remainingMs.value, startedAt: null }
  }

  const cleanup = () => clearTimer()
  onUnmounted(cleanup)
  onScopeDispose(cleanup)

  return {
    mode,
    remaining,
    displayTime,
    progress,
    totalDuration,
    start,
    pause,
    resume,
    reset,
    restoreFromState,
    getState
  }
}
