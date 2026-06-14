#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const root = resolve(new URL('..', import.meta.url).pathname)
const endpoint = (process.env.TIKO_APP_CONFIG_URL ?? process.env.VITE_TIKO_APP_CONFIG_URL ?? 'https://app.tikoapi.org/v1/apps/config').replace(/\/$/, '')
const strict = process.env.TIKO_APP_CONFIG_STRICT === '1'
const dryRun = process.env.TIKO_APP_CONFIG_DRY_RUN === '1'

const fallbackConfigs = {
  'yes-no': { id: 'yes-no', title: 'Yes No', appColor: 'yes-no', appIcon: 'ui/check-fat', appIconMediaCategory: 'emotions', themeColor: '#9b3fbd', iosIcon: 'checkmark.circle' },
  type: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'ui/type', appIconMediaCategory: 'letters', themeColor: '#2488ff', iosIcon: 'textformat' },
  cards: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'education/book-2', appIconMediaCategory: 'animals', themeColor: '#ff8a1f', iosIcon: 'rectangle.grid.2x2.fill' },
  sequence: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'ui/list', appIconMediaCategory: 'routines', themeColor: '#16b8a6', iosIcon: 'list.bullet.rectangle.fill' },
  timer: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'ui/timer', appIconMediaCategory: 'transport', themeColor: '#f8c22e', iosIcon: 'timer' },
  radio: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/headphones', appIconMediaCategory: 'music', themeColor: '#e84057', iosIcon: 'headphones' },
  media: { id: 'media', title: 'Media', appColor: 'media', appIcon: 'media/image', appIconMediaCategory: 'art', themeColor: '#2dd4bf', iosIcon: 'photo' },
  admin: { id: 'admin', title: 'Admin', appColor: 'admin', appIcon: 'ui/settings', appIconMediaCategory: 'tools', themeColor: '#8b5cf6', iosIcon: 'gearshape' },
  tiko: { id: 'tiko', title: 'Tiko', appColor: 'tiko', appIcon: 'ui/heart', appIconMediaCategory: 'tiko', themeColor: '#ef4f8f', iosIcon: 'heart.fill' },
  todo: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'ui/check-list', appIconMediaCategory: 'routines', themeColor: '#2488ff', iosIcon: 'checklist' },
  talk: { id: 'talk', title: 'Talk', appColor: 'talk', appIcon: 'ui/talk', appIconMediaCategory: 'communication', themeColor: '#17131c', iosIcon: 'message.fill' },
}

const webApps = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'todo', 'talk']
const iosSharedApps = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'talk', 'tiko']
const iosApps = {
  'yes-no': 'YesNoAppConfig.swift',
  type: 'TypeAppConfig.swift',
  cards: 'CardsAppConfig.swift',
  timer: 'TimerAppConfig.swift',
  radio: 'RadioAppConfig.swift',
}
const iosAppIconSources = {
  'yes-no': 'apps/yes-no/ios/Sources',
  type: 'apps/type/ios/Sources',
  cards: 'apps/cards/ios/Sources',
  timer: 'apps/timer/ios/Sources',
  radio: 'apps/radio/ios/Sources',
  talk: 'apps/talk/ios/Sources',
}
const iosAppIconImages = [
  { idiom: 'iphone', size: '20x20', scale: '2x', pixels: 40 },
  { idiom: 'iphone', size: '20x20', scale: '3x', pixels: 60 },
  { idiom: 'iphone', size: '29x29', scale: '2x', pixels: 58 },
  { idiom: 'iphone', size: '29x29', scale: '3x', pixels: 87 },
  { idiom: 'iphone', size: '40x40', scale: '2x', pixels: 80 },
  { idiom: 'iphone', size: '40x40', scale: '3x', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '2x', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '3x', pixels: 180 },
  { idiom: 'ipad', size: '20x20', scale: '1x', pixels: 20 },
  { idiom: 'ipad', size: '20x20', scale: '2x', pixels: 40 },
  { idiom: 'ipad', size: '29x29', scale: '1x', pixels: 29 },
  { idiom: 'ipad', size: '29x29', scale: '2x', pixels: 58 },
  { idiom: 'ipad', size: '40x40', scale: '1x', pixels: 40 },
  { idiom: 'ipad', size: '40x40', scale: '2x', pixels: 80 },
  { idiom: 'ipad', size: '76x76', scale: '1x', pixels: 76 },
  { idiom: 'ipad', size: '76x76', scale: '2x', pixels: 152 },
  { idiom: 'ipad', size: '83.5x83.5', scale: '2x', pixels: 167 },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', pixels: 1024 },
]

