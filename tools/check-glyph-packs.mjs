// Validates every glyph pack in packages/write-glyphs/source against
// engines/stroke/schema/glyph-pack.v1.json, plus the rules a JSON Schema cannot
// express: that stroke order is unambiguous, that key points ascend, that each
// stroke is a single continuous pen-down movement, and that the pen never
// leaves the viewBox.
//
// This is Node on purpose. Glyph packs are authored content, and someone adding
// a letter should not need a JDK — StrokeCore decodes the same schema in Kotlin,
// but the gate that runs in `npm run check` must not require the Kotlin
// toolchain. Every check here is unconditional: a validator whose best checks
// are behind a flag is a validator that misses things.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_DIR = 'packages/write-glyphs/source'
const SCHEMA_PATH = 'engines/stroke/schema/glyph-pack.v1.json'

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const STYLES = new Set(['print', 'cursive', 'shape', 'number'])

/** Argument count per SVG path command. */
const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

const problems = []

function fail(where, message) {
  problems.push(`${where}: ${message}`)
}

// ---------------------------------------------------------------------------
// SVG path data
// ---------------------------------------------------------------------------

/**
 * Tokenizes path data into { command, args } and walks it, tracking the current
 * point so relative commands resolve. Returns the on-path points the pen
 * actually visits — control points are excluded, because a control point may
 * legitimately sit outside the viewBox while the curve does not.
 */
function parsePath(d, where) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
  if (!tokens) {
    fail(where, `path data has no recognizable commands: ${JSON.stringify(d)}`)
    return null
  }

  const points = []
  let moveCount = 0
  let cursorX = 0
  let cursorY = 0
  let startX = 0
  let startY = 0
  let index = 0
  let previous = null

  while (index < tokens.length) {
    let token = tokens[index]
    let command
    if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(token)) {
      command = token
      index += 1
    } else if (previous) {
      // Repeated argument groups without a repeated command letter. A repeated
      // M continues as an implicit L, per the SVG spec.
      command = previous === 'M' ? 'L' : previous === 'm' ? 'l' : previous
    } else {
      fail(where, `path data must start with a moveto, found ${JSON.stringify(token)}`)
      return null
    }

    const upper = command.toUpperCase()
    const relative = command !== upper
    const arity = ARITY[upper]
    if (arity === undefined) {
      fail(where, `unsupported path command ${JSON.stringify(command)}`)
      return null
    }

    if (upper === 'M') moveCount += 1

    const args = []
    for (let n = 0; n < arity; n += 1) {
      const raw = tokens[index]
      if (raw === undefined || /^[MmLlHhVvCcSsQqTtAaZz]$/.test(raw)) {
        fail(where, `command ${command} expects ${arity} arguments, found ${n}`)
        return null
      }
      args.push(Number(raw))
      index += 1
    }
    previous = command

    switch (upper) {
      case 'M':
      case 'L':
      case 'T': {
        cursorX = relative ? cursorX + args[0] : args[0]
        cursorY = relative ? cursorY + args[1] : args[1]
        if (upper === 'M') {
          startX = cursorX
          startY = cursorY
        }
        break
      }
      case 'H': {
        cursorX = relative ? cursorX + args[0] : args[0]
        break
      }
      case 'V': {
        cursorY = relative ? cursorY + args[0] : args[0]
        break
      }
      case 'C': {
        cursorX = relative ? cursorX + args[4] : args[4]
        cursorY = relative ? cursorY + args[5] : args[5]
        break
      }
      case 'S':
      case 'Q': {
        cursorX = relative ? cursorX + args[2] : args[2]
        cursorY = relative ? cursorY + args[3] : args[3]
        break
      }
      case 'A': {
        if (args[0] <= 0 || args[1] <= 0) {
          fail(where, `arc radii must be positive, found rx=${args[0]} ry=${args[1]}`)
        }
        if (args[3] !== 0 && args[3] !== 1) fail(where, `arc large-arc-flag must be 0 or 1, found ${args[3]}`)
        if (args[4] !== 0 && args[4] !== 1) fail(where, `arc sweep-flag must be 0 or 1, found ${args[4]}`)
        cursorX = relative ? cursorX + args[5] : args[5]
        cursorY = relative ? cursorY + args[6] : args[6]
        break
      }
      case 'Z': {
        cursorX = startX
        cursorY = startY
        break
      }
    }

    if (upper !== 'Z') points.push([cursorX, cursorY])
  }

  if (moveCount === 0) {
    fail(where, 'path data must start with a moveto')
    return null
  }
  if (moveCount > 1) {
    fail(where, `a stroke is one continuous pen-down movement, but this path has ${moveCount} subpaths`)
  }

  return points
}

// ---------------------------------------------------------------------------
// Pack validation
// ---------------------------------------------------------------------------

