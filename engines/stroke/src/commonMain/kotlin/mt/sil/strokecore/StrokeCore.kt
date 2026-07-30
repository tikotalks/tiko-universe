package mt.sil.strokecore

/**
 * StrokeCore — guided path tracing.
 *
 * Given a path and a stream of input points, StrokeCore decides whether the
 * pointer is following that path: in the right place, travelling the right way,
 * through the required points, in the required order. It reports what happened
 * as semantic tags and never as prose.
 *
 * It is deliberately **product-neutral**. It knows nothing about Tiko, letters,
 * handwriting, curricula, or children. A consumer tracing a maze, a signature,
 * or a factory-floor gesture would find nothing out of place. Anything that
 * makes tracing mean something to a person — the copy, the voice, the
 * celebration, which glyph comes next — belongs to the client.
 *
 * See docs/adrs/2026-07-30-write-stroke-engine-boundary.md.
 *
 * The geometry and the tracing state machine land in Phase 1; this file
 * currently carries only the identity constants that the saved-state envelope
 * and the pack decoder are specified against.
 */
public object StrokeCore {

    /** Engine identity, written into every saved attempt record. */
    public const val ENGINE_NAME: String = "stroke-core"

    /**
     * Semantic version of engine *behaviour*. Any change to what counts as a
     * valid trace bumps this in the same commit as the fixture update, so an
     * attempt recorded under an older engine is never silently reinterpreted.
     */
    public const val ENGINE_VERSION: String = "0.1.0"

    /**
     * The glyph pack schema this build understands. A pack declaring anything
     * else is refused rather than partially decoded — version 2 adds cursive
     * join anchors, and a version 1 engine has no idea how to join letters.
     */
    public const val PACK_SCHEMA_VERSION: Int = 1

    /** Schema version of the saved attempt-record envelope. */
    public const val STATE_SCHEMA_VERSION: Int = 1

    /**
     * Decodes a glyph pack. Throws [PackDecodeError] on malformed data or an
     * unknown schema version — a bad pack fails at load rather than tracing
     * something unintended.
     */
    public fun loadPack(json: String): GlyphPack = decodePack(json)

    /** Starts one attempt at one glyph. [attempt] is 1-based. */
    public fun newSession(glyph: Glyph, settings: TraceSettings, attempt: Int = 1): TraceSession =
        TraceSession(glyph, settings, attempt)
}