async function main() {
  const configs = await fetchConfigs()
  if (dryRun) {
    console.log(`Validated app configs from ${endpoint}`)
    return
  }
  for (const app of webApps) {
    await writeWebConfig(app, configs[app] ?? fallbackConfigs[app])
  }
  await writeIosSharedConfig(configs)
  for (const [app, file] of Object.entries(iosApps)) {
    await writeIosAppConfig(app, file)
  }
  await writeIosAppIcons(configs)
  console.log(`Generated app configs from ${endpoint}`)
}

async function fetchConfigs() {
  let configs
  try {
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    configs = body.configs ?? body.data?.configs
    if (!configs || typeof configs !== 'object') throw new Error('No configs object in response')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    if (strict) {
      throw new Error(`Could not fetch app configs from ${endpoint} (${message})`)
    }
    console.warn(`Could not fetch app configs (${message}). Keeping fallback configs.`)
    return fallbackConfigs
  }
  return mergeValidConfigs(configs)
}

function mergeValidConfigs(configs) {
  const merged = { ...fallbackConfigs }
  for (const app of Object.keys(fallbackConfigs)) {
    if (!Object.hasOwn(configs, app)) continue
    try {
      merged[app] = validateConfig(app, configs[app])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid config'
      if (strict) throw new Error(`${app}: ${message}`)
      console.warn(`Ignoring invalid app config for ${app} (${message}). Keeping fallback config.`)
    }
  }
  return merged
}

function validateConfig(app, config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('config must be an object')
  }
  const fallback = fallbackConfigs[app]
  const normalized = { ...fallback, ...config }
  if (normalized.id !== app) throw new Error(`id must be "${app}"`)
  requireNonEmptyString(normalized.title, 'title')
  requireIdentifier(normalized.appColor, 'appColor')
  if (!fallbackConfigs[normalized.appColor]) throw new Error(`appColor "${normalized.appColor}" is not a known Tiko app color`)
  requireIconName(normalized.appIcon, 'appIcon')
  requireOptionalUrl(normalized.appIconImageUrl, 'appIconImageUrl')
  requireOptionalIdentifier(normalized.appIconMediaCategory, 'appIconMediaCategory')
  requireHexColor(normalized.themeColor, 'themeColor')
  requireOptionalSwiftSymbol(normalized.iosIcon, 'iosIcon')
  return normalized
}

async function writeWebConfig(app, config) {
  const file = resolve(root, `apps/${app}/web/src/appConfig.ts`)
  const payload = {
    id: config.id,
    title: config.title,
    appColor: config.appColor,
    appIcon: config.appIcon,
    appIconImageUrl: config.appIconImageUrl ?? '',
    ...(config.appIconMediaCategory ? { appIconMediaCategory: config.appIconMediaCategory } : {}),
    ...(config.themeColor ? { themeColor: config.themeColor } : {}),
  }
  const content = `import type { TikoAppConfig } from '@tiko/ui'\n\nexport const appConfig = ${JSON.stringify(payload, null, 2)} satisfies TikoAppConfig\n`
  await writeIfChanged(file, content)
}

