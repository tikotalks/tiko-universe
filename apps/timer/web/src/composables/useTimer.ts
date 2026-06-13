import { ref, computed, onUnmounted, onScopeDispose } from 'vue'

export type TimerMode = 'idle' | 'running' | 'paused' | 'expired'

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
  const now = ref(Date.now())
  let intervalId: ReturnType<typeof setInterval> | null = null

  const remaining = computed(() => {
    if (mode.value === 'idle') return 0
    if (mode.value === 'paused') return remainingMs.value
    if (mode.value === 'expired') return 0
    // running: compute from wall clock
    return Math.max(0, targetMs.value - now.value)
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
    now.value = Date.now()
    const left = targetMs.value - now.value
    if (left <= 0) {
      remainingMs.value = 0
      mode.value = 'expired'
      clearTimer()
    }
  }

  function start(ms: number) {
    clearTimer()
    now.value = Date.now()
    totalDuration.value = ms
    targetMs.value = now.value + ms
    remainingMs.value = ms
    mode.value = 'running'
    intervalId = setInterval(tick, 250)
  }

  function pause() {
    if (mode.value !== 'running') return
    now.value = Date.now()
    remainingMs.value = Math.max(0, targetMs.value - now.value)
    clearTimer()
    mode.value = 'paused'
  }

  function resume() {
    if (mode.value !== 'paused') return
    now.value = Date.now()
    targetMs.value = now.value + remainingMs.value
    mode.value = 'running'
    intervalId = setInterval(tick, 250)
  }

  function reset() {
    clearTimer()
    mode.value = 'idle'
    totalDuration.value = 0
    targetMs.value = 0
    remainingMs.value = 0
    now.value = Date.now()
  }

  function restoreFromState(state: { mode?: TimerMode; targetMs?: number; remainingMs?: number; totalDurationMs?: number; startedAt?: number | null }) {
    if (state.mode === 'running' && state.targetMs) {
      now.value = Date.now()
      const left = state.targetMs - now.value
      if (left > 0) {
        totalDuration.value = state.totalDurationMs && state.totalDurationMs > 0 ? state.totalDurationMs : left
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
      totalDuration.value = state.totalDurationMs && state.totalDurationMs > 0 ? state.totalDurationMs : state.remainingMs
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

  function getState(): { mode: TimerMode; targetMs: number; remainingMs: number; totalDurationMs: number; startedAt: number | null } {
    if (mode.value === 'running') {
      now.value = Date.now()
      return { mode: 'running', targetMs: targetMs.value, remainingMs: Math.max(0, targetMs.value - now.value), totalDurationMs: totalDuration.value, startedAt: targetMs.value - totalDuration.value || null }
    }
    return { mode: mode.value, targetMs: targetMs.value, remainingMs: remainingMs.value, totalDurationMs: totalDuration.value, startedAt: null }
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
