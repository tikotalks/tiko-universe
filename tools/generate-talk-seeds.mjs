#!/usr/bin/env node
/**
 * Generate D1 seed SQL files for Talk language packs.
 *
 * Reads every workers/sentence-api/data/<locale>-v<version>.json pack file and
 * emits a matching workers/sentence-api/db/seed-<locale>.sql in the exact
 * format of the original hand-checked seed-en.sql.
 *
 * Conventions:
 * - Pack id is `<locale>-v<version>` (e.g. `en-v1`, `nl-v1`).
 * - `talk_word_inventory.id` and `talk_templates.id` are GLOBAL primary keys.
 *   The `en` pack keeps its plain ids (backward compatible with deployed
 *   data); every other locale gets a `<locale>-` prefix (e.g. `nl-water`).
 * - `talk_transitions` rows derive from grammar.validTransitions with weights
 *   10, 9, 8, ... descending by array position (minimum 1).
 *
 * Usage:
 *   node tools/generate-talk-seeds.mjs          # validate + write seed files
 *   node tools/generate-talk-seeds.mjs --check  # validate + diff, exit 1 if stale
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'workers/sentence-api/data');
const DB_DIR = join(ROOT, 'workers/sentence-api/db');

const CHECK_MODE = process.argv.includes('--check');

/** Escape a string for a single-quoted SQL literal. */
function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Quote a nullable string column (NULL when absent). */
function sqlStringOrNull(value) {
  return value === undefined || value === null ? 'NULL' : sqlString(value);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function languageName(locale) {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(locale);
    if (name && name !== locale) return name;
  } catch {
    // fall through to the locale code itself
  }
  return locale;
}

/** Validate a pack JSON; throws Error with a descriptive message on failure. */
function validatePack(pack, fileLocale, fileVersion, fileName) {
  const problems = [];

  if (!pack || typeof pack !== 'object') {
    throw new Error(`${fileName}: pack is not a JSON object`);
  }
  if (pack.locale !== fileLocale) {
    problems.push(`locale "${pack.locale}" does not match filename locale "${fileLocale}"`);
  }
  if (!Number.isInteger(pack.version) || pack.version <= 0) {
    problems.push(`version must be a positive integer, got ${JSON.stringify(pack.version)}`);
  } else if (pack.version !== fileVersion) {
    problems.push(`version ${pack.version} does not match filename version ${fileVersion}`);
  }
  if (!Array.isArray(pack.words) || pack.words.length === 0) {
    problems.push('words must be a non-empty array');
  }
  if (!Array.isArray(pack.templates) || pack.templates.length === 0) {
    problems.push('templates must be a non-empty array');
  }
  if (!pack.grammar || typeof pack.grammar !== 'object') {
    problems.push('grammar must be an object');
  }

  const posSet = new Set();
  if (Array.isArray(pack.words)) {
    pack.words.forEach((word, index) => {
      const label = `words[${index}]${word && word.id ? ` (${word.id})` : ''}`;
      for (const field of ['id', 'text', 'pos', 'category']) {
        if (typeof word?.[field] !== 'string' || word[field].length === 0) {
          problems.push(`${label}: missing or empty "${field}"`);
        }
      }
      if (typeof word?.frequency !== 'number' || !(word.frequency >= 0)) {
        problems.push(`${label}: frequency must be a number >= 0`);
      }
      if (typeof word?.pos === 'string') posSet.add(word.pos);
    });
  }

  const transitions = pack.grammar?.validTransitions;
  if (!transitions || typeof transitions !== 'object' || Array.isArray(transitions)) {
    problems.push('grammar.validTransitions must be an object');
  } else {
    for (const [fromPos, toList] of Object.entries(transitions)) {
      if (!posSet.has(fromPos)) {
        problems.push(`grammar.validTransitions key "${fromPos}" is not a POS present in words`);
      }
      if (!Array.isArray(toList)) {
        problems.push(`grammar.validTransitions["${fromPos}"] must be an array`);
        continue;
      }
      for (const toPos of toList) {
        if (!posSet.has(toPos)) {
          problems.push(`grammar.validTransitions["${fromPos}"] value "${toPos}" is not a POS present in words`);
        }
      }
    }
  }

  if (Array.isArray(pack.templates)) {
    pack.templates.forEach((template, index) => {
      const label = `templates[${index}]${template && template.id ? ` (${template.id})` : ''}`;
      if (typeof template?.id !== 'string' || template.id.length === 0) {
        problems.push(`${label}: missing or empty "id"`);
      }
      if (!Array.isArray(template?.slots) || template.slots.length === 0) {
        problems.push(`${label}: slots must be a non-empty array`);
      }
    });
  }

  if (problems.length > 0) {
    throw new Error(`${fileName} failed validation:\n  - ${problems.join('\n  - ')}`);
  }
}