async function writeIosSharedConfig(configs) {
  const file = resolve(root, 'packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift')
  let content = await readFile(file, 'utf8')
  const iosConfigs = Object.entries(configs).filter(([app]) => iosSharedApps.includes(app))
  const block = iosConfigs
    .map(([app, config]) => `    static let ${swiftStaticName(app)} = TikoAppConfig(id: .${swiftCase(app)}, title: "${escapeSwift(config.title)}", appColor: .${swiftCase(config.appColor)}, appIconSystemName: "${escapeSwift(config.iosIcon ?? fallbackConfigs[app]?.iosIcon ?? 'app')}", appIconMediaCategory: ${swiftOptionalString(config.appIconMediaCategory)}, appIconImageUrl: ${swiftOptionalString(config.appIconImageUrl)}, themeColorHex: ${swiftHex(config.themeColor ?? fallbackConfigs[app]?.themeColor)})`)
    .join('\n')
  const paletteBlock = iosConfigs
    .map(([app, config]) => {
      const themeColor = config.themeColor ?? fallbackConfigs[app]?.themeColor
      return `        case .${swiftCase(app)}:\n            TikoAppPalette(label: "${escapeSwift(config.title)}", primary: Color(hex: ${swiftHex(themeColor)}), dark: Color(hex: ${swiftDarkHex(themeColor)}))`
    })
    .join('\n')
  content = content.replace(/public extension TikoAppConfig \{[\s\S]*?\n\}/, `public extension TikoAppConfig {\n${block}\n}`)
  content = content.replace(
    /public extension TikoAppColor \{\n    var palette: TikoAppPalette \{\n        switch self \{[\s\S]*?\n        \}\n    \}\n\}/,
    `public extension TikoAppColor {\n    var palette: TikoAppPalette {\n        switch self {\n${paletteBlock}\n        }\n    }\n}`
  )
  await writeIfChanged(file, content)
}

async function writeIosAppConfig(app, fileName) {
  const dir = resolve(root, `apps/${app}/ios/Sources`)
  const file = resolve(dir, fileName)
  const content = `import TikoKit\n\nenum ${fileName.replace('.swift', '')} {\n    static let app = TikoAppConfig.${swiftStaticName(app)}\n}\n`
  await writeIfChanged(file, content)
}

async function writeIosAppIcons(configs) {
  const sips = await hasCommand('sips')
  if (!sips) {
    const message = 'sips is required to generate iOS app icon PNGs'
    if (strict) throw new Error(message)
    console.warn(`${message}; skipping iOS app icon generation.`)
    return
  }

  const tempDir = await mkdtemp(resolve(tmpdir(), 'tiko-app-icons-'))
  for (const [app, sourceDir] of Object.entries(iosAppIconSources)) {
    const config = configs[app] ?? fallbackConfigs[app]
    if (!config?.appIconImageUrl) {
      const message = `${app}: appIconImageUrl is required to generate the iOS AppIcon asset catalog`
      if (strict) throw new Error(message)
      console.warn(`${message}; skipping.`)
      continue
    }

    const appIconDir = resolve(root, sourceDir, 'Assets.xcassets/AppIcon.appiconset')

    try {
      const sourceUrl = await resolveMediaImageUrl(config.appIconImageUrl)
      const downloadUrl = resizedTikoCdnUrl(sourceUrl, 1024)
      const sourceFile = resolve(tempDir, `${app}.source`)
      await downloadImage(downloadUrl, sourceFile, `${app} app icon`)

      await mkdir(appIconDir, { recursive: true })
      await writeIfChanged(resolve(root, sourceDir, 'Assets.xcassets/Contents.json'), assetCatalogContents())
      await writeIfChanged(resolve(appIconDir, 'Contents.json'), appIconContents())

      const uniqueSizes = [...new Set(iosAppIconImages.map(image => image.pixels))]
      for (const pixels of uniqueSizes) {
        await run('sips', ['-s', 'format', 'png', '-z', String(pixels), String(pixels), sourceFile, '--out', resolve(appIconDir, `app-icon-${pixels}.png`)])
      }
    } catch (error) {
      const existing = await readdir(appIconDir).then((files) => files.filter((f) => f.endsWith('.png'))).catch(() => [])
      if (existing.length > 0) {
        console.warn(`${app}: could not refresh app icon (${error.message}); keeping existing icon.`)
        continue
      }
      throw error
    }
  }
}

