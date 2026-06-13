export type TikoAppColor = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
export type TikoColorMode = 'light' | 'dark' | 'system'
export type TikoSupportedLanguagesMode = 'tiko-defaults' | 'custom'

export interface TikoAppConfig {
  id: TikoAppColor
  title: string
  appColor: TikoAppColor
  appIcon: string
  appIconMediaCategory?: string
  appIconImageUrl?: string
  themeColor?: string
  supportedLanguagesMode?: TikoSupportedLanguagesMode
  supportedLanguages?: string[]
}

export const tikoAppConfigs: Record<TikoAppColor, TikoAppConfig> = {
  'yes-no': { id: 'yes-no', title: 'Yes No', appColor: 'yes-no', appIcon: 'ui/check-fat', appIconMediaCategory: 'emotions', themeColor: '#9b3fbd' },
  type: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'ui/type', appIconMediaCategory: 'letters', themeColor: '#2488ff' },
  cards: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'education/book-2', appIconMediaCategory: 'animals', themeColor: '#ff8a1f' },
  sequence: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'ui/list', appIconMediaCategory: 'routines', themeColor: '#16b8a6' },
  timer: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'ui/timer', appIconMediaCategory: 'transport', themeColor: '#f8c22e' },
  radio: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/headphones', appIconMediaCategory: 'music', themeColor: '#e84057' },
  media: { id: 'media', title: 'Media', appColor: 'media', appIcon: 'media/image', appIconMediaCategory: 'art', themeColor: '#2dd4bf' },
  admin: { id: 'admin', title: 'Admin', appColor: 'admin', appIcon: 'ui/settings', appIconMediaCategory: 'tools', themeColor: '#8b5cf6' },
  tiko: { id: 'tiko', title: 'Tiko', appColor: 'tiko', appIcon: 'ui/heart', appIconMediaCategory: 'tiko', themeColor: '#ef4f8f' },
  todo: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'ui/check-list', appIconMediaCategory: 'routines', themeColor: '#2488ff' },
  talk: { id: 'talk', title: 'Talk', appColor: 'talk', appIcon: 'ui/talk', appIconMediaCategory: 'communication', themeColor: '#17131c' },
}

export const tikoAppColors: Record<TikoAppColor, { label: string; primary: string; dark: string }> = {
  'yes-no': { label: 'Yes No', primary: 'var(--color-primary)', dark: 'color-mix(in srgb, var(--color-primary), var(--color-foreground) 42%)' },
  type: { label: 'Type', primary: 'var(--color-secondary)', dark: 'color-mix(in srgb, var(--color-secondary), var(--color-foreground) 42%)' },
  cards: { label: 'Cards', primary: 'var(--color-accent)', dark: 'color-mix(in srgb, var(--color-accent), var(--color-foreground) 42%)' },
  sequence: { label: 'Sequence', primary: 'var(--color-tertiary)', dark: 'color-mix(in srgb, var(--color-tertiary), var(--color-foreground) 42%)' },
  timer: { label: 'Timer', primary: 'var(--color-warning)', dark: 'color-mix(in srgb, var(--color-warning), var(--color-foreground) 42%)' },
  radio: { label: 'Radio', primary: '#e84057', dark: 'color-mix(in srgb, #e84057, var(--color-foreground) 42%)' },
  media: { label: 'Media', primary: '#2dd4bf', dark: 'color-mix(in srgb, #2dd4bf, var(--color-foreground) 42%)' },
  admin: { label: 'Admin', primary: '#8b5cf6', dark: 'color-mix(in srgb, #8b5cf6, var(--color-foreground) 42%)' },
  tiko: { label: 'Tiko', primary: 'var(--color-error)', dark: 'color-mix(in srgb, var(--color-error), var(--color-foreground) 42%)' },
  todo: { label: 'Todo', primary: 'var(--color-info)', dark: 'color-mix(in srgb, var(--color-info), var(--color-foreground) 42%)' },
  talk: { label: 'Talk', primary: 'color-mix(in srgb, var(--color-foreground), var(--color-background) 30%)', dark: 'color-mix(in srgb, var(--color-foreground), var(--color-background) 18%)' },
}

export const TIKO_PALETTE: string[] = [
  '#9b3fbd',
  '#2488ff',
  '#ff8a1f',
  '#16b8a6',
  '#f8c22e',
  '#e84057',
  '#2dd4bf',
  '#8b5cf6',
  '#ef4f8f',
  '#FFB347',
  '#FF6B6B',
  '#4ECDC4',
  '#A8E6CF',
  '#DDA0DD',
  '#FFD93D',
  '#82B1FF',
  '#87CEEB',
  '#98D8C8',
]

