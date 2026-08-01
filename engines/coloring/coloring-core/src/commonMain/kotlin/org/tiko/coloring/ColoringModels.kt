package org.tiko.coloring

import kotlinx.serialization.Serializable

const val COLORING_DOCUMENT_SCHEMA_VERSION: Int = 1

@Serializable
data class ColoringDocument(
    val id: String,
    val schemaVersion: Int = COLORING_DOCUMENT_SCHEMA_VERSION,
    val canvas: ColoringCanvas,
    val regions: List<ColoringRegion>,
    val outlines: List<ColoringPath> = emptyList(),
    val strokes: List<ColoringStroke> = emptyList(),
    val palette: List<ColorValue> = emptyList(),
    val metadata: ColoringMetadata = ColoringMetadata(),
)

@Serializable
data class ColoringCanvas(
    val width: Double,
    val height: Double,
)

@Serializable
data class ColoringRegion(
    val id: String,
    val path: ColoringPath,
    val fill: ColorValue? = null,
    val parentRegionId: String? = null,
    val zIndex: Int = 0,
)

@Serializable
data class ColoringPath(
    val id: String,
    val points: List<ColoringPoint>,
    val closed: Boolean = true,
)

@Serializable
data class ColoringPoint(
    val x: Double,
    val y: Double,
)

@Serializable
data class ColoringStroke(
    val id: String,
    val tool: ColoringTool,
    val points: List<ColoringStrokePoint>,
    val color: ColorValue,
    val width: Double,
    val clippedRegionId: String? = null,
)

@Serializable
data class ColoringStrokePoint(
    val x: Double,
    val y: Double,
    val pressure: Double = 1.0,
    val timestampMillis: Long = 0,
)

@Serializable
enum class ColoringTool {
    CRAYON,
    MARKER,
    ERASER,
}

@Serializable
data class ColorValue(
    /** Canonical #RRGGBB or #RRGGBBAA value. */
    val hex: String,
)

@Serializable
data class ColoringMetadata(
    val title: String = "",
    val source: String = "bundled",
    val sourceMediaId: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class ColoringSnapshot(
    val document: ColoringDocument,
    val canUndo: Boolean,
    val canRedo: Boolean,
)

@Serializable
data class ColoringResult(
    val changed: Boolean,
    val code: ColoringResultCode,
    val regionId: String? = null,
)

@Serializable
enum class ColoringResultCode {
    FILLED,
    NO_REGION,
    SAME_COLOR,
    UNDONE,
    REDONE,
    NOTHING_TO_UNDO,
    NOTHING_TO_REDO,
}
