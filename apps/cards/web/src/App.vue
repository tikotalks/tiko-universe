<script setup lang="ts">
import { computed, h, inject, markRaw, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Button, Icon, Popup, ContextMenu, type ContextMenuItem, type PopupService } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type CardsSettings, type CardsState, type CardsCollection, type CardsTile } from '@tiko/data'
import { useTikoMedia, COLLECTION_CATEGORY_MAP, type TikoMedia } from '@tiko/media'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.scss'

// ---------------------------------------------------------------------------
// popupService (provided in main.ts)
// ---------------------------------------------------------------------------
const popup = inject<PopupService>('popupService')!

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const storageKey = 'tiko:cards'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'cards' as const
const apiBaseUrl = resolveApiBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()

type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  collections?: CardsCollection[]
  navPath?: string[]
  hiddenDefaults?: string[]
  collectionOverrides?: Record<string, Partial<{ title: string; icon: string; color: string; image: string; order: number }>>
  tileOverrides?: Record<string, Partial<{ title: string; speech: string; color: string; image: string }>>
  editMode?: boolean
}

interface StoredIdentity {
  userId?: string
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
}

// ---------------------------------------------------------------------------
// Virtual default collections (hardcoded, never stored in DB)
// ---------------------------------------------------------------------------

function makeTile(id: string, title: string, speech: string): CardsTile {
  return { id, title, type: 'card', speech }
}