function checkStroke(stroke, where, viewBox) {
  if (typeof stroke !== 'object' || stroke === null || Array.isArray(stroke)) {
    fail(where, 'stroke must be an object')
    return
  }
  for (const key of Object.keys(stroke)) {
    if (!['d', 'keyPoints', 'widthScale'].includes(key)) fail(where, `unknown stroke field ${JSON.stringify(key)}`)
  }

  if (typeof stroke.d !== 'string' || stroke.d.length < 2) {
    fail(where, 'stroke needs path data in `d`')
    return
  }

  const points = parsePath(stroke.d, where)
  if (points && viewBox) {
    const [minX, minY, width, height] = viewBox
    const maxX = minX + width
    const maxY = minY + height
    // A hair of slack: authored coordinates sit on the boundary often enough
    // that exact comparison would flag correct packs.
    const slack = 0.001
    for (const [x, y] of points) {
      if (x < minX - slack || x > maxX + slack || y < minY - slack || y > maxY + slack) {
        fail(where, `the pen visits (${x}, ${y}), outside the viewBox [${viewBox.join(', ')}]`)
        break
      }
    }
  }

  if (stroke.keyPoints !== undefined) {
    if (!Array.isArray(stroke.keyPoints)) {
      fail(where, 'keyPoints must be an array')
    } else {
      let last = 0
      stroke.keyPoints.forEach((value, i) => {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          fail(where, `keyPoints[${i}] must be a number`)
          return
        }
        if (value <= 0 || value >= 1) {
          fail(where, `keyPoints[${i}] is ${value}; 0 and 1 are implicit, so key points must sit strictly between them`)
          return
        }
        if (value <= last) {
          fail(where, `keyPoints[${i}] is ${value}, which does not ascend past ${last} — key points are an ordered walk along the stroke`)
        }
        last = value
      })
    }
  }

  if (stroke.widthScale !== undefined) {
    if (typeof stroke.widthScale !== 'number' || !(stroke.widthScale > 0)) {
      fail(where, 'widthScale must be a positive number')
    }
  }
}

function checkGlyph(glyph, where, viewBox, groupIds) {
  if (typeof glyph !== 'object' || glyph === null || Array.isArray(glyph)) {
    fail(where, 'glyph must be an object')
    return
  }
  const known = ['id', 'char', 'groupId', 'sortOrder', 'strokes', 'strokeOrderStrict', 'joins']
  for (const key of Object.keys(glyph)) {
    if (!known.includes(key)) fail(where, `unknown glyph field ${JSON.stringify(key)}`)
  }

  if (typeof glyph.id !== 'string' || !KEBAB.test(glyph.id)) {
    fail(where, `id must be kebab-case, found ${JSON.stringify(glyph.id)}`)
  }
  if (typeof glyph.char !== 'string' || glyph.char.length === 0) {
    fail(where, 'char is required and must be a non-empty string')
  }
  if (typeof glyph.groupId !== 'string' || !KEBAB.test(glyph.groupId)) {
    fail(where, `groupId must be kebab-case, found ${JSON.stringify(glyph.groupId)}`)
  } else if (groupIds && !groupIds.has(glyph.groupId)) {
    fail(where, `groupId ${JSON.stringify(glyph.groupId)} is not declared in the pack's groups`)
  }
  if (!Number.isInteger(glyph.sortOrder)) {
    fail(where, 'sortOrder must be an integer')
  }
  if (glyph.strokeOrderStrict !== undefined && typeof glyph.strokeOrderStrict !== 'boolean') {
    fail(where, 'strokeOrderStrict must be a boolean')
  }
  if (glyph.joins !== undefined && glyph.joins !== null) {
    fail(where, 'joins is reserved for packSchemaVersion 2 and must be null in version 1')
  }

  if (!Array.isArray(glyph.strokes) || glyph.strokes.length === 0) {
    fail(where, 'a glyph needs at least one stroke')
    return
  }
  glyph.strokes.forEach((stroke, i) => checkStroke(stroke, `${where} stroke[${i}]`, viewBox))
}

