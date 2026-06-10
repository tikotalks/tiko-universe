#!/usr/bin/env node
/**
 * Seed the 15 default collections for the Cards app into production D1.
 * Usage: node scripts/seed-cards-defaults.mjs [--dry-run]
 *
 * Requires: wrangler in PATH, authenticated via `wrangler whoami`
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const DRY_RUN = process.argv.includes('--dry-run')
const __dir = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function tile(collectionSlug, slug, title, speech) {
  return {
    id: `__default_${collectionSlug}_${slug}`,
    title,
    type: 'card',
    speech: speech ?? title,
  }
}

// ---------------------------------------------------------------------------
// 15 default collections
// ---------------------------------------------------------------------------

const collections = [
  {
    id: '__default_animals',
    title: 'Animals',
    color: '#4CAF50',
    order: 1,
    mediaCategories: ['animals'],
    tiles: [
      tile('animals', 'cat', 'Cat'),
      tile('animals', 'dog', 'Dog'),
      tile('animals', 'bird', 'Bird'),
      tile('animals', 'fish', 'Fish'),
      tile('animals', 'horse', 'Horse'),
      tile('animals', 'elephant', 'Elephant'),
      tile('animals', 'lion', 'Lion'),
      tile('animals', 'monkey', 'Monkey'),
      tile('animals', 'rabbit', 'Rabbit'),
      tile('animals', 'bear', 'Bear'),
      tile('animals', 'cow', 'Cow'),
      tile('animals', 'pig', 'Pig'),
    ],
  },
  {
    id: '__default_food',
    title: 'Food',
    color: '#FF5722',
    order: 2,
    mediaCategories: ['food'],
    tiles: [
      tile('food', 'apple', 'Apple'),
      tile('food', 'banana', 'Banana'),
      tile('food', 'bread', 'Bread'),
      tile('food', 'rice', 'Rice'),
      tile('food', 'pasta', 'Pasta'),
      tile('food', 'pizza', 'Pizza'),
      tile('food', 'soup', 'Soup'),
      tile('food', 'carrot', 'Carrot'),
      tile('food', 'egg', 'Egg'),
      tile('food', 'potato', 'Potato'),
      tile('food', 'tomato', 'Tomato'),
      tile('food', 'cheese', 'Cheese'),
    ],
  },
  {
    id: '__default_snacks',
    title: 'Snacks',
    color: '#FF9800',
    order: 3,
    mediaCategories: ['snacks', 'food-snacks'],
    tiles: [
      tile('snacks', 'cookie', 'Cookie'),
      tile('snacks', 'chips', 'Chips'),
      tile('snacks', 'crackers', 'Crackers'),
      tile('snacks', 'popcorn', 'Popcorn'),
      tile('snacks', 'nuts', 'Nuts'),
      tile('snacks', 'yogurt', 'Yogurt'),
      tile('snacks', 'fruit', 'Fruit'),
      tile('snacks', 'chocolate', 'Chocolate'),
      tile('snacks', 'pretzels', 'Pretzels'),
      tile('snacks', 'granola', 'Granola Bar'),
    ],
  },
  {
    id: '__default_drinks',
    title: 'Drinks',
    color: '#2196F3',
    order: 4,
    mediaCategories: ['drinks'],
    tiles: [
      tile('drinks', 'water', 'Water'),
      tile('drinks', 'milk', 'Milk'),
      tile('drinks', 'juice', 'Juice'),
      tile('drinks', 'tea', 'Tea'),
      tile('drinks', 'coffee', 'Coffee'),
      tile('drinks', 'lemonade', 'Lemonade'),
      tile('drinks', 'soda', 'Soda'),
      tile('drinks', 'smoothie', 'Smoothie'),
      tile('drinks', 'hot_chocolate', 'Hot Chocolate'),
    ],
  },
  {
    id: '__default_colors',
    title: 'Colors',
    color: '#9C27B0',
    order: 5,
    mediaCategories: ['colors'],
    tiles: [
      tile('colors', 'red', 'Red'),
      tile('colors', 'blue', 'Blue'),
      tile('colors', 'green', 'Green'),
      tile('colors', 'yellow', 'Yellow'),
      tile('colors', 'orange', 'Orange'),
      tile('colors', 'purple', 'Purple'),
      tile('colors', 'pink', 'Pink'),
      tile('colors', 'black', 'Black'),
      tile('colors', 'white', 'White'),
      tile('colors', 'brown', 'Brown'),
      tile('colors', 'grey', 'Grey'),
    ],
  },
  {
    id: '__default_emotions',
    title: 'Emotions',
    color: '#F44336',
    order: 6,
    mediaCategories: ['emotions', 'feelings'],
    tiles: [
      tile('emotions', 'happy', 'Happy'),
      tile('emotions', 'sad', 'Sad'),
      tile('emotions', 'angry', 'Angry'),
      tile('emotions', 'scared', 'Scared'),
      tile('emotions', 'surprised', 'Surprised'),
      tile('emotions', 'tired', 'Tired'),
      tile('emotions', 'excited', 'Excited'),
      tile('emotions', 'calm', 'Calm'),
      tile('emotions', 'confused', 'Confused'),
      tile('emotions', 'loved', 'Loved'),
      tile('emotions', 'worried', 'Worried'),
      tile('emotions', 'bored', 'Bored'),
    ],
  },
  {
    id: '__default_transport',
    title: 'Transport',
    color: '#607D8B',
    order: 7,
    mediaCategories: ['transport', 'vehicles'],
    tiles: [
      tile('transport', 'car', 'Car'),
      tile('transport', 'bus', 'Bus'),
      tile('transport', 'train', 'Train'),
      tile('transport', 'plane', 'Plane'),
      tile('transport', 'bike', 'Bike'),
      tile('transport', 'boat', 'Boat'),
      tile('transport', 'truck', 'Truck'),
      tile('transport', 'motorcycle', 'Motorcycle'),
      tile('transport', 'helicopter', 'Helicopter'),
      tile('transport', 'taxi', 'Taxi'),
    ],
  },
  {
    id: '__default_body',
    title: 'Body',
    color: '#795548',
    order: 8,
    mediaCategories: ['body', 'body-parts'],
    tiles: [
      tile('body', 'head', 'Head'),
      tile('body', 'arms', 'Arms'),
      tile('body', 'legs', 'Legs'),
      tile('body', 'hands', 'Hands'),
      tile('body', 'feet', 'Feet'),
      tile('body', 'eyes', 'Eyes'),
      tile('body', 'ears', 'Ears'),
      tile('body', 'nose', 'Nose'),
      tile('body', 'mouth', 'Mouth'),
      tile('body', 'hair', 'Hair'),
      tile('body', 'fingers', 'Fingers'),
      tile('body', 'toes', 'Toes'),
    ],
  },
  {
    id: '__default_numbers',
    title: 'Numbers',
    color: '#3F51B5',
    order: 9,
    mediaCategories: ['numbers'],
    tiles: [
      tile('numbers', '1', '1', 'one'),
      tile('numbers', '2', '2', 'two'),
      tile('numbers', '3', '3', 'three'),
      tile('numbers', '4', '4', 'four'),
      tile('numbers', '5', '5', 'five'),
      tile('numbers', '6', '6', 'six'),
      tile('numbers', '7', '7', 'seven'),
      tile('numbers', '8', '8', 'eight'),
      tile('numbers', '9', '9', 'nine'),
      tile('numbers', '10', '10', 'ten'),
    ],
  },
  {
    id: '__default_letters',
    title: 'Letters',
    color: '#009688',
    order: 10,
    mediaCategories: ['letters', 'alphabet'],
    tiles: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) =>
      tile('letters', l.toLowerCase(), l, l)
    ),
  },
  {
    id: '__default_actions',
    title: 'Actions',
    color: '#E91E63',
    order: 11,
    mediaCategories: ['actions', 'verbs'],
    tiles: [
      tile('actions', 'eat', 'Eat'),
      tile('actions', 'drink', 'Drink'),
      tile('actions', 'sleep', 'Sleep'),
      tile('actions', 'play', 'Play'),
      tile('actions', 'walk', 'Walk'),
      tile('actions', 'run', 'Run'),
      tile('actions', 'sit', 'Sit'),
      tile('actions', 'stand', 'Stand'),
      tile('actions', 'go', 'Go'),
      tile('actions', 'stop', 'Stop'),
      tile('actions', 'help', 'Help'),
      tile('actions', 'come', 'Come'),
    ],
  },
  {
    id: '__default_people',
    title: 'People',
    color: '#FF5722',
    order: 12,
    mediaCategories: ['people', 'family'],
    tiles: [
      tile('people', 'mom', 'Mom'),
      tile('people', 'dad', 'Dad'),
      tile('people', 'sister', 'Sister'),
      tile('people', 'brother', 'Brother'),
      tile('people', 'grandma', 'Grandma'),
      tile('people', 'grandpa', 'Grandpa'),
      tile('people', 'baby', 'Baby'),
      tile('people', 'friend', 'Friend'),
      tile('people', 'teacher', 'Teacher'),
      tile('people', 'doctor', 'Doctor'),
      tile('people', 'myself', 'Myself'),
    ],
  },
  {
    id: '__default_places',
    title: 'Places',
    color: '#00BCD4',
    order: 13,
    mediaCategories: ['places', 'locations'],
    tiles: [
      tile('places', 'home', 'Home'),
      tile('places', 'school', 'School'),
      tile('places', 'park', 'Park'),
      tile('places', 'store', 'Store'),
      tile('places', 'hospital', 'Hospital'),
      tile('places', 'library', 'Library'),
      tile('places', 'beach', 'Beach'),
      tile('places', 'restaurant', 'Restaurant'),
      tile('places', 'playground', 'Playground'),
      tile('places', 'toilet', 'Toilet'),
      tile('places', 'bedroom', 'Bedroom'),
      tile('places', 'kitchen', 'Kitchen'),
    ],
  },
  {
    id: '__default_clothing',
    title: 'Clothing',
    color: '#8BC34A',
    order: 14,
    mediaCategories: ['clothing', 'clothes'],
    tiles: [
      tile('clothing', 'shirt', 'Shirt'),
      tile('clothing', 'pants', 'Pants'),
      tile('clothing', 'shoes', 'Shoes'),
      tile('clothing', 'socks', 'Socks'),
      tile('clothing', 'jacket', 'Jacket'),
      tile('clothing', 'dress', 'Dress'),
      tile('clothing', 'hat', 'Hat'),
      tile('clothing', 'coat', 'Coat'),
      tile('clothing', 'gloves', 'Gloves'),
      tile('clothing', 'scarf', 'Scarf'),
      tile('clothing', 'boots', 'Boots'),
    ],
  },
  {
    id: '__default_nature',
    title: 'Nature',
    color: '#4CAF50',
    order: 15,
    mediaCategories: ['nature', 'weather'],
    tiles: [
      tile('nature', 'sun', 'Sun'),
      tile('nature', 'rain', 'Rain'),
      tile('nature', 'cloud', 'Cloud'),
      tile('nature', 'tree', 'Tree'),
      tile('nature', 'flower', 'Flower'),
      tile('nature', 'grass', 'Grass'),
      tile('nature', 'snow', 'Snow'),
      tile('nature', 'wind', 'Wind'),
      tile('nature', 'mountain', 'Mountain'),
      tile('nature', 'river', 'River'),
      tile('nature', 'star', 'Star'),
      tile('nature', 'moon', 'Moon'),
    ],
  },
]

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------

const state = { collections }
const dataJson = JSON.stringify(state).replace(/'/g, "''")
const now = new Date().toISOString()

const sql = `INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
VALUES ('cards', 'state', '${dataJson}', '${now}', 1)
ON CONFLICT(app, resource) DO UPDATE SET
  data_json = excluded.data_json,
  updated_at = excluded.updated_at,
  version = excluded.version;`

console.log('Collections:', collections.length)
console.log('Total tiles:', collections.reduce((n, c) => n + c.tiles.length, 0))
console.log()

if (DRY_RUN) {
  console.log('--- SQL (dry run) ---')
  console.log(sql.slice(0, 500) + '...')
  console.log()
  console.log('--- State preview ---')
  console.log(JSON.stringify({ collections: collections.map(c => ({ id: c.id, title: c.title, tiles: c.tiles.length })) }, null, 2))
  process.exit(0)
}

// Write SQL to temp file and execute via wrangler
const sqlFile = join(__dir, '_seed_cards_defaults_tmp.sql')
writeFileSync(sqlFile, sql)

try {
  console.log('Seeding production D1 (tiko-db)...')
  const output = execSync(
    `cd ${join(__dir, '../workers/app-api')} && npx wrangler d1 execute tiko-db --env production --file=${sqlFile} --remote`,
    { encoding: 'utf8' }
  )
  console.log(output)
  console.log('Done! 15 collections seeded.')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  unlinkSync(sqlFile)
}