const VIRTUAL_DEFAULTS: CardsCollection[] = [
  {
    id: '__default_animals',
    title: 'Animals',
    color: '#FFB347',
    order: 0,
    tiles: [
      makeTile('animal_dog', 'Dog', 'Dog'),
      makeTile('animal_cat', 'Cat', 'Cat'),
      makeTile('animal_bird', 'Bird', 'Bird'),
      makeTile('animal_fish', 'Fish', 'Fish'),
      makeTile('animal_horse', 'Horse', 'Horse'),
      makeTile('animal_cow', 'Cow', 'Cow'),
      makeTile('animal_pig', 'Pig', 'Pig'),
      makeTile('animal_chicken', 'Chicken', 'Chicken'),
      makeTile('animal_duck', 'Duck', 'Duck'),
      makeTile('animal_sheep', 'Sheep', 'Sheep'),
      makeTile('animal_rabbit', 'Rabbit', 'Rabbit'),
      makeTile('animal_mouse', 'Mouse', 'Mouse'),
      makeTile('animal_frog', 'Frog', 'Frog'),
      makeTile('animal_butterfly', 'Butterfly', 'Butterfly'),
      makeTile('animal_snake', 'Snake', 'Snake'),
      makeTile('animal_turtle', 'Turtle', 'Turtle'),
      makeTile('animal_lion', 'Lion', 'Lion'),
      makeTile('animal_elephant', 'Elephant', 'Elephant'),
      makeTile('animal_giraffe', 'Giraffe', 'Giraffe'),
      makeTile('animal_monkey', 'Monkey', 'Monkey'),
      makeTile('animal_penguin', 'Penguin', 'Penguin'),
      makeTile('animal_bear', 'Bear', 'Bear'),
      makeTile('animal_zebra', 'Zebra', 'Zebra'),
      makeTile('animal_owl', 'Owl', 'Owl'),
      makeTile('animal_bee', 'Bee', 'Bee'),
      makeTile('animal_ant', 'Ant', 'Ant'),
      makeTile('animal_spider', 'Spider', 'Spider'),
      makeTile('animal_dolphin', 'Dolphin', 'Dolphin'),
      makeTile('animal_shark', 'Shark', 'Shark'),
      makeTile('animal_whale', 'Whale', 'Whale'),
      makeTile('animal_crab', 'Crab', 'Crab'),
      makeTile('animal_octopus', 'Octopus', 'Octopus'),
      makeTile('animal_parrot', 'Parrot', 'Parrot'),
      makeTile('animal_eagle', 'Eagle', 'Eagle'),
      makeTile('animal_flamingo', 'Flamingo', 'Flamingo'),
      makeTile('animal_fox', 'Fox', 'Fox'),
      makeTile('animal_deer', 'Deer', 'Deer'),
      makeTile('animal_wolf', 'Wolf', 'Wolf'),
      makeTile('animal_crocodile', 'Crocodile', 'Crocodile'),
    ],
  },
  {
    id: '__default_colors',
    title: 'Colors',
    color: '#FF6B6B',
    order: 1,
    tiles: [
      makeTile('color_red', 'Red', 'Red'),
      makeTile('color_orange', 'Orange', 'Orange'),
      makeTile('color_yellow', 'Yellow', 'Yellow'),
      makeTile('color_green', 'Green', 'Green'),
      makeTile('color_blue', 'Blue', 'Blue'),
      makeTile('color_purple', 'Purple', 'Purple'),
      makeTile('color_pink', 'Pink', 'Pink'),
      makeTile('color_brown', 'Brown', 'Brown'),
      makeTile('color_black', 'Black', 'Black'),
      makeTile('color_white', 'White', 'White'),
      makeTile('color_gray', 'Gray', 'Gray'),
      makeTile('color_gold', 'Gold', 'Gold'),
      makeTile('color_silver', 'Silver', 'Silver'),
      makeTile('color_beige', 'Beige', 'Beige'),
      makeTile('color_maroon', 'Maroon', 'Maroon'),
      makeTile('color_navy', 'Navy', 'Navy'),
      makeTile('color_teal', 'Teal', 'Teal'),
      makeTile('color_coral', 'Coral', 'Coral'),
      makeTile('color_lime', 'Lime', 'Lime'),
      makeTile('color_lavender', 'Lavender', 'Lavender'),
      makeTile('color_cyan', 'Cyan', 'Cyan'),
      makeTile('color_magenta', 'Magenta', 'Magenta'),
      makeTile('color_olive', 'Olive', 'Olive'),
      makeTile('color_peach', 'Peach', 'Peach'),
    ],
  },
  {
    id: '__default_food',
    title: 'Food & Drinks',
    color: '#4ECDC4',
    order: 2,
    tiles: [
      makeTile('food_apple', 'Apple', 'Apple'),
      makeTile('food_banana', 'Banana', 'Banana'),
      makeTile('food_bread', 'Bread', 'Bread'),
      makeTile('food_milk', 'Milk', 'Milk'),
      makeTile('food_water', 'Water', 'Water'),
      makeTile('food_juice', 'Juice', 'Juice'),
      makeTile('food_cheese', 'Cheese', 'Cheese'),
      makeTile('food_rice', 'Rice', 'Rice'),
      makeTile('food_pizza', 'Pizza', 'Pizza'),
      makeTile('food_cake', 'Cake', 'Cake'),
      makeTile('food_egg', 'Egg', 'Egg'),
      makeTile('food_grape', 'Grape', 'Grape'),
      makeTile('food_strawberry', 'Strawberry', 'Strawberry'),
      makeTile('food_carrot', 'Carrot', 'Carrot'),
      makeTile('food_tomato', 'Tomato', 'Tomato'),
      makeTile('food_potato', 'Potato', 'Potato'),
      makeTile('food_corn', 'Corn', 'Corn'),
      makeTile('food_onion', 'Onion', 'Onion'),
      makeTile('food_mushroom', 'Mushroom', 'Mushroom'),
      makeTile('food_broccoli', 'Broccoli', 'Broccoli'),
      makeTile('food_soup', 'Soup', 'Soup'),
      makeTile('food_pasta', 'Pasta', 'Pasta'),
      makeTile('food_burger', 'Burger', 'Burger'),
      makeTile('food_hotdog', 'Hot Dog', 'Hot Dog'),
      makeTile('food_icecream', 'Ice Cream', 'Ice Cream'),
      makeTile('food_cookie', 'Cookie', 'Cookie'),
      makeTile('food_chocolate', 'Chocolate', 'Chocolate'),
      makeTile('food_donut', 'Donut', 'Donut'),
      makeTile('food_pancake', 'Pancake', 'Pancake'),
      makeTile('food_cereal', 'Cereal', 'Cereal'),
      makeTile('food_popcorn', 'Popcorn', 'Popcorn'),
      makeTile('food_watermelon', 'Watermelon', 'Watermelon'),
      makeTile('food_lemon', 'Lemon', 'Lemon'),
      makeTile('food_pineapple', 'Pineapple', 'Pineapple'),
      makeTile('food_mango', 'Mango', 'Mango'),
      makeTile('food_cherry', 'Cherry', 'Cherry'),
      makeTile('food_pear', 'Pear', 'Pear'),
      makeTile('food_orange_fruit', 'Orange', 'Orange'),
      makeTile('food_grapefruit', 'Grapefruit', 'Grapefruit'),
      makeTile('food_kiwi', 'Kiwi', 'Kiwi'),
      makeTile('food_peach_fruit', 'Peach', 'Peach'),
      makeTile('food_plum', 'Plum', 'Plum'),
      makeTile('food_cucumber', 'Cucumber', 'Cucumber'),
      makeTile('food_pepper', 'Pepper', 'Pepper'),
      makeTile('food_avocado', 'Avocado', 'Avocado'),
      makeTile('food_sandwich', 'Sandwich', 'Sandwich'),
      makeTile('food_taco', 'Taco', 'Taco'),
      makeTile('food_sushi', 'Sushi', 'Sushi'),
      makeTile('food_noodles', 'Noodles', 'Noodles'),
      makeTile('food_sausage', 'Sausage', 'Sausage'),
      makeTile('food_tea', 'Tea', 'Tea'),
      makeTile('food_coffee', 'Coffee', 'Coffee'),
      makeTile('food_smoothie', 'Smoothie', 'Smoothie'),
    ],
  },
  {
    id: '__default_body',
    title: 'Body Parts',
    color: '#A8E6CF',
    order: 3,
    tiles: [
      makeTile('body_head', 'Head', 'Head'),
      makeTile('body_hair', 'Hair', 'Hair'),
      makeTile('body_face', 'Face', 'Face'),
      makeTile('body_eyes', 'Eyes', 'Eyes'),
      makeTile('body_nose', 'Nose', 'Nose'),
      makeTile('body_mouth', 'Mouth', 'Mouth'),
      makeTile('body_ears', 'Ears', 'Ears'),
      makeTile('body_teeth', 'Teeth', 'Teeth'),
      makeTile('body_tongue', 'Tongue', 'Tongue'),
      makeTile('body_chin', 'Chin', 'Chin'),
      makeTile('body_neck', 'Neck', 'Neck'),
      makeTile('body_shoulders', 'Shoulders', 'Shoulders'),
      makeTile('body_chest', 'Chest', 'Chest'),
      makeTile('body_back', 'Back', 'Back'),
      makeTile('body_stomach', 'Stomach', 'Stomach'),
      makeTile('body_hands', 'Hands', 'Hands'),
      makeTile('body_fingers', 'Fingers', 'Fingers'),
      makeTile('body_thumb', 'Thumb', 'Thumb'),
      makeTile('body_wrist', 'Wrist', 'Wrist'),
      makeTile('body_arms', 'Arms', 'Arms'),
      makeTile('body_elbow', 'Elbow', 'Elbow'),
      makeTile('body_legs', 'Legs', 'Legs'),
      makeTile('body_knees', 'Knees', 'Knees'),
      makeTile('body_feet', 'Feet', 'Feet'),
      makeTile('body_toes', 'Toes', 'Toes'),
      makeTile('body_ankle', 'Ankle', 'Ankle'),
      makeTile('body_heel', 'Heel', 'Heel'),
    ],
  },
  {
    id: '__default_shapes',
    title: 'Shapes',
    color: '#DDA0DD',
    order: 4,
    tiles: [
      makeTile('shape_circle', 'Circle', 'Circle'),
      makeTile('shape_square', 'Square', 'Square'),
      makeTile('shape_triangle', 'Triangle', 'Triangle'),
      makeTile('shape_rectangle', 'Rectangle', 'Rectangle'),
      makeTile('shape_oval', 'Oval', 'Oval'),
      makeTile('shape_star', 'Star', 'Star'),
      makeTile('shape_heart', 'Heart', 'Heart'),
      makeTile('shape_diamond', 'Diamond', 'Diamond'),
      makeTile('shape_hexagon', 'Hexagon', 'Hexagon'),
      makeTile('shape_pentagon', 'Pentagon', 'Pentagon'),
      makeTile('shape_crescent', 'Crescent', 'Crescent'),
      makeTile('shape_cross', 'Cross', 'Cross'),
      makeTile('shape_arrow', 'Arrow', 'Arrow'),
      makeTile('shape_sphere', 'Sphere', 'Sphere'),
      makeTile('shape_cube', 'Cube', 'Cube'),
      makeTile('shape_pyramid', 'Pyramid', 'Pyramid'),
      makeTile('shape_cylinder', 'Cylinder', 'Cylinder'),
      makeTile('shape_cone', 'Cone', 'Cone'),
    ],
  },
  {
    id: '__default_emotions',
    title: 'Emotions',
    color: '#FFD93D',
    order: 5,
    tiles: [
      makeTile('emotion_happy', 'Happy', 'Happy'),
      makeTile('emotion_sad', 'Sad', 'Sad'),
      makeTile('emotion_angry', 'Angry', 'Angry'),
      makeTile('emotion_scared', 'Scared', 'Scared'),
      makeTile('emotion_surprised', 'Surprised', 'Surprised'),
      makeTile('emotion_tired', 'Tired', 'Tired'),
      makeTile('emotion_excited', 'Excited', 'Excited'),
      makeTile('emotion_calm', 'Calm', 'Calm'),
      makeTile('emotion_confused', 'Confused', 'Confused'),
      makeTile('emotion_shy', 'Shy', 'Shy'),
      makeTile('emotion_proud', 'Proud', 'Proud'),
      makeTile('emotion_grumpy', 'Grumpy', 'Grumpy'),
      makeTile('emotion_brave', 'Brave', 'Brave'),
      makeTile('emotion_curious', 'Curious', 'Curious'),
      makeTile('emotion_lonely', 'Lonely', 'Lonely'),
      makeTile('emotion_grateful', 'Grateful', 'Grateful'),
      makeTile('emotion_nervous', 'Nervous', 'Nervous'),
      makeTile('emotion_silly', 'Silly', 'Silly'),
      makeTile('emotion_love', 'Love', 'Love'),
      makeTile('emotion_bored', 'Bored', 'Bored'),
    ],
  },
  {
    id: '__default_transport',
    title: 'Transport',
    color: '#82B1FF',
    order: 6,
    tiles: [
      makeTile('transport_car', 'Car', 'Car'),
      makeTile('transport_bus', 'Bus', 'Bus'),
      makeTile('transport_train', 'Train', 'Train'),
      makeTile('transport_truck', 'Truck', 'Truck'),
      makeTile('transport_airplane', 'Airplane', 'Airplane'),
      makeTile('transport_helicopter', 'Helicopter', 'Helicopter'),
      makeTile('transport_boat', 'Boat', 'Boat'),
      makeTile('transport_ship', 'Ship', 'Ship'),
      makeTile('transport_bicycle', 'Bicycle', 'Bicycle'),
      makeTile('transport_motorcycle', 'Motorcycle', 'Motorcycle'),
      makeTile('transport_scooter', 'Scooter', 'Scooter'),
      makeTile('transport_taxi', 'Taxi', 'Taxi'),
      makeTile('transport_ambulance', 'Ambulance', 'Ambulance'),
      makeTile('transport_firetruck', 'Fire Truck', 'Fire Truck'),
      makeTile('transport_policecar', 'Police Car', 'Police Car'),
      makeTile('transport_tractor', 'Tractor', 'Tractor'),
      makeTile('transport_rocket', 'Rocket', 'Rocket'),
      makeTile('transport_submarine', 'Submarine', 'Submarine'),
      makeTile('transport_balloon', 'Hot Air Balloon', 'Hot Air Balloon'),
      makeTile('transport_skateboard', 'Skateboard', 'Skateboard'),
      makeTile('transport_rollercoaster', 'Roller Coaster', 'Roller Coaster'),
      makeTile('transport_jeep', 'Jeep', 'Jeep'),
      makeTile('transport_van', 'Van', 'Van'),
      makeTile('transport_canoe', 'Canoe', 'Canoe'),
    ],
  },
  {
    id: '__default_numbers',
    title: 'Numbers',
    color: '#87CEEB',
    order: 7,
    tiles: [
      makeTile('num_1', 'One', 'One'),
      makeTile('num_2', 'Two', 'Two'),
      makeTile('num_3', 'Three', 'Three'),
      makeTile('num_4', 'Four', 'Four'),
      makeTile('num_5', 'Five', 'Five'),
      makeTile('num_6', 'Six', 'Six'),
      makeTile('num_7', 'Seven', 'Seven'),
      makeTile('num_8', 'Eight', 'Eight'),
      makeTile('num_9', 'Nine', 'Nine'),
      makeTile('num_10', 'Ten', 'Ten'),
      makeTile('num_11', 'Eleven', 'Eleven'),
      makeTile('num_12', 'Twelve', 'Twelve'),
      makeTile('num_13', 'Thirteen', 'Thirteen'),
      makeTile('num_14', 'Fourteen', 'Fourteen'),
      makeTile('num_15', 'Fifteen', 'Fifteen'),
      makeTile('num_16', 'Sixteen', 'Sixteen'),
      makeTile('num_17', 'Seventeen', 'Seventeen'),
      makeTile('num_18', 'Eighteen', 'Eighteen'),
      makeTile('num_19', 'Nineteen', 'Nineteen'),
      makeTile('num_20', 'Twenty', 'Twenty'),
    ],
  },
  {
    id: '__default_letters',
    title: 'Letters',
    color: '#98D8C8',
    order: 8,
    tiles: [
      makeTile('letter_a', 'A', 'A'),
      makeTile('letter_b', 'B', 'B'),
      makeTile('letter_c', 'C', 'C'),
      makeTile('letter_d', 'D', 'D'),
      makeTile('letter_e', 'E', 'E'),
      makeTile('letter_f', 'F', 'F'),
      makeTile('letter_g', 'G', 'G'),
      makeTile('letter_h', 'H', 'H'),
      makeTile('letter_i', 'I', 'I'),
      makeTile('letter_j', 'J', 'J'),
      makeTile('letter_k', 'K', 'K'),
      makeTile('letter_l', 'L', 'L'),
      makeTile('letter_m', 'M', 'M'),
      makeTile('letter_n', 'N', 'N'),
      makeTile('letter_o', 'O', 'O'),
      makeTile('letter_p', 'P', 'P'),
      makeTile('letter_q', 'Q', 'Q'),
      makeTile('letter_r', 'R', 'R'),
      makeTile('letter_s', 'S', 'S'),
      makeTile('letter_t', 'T', 'T'),
      makeTile('letter_u', 'U', 'U'),
      makeTile('letter_v', 'V', 'V'),
      makeTile('letter_w', 'W', 'W'),
      makeTile('letter_x', 'X', 'X'),
      makeTile('letter_y', 'Y', 'Y'),
      makeTile('letter_z', 'Z', 'Z'),
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://identity.tikoapi.org/v1').replace(/\/$/, '')
}

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function toLanguage(value: string | undefined): TikoLanguage {
  return tikoLanguages.includes(value as TikoLanguage) ? value as TikoLanguage : defaultLanguage
}

function toColorMode(value: string | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const userCollections = ref<CardsCollection[]>(stored.collections ?? [])
const navPath = ref<string[]>(stored.navPath ?? [])
const hiddenDefaults = ref<string[]>(stored.hiddenDefaults ?? [])
const collectionOverrides = ref<Record<string, Partial<{ title: string; icon: string; color: string; image: string; order: number }>>>(stored.collectionOverrides ?? {})
const tileOverrides = ref<Record<string, Partial<{ title: string; speech: string; color: string; image: string }>>>(stored.tileOverrides ?? {})
const editMode = ref(false)
const settingsOpen = ref(false)
const speakStatus = ref<SpeakStatus>('idle')
const currentPage = ref(1)

// Reactive columns and items per page based on viewport
const columns = computed(() => {
  if (typeof window === 'undefined') return 3
  const w = window.innerWidth
  if (w >= 640) return 5
  if (w >= 480) return 4
  return 3
})

const itemsPerPage = computed(() => {
  if (typeof window === 'undefined') return 12
  // Estimate available height: viewport minus header (~56px), dots (~30px), gaps
  const availableHeight = window.innerHeight - 100
  const tileWidth = (window.innerWidth - 16 - 12 * (columns.value - 1)) / columns.value // tile size with gap
  const rows = Math.max(2, Math.floor(availableHeight / tileWidth))
  return columns.value * rows
})
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })
const newItemName = ref('')
const userKind = ref<'anonymous' | 'account'>('anonymous')

// ---------------------------------------------------------------------------
// Media integration (Supabase images for default collections)
// ---------------------------------------------------------------------------

const { fetchByCategory, search: searchMedia, loading: mediaLoading } = useTikoMedia()
const tileMediaMap = ref<Record<string, string>>({}) // tile.id → original_url
const colThumbMap = ref<Record<string, string>>({}) // collection.id → original_url (thumbnail)
const fetchedCollections = ref<Set<string>>(new Set()) // track which collections have been fetched

// ---------------------------------------------------------------------------
// Labels (i18n-driven)
// ---------------------------------------------------------------------------

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.cards.appName),
    emptyCollections: i18n.t(tikoI18nKeys.cards.collections.empty),
    emptyTiles: i18n.t(tikoI18nKeys.cards.tiles.empty),
    addNewCollection: i18n.t(tikoI18nKeys.cards.collections.addNew),
    addNewTile: i18n.t(tikoI18nKeys.cards.tiles.addNew),
    newNameCollection: i18n.t(tikoI18nKeys.cards.collections.newName),
    newNameTile: i18n.t(tikoI18nKeys.cards.tiles.newName),
    create: i18n.t(tikoI18nKeys.cards.collections.create),
    restoreDefaults: i18n.t(tikoI18nKeys.cards.settings.restoreDefaults),
    restoreConfirm: i18n.t(tikoI18nKeys.cards.settings.restoreConfirm),
    fallback: i18n.t(tikoI18nKeys.cards.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.cards.status.speechError),
  }
})