function checkPack(pack, file) {
  const where = file
  if (typeof pack !== 'object' || pack === null || Array.isArray(pack)) {
    fail(where, 'pack must be a JSON object')
    return
  }
  const known = ['packId', 'packSchemaVersion', 'packVersion', 'style', 'viewBox', 'guides', 'groups', 'glyphs']
  for (const key of Object.keys(pack)) {
    if (!known.includes(key)) fail(where, `unknown pack field ${JSON.stringify(key)}`)
  }

  if (typeof pack.packId !== 'string' || !KEBAB.test(pack.packId)) {
    fail(where, `packId must be kebab-case, found ${JSON.stringify(pack.packId)}`)
  }
  if (pack.packSchemaVersion !== 1) {
    fail(where, `packSchemaVersion must be 1, found ${JSON.stringify(pack.packSchemaVersion)}`)
  }
  if (!Number.isInteger(pack.packVersion) || pack.packVersion < 1) {
    fail(where, 'packVersion must be an integer of at least 1')
  }
  if (!STYLES.has(pack.style)) {
    fail(where, `style must be one of ${[...STYLES].join(', ')}, found ${JSON.stringify(pack.style)}`)
  }

  let viewBox = null
  if (!Array.isArray(pack.viewBox) || pack.viewBox.length !== 4 || pack.viewBox.some((n) => typeof n !== 'number')) {
    fail(where, 'viewBox must be four numbers: [minX, minY, width, height]')
  } else if (!(pack.viewBox[2] > 0) || !(pack.viewBox[3] > 0)) {
    fail(where, 'viewBox width and height must be positive')
  } else {
    viewBox = pack.viewBox
  }

  let groupIds = null
  if (pack.groups !== undefined) {
    if (!Array.isArray(pack.groups)) {
      fail(where, 'groups must be an array')
    } else {
      groupIds = new Set()
      const orders = new Set()
      pack.groups.forEach((group, i) => {
        const at = `${where} groups[${i}]`
        if (typeof group?.id !== 'string' || !KEBAB.test(group.id)) {
          fail(at, `group id must be kebab-case, found ${JSON.stringify(group?.id)}`)
          return
        }
        if (groupIds.has(group.id)) fail(at, `duplicate group id ${JSON.stringify(group.id)}`)
        groupIds.add(group.id)
        if (!Number.isInteger(group.sortOrder)) {
          fail(at, 'group sortOrder must be an integer')
        } else if (orders.has(group.sortOrder)) {
          fail(at, `two groups share sortOrder ${group.sortOrder}, so their order is undefined`)
        } else {
          orders.add(group.sortOrder)
        }
      })
    }
  }

  if (pack.guides !== undefined) {
    const guideKeys = ['ascender', 'capHeight', 'xHeight', 'baseline', 'descender']
    if (typeof pack.guides !== 'object' || pack.guides === null) {
      fail(where, 'guides must be an object')
    } else {
      for (const key of Object.keys(pack.guides)) {
        if (!guideKeys.includes(key)) fail(where, `unknown guide ${JSON.stringify(key)}`)
      }
      if (typeof pack.guides.baseline !== 'number') fail(where, 'guides.baseline is required')
    }
  }

  if (!Array.isArray(pack.glyphs) || pack.glyphs.length === 0) {
    fail(where, 'a pack needs at least one glyph')
    return
  }

  const seenIds = new Set()
  const seenOrder = new Map()
  pack.glyphs.forEach((glyph, i) => {
    const at = `${where} glyphs[${i}]${glyph?.id ? ` (${glyph.id})` : ''}`
    checkGlyph(glyph, at, viewBox, groupIds)

    if (typeof glyph?.id === 'string') {
      if (seenIds.has(glyph.id)) fail(at, `duplicate glyph id ${JSON.stringify(glyph.id)}`)
      seenIds.add(glyph.id)
    }
    // Ordering must be total. Two glyphs sharing a sortOrder inside one group
    // means the grid order depends on array order, which is not what the field
    // is for.
    if (typeof glyph?.groupId === 'string' && Number.isInteger(glyph?.sortOrder)) {
      const key = `${glyph.groupId}/${glyph.sortOrder}`
      if (seenOrder.has(key)) {
        fail(at, `sortOrder ${glyph.sortOrder} in group ${JSON.stringify(glyph.groupId)} is already used by ${seenOrder.get(key)}`)
      } else {
        seenOrder.set(key, glyph.id)
      }
    }
  })
}

// ---------------------------------------------------------------------------

// The schema is not used to drive validation — the checks above are hand-written
// so they can say something useful and go beyond what JSON Schema expresses —
// but it is the published contract, so a missing or malformed schema is a
// failure in its own right.
let schema
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
} catch (error) {
  console.error(`Could not read the glyph pack schema at ${SCHEMA_PATH}: ${error.message}`)
  process.exit(1)
}
if (schema.$id !== 'https://tiko.mt/schema/glyph-pack.v1.json') {
  console.error(`${SCHEMA_PATH}: unexpected $id ${JSON.stringify(schema.$id)}`)
  process.exit(1)
}

let files
try {
  files = readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.json')).sort()
} catch (error) {
  console.error(`Could not read ${SOURCE_DIR}: ${error.message}`)
  process.exit(1)
}

if (files.length === 0) {
  console.error(`No glyph packs found in ${SOURCE_DIR}`)
  process.exit(1)
}

const seenPackIds = new Map()
let glyphCount = 0
let strokeCount = 0

for (const file of files) {
  const path = join(SOURCE_DIR, file)
  let pack
  try {
    pack = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(path, `invalid JSON: ${error.message}`)
    continue
  }
  checkPack(pack, path)

  if (typeof pack?.packId === 'string') {
    if (seenPackIds.has(pack.packId)) {
      fail(path, `packId ${JSON.stringify(pack.packId)} is already used by ${seenPackIds.get(pack.packId)}`)
    } else {
      seenPackIds.set(pack.packId, path)
    }
  }
  if (Array.isArray(pack?.glyphs)) {
    glyphCount += pack.glyphs.length
    for (const glyph of pack.glyphs) {
      if (Array.isArray(glyph?.strokes)) strokeCount += glyph.strokes.length
    }
  }
}

if (problems.length) {
  console.error(`glyph pack checks failed (${problems.length}):`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(`glyph pack checks passed — ${files.length} pack(s), ${glyphCount} glyphs, ${strokeCount} strokes`)
