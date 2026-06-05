import { ref, computed } from 'vue'

/**
 * Shared parent mode state — singleton pattern so all apps share the same mode.
 * Parent mode is ON by default. Switching to child mode requires a 4-digit code.
 * The code hash is stored on the user's identity profile (subject metadata).
 */

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
    const hash = await hashPin(code)
    parentCodeHash.value = hash
    await deps.updateProfile({ parentCodeHash: hash })
  }

  function enableParentMode(): void {
    parentMode.value = true
  }

  async function disableParentMode(deps: ParentModeDeps): Promise<{ needsCode: true } | { needsCode: false; error?: string }> {
    if (!parentCodeHash.value) {
      // No code set yet — caller should show code creation UI
      return { needsCode: true }
    }
    // Code exists — caller should show verification UI
    return { needsCode: true }
  }

  async function verifyAndDisable(code: string, deps: ParentModeDeps): Promise<{ success: boolean; error?: string }> {
    const hash = await hashPin(code)
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

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`tiko:parent-code:${pin}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