// ---------------------------------------------------------------------------
// Computed: merged root collections
// ---------------------------------------------------------------------------

function applyOverrides(collection: CardsCollection): CardsCollection {
  const overrides = collectionOverrides.value[collection.id]
  if (!overrides) return collection
  return {
    ...collection,
    title: overrides.title ?? collection.title,
    icon: overrides.icon ?? collection.icon,
    color: overrides.color ?? collection.color,
    image: overrides.image ?? collection.image,
    order: overrides.order ?? collection.order,
  }
}

const rootCollections = computed<CardsCollection[]>(() => {
  const defaults = VIRTUAL_DEFAULTS
    .filter((c) => !hiddenDefaults.value.includes(c.id))
    .map(applyOverrides)
  const all = [...defaults, ...userCollections.value]
  return all.sort((a, b) => a.order - b.order)
})

// ---------------------------------------------------------------------------
// Computed: navigation state
// ---------------------------------------------------------------------------

const isAtRoot = computed(() => navPath.value.length === 0)

const currentCollection = computed<CardsCollection | null>(() => {
  if (isAtRoot.value) return null
  const allCollections = rootCollections.value
  let current: CardsCollection | null = null
  for (const id of navPath.value) {
    const search: CardsCollection[] = current ? current.tiles.filter((t): t is CardsTile & { type: 'group' } => t.type === 'group') as unknown as CardsCollection[] : allCollections
    // For nested groups, look for a tile that acts as a sub-collection
    // For now, we only support one level of navigation into root collections
    current = search.find((c: CardsCollection) => c.id === id) ?? null
    if (!current) return null
  }
  return current
})

