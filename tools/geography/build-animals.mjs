#!/usr/bin/env node
// Builds packages/geography/content/animals.json from the Tiko media library
// and the district mapping beside this file, and fetches a bundled copy of each
// picture so Animals mode works in airplane mode.
//
//   node tools/geography/build-animals.mjs           report what would be built
//   node tools/geography/build-animals.mjs --write   write the pack and fetch images
//
// Anything in the library that has no district is reported, not guessed at: a
// child being told a kangaroo lives in Norway is worse than no kangaroo.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { countriesCentredNear, countriesNear, isLand, pointsInsideCountry, pointsOffCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const OUT_DIR_COUNTRIES = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const IMAGE_WIDTH = 320
const WRITE = process.argv.includes('--write')
const SCHEMA_VERSION = 1

/** Titles in the animals category that are not animals a child can find on Earth. */
const NOT_A_PLACEABLE_ANIMAL = /alien|centaur|cerberus|chimera|dragon|fenrir|griffin|harpy|hydra|kraken|leviathan|mermaid|pegasus|phoenix|satyr|unicorn|sea serpent|noah|adam and eve|caveman|farmer|fisherman|zookeeper|teddy|toy|letter|puss-in-boots|tintin|idefix|octocat|the (big bad|three|ugly)|aquarium|birdhouse|fish bowl|spider web|hay bale|cards|berlin|animal crossing|nose|eye|teeth|tongue|hair|chicken leg|turkey roast|tuna steak|fried|steak|roast|easter bunny|bunny ears|frog prince|white dove|josef|horse carriage|cocoon|skull|clock tower|brontosaurus|stegosaurus|triceratops|tyrannosaurus|velociraptor|pterodactyl|megalodon|dodo|great auk|mammoth|mastodon|saber-toothed|tasmanian tiger/i

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * What shows first as a child zooms out. Big, famous mammals carry the whole
 * Earth; the insects and the reef life are there for someone who has zoomed
 * into a reef. Tier decides both priority and the zoom a marker appears at.
 */
const ICONIC = new Set(['african elephant', 'elephant', 'asian elephant', 'lion', 'tiger', 'giraffe',
  'zebra', 'giant panda', 'polar bear', 'brown bear', 'grizzly bear', 'gorilla', 'kangaroo', 'koala',
  'penguin', 'emperor penguin', 'rhino', 'rhinoceros', 'hippopotamus', 'cheetah', 'leopard',
  'snow leopard', 'jaguar', 'blue whale', 'orca', 'great white shark', 'wolf', 'gray wolf', 'moose',
  'bison', 'camel', 'reindeer', 'walrus', 'orangutan', 'chimpanzee', 'sloth', 'flamingo', 'ostrich',
  'crocodile', 'saltwater crocodile', 'lemur', 'meerkat', 'wildebeest', 'wildebeests', 'red panda',
  'bottlenose dolphin', 'arctic fox', 'tasmanian devil', 'platypus', 'toucan', 'macaw'])

/** Words that place an animal in a group, checked in order. */
const GROUPS = [
  { tier: 5, test: /(coral|anemone|sponge|worm|shrimp|snail|clam|oyster|scallop|urchin|sea star|sea cucumber|sea hare|conch|mite|ant$|bee$|wasp|hornet|beetle|ladybug|grasshopper|cricket|mantis|firefly|moth|mosquito|gnat|cockroach|termite|caterpillar|catterpillar|butterfly|dragonfly|damselfly|spider|scorpion|tarantula|fly$|cocoon|tadpole|brine)/i },
  { tier: 4, test: /(fish|tuna|tang|goby|blenny|wrasse|gramma|anthias|damsel|cardinalfish|hawkfish|guppy|platy|danio|koi|herring|halibut|marlin|tarpon|sturgeon|barracuda|mahi|salamander|lizard|skink|gecko|snake|python|turtle|tortoise|slider|frog|toad|newt|crab|lobster|shark|sawshark)/i },
  { tier: 3, test: /(bird|owl|eagle|vulture|parrot|parakeet|macaw|cockatoo|cockatiel|penguin|puffin|goose|gander|swan|stork|robin|magpie|pigeon|canary|lovebird|kookaburra|hornbill|cassowary|emu|peafowl|snowcock|booby|seagull|duck|mallard|toucan|indigo)/i }
]

/**
 * 1 is a lion, 5 is a sea anemone. Mammals default to 2 because the ask was for
 * more mammals and bigger animals up front.
 */
