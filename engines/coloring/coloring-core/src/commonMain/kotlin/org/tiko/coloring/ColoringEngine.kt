package org.tiko.coloring

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class ColoringEngine private constructor(initialDocument: ColoringDocument) {
    /**
     * One undoable edit. Fills and strokes share a single history so undo walks back
     * through what the child actually did, in order, rather than through two stacks
     * that interleave unpredictably.
     */
    private sealed interface Change {
        val regionId: String?

        data class Fill(
            override val regionId: String,
            val before: ColorValue?,
            val after: ColorValue?,
        ) : Change

        /** A stroke that was added; undo removes it, redo puts it back. */
        data class Stroke(val stroke: ColoringStroke) : Change {
            override val regionId: String? get() = stroke.clippedRegionId
        }

        /** A wholesale document swap, used by clear, where per-edit inverses would not compose. */
        data class Replace(
            val before: ColoringDocument,
            val after: ColoringDocument,
        ) : Change {
            override val regionId: String? get() = null
        }
    }

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
        explicitNulls = false
        prettyPrint = false
    }

    private var document: ColoringDocument = validateDocument(initialDocument)
    private val undoStack = ArrayDeque<Change>()
    private val redoStack = ArrayDeque<Change>()

    /** The stroke being drawn right now. Not in the document until the finger lifts. */
    private var activeStroke: ColoringStroke? = null
    private var strokeCounter: Int = 0

    fun snapshot(): ColoringSnapshot = ColoringSnapshot(
        document = document,
        canUndo = undoStack.isNotEmpty(),
        canRedo = redoStack.isNotEmpty(),
    )

    /** Compact bridge shape for Swift while the typed adapter is still evolving. */
    fun snapshotJson(): String = json.encodeToString(snapshot())

    fun serialize(): String = json.encodeToString(document)

    fun fill(x: Double, y: Double, colorHex: String): ColoringResult {
        // Validate the colour before hit testing so a malformed value reports the same
        // way wherever the tap landed.
        val normalized = normalizeColorOrNull(colorHex)
            ?: return ColoringResult(changed = false, code = ColoringResultCode.INVALID_COLOR)
        val region = hitTest(ColoringPoint(x, y))
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NO_REGION)
        val color = ColorValue(normalized)
        if (region.fill == color) {
            return ColoringResult(changed = false, code = ColoringResultCode.SAME_COLOR, regionId = region.id)
        }

        applyFill(region.id, color)
        undoStack.addLast(Change.Fill(region.id, region.fill, color))
        redoStack.clear()
        return ColoringResult(changed = true, code = ColoringResultCode.FILLED, regionId = region.id)
    }

    /**
     * Starts a freehand stroke.
     *
     * When [stayInsideLines] is true the stroke is tied to the region under the
     * starting point and the renderer clips it there, so scribbling roughly over a
     * shape colours only that shape. When false the stroke is free across the page.
     * Starting outside every region is only an error in the first mode.
     */
    fun beginStroke(
        x: Double,
        y: Double,
        colorHex: String,
        width: Double,
        tool: ColoringTool = ColoringTool.CRAYON,
        stayInsideLines: Boolean = true,
    ): ColoringResult {
        val normalized = normalizeColorOrNull(colorHex)
            ?: return ColoringResult(changed = false, code = ColoringResultCode.INVALID_COLOR)
        if (width <= 0) return ColoringResult(changed = false, code = ColoringResultCode.INVALID_WIDTH)

        val region = hitTest(ColoringPoint(x, y))
        if (stayInsideLines && region == null) {
            return ColoringResult(changed = false, code = ColoringResultCode.NO_REGION)
        }

        strokeCounter += 1
        activeStroke = ColoringStroke(
            id = "stroke-$strokeCounter",
            tool = tool,
            points = listOf(ColoringStrokePoint(x, y)),
            color = ColorValue(normalized),
            width = width,
            clippedRegionId = if (stayInsideLines) region?.id else null,
        )
        return ColoringResult(changed = true, code = ColoringResultCode.STROKE_STARTED, regionId = region?.id)
    }

    /** Adds a point to the stroke in progress. Ignored when no stroke is active. */
    fun extendStroke(x: Double, y: Double, pressure: Double = 1.0): ColoringResult {
        val stroke = activeStroke
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NO_ACTIVE_STROKE)
        // Points arrive far faster than they can be drawn; drop ones that add nothing.
        val last = stroke.points.last()
        if (abs(last.x - x) < MIN_STROKE_STEP && abs(last.y - y) < MIN_STROKE_STEP) {
            return ColoringResult(changed = false, code = ColoringResultCode.STROKE_EXTENDED, regionId = stroke.clippedRegionId)
        }
        activeStroke = stroke.copy(points = stroke.points + ColoringStrokePoint(x, y, pressure))
        return ColoringResult(changed = true, code = ColoringResultCode.STROKE_EXTENDED, regionId = stroke.clippedRegionId)
    }

    /** Commits the stroke in progress to the document as one undoable step. */
    fun endStroke(): ColoringResult {
        val stroke = activeStroke
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NO_ACTIVE_STROKE)
        activeStroke = null
        // A tap that never moved is a dot, which is still ink worth keeping.
        document = document.copy(strokes = document.strokes + stroke)
        undoStack.addLast(Change.Stroke(stroke))
        redoStack.clear()
        return ColoringResult(changed = true, code = ColoringResultCode.STROKE_ENDED, regionId = stroke.clippedRegionId)
    }

    /** The stroke being drawn, so the view can show ink under the finger. */
    fun activeStrokeJson(): String? = activeStroke?.let { json.encodeToString(it) }

    fun undo(): ColoringResult {
        val change = undoStack.removeLastOrNull()
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NOTHING_TO_UNDO)
        when (change) {
            is Change.Fill -> applyFill(change.regionId, change.before)
            is Change.Stroke -> document = document.copy(
                strokes = document.strokes.filterNot { it.id == change.stroke.id },
            )
            is Change.Replace -> document = change.before
        }
        redoStack.addLast(change)
        return ColoringResult(changed = true, code = ColoringResultCode.UNDONE, regionId = change.regionId)
    }

    fun redo(): ColoringResult {
        val change = redoStack.removeLastOrNull()
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NOTHING_TO_REDO)
        when (change) {
            is Change.Fill -> applyFill(change.regionId, change.after)
            is Change.Stroke -> document = document.copy(strokes = document.strokes + change.stroke)
            is Change.Replace -> document = change.after
        }
        undoStack.addLast(change)
        return ColoringResult(changed = true, code = ColoringResultCode.REDONE, regionId = change.regionId)
    }

    /** Removes every fill and stroke as a single undoable step. */
    fun clear(): ColoringResult {
        if (document.strokes.isEmpty() && document.regions.all { it.fill == null }) {
            return ColoringResult(changed = false, code = ColoringResultCode.NOTHING_TO_CLEAR)
        }
        val before = document
        val after = document.copy(
            strokes = emptyList(),
            regions = document.regions.map { it.copy(fill = null) },
        )
        document = after
        activeStroke = null
        undoStack.addLast(Change.Replace(before, after))
        redoStack.clear()
        return ColoringResult(changed = true, code = ColoringResultCode.CLEARED)
    }

    fun regionAt(x: Double, y: Double): String? = hitTest(ColoringPoint(x, y))?.id

    private fun applyFill(regionId: String, color: ColorValue?) {
        document = document.copy(
            regions = document.regions.map { region ->
                if (region.id == regionId) region.copy(fill = color) else region
            },
        )
    }

    private fun hitTest(point: ColoringPoint): ColoringRegion? =
        document.regions
            .asSequence()
            .filter { pointInPolygon(point, it.path.points) }
            .minWithOrNull(compareBy<ColoringRegion> { abs(polygonArea(it.path.points)) }.thenByDescending { it.zIndex })

    companion object {
        /**
         * Minimum movement, in canvas units, before a stroke records another point.
         * Touch delivers points far faster than they can be drawn or stored, and a
         * stroke that keeps every one of them bloats the saved document for no
         * visible difference.
         */
        private const val MIN_STROKE_STEP = 0.75

        private val colorRegex = Regex("^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$")
        private val decoder = Json { ignoreUnknownKeys = true }

        fun open(serializedDocument: String): ColoringEngine =
            ColoringEngine(decoder.decodeFromString<ColoringDocument>(serializedDocument))

        fun fromSvg(documentId: String, svg: String, title: String = ""): ColoringEngine =
            ColoringEngine(SvgColoringImporter.import(documentId, svg, title))

        private fun validateDocument(value: ColoringDocument): ColoringDocument {
            require(value.schemaVersion == COLORING_DOCUMENT_SCHEMA_VERSION) {
                "Unsupported coloring document schema ${value.schemaVersion}"
            }
            require(value.id.isNotBlank()) { "Coloring document ID must not be blank" }
            require(value.canvas.width > 0 && value.canvas.height > 0) { "Coloring canvas must have a positive size" }
            require(value.regions.isNotEmpty()) { "Coloring document must contain at least one region" }
            require(value.regions.map { it.id }.distinct().size == value.regions.size) { "Coloring region IDs must be unique" }
            value.regions.forEach { region ->
                require(region.path.closed) { "Coloring region ${region.id} must be closed" }
                require(region.path.points.size >= 3) { "Coloring region ${region.id} is not a polygon" }
            }
            // Canonicalise stored fills rather than only checking them. Colour equality is
            // data-class equality on the hex string, so a document saved with `#ff3366`
            // would never compare equal to an incoming `#FF3366` and every repeat fill
            // would count as a change.
            return value.copy(
                regions = value.regions.map { region ->
                    val fill = region.fill ?: return@map region
                    val normalized = requireNotNull(normalizeColorOrNull(fill.hex)) {
                        "Coloring region ${region.id} has an invalid fill: ${fill.hex}"
                    }
                    if (normalized == fill.hex) region else region.copy(fill = ColorValue(normalized))
                },
            )
        }

        private fun normalizeColorOrNull(value: String): String? {
            val normalized = value.trim().uppercase()
            return if (colorRegex.matches(normalized)) normalized else null
        }

        private fun pointInPolygon(point: ColoringPoint, polygon: List<ColoringPoint>): Boolean {
            if (polygon.indices.any { index ->
                    pointOnSegment(point, polygon[index], polygon[(index + 1) % polygon.size])
                }) return true

            var inside = false
            var previous = polygon.last()
            for (current in polygon) {
                val crosses = (current.y > point.y) != (previous.y > point.y)
                if (crosses) {
                    val intersectionX = (previous.x - current.x) * (point.y - current.y) /
                        (previous.y - current.y) + current.x
                    if (point.x < intersectionX) inside = !inside
                }
                previous = current
            }
            return inside
        }

        private fun pointOnSegment(point: ColoringPoint, a: ColoringPoint, b: ColoringPoint): Boolean {
            val cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y)
            if (abs(cross) > 0.000001) return false
            return point.x in (min(a.x, b.x) - 0.000001)..(max(a.x, b.x) + 0.000001) &&
                point.y in (min(a.y, b.y) - 0.000001)..(max(a.y, b.y) + 0.000001)
        }

        private fun polygonArea(points: List<ColoringPoint>): Double {
            var sum = 0.0
            for (index in points.indices) {
                val current = points[index]
                val next = points[(index + 1) % points.size]
                sum += current.x * next.y - next.x * current.y
            }
            return sum / 2.0
        }
    }
}