const currentTiles = computed<CardsTile[]>(() => {
  return currentCollection.value?.tiles ?? []
})

const breadcrumbLabels = computed<string[]>(() => {
  return navPath.value.map((id) => {
    const col = rootCollections.value.find((c) => c.id === id)
    return col?.title ?? id
  })
})

// ---------------------------------------------------------------------------
// Computed: pagination
// ---------------------------------------------------------------------------

const totalPages = computed(() => {
  const items = isAtRoot.value ? rootCollections.value : currentTiles.value
  return Math.max(1, Math.ceil(items.length / itemsPerPage.value))
})

// All visible items (not sliced by page)
const allChoices = computed(() => {
  const items = isAtRoot.value ? rootCollections.value : currentTiles.value
  if (isAtRoot.value) {
    return items.map((col: any) => {
      const override = collectionOverrides.value[col.id]
      return {
        id: col.id,
        label: override?.title ?? col.title,
        color: override?.color ?? col.color,
        imageSrc: cdnUrl(override?.image || colThumbMap.value[col.id] || col.image),
        speechText: col.title,
      }
    })
  }
  return items.map((tile: any) => {
    const override = tileOverrides.value[tile.id]
    return {
      id: tile.id,
      label: override?.title ?? tile.title,
      speechText: override?.speech ?? tile.speech ?? tile.title,
      imageSrc: cdnUrl(override?.image || tileMediaMap.value[tile.id] || tile.image),
      color: override?.color,
    }
  })
})

// Chunk all choices into pages
const allPages = computed(() => {
  const pages: typeof allChoices.value[] = []
  for (let i = 0; i < allChoices.value.length; i += itemsPerPage.value) {
    pages.push(allChoices.value.slice(i, i + itemsPerPage.value))
  }
  return pages.length > 0 ? pages : [[]] // always at least one empty page
})

const emptyMessage = computed(() => {
  if (isAtRoot.value) return labels.value.emptyCollections
  return labels.value.emptyTiles
})

const editPlaceholder = computed(() => {
  if (isAtRoot.value) return labels.value.newNameCollection
  return labels.value.newNameTile
})

const hasHiddenDefaults = computed(() => hiddenDefaults.value.length > 0)

const headerActions = computed(() => {
  const actions: Array<{ id: string; label: string; icon: string; active?: boolean; visible?: boolean }> = []

  // Back button when inside a collection
  if (navPath.value.length > 0) {
    actions.push({ id: 'back', label: 'Back', icon: 'ui/arrow-left', visible: true })
  }

  actions.push({ id: 'manage', label: 'Add', icon: 'ui/plus' })
  return actions
})

// ---------------------------------------------------------------------------
// Color mode
// ---------------------------------------------------------------------------

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    collections: userCollections.value,
    navPath: navPath.value,
    hiddenDefaults: hiddenDefaults.value,
    collectionOverrides: collectionOverrides.value,
    tileOverrides: tileOverrides.value,
    editMode: editMode.value,
  })
}

function saveIdentity(bundle: IdentityBundle) {
  if (!bundle.session?.token) throw new Error('Identity response did not include a session token.')
  sessionToken.value = bundle.session.token
  userKind.value = bundle.account?.emailVerified ? 'account' : 'anonymous'
  writeJson(identityStorageKey, {
    userId: bundle.subject.id,
    deviceId: bundle.device?.id,
    deviceSecret: bundle.device?.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt,
  } satisfies StoredIdentity)
}

// ---------------------------------------------------------------------------
// Bootstrap: identity + remote data
// ---------------------------------------------------------------------------

async function bootstrapIdentity() {
  const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})

  try {
    const bundle = await identityClient.getCookieSession()
    saveIdentity(bundle)
    return
  } catch {
    // Fall through to local bearer/device fallback when the shared app-family cookie is missing or expired.
  }

  if (storedIdentity.sessionToken) {
    try {
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      saveIdentity(bundle)
      return
    } catch {
      // Fall through to device bootstrap.
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Cards web',
      platform: 'web',
    },
  })
  saveIdentity(bundle)
}

function applySettings(settings: CardsSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  hiddenDefaults.value = settings.hiddenDefaults ?? []
  collectionOverrides.value = settings.collectionOverrides ?? {}
  tileOverrides.value = (settings as any).tileOverrides ?? {}
  settingsVersion.value = version
}

function applyState(state: CardsState, version?: number) {
  userCollections.value = state.collections ?? []
  navPath.value = state.navPath ?? []
  editMode.value = state.editMode ?? false
  stateVersion.value = version
}

async function hydrateRemoteData() {
  if (!sessionToken.value) return
  const [settings, state] = await Promise.all([
    dataClient.getSettings(appId, sessionToken.value),
    dataClient.getState(appId, sessionToken.value),
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)
}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putSettings(appId, sessionToken.value, {
      language: language.value,
      colorMode: colorMode.value,
      hiddenDefaults: hiddenDefaults.value,
      collectionOverrides: collectionOverrides.value,
      tileOverrides: tileOverrides.value,
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Remote will retry on next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, sessionToken.value, {
      collections: userCollections.value,
      navPath: navPath.value,
      editMode: editMode.value,
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Remote will retry on next edit.
  }
}

// ---------------------------------------------------------------------------
// Media integration: fetch images for default collection tiles
// ---------------------------------------------------------------------------

async function fetchMediaForCollection(collectionId: string) {
  const categories = COLLECTION_CATEGORY_MAP[collectionId]
  console.log('[Cards] fetchMediaForCollection:', collectionId, 'categories:', categories)
  if (!categories || fetchedCollections.value.has(collectionId)) {
    console.log('[Cards] skip:', !categories ? 'no categories' : 'already fetched')
    return
  }

  fetchedCollections.value.add(collectionId)
  try {
    const results = await fetchByCategory(categories, { limit: 50 })
    console.log('[Cards] fetched:', results.length, 'media items')
    if (results.length === 0) { console.log('[Cards] no results, returning'); return }

    // Build a map from media name/title keywords to original_url
    const mediaByUrl = new Map<string, TikoMedia>()
    const mediaByName = new Map<string, TikoMedia>()
    for (const m of results) {
      mediaByUrl.set(m.original_url, m)
      mediaByName.set(m.name.toLowerCase(), m)
      mediaByName.set(m.title.toLowerCase(), m)
      // Also index by each tag and category for fuzzy matching
    }

    // Find the default collection and match tiles to media
    const collection = VIRTUAL_DEFAULTS.find((c) => c.id === collectionId)
    if (!collection) return

    const updates: Record<string, string> = {}
    const matchedUrls = new Set<string>()

    // First pass: exact matches on tile title/name
    for (const tile of collection.tiles) {
      const key = tile.title.toLowerCase().replace(/\s+/g, '_')
      if (mediaByName.has(key)) {
        const media = mediaByName.get(key)!
        updates[tile.id] = media.original_url
        matchedUrls.add(media.original_url)
      } else if (mediaByName.has(tile.title.toLowerCase())) {
        const media = mediaByName.get(tile.title.toLowerCase())!
        updates[tile.id] = media.original_url
        matchedUrls.add(media.original_url)
      }
    }

    // Second pass: partial/tag matching for unmatched tiles
    for (const tile of collection.tiles) {
      if (updates[tile.id]) continue
      const tileWords = tile.title.toLowerCase().split(/\s+/)
      for (const m of results) {
        if (matchedUrls.has(m.original_url)) continue
        const nameParts = m.name.toLowerCase().split(/[-_]+/)
        const match =
          m.tags?.some((t) => tileWords.some((w) => t.toLowerCase() === w || w === t.toLowerCase().split(/\s+/)[0])) ||
          nameParts.some((p) => tileWords.includes(p))
        if (match) {
          updates[tile.id] = m.original_url
          matchedUrls.add(m.original_url)
          break
        }
      }
    }

    // NOTE: No positional fallback — unmatched tiles show colored bg + text label
    // rather than a random unrelated image

    console.log('[Cards] tileMediaMap updates:', Object.keys(updates).length, 'tiles with images')
    tileMediaMap.value = { ...tileMediaMap.value, ...updates }

    // Set collection thumbnail from first result
    if (results[0]?.original_url) {
      console.log('[Cards] colThumbMap set:', collectionId, results[0].original_url.slice(-30))
      colThumbMap.value = { ...colThumbMap.value, [collectionId]: results[0].original_url }
    }
  } catch (err) {
    console.error('[Cards] fetchMediaForCollection error:', err)
  }
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, hiddenDefaults, collectionOverrides, tileOverrides], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([userCollections, navPath, editMode], () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

// Reset page when navigating
watch(navPath, () => {
  currentPage.value = 1
  // Fetch media images when entering a default collection
  const lastId = navPath.value[navPath.value.length - 1]
  console.log('[Cards] navPath changed:', navPath.value, 'lastId:', lastId)
  if (lastId?.startsWith('__default_')) {
    void fetchMediaForCollection(lastId)
  }
})

// ---------------------------------------------------------------------------
// TTS
// ---------------------------------------------------------------------------

async function speak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  speakStatus.value = 'speaking'
  try {
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'auto' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
}

// ---------------------------------------------------------------------------
// Dominant image color extraction (client-side canvas)
// ---------------------------------------------------------------------------
const dominantColorCache = ref<Record<string, string>>({})
const colorCanvas = document.createElement('canvas')
const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })!

function extractDominantColor(src: string): void {
  if (dominantColorCache.value[src]) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const size = 32
      colorCanvas.width = size
      colorCanvas.height = size
      colorCtx.drawImage(img, 0, 0, size, size)
      const data = colorCtx.getImageData(0, 0, size, size).data

      // Quantize pixels into color buckets (step 32 → 8 buckets per channel)
      const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {}
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2]
        const key = `${(r >> 5) << 5},${(g >> 5) << 5},${(b >> 5) << 5}`
        if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 }
        buckets[key].r += r; buckets[key].g += g; buckets[key].b += b; buckets[key].count++
      }

      // Find the bucket with the most pixels
      let best = { r: 0, g: 0, b: 0, count: 0 }
      for (const b of Object.values(buckets)) {
        if (b.count > best.count) best = b
      }

      // Average the bucket, then brighten by ~15%
      const avg = (c: number) => Math.round(c / best.count)
      let r = avg(best.r); let g = avg(best.g); let b = avg(best.b)
      const brighten = (v: number) => Math.min(255, v + Math.round((255 - v) * 0.15))
      r = brighten(r); g = brighten(g); b = brighten(b)

      dominantColorCache.value = { ...dominantColorCache.value, [src]: `rgb(${r},${g},${b})` }
      console.log('[Cards] dominantColorCache set:', src.slice(-30), dominantColorCache.value[src])
    } catch {
      dominantColorCache.value = { ...dominantColorCache.value, [src]: '#333' }
    }
  }
  img.onerror = () => {
    dominantColorCache.value = { ...dominantColorCache.value, [src]: '#333' }
  }
  img.src = src
}