/** Render the seed SQL for a validated pack. */
function generateSeedSql(pack, fileName) {
  const locale = pack.locale;
  const packId = `${locale}-v${pack.version}`;
  // en keeps plain global ids for backward compatibility with deployed data;
  // every other locale prefixes word/template ids with `<locale>-`.
  const globalId = (id) => (locale === 'en' ? id : `${locale}-${id}`);

  const lines = [];
  lines.push(`-- Curated ${languageName(locale)} v${pack.version} seed for Talk sentence-api.`);
  lines.push(`-- Generated from workers/sentence-api/data/${fileName}; keep JSON as the source of review.`);

  const grammarJson = JSON.stringify(pack.grammar);
  const metadataJson =
    '{"fallbackGenerator": {"minFrequency": 8, "targetWords": 50, "targetTemplates": 5, "schema": "LanguagePack"}, ' +
    `"counts": {"words": ${pack.words.length}, "talk_templates": ${pack.templates.length}}}`;

  lines.push(
    'INSERT OR REPLACE INTO talk_language_packs (id, locale, version, status, source, grammar_json, metadata_json, published_at) VALUES ' +
      `(${sqlString(packId)}, ${sqlString(locale)}, ${pack.version}, 'active', 'curated', ${sqlString(grammarJson)}, ${sqlString(metadataJson)}, CURRENT_TIMESTAMP);`
  );

  for (const word of pack.words) {
    const inflectionsJson = JSON.stringify(word.inflections ?? {});
    lines.push(
      'INSERT OR REPLACE INTO talk_word_inventory (id, pack_id, locale, text, normalized_text, pos, category, icon, image, frequency, inflections_json) VALUES ' +
        `(${sqlString(globalId(word.id))}, ${sqlString(packId)}, ${sqlString(locale)}, ${sqlString(word.text)}, ${sqlString(word.text.toLowerCase())}, ${sqlString(word.pos)}, ${sqlString(word.category)}, ${sqlStringOrNull(word.icon)}, ${sqlStringOrNull(word.image)}, ${word.frequency}, ${sqlString(inflectionsJson)});`
    );
  }

  for (const template of pack.templates) {
    const slotsJson = JSON.stringify(template.slots);
    lines.push(
      'INSERT OR REPLACE INTO talk_templates (id, pack_id, locale, pattern, category, icon, slots_json, priority) VALUES ' +
        `(${sqlString(globalId(template.id))}, ${sqlString(packId)}, ${sqlString(locale)}, ${sqlString(template.pattern)}, ${sqlString(template.category)}, ${sqlStringOrNull(template.icon)}, ${sqlString(slotsJson)}, ${template.priority ?? 0});`
    );
  }

  for (const [fromPos, toList] of Object.entries(pack.grammar.validTransitions)) {
    toList.forEach((toPos, index) => {
      const weight = Math.max(10 - index, 1);
      lines.push(
        'INSERT OR REPLACE INTO talk_transitions (id, pack_id, locale, from_pos, to_pos, weight, source) VALUES ' +
          `(${sqlString(`${packId}:${fromPos}:${toPos}`)}, ${sqlString(packId)}, ${sqlString(locale)}, ${sqlString(fromPos)}, ${sqlString(toPos)}, ${weight.toFixed(2)}, 'curated');`
      );
    });
  }

  return lines.join('\n') + '\n';
}