function tierFor(key) {
  if (ICONIC.has(key)) return 1
  for (const group of GROUPS) {
    if (group.test.test(key)) return group.tier
  }
  return 2
}

/** Priority within the tier, stable per animal so the globe looks the same twice. */
function priorityFor(key, tier) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff
  const band = [0, 88, 70, 52, 34, 16][tier]
  return band + (hash % 12)
}

async function library() {
  const items = []
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`${MEDIA_API}?category=animals&type=image&limit=100&page=${page}`)
    if (!response.ok) throw new Error(`media api responded ${response.status}`)
    const body = await response.json()
    items.push(...(body.data ?? []))
    if (page >= (body.meta?.totalPages ?? 1)) break
  }
  return items
}

async function download(item, id) {
  await mkdir(IMAGE_DIR, { recursive: true })
  const file = join(IMAGE_DIR, `${id}.png`)
  if (existsSync(file)) return `images/${id}.png`
  const path = new URL(item.original_url).pathname
  const url = `https://data.tikocdn.org/cdn-cgi/image/width=${IMAGE_WIDTH},quality=82,f=auto${path}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${id}: image responded ${response.status}`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return `images/${id}.png`
}

/**
 * A stable pseudo-random point inside the district's spread. Deterministic, so
 * an animal is in the same place every launch, and latitude-corrected so a
 * scatter near the poles does not stretch across half the Arctic.
 */
function scatter(point, spread, seed, wantsLand) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let fallback = null
  // Tries a few offsets and takes the first that is the right kind of ground:
  // a koala scattered into the Tasman Sea is not a koala anyone can find.
  for (let attempt = 0; attempt < 32; attempt++) {
    hash = Math.imul(hash ^ (attempt + 1), 16777619)
    const angle = ((hash >>> 0) % 3600) / 3600 * Math.PI * 2
    const radius = Math.sqrt(((hash >>> 8) % 1000) / 1000) * spread
    const lat = Math.max(-85, Math.min(85, point.lat + Math.sin(angle) * radius))
    const lonScale = Math.max(0.2, Math.cos(lat * Math.PI / 180))
    const lon = ((point.lon + (Math.cos(angle) * radius) / lonScale + 540) % 360) - 180
    const candidate = { lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) }
    if (fallback === null) fallback = candidate
    if (isLand(candidate) === wantsLand) return candidate
  }
  // Nothing suitable nearby: the district's own point is the honest answer.
  return isLand(point) === wantsLand ? { lat: point.lat, lon: point.lon } : fallback
}

/**
 * Not every animal is filed under "animals": the polar bear sits in another
 * category entirely. Anything the mapping asks for and the category listing did
 * not provide is searched for by name, and only an exact title is accepted.
 */
async function searchForTitle(title) {
  const response = await fetch(`${MEDIA_API}?search=${encodeURIComponent(title)}&type=image&limit=50`)
  if (!response.ok) return null
  const data = (await response.json()).data ?? []
  return data.find((item) => (item.title ?? '').toLowerCase() === title.toLowerCase()) ?? null
}

const districtSource = JSON.parse(await readFile(join(CONTENT_DIR, 'animal-districts.json'), 'utf8'))
/** name → district ids, from the authored JSON. */
const ANIMAL_DISTRICTS = Object.fromEntries(
  Object.entries(districtSource.animals).map(([name, entry]) => [name, entry.districts])
)
const NEAREST_AVAILABLE = districtSource.renames ?? {}
const countryAnimals = JSON.parse(await readFile(join(CONTENT_DIR, 'country-animals.json'), 'utf8'))
const COUNTRY_ANIMALS = Object.fromEntries(
  Object.entries(countryAnimals.countries).map(([id, entry]) => [id, entry.animals.map((animal) => animal.name)])
)

const districts = JSON.parse(await readFile(join(CONTENT_DIR, 'districts.json'), 'utf8'))
const districtById = new Map(districts.items.map((district) => [district.id, district]))