// Watch for new imageSrcs and extract colors (use cdnUrl for cache key matching)
watch(tileMediaMap, (map) => {
  for (const src of Object.values(map)) {
    const url = cdnUrl(src)
    if (url) extractDominantColor(url)
  }
}, { deep: true })

watch(colThumbMap, (map) => {
  for (const src of Object.values(map)) {
    const url = cdnUrl(src)
    if (url) extractDominantColor(url)
  }
}, { deep: true })

function getDominantColor(src: string | undefined): string {
  if (!src) return '#666'
  return dominantColorCache.value[src] || '#333'
}

console.log('[Cards] getDominantColor fn loaded')

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function navigateTo(collectionId: string) {
  navPath.value = [...navPath.value, collectionId]
  currentPage.value = 1
}

function navigateBack() {
  if (navPath.value.length > 0) {
    navPath.value = navPath.value.slice(0, -1)
    currentPage.value = 1
  }
}

// ---------------------------------------------------------------------------
// Choice handler
// ---------------------------------------------------------------------------

function handleChoice(id: string) {
  if (isAtRoot.value) {
    // At root: tapping a collection navigates into it
    navigateTo(id)
  } else {
    // Inside a collection: tapping a tile speaks it
    const tile = currentTiles.value.find((t) => t.id === id)
    if (tile) {
      void speak(tile.speech ?? tile.title)
    }
  }
}

// ---------------------------------------------------------------------------
// Edit mode: add / delete / hide
// ---------------------------------------------------------------------------

function addNewItem() {
  const name = newItemName.value.trim()
  if (!name) return

  if (isAtRoot.value) {
    // Add a new user collection
    const newCollection: CardsCollection = {
      id: generateId(),
      title: name,
      color: '#B8B8B8',
      order: rootCollections.value.length,
      tiles: [],
    }
    userCollections.value = [...userCollections.value, newCollection]
  } else {
    // Add a new tile to the current collection
    const currentId = navPath.value[navPath.value.length - 1]
    const newTile: CardsTile = {
      id: generateId(),
      title: name,
      type: 'card',
      speech: name,
    }
    // Check if it's a user collection (can be edited)
    const userCol = userCollections.value.find((c) => c.id === currentId)
    if (userCol) {
      userCol.tiles = [...userCol.tiles, newTile]
      userCollections.value = [...userCollections.value]
    }
  }

  newItemName.value = ''
}

function deleteOrHide(id: string) {
  if (isAtRoot.value) {
    // At root: hide if default, delete if user-created
    if (id.startsWith('__default_')) {
      if (!hiddenDefaults.value.includes(id)) {
        hiddenDefaults.value = [...hiddenDefaults.value, id]
      }
    } else {
      userCollections.value = userCollections.value.filter((c) => c.id !== id)
    }
  } else {
    // Inside a collection: delete the tile
    const currentId = navPath.value[navPath.value.length - 1]
    const userCol = userCollections.value.find((c) => c.id === currentId)
    if (userCol) {
      userCol.tiles = userCol.tiles.filter((t) => t.id !== id)
      userCollections.value = [...userCollections.value]
    }
    // Adjust page if needed
    const newTotalPages = Math.max(1, Math.ceil(userCol?.tiles.length ?? 0 / itemsPerPage.value))
    if (currentPage.value > newTotalPages) currentPage.value = newTotalPages
  }
}

function restoreDefaults() {
  hiddenDefaults.value = []
}

// ---------------------------------------------------------------------------
// CDN image URL helper — uses CF Image Resizing for smaller thumbnails
// ---------------------------------------------------------------------------
const CDN_ORIGIN = 'data.tikocdn.org'
function cdnUrl(originalUrl: string | undefined): string | undefined {
  if (!originalUrl) return undefined
  try {
    const u = new URL(originalUrl)
    if (u.hostname === CDN_ORIGIN && u.pathname.startsWith('/uploads/')) {
      return `https://${CDN_ORIGIN}/cdn-cgi/image/width=300,quality=80,f=auto${u.pathname}`
    }
  } catch {}
  return originalUrl
}

// ---------------------------------------------------------------------------
// Pointer-based pager drag (works for both touch and mouse)
// ---------------------------------------------------------------------------
const touchStartX = ref(0)
const touchDeltaX = ref(0)
const isDragging = ref(false)
const activePointerId = ref<number | null>(null)
const pagerWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 390)

function updatePagerWidth() {
  const el = document.querySelector('.cards-pager') as HTMLElement | null
  pagerWidth.value = el ? el.clientWidth : window.innerWidth
}

// CSS translate offset: -(currentPage-1) * pagerWidth + drag delta
const pagerOffset = computed(() => {
  const pageW = pagerWidth.value || window.innerWidth
  const base = -(currentPage.value - 1) * pageW
  if (isDragging.value) return base + touchDeltaX.value
  return base
})

