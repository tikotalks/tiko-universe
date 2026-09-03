import { onScopeDispose, ref } from 'vue'

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

const SCAN_INTERVAL_MS = 300

function barcodeDetector(): BarcodeDetectorConstructor | null {
  const candidate = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
  return typeof candidate === 'function' ? candidate : null
}

export type QrScannerError = 'unsupported' | 'no-camera' | 'failed'

/**
 * Read a QR code with the device camera.
 *
 * Uses the browser's own barcode detector where there is one (Chrome, Android).
 * Safari has none, and rather than shipping a decoder to every child's device,
 * the popup falls back to what already works there: the phone's camera app
 * opens the share link, or a parent types the eight characters.
 */
export function useQrScanner() {
  const supported = ref(barcodeDetector() !== null)
  const scanning = ref(false)
  const error = ref<QrScannerError | null>(null)

  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function start(video: HTMLVideoElement, onResult: (value: string) => void): Promise<void> {
    const Detector = barcodeDetector()
    if (!Detector) {
      supported.value = false
      error.value = 'unsupported'
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'no-camera'
      return
    }

    error.value = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      video.srcObject = stream
      await video.play()
      scanning.value = true

      const detector = new Detector({ formats: ['qr_code'] })
      timer = setInterval(async () => {
        if (!scanning.value) return
        try {
          const codes = await detector.detect(video)
          const value = codes.find(code => code.rawValue)?.rawValue
          if (value) {
            stop()
            onResult(value)
          }
        } catch {
          // A dropped frame is not a failure; the next tick tries again.
        }
      }, SCAN_INTERVAL_MS)
    } catch {
      error.value = 'no-camera'
      stop()
    }
  }

  function stop(): void {
    scanning.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      stream = null
    }
  }

  onScopeDispose(stop)

  return { supported, scanning, error, start, stop }
}
