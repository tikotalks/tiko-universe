/**
 * Resolving website copy for a locale.
 *
 * The marketing site's text is long-form: headlines, ledes, whole paragraphs,
 * lists of principles. That is a different shape from the ~197 short interface
 * strings in `tools/ui-translations`, which are keyed by the English string
 * itself so that "Cancel" is translated once for every app that shows it. Those
 * two things do not want the same pipeline — a paragraph is not reused across
 * apps, and keying it by its own English text would make editing a typo look
 * like a new string.
 *
 * So the site keeps structured copy objects instead: English is the typed
 * source of truth and defines the shape, and each locale supplies a partial
 * override. Anything a locale has not translated falls back to English at that
 * leaf, which means a locale can ship half-done and read correctly.
 */

/**
 * Widen `as const` literals back to their base types.
 *
 * The English copy is declared `as const` so the object keys are exact and a
 * typo in a key is a compile error. Without widening, though, every leaf would
 * also be a *literal* type — `'Toggle theme'` rather than `string` — and no
 * translation could ever satisfy it. This keeps the shape and relaxes the
 * values.
 */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? readonly Widen<U>[]
        : T extends object
          ? { readonly [K in keyof T]: Widen<T[K]> }
          : T

/** A locale may translate any subset of the English copy. */
export type DeepPartial<T> = T extends readonly (infer U)[]
  ? readonly DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Overlay a locale's partial copy onto the English base.
 *
 * Arrays are replaced wholesale rather than merged element-wise: a translated
 * list of principles is a complete list, and zipping it against English by
 * index would silently produce half-English entries if the lengths ever drifted.
 */
export function overlayCopy<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (override === undefined || override === null) return base

  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base
    const out: Record<string, unknown> = { ...base }
    for (const key of Object.keys(base)) {
      if (!(key in override)) continue
      out[key] = overlayCopy(
        (base as Record<string, unknown>)[key],
        (override as Record<string, unknown>)[key] as never,
      )
    }
    return out as T
  }

  // A leaf. Take the translation only if it is a non-empty string, so an empty
  // entry in a locale file reads as "not translated yet" rather than blanking
  // the page.
  if (typeof override === 'string' && override.trim() === '') return base
  return override as T
}