function onPointerDown(e: PointerEvent) {
  updatePagerWidth()
  activePointerId.value = e.pointerId
  touchStartX.value = e.clientX
  touchDeltaX.value = 0
  isDragging.value = false
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (activePointerId.value !== e.pointerId) return
  if (e.pointerType === 'mouse' && e.buttons !== 1) return

  const dx = e.clientX - touchStartX.value
  // Only start dragging after 5px of movement — lets taps through.
  if (!isDragging.value && Math.abs(dx) > 5) {
    isDragging.value = true
  }
  if (!isDragging.value) return

  e.preventDefault()
  // Apply rubber-band at edges.
  let clamped = dx
  if ((currentPage.value <= 1 && dx > 0) || (currentPage.value >= totalPages.value && dx < 0)) {
    clamped = dx * 0.3
  }
  touchDeltaX.value = clamped
}

function onPointerUp(e?: PointerEvent) {
  if (e && activePointerId.value !== e.pointerId) return
  activePointerId.value = null
  if (!isDragging.value) return

  const threshold = pagerWidth.value * 0.2
  if (touchDeltaX.value < -threshold && currentPage.value < totalPages.value) {
    currentPage.value++
  } else if (touchDeltaX.value > threshold && currentPage.value > 1) {
    currentPage.value--
  }
  isDragging.value = false
  touchDeltaX.value = 0
}


// ---------------------------------------------------------------------------
// Context menu (right-click to edit tile)
// ---------------------------------------------------------------------------

const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const contextMenuChoiceId = ref<string>('')

const canEditTiles = computed(() => userKind.value === 'account')

function onTileContextmenu(e: MouseEvent, choiceId: string) {
  if (!canEditTiles.value) return
  e.preventDefault()
  e.stopPropagation()
  contextMenuChoiceId.value = choiceId
  contextMenuRef.value?.open()
}

const editContextMenuConfig = {
  position: 'click' as const,
  menu: [
    {
      id: 'edit',
      label: 'Edit Card',
      icon: 'edit-fat',
      action: () => openEditPopup(contextMenuChoiceId.value),
    } as ContextMenuItem,
  ],
}

function closeContextMenu() {
  contextMenuRef.value?.close()
}

function openEditPopup(choiceId: string) {
  closeContextMenu()
  const choice = allChoices.value.find((c) => c.id === choiceId)
  if (!choice) return

  // Find the original tile data (from virtual defaults or user collections)
  const tile = currentTiles.value.find((t) => t.id === choiceId)
  const override = tileOverrides.value[choiceId]
  const isDefault = choiceId.startsWith('__default_')

  const draftTitle = ref(override?.title ?? tile?.title ?? choice.label)
  const draftSpeech = ref(override?.speech ?? tile?.speech ?? choice.speechText ?? choice.label)
  const draftColor = ref(override?.color ?? tile?.color ?? '')
  const draftImage = ref(override?.image ?? tile?.image ?? '')

  // Also track whether the original had a media-matched image
  const originalMediaImage = tileMediaMap.value[choiceId] || ''
  const effectiveImage = computed(() => {
    if (draftImage.value) return draftImage.value
    if (isDefault && originalMediaImage) return originalMediaImage
    return tile?.image ?? ''
  })

  function openImageSelector() {
    const query = ref('')
    const results = ref<TikoMedia[]>([])
    const searching = ref(false)
    const selectedUrl = ref('')

    async function doSearch() {
      if (!query.value.trim()) return
      searching.value = true
      try {
        results.value = await searchMedia(query.value.trim(), { limit: 30 })
      } catch (err) {
        console.error('[Cards] image search error:', err)
      } finally {
        searching.value = false
      }
    }

    popup.showPopup({
      component: markRaw({
        setup() {
          return () => h('div', { class: 'cards-img-picker', onClick: (e: Event) => e.stopPropagation() }, [
            // Search input
            h('div', { class: 'cards-img-picker__search' }, [
              h('input', {
                type: 'text',
                class: 'cards-img-picker__input',
                placeholder: 'Search images...',
                value: query.value,
                onInput: (e: Event) => { query.value = (e.target as HTMLInputElement).value },
                onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch() },
              }),
              h(Button, {
                variant: 'primary',
                class: 'cards-img-picker__search-btn',
                onClick: doSearch,
                disabled: !query.value.trim() || searching.value,
              }, () => searching.value ? '...' : 'Search'),
            ]),
            // Results grid
            results.value.length > 0
              ? h('div', { class: 'cards-img-picker__grid' }, results.value.map((m: TikoMedia) =>
                  h('button', {
                    key: m.id,
                    class: [
                      'cards-img-picker__item',
                      { 'cards-img-picker__item--selected': selectedUrl.value === m.original_url },
                    ].join(' '),
                    onClick: () => {
                      selectedUrl.value = m.original_url
                      draftImage.value = m.original_url
                      popup.closeAllPopups()
                    },
                  }, [
                    h('img', {
                      src: cdnUrl(m.original_url),
                      alt: m.title || m.name,
                      class: 'cards-img-picker__thumb',
                      loading: 'lazy',
                      crossorigin: 'anonymous',
                    }),
                  ])
                ))
              : h('p', { class: 'cards-img-picker__empty' }, query.value ? (searching.value ? 'Searching...' : 'No results') : 'Type to search for images'),
          ])
        },
      }),
      title: 'Pick an Image',
      config: { position: 'center', canClose: true, background: true, width: '28rem' },
    })
  }

  function removeImage() {
    draftImage.value = ''
  }

  popup.showPopup({
    component: markRaw({
      setup() {
        const colorPresets = ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#5F27CD', '#FF6B81', '#C44569', '#574B90', '#303952', '#B8B8B8']

        return () => h('div', { class: 'cards-edit-popup' }, [
          // Title
          h('label', { class: 'cards-edit-popup__label' }, 'Title'),
          h('input', {
            class: 'cards-edit-popup__input',
            value: draftTitle.value,
            onInput: (e: Event) => { draftTitle.value = (e.target as HTMLInputElement).value },
          }),

          // Speech
          h('label', { class: 'cards-edit-popup__label' }, 'Speech'),
          h('textarea', {
            class: 'cards-edit-popup__textarea',
            rows: 2,
            value: draftSpeech.value,
            onInput: (e: Event) => { draftSpeech.value = (e.target as HTMLTextAreaElement).value },
          }),

          // Color picker
          h('label', { class: 'cards-edit-popup__label' }, 'Color'),
          h('div', { class: 'cards-edit-popup__colors' }, [
            ...colorPresets.map((c: string) =>
              h('button', {
                key: c,
                class: [
                  'cards-edit-popup__color-swatch',
                  { 'cards-edit-popup__color-swatch--active': draftColor.value === c },
                ].join(' '),
                style: { backgroundColor: c },
                onClick: () => { draftColor.value = draftColor.value === c ? '' : c },
              })
            ),
            // Custom color input
            h('label', { class: 'cards-edit-popup__custom-color' }, [
              h('input', {
                type: 'color',
                value: draftColor.value || '#666666',
                onChange: (e: Event) => { draftColor.value = (e.target as HTMLInputElement).value },
              }),
              h('span', {}, '✎'),
            ]),
          ]),

          // Image
          h('label', { class: 'cards-edit-popup__label' }, 'Image'),
          h('div', { class: 'cards-edit-popup__image-row' }, [
            effectiveImage.value
              ? h('div', { class: 'cards-edit-popup__image-preview' }, [
                  h('img', {
                    src: cdnUrl(effectiveImage.value),
                    alt: 'Current image',
                    class: 'cards-edit-popup__image-thumb',
                    crossorigin: 'anonymous',
                  }),
                  h('button', {
                    class: 'cards-edit-popup__image-remove',
                    onClick: removeImage,
                  }, '✕'),
                ])
              : null,
            h(Button, {
              variant: 'secondary',
              onClick: openImageSelector,
            }, () => effectiveImage.value ? 'Change Image' : 'Browse Images'),
          ]),

          // Actions
          h('div', { class: 'cards-edit-popup__actions' }, [
            h(Button, {
              variant: 'primary',
              onClick: () => {
                // Apply overrides
                const newOverride: Partial<{ title: string; speech: string; color: string; image: string }> = {}
                const tileData = currentTiles.value.find((t) => t.id === choiceId)
                const hasChanges = (
                  (draftTitle.value && draftTitle.value !== tileData?.title) ||
                  (draftSpeech.value && draftSpeech.value !== tileData?.speech) ||
                  (draftColor.value) ||
                  (draftImage.value !== (tileData?.image ?? ''))
                )
                if (hasChanges) {
                  if (draftTitle.value) newOverride.title = draftTitle.value
                  if (draftSpeech.value) newOverride.speech = draftSpeech.value
                  if (draftColor.value) newOverride.color = draftColor.value
                  if (draftImage.value) newOverride.image = draftImage.value
                  tileOverrides.value = { ...tileOverrides.value, [choiceId]: newOverride }

                  // For user collections, also update the tile data directly
                  const currentId = navPath.value[navPath.value.length - 1]
                  const userCol = userCollections.value.find((c) => c.id === currentId)
                  if (userCol) {
                    const tileIdx = userCol.tiles.findIndex((t) => t.id === choiceId)
                    if (tileIdx >= 0) {
                      const updated = { ...userCol.tiles[tileIdx] }
                      if (newOverride.title) updated.title = newOverride.title
                      if (newOverride.speech) updated.speech = newOverride.speech
                      if (newOverride.color) updated.color = newOverride.color
                      if (newOverride.image) updated.image = newOverride.image
                      userCol.tiles = userCol.tiles.map((t, i) => i === tileIdx ? updated : t)
                      userCollections.value = [...userCollections.value]
                    }
                  }
                } else {
                  // Remove override if everything was reset to original
                  const updated = { ...tileOverrides.value }
                  delete updated[choiceId]
                  tileOverrides.value = updated
                }

                popup.closeAllPopups()
              },
            }, () => 'Save'),
            h(Button, {
              variant: 'ghost',
              onClick: () => { popup.closeAllPopups() },
            }, () => 'Cancel'),
          ]),
        ])
      },
    }),
    title: 'Edit Card',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
  })
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function goHome() {
  navPath.value = []
  currentPage.value = 1
  nextTick(updatePagerWidth)
}

