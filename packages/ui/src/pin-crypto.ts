export async function hashParentPin(pin: string, namespace = 'parent-code'): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`tiko:${namespace}:${pin}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
