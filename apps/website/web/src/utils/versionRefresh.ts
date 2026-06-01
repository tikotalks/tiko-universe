const CHECK_INTERVAL_MS = 5 * 60 * 1000
const RELOAD_SESSION_PREFIX = 'tiko:website-reloaded:'

function getEntryScriptsFromDocument(doc: Document, origin: string): string[] {
  return Array.from(doc.scripts)
    .map((script) => script.getAttribute('src'))
    .filter((src): src is string => Boolean(src))
    .map((src) => new URL(src, origin).pathname)
    .filter((pathname) => pathname.startsWith('/assets/') && pathname.endsWith('.js'))
    .sort()
}

let isChecking = false

async function checkForWebsiteUpdate() {
  if (isChecking) return

  isChecking = true

  try {
    const response = await fetch(`${window.location.origin}/?tiko-version=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) return

    const html = await response.text()
    const latestDocument = new DOMParser().parseFromString(html, 'text/html')
    const currentEntries = getEntryScriptsFromDocument(document, window.location.origin)
    const latestEntries = getEntryScriptsFromDocument(latestDocument, window.location.origin)

    if (!currentEntries.length || !latestEntries.length) return

    const currentVersion = currentEntries.join('|')
    const latestVersion = latestEntries.join('|')

    if (currentVersion === latestVersion) return

    const reloadKey = `${RELOAD_SESSION_PREFIX}${latestVersion}`
    if (sessionStorage.getItem(reloadKey) === '1') return

    sessionStorage.setItem(reloadKey, '1')
    window.location.reload()
  } catch (error) {
    console.warn('Unable to check for a newer Tiko website version', error)
  } finally {
    isChecking = false
  }
}

function isLocalDevelopmentHost() {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
}

export function installWebsiteVersionRefresh() {
  if (typeof window === 'undefined' || isLocalDevelopmentHost()) return

  window.addEventListener('focus', () => {
    void checkForWebsiteUpdate()
  })

  window.addEventListener('pageshow', () => {
    void checkForWebsiteUpdate()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForWebsiteUpdate()
    }
  })

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForWebsiteUpdate()
    }
  }, CHECK_INTERVAL_MS)
}
