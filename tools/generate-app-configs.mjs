#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const endpoint = (process.env.TIKO_APP_CONFIG_URL ?? process.env.VITE_TIKO_APP_CONFIG_URL ?? 'https://app.tikoapi.org/v1/apps/config').replace(/\/$/, '')

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

async function main() {
  const configs = await fetchConfigs()
  for (const app of webApps) {
    await writeWebConfig(app, configs[app] ?? fallbackConfigs[app])
  }
  await writeIosSharedConfig(configs)
  for (const [app, file] of Object.entries(iosApps)) {
    await writeIosAppConfig(app, file)
  }
  console.log(`Generated app configs from ${endpoint}`)
}

async function fetchConfigs() {
  try {
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    const configs = body.configs ?? body.data?.configs
    if (!configs || typeof configs !== 'object') throw new Error('No configs object in response')
    return { ...fallbackConfigs, ...configs }
  } catch (error) {
    console.warn(`Could not fetch app configs (${error instanceof Error ? error.message : 'unknown error'}). Keeping fallback configs.`)
    return fallbackConfigs
  }
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

async function writeIfChanged(file, content) {
  await mkdir(dirname(file), { recursive: true })
  let old = ''
  try { old = await readFile(file, 'utf8') } catch {}
  if (old !== content) await writeFile(file, content)
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

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