function headerAction(id: string) {
  if (id === 'back') { navigateBack(); return }
  if (id === 'manage') openSettingsPopup()
  if (id === 'edit') editMode.value = !editMode.value
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}

function openSettings() {
  settingsOpen.value = true
}

function openSettingsPopup() {
  popup.showPopup({
    component: markRaw({
      setup() {
        return () => h('div', { class: 'cards-app__settings-popup' }, [
          h(TikoSettingsPanel, {
            language: language.value,
            'onUpdate:language': (v: TikoLanguage) => { language.value = v },
            colorMode: colorMode.value,
            'onUpdate:colorMode': (v: TikoColorMode) => { colorMode.value = v },
          }),
          hasHiddenDefaults.value
            ? h('div', { class: 'cards-app__settings-extra' }, [
                h(Button, { class: 'cards-app__restore-btn', variant: 'secondary', onClick: restoreDefaults }, () => labels.value.restoreDefaults),
                h('p', { class: 'cards-app__restore-confirm' }, labels.value.restoreConfirm),
              ])
            : null,
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    onClose: () => {},
  })
}

// ---------------------------------------------------------------------------
// Login popup (OTP sign-in)
// ---------------------------------------------------------------------------
function openLoginPopup() {
  popup.showPopup({
    component: markRaw({
      setup() {
        const email = ref('')
        const code = ref('')
        const sent = ref(false)
        const loading = ref(false)
        const verifyError = ref('')

        async function sendCode() {
          if (!email.value.trim()) return
          loading.value = true
          verifyError.value = ''
          try {
            await identityClient.createEmailChallenge({ email: email.value.trim(), purpose: 'recover' })
            sent.value = true
          } catch {
            verifyError.value = 'Could not send the code. Please try again.'
          } finally {
            loading.value = false
          }
        }

        async function verifyCode() {
          const digits = code.value.replace(/\s/g, '')
          if (digits.length !== 6) return
          loading.value = true
          verifyError.value = ''
          try {
            const bundle = await identityClient.verifyOtp(digits)
            saveIdentity(bundle)
            popup.closeAllPopups()
          } catch {
            verifyError.value = 'Invalid or expired code. Try again or resend.'
          } finally {
            loading.value = false
          }
        }

        return () => h('div', { class: 'cards-app__login-popup' }, [
          h('h3', { class: 'cards-app__login-popup__title' }, 'Log in'),
          sent.value
            ? [
                h('p', { class: 'cards-app__login-popup__sent-text' }, `Code sent to ${email.value}`),
                h('label', { class: 'cards-app__login-popup__label' }, [
                  'Sign-in code',
                  h('input', {
                    type: 'text',
                    inputmode: 'numeric',
                    autocomplete: 'one-time-code',
                    value: code.value,
                    maxlength: 7,
                    placeholder: '123 456',
                    class: 'cards-app__login-popup__otp',
                    onInput: (e: Event) => { code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6) },
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') verifyCode() },
                  }),
                ]),
                verifyError.value ? h('p', { class: 'cards-app__login-popup__error' }, verifyError.value) : null,
                h('button', {
                  class: 'cards-app__login-popup__submit',
                  disabled: code.value.replace(/\s/g, '').length !== 6 || loading.value,
                  onClick: verifyCode,
                }, loading.value ? 'Checking…' : 'Verify code'),
                h('button', {
                  class: 'cards-app__login-popup__back',
                  onClick: () => { sent.value = false; code.value = ''; verifyError.value = '' },
                }, 'Use a different email'),
              ]
            : [
                h('label', { class: 'cards-app__login-popup__label' }, [
                  'Email',
                  h('input', {
                    type: 'email',
                    value: email.value,
                    onInput: (e: Event) => { email.value = (e.target as HTMLInputElement).value },
                    placeholder: 'you@example.com',
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') sendCode() },
                  }),
                ]),
                verifyError.value ? h('p', { class: 'cards-app__login-popup__error' }, verifyError.value) : null,
                h('button', {
                  class: 'cards-app__login-popup__submit',
                  disabled: !email.value.trim() || loading.value,
                  onClick: sendCode,
                }, loading.value ? 'Sending…' : 'Send sign-in code'),
              ],
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    onClose: () => {},
  })
}

function handleAvatarClick() {
  if (!sessionToken.value) {
    openLoginPopup()
  }
}

// ---------------------------------------------------------------------------
// Bootstrap lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  try {
    await bootstrapIdentity()
    await hydrateRemoteData()
  } catch {
    // Keep the local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
    // Fetch tiko media images for all visible default collections
    const visibleDefaults = VIRTUAL_DEFAULTS.filter((c) => !hiddenDefaults.value.includes(c.id))
    for (const col of visibleDefaults) {
      fetchMediaForCollection(col.id).catch(() => {})
    }
    // Initialize pager width
    nextTick(updatePagerWidth)
    window.addEventListener('resize', updatePagerWidth)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePagerWidth)
})
</script>

<template>
  <TikoAppShell
    :app-name="currentCollection?.title ?? labels.appName"
    app-icon="education/book-2"
    app-color="cards"
    avatar="ui/avatar"
    :actions="headerActions"
    @header-action="headerAction"
    @avatar-click="handleAvatarClick"
    @title-click="goHome"
  >
    <section class="cards-app" :data-color-mode="colorMode">
      <!-- Pager viewport — clips the sliding track -->
      <div
        v-if="allChoices.length > 0"
        class="cards-pager"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          class="cards-pager__track"
          :class="{ 'cards-pager__track--dragging': isDragging }"
          :style="{ transform: 'translateX(' + pagerOffset + 'px)', width: ((pagerWidth || 390) * allPages.length) + 'px' }"
        >
          <div
            v-for="(page, pi) in allPages"
            :key="'page-' + pi"
            class="cards-grid"
            :class="'cards-grid--cols-' + columns"
            :style="{ width: (pagerWidth || 390) + 'px', minWidth: (pagerWidth || 390) + 'px' }"
          >
            <div
              v-for="choice in page"
              :key="choice.id"
              class="cards-grid__tile"
              :class="{ 'cards-grid__tile--has-image': choice.imageSrc }"
              :style="{ backgroundColor: choice.imageSrc ? `color-mix(in srgb, ${getDominantColor(choice.imageSrc)} 75%, var(--color-background) 25%)` : (choice.color || '#666') }"
              role="button"
              tabindex="0"
              :aria-label="choice.label"
              @click="handleChoice(choice.id)"
              @keydown.enter="handleChoice(choice.id)"
              @contextmenu="onTileContextmenu($event, choice.id)"
            >
              <img v-if="choice.imageSrc" :src="choice.imageSrc" :alt="choice.label" class="cards-grid__tile-img" loading="lazy" crossorigin="anonymous" />
              <span v-else class="cards-grid__tile-label">{{ choice.label }}</span>
              <span v-if="choice.imageSrc" class="cards-grid__tile-name">{{ choice.label }}</span>
            </div>
          </div>
        </div>
      </div><!-- /cards-pager -->

      <!-- Pagination dots (below grid) -->
      <div v-if="totalPages > 1" class="cards-dots">
        <button
          v-for="p in totalPages"
          :key="p"
          class="cards-dots__dot"
          :class="{ 'cards-dots__dot--active': p === currentPage }"
          :aria-label="'Page ' + p"
          @click="currentPage = p"
        />
      </div>

      <!-- Empty state -->
      <p v-if="allChoices.length === 0" class="cards-app__empty">{{ emptyMessage }}</p>

      <!-- TTS status -->
      <p v-if="speakStatus === 'error'" class="cards-app__status cards-app__status--error" role="alert">{{ labels.speechError }}</p>

      <!-- Edit mode: action buttons on each visible choice -->
      <div v-if="editMode" class="cards-app__edit-bar">
        <input
          v-model="newItemName"
          class="cards-app__edit-input"
          :placeholder="editPlaceholder"
          @keydown.enter="addNewItem"
        />
        <Button class="cards-app__edit-add" variant="primary" @click="addNewItem">+ {{ labels.create }}</Button>
      </div>

      <!-- Edit mode: delete/hide buttons overlay -->
      <div v-if="editMode && allChoices.length > 0" class="cards-app__edit-actions">
        <button
          v-for="choice in allChoices"
          :key="`del-${choice.id}`"
          class="cards-app__delete-btn"
          :title="choice.id.startsWith('__default_') ? 'Hide' : 'Delete'"
          @click="deleteOrHide(choice.id)"
        >
          ×
        </button>
      </div>

      <!-- Popup host -->
      <Popup />
    </section>

    <!-- Context menu (right-click edit) -->
    <ContextMenu ref="contextMenuRef" :config="editContextMenuConfig">
      <div style="display: none"></div>
    </ContextMenu>
  </TikoAppShell>
</template>

<style scoped>
/* App shell constraint */
:deep(.tiko-app-shell__main) {
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* App section fills available space */
.cards-app {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Pager viewport — clips the sliding track */
.cards-pager {
  flex: 1;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Track: all pages side by side */
.cards-pager__track {
  display: flex;
  height: 100%;
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

/* During drag: disable transition for real-time tracking */
.cards-pager__track--dragging {
  transition: none;
}

/* Pagination dots */
.cards-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 4px;
}

.cards-dots__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: var(--color-foreground, rgba(255, 255, 255, 0.25));
  opacity: 0.3;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s ease, transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.cards-dots__dot--active {
  opacity: 1;
  transform: scale(1.2);
}

/* Cards grid — each page in the pager track */
.cards-grid {
  display: grid;
  gap: 12px;
  padding: 8px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  align-content: start;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* Column classes — driven by JS `columns` computed */
.cards-grid--cols-3 { grid-template-columns: repeat(3, 1fr); }
.cards-grid--cols-4 { grid-template-columns: repeat(4, 1fr); }
.cards-grid--cols-5 { grid-template-columns: repeat(5, 1fr); }

.cards-grid__tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.cards-grid__tile:active {
  transform: scale(0.95);
}

/* Tile has image — background set by inline style from avg color extraction */
.cards-grid__tile--has-image {
  /* no hardcoded bg — backgroundColor comes from getAvgColor() */
}

.cards-grid__tile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 16px;
}

.cards-grid__tile-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: clamp(4px, 1vw, 10px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(12px, 2vw, 20px);
  font-weight: 600;
  color: #fff;
  text-align: center;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  border-radius: 0 0 16px 16px;
  pointer-events: none;
}

/* When tile has NO image — colored square with label */
.cards-grid__tile-label {
  font-size: clamp(13px, 2.2vw, 22px);
  font-weight: 600;
  color: #fff;
  text-align: center;
  padding: 4px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* ------------------------------------------------------------------ */
/* Edit card popup                                                     */
/* ------------------------------------------------------------------ */

.cards-edit-popup {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: .5rem 0;
}

.cards-edit-popup__label {
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  opacity: .6;
  margin-bottom: -.25rem;
}

.cards-edit-popup__input,
.cards-edit-popup__textarea {
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 15%);
  border-radius: .75rem;
  background: var(--tiko-surface);
  color: inherit;
  font-size: .95rem;
  box-sizing: border-box;
}

.cards-edit-popup__input:focus,
.cards-edit-popup__textarea:focus {
  outline: none;
  border-color: var(--color-primary, #5F27CD);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #5F27CD), transparent 70%);
}

.cards-edit-popup__textarea {
  resize: vertical;
  min-height: 3rem;
}

.cards-edit-popup__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cards-edit-popup__color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform .15s ease, border-color .15s ease;
}

.cards-edit-popup__color-swatch:hover {
  transform: scale(1.15);
}

.cards-edit-popup__color-swatch--active {
  border-color: var(--color-foreground, #333);
  transform: scale(1.15);
}

.cards-edit-popup__custom-color {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--tiko-surface);
  border: 2px dashed color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 30%);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.cards-edit-popup__custom-color input[type="color"] {
  position: absolute;
  inset: -8px;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  cursor: pointer;
  opacity: 0;
}

.cards-edit-popup__custom-color span {
  font-size: .8rem;
  opacity: .5;
  pointer-events: none;
}

.cards-edit-popup__image-row {
  display: flex;
  align-items: center;
  gap: .75rem;
}

.cards-edit-popup__image-preview {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.cards-edit-popup__image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cards-edit-popup__image-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #e84057;
  color: #fff;
  font-size: .65rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.cards-edit-popup__actions {
  display: flex;
  gap: .5rem;
  padding-top: .5rem;
}

/* ------------------------------------------------------------------ */
/* Image picker popup                                                  */
/* ------------------------------------------------------------------ */

.cards-img-picker {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: .5rem 0;
}

.cards-img-picker__search {
  display: flex;
  gap: .5rem;
}

.cards-img-picker__input {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 15%);
  border-radius: .75rem;
  background: var(--tiko-surface);
  color: inherit;
  font-size: .95rem;
  min-width: 0;
}

.cards-img-picker__input:focus {
  outline: none;
  border-color: var(--color-primary, #5F27CD);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #5F27CD), transparent 70%);
}

.cards-img-picker__search-btn {
  flex-shrink: 0;
}

.cards-img-picker__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 2px;
}

.cards-img-picker__item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 3px solid transparent;
  background: var(--tiko-surface);
  cursor: pointer;
  transition: border-color .15s ease, transform .15s ease;
  padding: 0;
}

.cards-img-picker__item:hover {
  transform: scale(1.03);
  border-color: color-mix(in srgb, var(--color-primary, #5F27CD), transparent 50%);
}

.cards-img-picker__item--selected {
  border-color: var(--color-primary, #5F27CD);
}

.cards-img-picker__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cards-img-picker__empty {
  text-align: center;
  opacity: .5;
  font-weight: 600;
  padding: 2rem .5rem;
}
</style>
