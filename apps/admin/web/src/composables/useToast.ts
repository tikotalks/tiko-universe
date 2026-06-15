import { ref, computed } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  const readonlyToasts = computed(() => toasts.value)

  function showToast(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, type }]
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts: readonlyToasts,
    showToast,
    dismiss,
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error', 6000),
    info: (msg: string) => showToast(msg, 'info'),
  }
}