export interface TikoOpenIconOption {
  name: string
  label: string
}

export const tikoOpenIcons: TikoOpenIconOption[] = [
  { name: 'ui/check-fat', label: 'Check' },
  { name: 'wayfinding/cross', label: 'Cross' },
  { name: 'ui/question-mark-fat', label: 'Question' },
  { name: 'ui/add-fat', label: 'Plus' },
  { name: 'ui/subtract-fat', label: 'Minus' },
  { name: 'ui/info-fat', label: 'Info' },
  { name: 'ui/exclamation-mark-s', label: 'Important' },
  { name: 'ui/star-fat', label: 'Star' },
  { name: 'ui/circled-heart', label: 'Heart' },
  { name: 'ui/circled-check', label: 'Circle check' },
  { name: 'ui/circled-question-mark', label: 'Circle question' },
  { name: 'ui/squared-check', label: 'Square check' },
  { name: 'ui/squared-question-mark', label: 'Square question' },
  { name: 'ui/pointer-hand', label: 'Hand' },
  { name: 'ui/pointer-cross', label: 'Stop hand' },
  { name: 'ui/pointer-arrow', label: 'Pointer' },
  { name: 'ui/speech-balloon', label: 'Speech' },
  { name: 'ui/speech-balloon-square-text', label: 'Message' },
  { name: 'ui/talk-info', label: 'Talk info' },
  { name: 'ui/talk-question-mark', label: 'Talk question' },
  { name: 'ui/user', label: 'Person' },
  { name: 'ui/users', label: 'People' },
  { name: 'ui/user-heart', label: 'Care' },
  { name: 'ui/accessibility-person', label: 'Accessibility' },
  { name: 'ui/wheelchair-action', label: 'Wheelchair' },
  { name: 'ui/clock', label: 'Clock' },
  { name: 'ui/timer', label: 'Timer' },
  { name: 'ui/calendar-2', label: 'Calendar' },
  { name: 'ui/check-list', label: 'Checklist' },
  { name: 'ui/checklist-success', label: 'Checklist done' },
  { name: 'ui/books', label: 'Books' },
  { name: 'ui/home-location', label: 'Home' },
  { name: 'ui/building-house', label: 'House' },
  { name: 'ui/building-shop', label: 'Shop' },
  { name: 'ui/globe', label: 'Globe' },
  { name: 'ui/world', label: 'World' },
  { name: 'media/volume-iii', label: 'Voice' },
  { name: 'media/music-note', label: 'Music' },
  { name: 'media/headphones', label: 'Headphones' },
  { name: 'media/microphone', label: 'Microphone' },
  { name: 'media/camera', label: 'Camera' },
  { name: 'media/image', label: 'Image' },
  { name: 'media/playback-play', label: 'Play' },
  { name: 'media/playback-pause', label: 'Pause' },
  { name: 'food-drinks/bottle', label: 'Bottle' },
  { name: 'food-drinks/bread-slice', label: 'Bread' },
  { name: 'food-drinks/hamburger', label: 'Food' },
  { name: 'animals/cat-head', label: 'Cat' },
  { name: 'animals/fish', label: 'Fish' },
  { name: 'animals/turtle', label: 'Turtle' },
  { name: 'misc/toy-blocks', label: 'Toys' },
  { name: 'misc/furniture-bed', label: 'Bed' },
  { name: 'misc/plant', label: 'Plant' },
  { name: 'misc/fire', label: 'Fire' },
  { name: 'misc/key', label: 'Key' },
  { name: 'misc/lock', label: 'Lock' },
  { name: 'misc/unlock', label: 'Unlock' },
  { name: 'misc/shield-check', label: 'Safe' },
  { name: 'arrows/arrow-headed-left', label: 'Left' },
  { name: 'arrows/arrow-headed-right', label: 'Right' },
  { name: 'arrows/arrow-headed-up', label: 'Up' },
  { name: 'arrows/arrow-headed-down', label: 'Down' },
]

export function tikoNormalizeOpenIcon(icon: string | undefined): string {
  if (!icon) return ''
  if (icon.includes('/')) return icon
  if (import.meta.env?.DEV) console.warn(`[tiko] Unknown icon "${icon}" rewritten to "ui/question-mark-fat"`)
  return 'ui/question-mark-fat'
}