async function writeIfChanged(file, content) {
  await mkdir(dirname(file), { recursive: true })
  let old = ''
  try { old = await readFile(file, 'utf8') } catch {}
  if (old !== content) await writeFile(file, content)
}

async function hasCommand(command) {
  try {
    await run(command, ['--version'])
    return true
  } catch {
    return false
  }
}

async function resolveMediaImageUrl(value) {
  const url = new URL(value)
  const mediaId = mediaDownloadId(url)
  if (!mediaId) return url

  const mediaUrl = new URL(`/v1/media/${encodeURIComponent(mediaId)}`, url.origin)
  const response = await fetch(mediaUrl)
  if (!response.ok) throw new Error(`Could not resolve media icon ${mediaId} (HTTP ${response.status})`)
  const body = await response.json()
  const originalUrl = body?.data?.original_url ?? body?.original_url
  if (!originalUrl) throw new Error(`Could not resolve media icon ${mediaId} (missing original_url)`)
  return new URL(originalUrl)
}

function mediaDownloadId(url) {
  if (url.hostname !== 'media.tikoapi.org') return ''
  const parts = url.pathname.split('/').filter(Boolean)
  const mediaIndex = parts.indexOf('media')
  if (mediaIndex < 0 || parts[mediaIndex + 2] !== 'download') return ''
  return parts[mediaIndex + 1] ?? ''
}

function resizedTikoCdnUrl(url, size) {
  if (url.hostname === 'data.tikocdn.org' && url.pathname.startsWith('/uploads/')) {
    return new URL(`https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=95,f=auto${url.pathname}`)
  }
  return url
}

async function downloadImage(url, file, label) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${label} (${response.status})`)
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`Could not download ${label} (expected image, got ${type || 'unknown content type'})`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  await writeFile(file, bytes)
}

function assetCatalogContents() {
  return `${JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)}\n`
}

function appIconContents() {
  return `${JSON.stringify({
    images: iosAppIconImages.map(({ idiom, size, scale, pixels }) => ({
      idiom,
      size,
      scale,
      filename: `app-icon-${pixels}.png`,
    })),
    info: { author: 'xcode', version: 1 },
  }, null, 2)}\n`
}

function swiftStaticName(app) {
  return app === 'yes-no' ? 'yesNo' : app.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function swiftCase(app) {
  return swiftStaticName(app)
}

function escapeSwift(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function swiftOptionalString(value) {
  return value ? `"${escapeSwift(value)}"` : 'nil'
}

function swiftHex(value) {
  const hex = String(value ?? '#000000').replace('#', '')
  return `0x${/^[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : '000000'}`
}

function swiftDarkHex(value) {
  const hex = String(value ?? '#000000').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '0x000000'
  const red = Math.max(0, Math.round(Number.parseInt(hex.slice(0, 2), 16) * 0.52))
  const green = Math.max(0, Math.round(Number.parseInt(hex.slice(2, 4), 16) * 0.52))
  const blue = Math.max(0, Math.round(Number.parseInt(hex.slice(4, 6), 16) * 0.52))
  return `0x${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`)
  }
}

function requireIdentifier(value, field) {
  requireNonEmptyString(value, field)
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error(`${field} must match /^[a-z][a-z0-9-]*$/`)
  }
}

function requireOptionalIdentifier(value, field) {
  if (value == null || value === '') return
  requireIdentifier(value, field)
}

function requireIconName(value, field) {
  requireNonEmptyString(value, field)
  if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error(`${field} must be an open-icon name like "ui/settings"`)
  }
}

function requireOptionalUrl(value, field) {
  if (value == null || value === '') return
  requireNonEmptyString(value, field)
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') throw new Error('must use https')
  } catch {
    throw new Error(`${field} must be a valid https URL`)
  }
}

function requireHexColor(value, field) {
  requireNonEmptyString(value, field)
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${field} must be a #RRGGBB hex color`)
  }
}

function requireOptionalSwiftSymbol(value, field) {
  if (value == null || value === '') return
  requireNonEmptyString(value, field)
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`${field} contains unsupported characters`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
