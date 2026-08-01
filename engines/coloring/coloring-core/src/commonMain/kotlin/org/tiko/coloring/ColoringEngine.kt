package org.tiko.coloring

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class ColoringEngine private constructor(initialDocument: ColoringDocument) {
    private data class FillChange(
        val regionId: String,
        val before: ColorValue?,
        val after: ColorValue?,
    )

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
        explicitNulls = false
        prettyPrint = false
    }

    private var document: ColoringDocument = validateDocument(initialDocument)
    private val undoStack = ArrayDeque<FillChange>()
    private val redoStack = ArrayDeque<FillChange>()

    fun snapshot(): ColoringSnapshot = ColoringSnapshot(
        document = document,
        canUndo = undoStack.isNotEmpty(),
        canRedo = redoStack.isNotEmpty(),
    )

    /** Compact bridge shape for Swift while the typed adapter is still evolving. */
    fun snapshotJson(): String = json.encodeToString(snapshot())

    fun serialize(): String = json.encodeToString(document)

    fun fill(x: Double, y: Double, colorHex: String): ColoringResult {
        val region = hitTest(ColoringPoint(x, y))
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NO_REGION)
        val color = ColorValue(normalizeColor(colorHex))
        if (region.fill == color) {
            return ColoringResult(changed = false, code = ColoringResultCode.SAME_COLOR, regionId = region.id)
        }

        applyFill(region.id, color)
        undoStack.addLast(FillChange(region.id, region.fill, color))
        redoStack.clear()
        return ColoringResult(changed = true, code = ColoringResultCode.FILLED, regionId = region.id)
    }

    fun undo(): ColoringResult {
        val change = undoStack.removeLastOrNull()
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NOTHING_TO_UNDO)
        applyFill(change.regionId, change.before)
        redoStack.addLast(change)
        return ColoringResult(changed = true, code = ColoringResultCode.UNDONE, regionId = change.regionId)
    }

    fun redo(): ColoringResult {
        val change = redoStack.removeLastOrNull()
            ?: return ColoringResult(changed = false, code = ColoringResultCode.NOTHING_TO_REDO)
        applyFill(change.regionId, change.after)
        undoStack.addLast(change)
        return ColoringResult(changed = true, code = ColoringResultCode.REDONE, regionId = change.regionId)
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
                region.fill?.let { normalizeColor(it.hex) }
            }
            return value
        }

        private fun normalizeColor(value: String): String {
            val normalized = value.trim().uppercase()
            require(colorRegex.matches(normalized)) { "Color must be #RRGGBB or #RRGGBBAA" }
            return normalized
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