// Which countries each district actually covers, worked out from the geometry
// rather than typed by hand: it is what the detail panel's little map draws,
// and what answers "which animals live here" from the other direction.
const districtCountries = new Map()
for (const district of districts.items) {
  const found = new Set()
  // A water district's points sit in open sea, and a wide circle around them
  // swallows whole landlocked countries — an ocean reaching Botswana. Water
  // looks only as far as the coast it touches.
  const radius = district.isMarine || district.isGeneric
    ? Math.min(district.spreadDegrees ?? 5, 6)
    : (district.spreadDegrees ?? 5)
  for (const point of district.points) {
    // Centred: the district has to cover the country, not brush its furthest
    // island. Water districts still use the coastline test — a whale's Atlantic
    // touches Portugal without covering it.
    const ids = district.isMarine
      ? countriesNear(point, radius)
      : countriesCentredNear(point, radius * 1.4)
    for (const id of ids) found.add(id)
  }
  districtCountries.set(district.id, [...found].sort())
}
const media = await library()

const items = []
const unplaced = []
const seen = new Set()

// One entry per animal, and the first picture wins when the library holds
// several of the same subject.
for (const item of media) {
  const title = (item.title ?? '').trim()
  if (!title || NOT_A_PLACEABLE_ANIMAL.test(title)) continue
  const key = title.toLowerCase()
  const placement = ANIMAL_DISTRICTS[key]
  if (!placement) {
    if (!unplaced.includes(title)) unplaced.push(title)
    continue
  }
  if (seen.has(key)) continue
  seen.add(key)

  const markers = []
  const regions = []
  for (const districtId of placement) {
    const district = districtById.get(districtId)
    if (!district) throw new Error(`${title} references unknown district ${districtId}`)
    regions.push(district.name)
    // Scattered around the district's points rather than stacked on them: a
    // savanna holds thirty animals, and a globe that draws them all in the same
    // spot shows one.
    const wantsLand = !district.isMarine
    for (const [index, point] of district.points.slice(0, 2).entries()) {
      markers.push({
        ...scatter(point, district.spreadDegrees ?? 5, `${key}:${districtId}:${index}`, wantsLand),
        // Which district put it here, so the placement guard can hold each
        // marker to its own district's rules.
        district: districtId
      })
    }
  }

  const countries = [...new Set(placement.flatMap((districtId) => districtCountries.get(districtId) ?? []))].sort()
  const tier = tierFor(key)
  const id = slug(title)
  items.push({
    id: `animal.${id}`,
    name: title,
    glyph: '🐾',
    tier,
    priority: priorityFor(key, tier),
    districts: placement,
    region: regions.join(' · '),
    countries,
    markers,
    mediaId: item.id,
    image: WRITE ? await download(item, id) : `images/${id}.png`,
    review: { state: 'draft', source: null }
  })
}

// The mapped animals the category listing missed — the polar bear is filed
// somewhere else entirely.
for (const [key, placement] of Object.entries(ANIMAL_DISTRICTS)) {
  if (seen.has(key)) continue
  const item = await searchForTitle(key)
  if (!item) continue
  seen.add(key)
  const title = item.title
  const markers = []
  const regions = []
  for (const districtId of placement) {
    const district = districtById.get(districtId)
    if (!district) continue
    regions.push(district.name)
    const wantsLand = !district.isMarine
    for (const [index, point] of district.points.slice(0, 2).entries()) {
      markers.push({
        ...scatter(point, district.spreadDegrees ?? 5, `${key}:${districtId}:${index}`, wantsLand),
        district: districtId
      })
    }
  }
  if (markers.length === 0) continue
  const countries = [...new Set(placement.flatMap((districtId) => districtCountries.get(districtId) ?? []))].sort()
  const tier = tierFor(key)
  const id = slug(title)
  items.push({
    id: `animal.${id}`,
    name: title,
    glyph: '🐾',
    tier,
    priority: priorityFor(key, tier),
    districts: placement,
    region: regions.join(' · '),
    countries,
    markers,
    mediaId: item.id,
    image: WRITE ? await download(item, id) : `images/${id}.png`,
    review: { state: 'draft', source: null }
  })
}

// Every country gets a few of its own animals standing inside it, so zooming
// into one always finds something rather than an empty shape.
const generated = JSON.parse(await readFile(join(OUT_DIR_COUNTRIES, 'countries.json'), 'utf8')).countries
// Every country gets its own animals, written out per country in
// country-animals.mjs, standing inside its outline. A region cannot tell the
// Netherlands from Romania, so the list is authored rather than derived.
const byName = new Map(items.map((item) => [item.name.toLowerCase(), item]))
const substitutions = new Map()
const unavailable = new Set()

/** How many animals a child can find inside one country. */
const PER_COUNTRY = 9
/** And how many in the water off its coast. */
const SEA_PER_COUNTRY = 4

