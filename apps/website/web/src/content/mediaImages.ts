import { tikoMediaImageUrl, type TikoImageSize } from '@tiko/ui'

/**
 * Curated Tiko Media images used as section and card artwork.
 *
 * The website used to decorate its cards from a `/media?limit=24&page=1` pool,
 * which is ordered newest-first — so a card about "Open instantly. No setup."
 * would illustrate itself with whatever had been uploaded that week. Every slot
 * now names the image it wants.
 *
 * Media IDs are stable. Pick replacements from https://media.tikoapps.org — the
 * API also supports `?search=`, `?category=` and `/media/facets` for browsing.
 */
export const mediaImages = {
  // ─── People ───────────────────────────────────────────────────────────────
  adultAndChildTalking: '12728952-0013-4d87-b3a7-c9108b90ae96', // Speech Therapist with Boy
  adultAndChildrenLearning: '1ebfe98f-07b5-4e02-a0ab-c00985496bba', // Speech Therapist with Kids
  adultAndGirlPractising: 'a1fda77d-294a-4868-8388-d70a92a83693', // Speech Therapist with Girl
  adultAndChildWithTablet: '91eb9d63-1f02-4374-b948-1649ef884dda', // Speech Therapist with Kid
  childSayingHi: 'c6f06e3f-362c-4221-8c02-608d520ea253', // Boy Saying Hi
  childReading: 'c6d31af0-2734-4c56-b818-c45662dfe003', // Reading Child
  teacher: 'ae658525-5db8-40e5-87fa-ab2a1c8aabef', // Teacher
  caregiver: '242925fe-1e2d-4a6a-9ced-71dcd7cc19cc', // Mother
  doctor: '8b4f7c38-ef37-4af5-8b0d-4ff42c784746', // Woman Doctor

  // ─── Devices ──────────────────────────────────────────────────────────────
  laptop: '4f073cca-240c-47fe-a68a-270fd3a0ea45',
  smartphone: '8f3fdf0a-0d16-44f0-a9f5-79dff10186a9',
  tablet: '2851f182-37d3-4f3d-a8f4-dc743edf38d9',
  allDevices: '4409f071-7f06-449d-91c5-6301e0d4e7b7', // iPhone, iPad, and Monitor

  // ─── Objects & ideas ──────────────────────────────────────────────────────
  lightBulb: 'ddb65c09-ef61-4bd9-ae74-4efd0747066e',
  puzzlePiece: '14a58fca-33fc-44a0-a283-9dd16566eabb',
  globe: 'aed21647-bef1-4749-b418-5306bab70beb',
  worldMap: '447b686c-632f-4687-852f-77b17c4db374',
  giftBox: '655777b6-58d7-46d0-823b-c46f69c14599',
  balloons: '003db380-cc66-47e8-b638-e5db1578636e',
  coin: 'ea74a931-acbe-4fe1-82e3-8fb882638990', // Gold Coin
  todoList: 'd165c63c-818f-47cd-b6e5-2a3c3e87dce0',
  envelope: '0fb6637c-8370-4e4f-8d71-35f2e8369f40', // Envelope Icon
  gear: '41ef75eb-2f29-416f-a67a-3996262f37e3',
  speechBalloon: '575d659f-f984-4948-8800-5d40fc63bda7',
  calculator: '05a0ef80-006c-4ccc-9368-56d529c28dd7',
  chalkboard: '1bd66fcd-d8a9-4a91-9ec5-54aba5238692',
  alphabetBlocks: 'ff7789b1-9b24-42de-8c7a-bb72b6608301',
  backpack: '3cb14c8e-2f73-4add-a5f6-fc390bd5b768',
  penAndNotebook: '6d329a8c-c1c2-407d-9b6c-20ab37e17307',
  alarmClock: 'ec6bad5e-8cbe-4934-b1c8-d66d80098f95',
} as const

export type MediaImageName = keyof typeof mediaImages

/** URL for a curated image. `medium` (800px) suits cards and split-media panels. */
export function mediaImage(name: MediaImageName, size: TikoImageSize = 'medium'): string {
  return tikoMediaImageUrl(mediaImages[name], size)
}

/**
 * Categories the library-showcase components draw from.
 *
 * MediaStream is meant to show the breadth of Tiko Media, so a broad pull is
 * right — but "newest first, unfiltered" surfaced whatever had just
 * been generated. Narrowing to child-facing categories keeps the showcase on brand
 * without pinning it to a fixed set.
 */
export const showcaseCategories = 'children,education,animals,food,communication,toys,nature'