function main() {
  let packFiles;
  try {
    packFiles = readdirSync(DATA_DIR)
      .filter((name) => /^.+-v\d+\.json$/.test(name))
      .sort();
  } catch (error) {
    fail(`could not read pack data directory ${DATA_DIR}: ${error.message}`);
  }

  if (packFiles.length === 0) {
    fail(`no pack files matching <locale>-v<version>.json found in ${DATA_DIR}`);
  }

  const stale = [];
  const written = [];

  for (const fileName of packFiles) {
    const match = fileName.match(/^(.+)-v(\d+)\.json$/);
    const fileLocale = match[1];
    const fileVersion = Number(match[2]);
    const filePath = join(DATA_DIR, fileName);

    let pack;
    try {
      pack = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      fail(`${fileName}: invalid JSON (${error.message})`);
    }

    try {
      validatePack(pack, fileLocale, fileVersion, fileName);
    } catch (error) {
      fail(error.message);
    }

    const sql = generateSeedSql(pack, fileName);
    const seedPath = join(DB_DIR, `seed-${fileLocale}.sql`);
    const seedRelative = `workers/sentence-api/db/seed-${fileLocale}.sql`;

    if (CHECK_MODE) {
      const existing = existsSync(seedPath) ? readFileSync(seedPath, 'utf8') : null;
      if (existing === null) {
        stale.push(`${seedRelative} is missing (generated from ${fileName})`);
      } else if (existing !== sql) {
        stale.push(`${seedRelative} is stale (regenerate from ${fileName})`);
      } else {
        console.log(`OK ${seedRelative} is up to date`);
      }
    } else {
      writeFileSync(seedPath, sql);
      written.push(seedRelative);
      console.log(`Wrote ${seedRelative} (${pack.words.length} words, ${pack.templates.length} templates)`);
    }
  }

  // Concept -> image seed from the central media map. Upserts only 'auto' rows
  // so admin 'manual' overrides survive reseeds.
  const mapPath = join(DATA_DIR, 'media-map.json');
  const mapSeedPath = join(DB_DIR, 'seed-media-map.sql');
  const mapSeedRelative = 'workers/sentence-api/db/seed-media-map.sql';
  if (existsSync(mapPath)) {
    let mediaMap;
    try {
      mediaMap = JSON.parse(readFileSync(mapPath, 'utf8'));
    } catch (error) {
      fail(`media-map.json: invalid JSON (${error.message})`);
    }
    const lines = ['-- Generated from workers/sentence-api/data/media-map.json; concept -> Tiko media image.'];
    for (const conceptId of Object.keys(mediaMap).sort()) {
      const imageUrl = mediaMap[conceptId];
      if (typeof imageUrl !== 'string' || !imageUrl) continue;
      lines.push(
        'INSERT INTO talk_media_map (concept_id, image_url, source, updated_at) VALUES ' +
          `(${sqlString(conceptId)}, ${sqlString(imageUrl)}, 'auto', CURRENT_TIMESTAMP) ` +
          'ON CONFLICT(concept_id) DO UPDATE SET image_url = excluded.image_url, updated_at = CURRENT_TIMESTAMP ' +
          "WHERE talk_media_map.source = 'auto';"
      );
    }
    const mapSql = lines.join('\n') + '\n';
    if (CHECK_MODE) {
      const existingMap = existsSync(mapSeedPath) ? readFileSync(mapSeedPath, 'utf8') : null;
      if (existingMap !== mapSql) stale.push(`${mapSeedRelative} is stale (regenerate from media-map.json)`);
      else console.log(`OK ${mapSeedRelative} is up to date`);
    } else {
      writeFileSync(mapSeedPath, mapSql);
      console.log(`Wrote ${mapSeedRelative} (${Object.keys(mediaMap).length} concepts)`);
    }
  }

  if (CHECK_MODE) {
    if (stale.length > 0) {
      console.error('Seed files are out of date. Run: npm run generate:talk-seeds');
      for (const entry of stale) console.error(`  - ${entry}`);
      process.exit(1);
    }
    console.log(`All ${packFiles.length} seed file(s) up to date.`);
  } else {
    console.log(`Generated ${written.length} seed file(s) from ${packFiles.length} pack(s).`);
  }
}

main();
