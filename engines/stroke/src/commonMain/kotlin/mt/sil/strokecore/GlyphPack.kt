package mt.sil.strokecore

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * The glyph pack contract, decoded.
 *
 * Mirrors engines/stroke/schema/glyph-pack.v1.json. A pack whose schema version
 * this build does not know is refused outright rather than partially decoded —
 * version 2 adds cursive join anchors, and a version 1 engine has no idea how to
 * join letters, so a partial decode would silently teach the wrong thing.
 */

@Serializable
public data class StrokeSpec(
    val d: String,
    val keyPoints: List<Double>? = null,
    val widthScale: Double = 1.0,
)

@Serializable
public data class GlyphSpec(
    val id: String,
    val char: String,
    val groupId: String,
    val sortOrder: Int,
    val strokes: List<StrokeSpec>,
    val strokeOrderStrict: Boolean = true,
)

@Serializable
public data class GroupSpec(val id: String, val sortOrder: Int)

@Serializable
public data class GuidesSpec(
    val ascender: Double? = null,
    val capHeight: Double? = null,
    val xHeight: Double? = null,
    val baseline: Double,
    val descender: Double? = null,
)

@Serializable
internal data class PackSpec(
    val packId: String,
    val packSchemaVersion: Int,
    val packVersion: Int,
    val style: String,
    val viewBox: List<Double>,
    val guides: GuidesSpec? = null,
    val groups: List<GroupSpec> = emptyList(),
    val glyphs: List<GlyphSpec>,
)

/** Thrown when a pack cannot be decoded, or targets an unknown schema version. */
public class PackDecodeError(message: String) : IllegalArgumentException(message)

/** One traceable stroke: its geometry, its key points, and its tolerance scale. */
public class Stroke internal constructor(
    internal val polyline: Polyline,
    /** Ordered key point positions in normalized arc length, excluding 0 and 1. */
    internal val keyPointsS: DoubleArray,
    internal val widthScale: Double,
) {
    public val keyPointCount: Int get() = keyPointsS.size

    /** Flattened geometry. Swift builds its display path from exactly this. */
    public fun polylinePoints(): FlatPolyline = polyline.flat()

    /** Key points as points, for rendering the dots the child aims through. */
    public fun keyPointPositions(): FlatPolyline {
        val xs = DoubleArray(keyPointsS.size)
        val ys = DoubleArray(keyPointsS.size)
        for (i in keyPointsS.indices) {
            val p = polyline.pointAt(keyPointsS[i])
            xs[i] = p[0]; ys[i] = p[1]
        }
        return FlatPolyline(xs, ys)
    }

    /** Longest side of the stroke's bounding box, in viewBox units. */
    public fun extent(): Double = polyline.boundsMaxDimension()
}

public class Glyph internal constructor(
    public val id: String,
    /** The character this glyph represents. Named `character` rather than `char`
     *  because `char` is a C keyword and Kotlin/Native would mangle it to `char_`
     *  on the Objective-C bridge. */
    public val character: String,
    public val groupId: String,
    public val sortOrder: Int,
    public val strokeOrderStrict: Boolean,
    internal val strokes: List<Stroke>,
) {
    public val strokeCount: Int get() = strokes.size
    public fun stroke(index: Int): Stroke = strokes[index]
    public fun polyline(strokeIndex: Int): FlatPolyline = strokes[strokeIndex].polylinePoints()
    public fun keyPoints(strokeIndex: Int): FlatPolyline = strokes[strokeIndex].keyPointPositions()
}

public class GlyphPack internal constructor(
    public val packId: String,
    public val packVersion: Int,
    public val style: String,
    public val viewBoxWidth: Double,
    public val viewBoxHeight: Double,
    public val baseline: Double?,
    private val glyphList: List<Glyph>,
) {
    public val glyphCount: Int get() = glyphList.size
    public fun glyphAt(index: Int): Glyph = glyphList[index]
    public fun glyph(id: String): Glyph? = glyphList.firstOrNull { it.id == id }
}

internal val packJson: Json = Json { ignoreUnknownKeys = true }

internal fun decodePack(json: String): GlyphPack {
    val spec = try {
        packJson.decodeFromString(PackSpec.serializer(), json)
    } catch (e: Exception) {
        throw PackDecodeError("could not decode glyph pack: ${e.message}")
    }

    if (spec.packSchemaVersion != StrokeCore.PACK_SCHEMA_VERSION) {
        throw PackDecodeError(
            "pack '${spec.packId}' targets schema version ${spec.packSchemaVersion}, " +
                "but this engine understands ${StrokeCore.PACK_SCHEMA_VERSION}"
        )
    }
    if (spec.viewBox.size != 4) {
        throw PackDecodeError("pack '${spec.packId}' viewBox must be four numbers")
    }

    val glyphs = spec.glyphs.map { g ->
        if (g.strokes.isEmpty()) throw PackDecodeError("glyph '${g.id}' has no strokes")
        val strokes = g.strokes.map { s ->
            val poly = try {
                Polyline.fromPathData(s.d)
            } catch (e: Exception) {
                throw PackDecodeError("glyph '${g.id}': ${e.message}")
            }
            Stroke(poly, KeyPoints.resolve(poly, s.keyPoints), s.widthScale)
        }
        Glyph(g.id, g.char, g.groupId, g.sortOrder, g.strokeOrderStrict, strokes)
    }

    return GlyphPack(
        packId = spec.packId,
        packVersion = spec.packVersion,
        style = spec.style,
        viewBoxWidth = spec.viewBox[2],
        viewBoxHeight = spec.viewBox[3],
        baseline = spec.guides?.baseline,
        glyphList = glyphs,
    )
}