const marineDistrictIds = new Set(
  districts.items.filter((district) => district.isMarine).map((district) => district.id)
)
const genericDistrictIds = new Set(
  districts.items.filter((district) => district.isGeneric).map((district) => district.id)
)

/** True when an animal has nowhere but water to be. */
function livesInWaterOnly(item) {
  return item.districts.every((id) => marineDistrictIds.has(id))
}

/** Anything that is not exclusively a sea creature can stand in a country. */
function livesOnLand(item) {
  return !livesInWaterOnly(item)
}

/**
 * The countries an animal can be *stood inside*: taken from its land districts
 * only, because an orca's ocean touching the Namibian coast is no reason to put
 * one in Botswana.
 */
function landCountriesOf(item) {
  const districtsOfItem = item.districts.filter(
    (id) => !marineDistrictIds.has(id) && !genericDistrictIds.has(id)
  )
  return new Set(districtsOfItem.flatMap((id) => districtCountries.get(id) ?? []))
}

function resolveAnimal(name) {
  const direct = byName.get(name.toLowerCase())
  if (direct) return direct
  const nearest = NEAREST_AVAILABLE[name]
  if (nearest) {
    const stand = byName.get(nearest.toLowerCase())
    if (stand) {
      substitutions.set(name, nearest)
      return stand
    }
  }
  unavailable.add(name)
  return null
}

let countryPlacements = 0
const thin = []
for (const country of generated) {
  const wanted = COUNTRY_ANIMALS[country.id] ?? []
  let residents = [...new Set(wanted.map(resolveAnimal).filter(Boolean))].slice(0, PER_COUNTRY)

  // No automatic top-up. Filling a country from its region put a fox, a hare, a
  // wild boar and a tortoise in Malta, none of which live there — the region is
  // right and the country is wrong, and a child cannot tell the difference. The
  // list in country-animals.mjs is the whole of what a country claims on land.

  // A coastal country has a sea as well as a shore: a few animals from the
  // water that touches it, standing offshore.
  const seaExtras = items
    .filter((item) => !residents.includes(item)
      && livesInWaterOnly(item)
      && item.districts.some((id) => marineDistrictIds.has(id) && (districtCountries.get(id) ?? []).includes(country.id)))
    .sort((a, b) => a.tier - b.tier || b.priority - a.priority)
    .slice(0, SEA_PER_COUNTRY)
  residents = [...residents, ...seaExtras]

  // Land animals stand in the country; sea animals sit in the water off its
  // coast, which is where a child would look for them anyway.
  const onLand = residents.filter((resident) => !livesInWaterOnly(resident))
  const atSea = residents.filter(livesInWaterOnly)
  const inside = pointsInsideCountry(country.id, onLand.length, country.labelPoint, country.id)
  const offshore = atSea.length > 0
    ? pointsOffCountry(country.id, atSea.length, country.labelPoint, `${country.id}:sea`)
    : []

  onLand.forEach((resident, index) => {
    const point = inside[index]
    if (!point) return
    // Only visible once the child is inside the country: these exist to fill a
    // zoomed-in country, not to crowd the continent.
    resident.markers.push({ lat: point.lat, lon: point.lon, country: country.id, closeUp: true })
    countryPlacements += 1
  })
  atSea.forEach((resident, index) => {
    const point = offshore[index]
    if (!point) return
    resident.markers.push({ lat: point.lat, lon: point.lon, country: country.id, closeUp: true, atSea: true })
    countryPlacements += 1
  })
}

items.sort((a, b) => a.name.localeCompare(b.name))

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'animals.json'), `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    note: 'Built by tools/geography/build-animals.mjs from the Tiko media library and animal-districts.mjs. Markers are representative points inside a district, not habitat data. Every entry is draft until an editor has reviewed it.',
    items
  }, null, 2)}\n`)
}

process.stdout.write(`${items.length} animals placed, ${countryPlacements} inside countries, ${unplaced.length} library entries with no district\n`)
if (substitutions.size > 0) {
  process.stdout.write(`stood in for (no picture in the library): ${[...substitutions].map(([wanted, used]) => `${wanted} → ${used}`).join(', ')}\n`)
}
if (unavailable.size > 0) {
  process.stdout.write(`NO PICTURE AND NO STAND-IN: ${[...unavailable].join(', ')}\n`)
}
if (thin.length > 0) {
  process.stdout.write(`countries with fewer than three: ${thin.join(', ')}\n`)
}
process.stdout.write(`unplaced: ${unplaced.join(', ')}\n`)
