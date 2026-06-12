import { ref, computed } from 'vue'

/**
 * Shared parent mode state — singleton pattern so all apps share the same mode.
 * Parent mode is ON by default. Switching to child mode requires a 4-digit code.
 * The code hash is stored on the user's identity profile (subject metadata).
 */

export async function hashParentPin(pin: string, namespace = 'parent-code'): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`tiko:${namespace}:${pin}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Singleton state
const parentMode = ref(true)
const parentCodeHash = ref<string | undefined>()

export interface ParentModeDeps {
  getProfile: () => Promise<{ profile: Record<string, unknown> }>
  updateProfile: (data: Record<string, unknown>) => Promise<{ profile: Record<string, unknown> }>
}

export function useParentMode() {
  const hasCode = computed(() => Boolean(parentCodeHash.value))

  async function loadCode(deps: ParentModeDeps): Promise<void> {
    try {
      const { profile } = await deps.getProfile()
      parentCodeHash.value = typeof profile.parentCodeHash === 'string' ? profile.parentCodeHash : undefined
    } catch {
      // Not logged in or network error — parent mode stays on
    }
  }

  async function saveCode(code: string, deps: ParentModeDeps): Promise<void> {
    const hash = await hashParentPin(code)
    parentCodeHash.value = hash
    await deps.updateProfile({ parentCodeHash: hash })
  }

  function enableParentMode(): void {
    parentMode.value = true
  }

  function disableParentMode(): { action: 'create' } | { action: 'verify' } {
    if (!parentCodeHash.value) {
      return { action: 'create' }
    }
    return { action: 'verify' }
  }

  async function verifyAndDisable(code: string): Promise<{ success: boolean; error?: string }> {
    const hash = await hashParentPin(code)
    if (hash === parentCodeHash.value) {
      parentMode.value = false
      return { success: true }
    }
    return { success: false, error: 'Wrong code' }
  }

  async function createCodeAndDisable(code: string, deps: ParentModeDeps): Promise<void> {
    await saveCode(code, deps)
    parentMode.value = false
  }

  return {
    parentMode,
    parentCodeHash,
    hasCode,
    loadCode,
    saveCode,
    enableParentMode,
    disableParentMode,
    verifyAndDisable,
    createCodeAndDisable,
  }
}
