package org.tiko.coloring

/**
 * Imports the deliberately small SVG subset used by Tiko coloring pages.
 *
 * Supported path commands: M/m, L/l, H/h, V/v and Z/z. Curves, masks,
 * filters, text, scripts, remote resources and embedded images are rejected.
 * The generation pipeline must normalize richer source artwork before it
 * reaches this importer.
 */
object SvgColoringImporter {
    private val forbiddenMarkup = listOf(
        "<script",
        "<foreignobject",
        "<image",
        "<use",
        "<filter",
        "<mask",
        "<text",
        "<a ",
        "javascript:",
    )

    private val viewBoxRegex = Regex("""viewBox\s*=\s*[\"']([^\"']+)[\"']""", RegexOption.IGNORE_CASE)
    private val widthRegex = Regex("""\bwidth\s*=\s*[\"']([0-9.]+)[\"']""", RegexOption.IGNORE_CASE)
    private val heightRegex = Regex("""\bheight\s*=\s*[\"']([0-9.]+)[\"']""", RegexOption.IGNORE_CASE)
    private val pathRegex = Regex("""<path\b([^>]*)/?>""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    private val attributeRegex = Regex("""([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*[\"']([^\"']*)[\"']""")
    private val tokenRegex = Regex("""[MmLlHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?""")

    fun import(documentId: String, svg: String, title: String = ""): ColoringDocument {
        require(documentId.isNotBlank()) { "documentId must not be blank" }
        validateSafeMarkup(svg)

        val viewport = parseViewport(svg)
        val canvas = ColoringCanvas(width = viewport.width, height = viewport.height)
        val regions = pathRegex.findAll(svg).mapIndexedNotNull { index, match ->
            val attributes = parseAttributes(match.groupValues[1])
            if (attributes["data-color-region"]?.lowercase() == "false") return@mapIndexedNotNull null

            val data = attributes["d"] ?: return@mapIndexedNotNull null
            val id = attributes["id"]?.takeIf(String::isNotBlank) ?: "region-${index + 1}"
            val path = parsePath(id, data)
            ColoringRegion(
                id = id,
                path = viewport.toCanvasSpace(path),
                parentRegionId = attributes["data-parent-region"],
                zIndex = attributes["data-z-index"]?.toIntOrNull() ?: index,
            )
        }.toList()

        require(regions.isNotEmpty()) { "SVG does not contain any supported coloring regions" }
        require(regions.map { it.id }.distinct().size == regions.size) { "Coloring region IDs must be unique" }

        // Artwork rarely reaches the corners of its own canvas, which leaves dead
        // areas where a tap does nothing and the page feels broken. Back every
        // document with a full-canvas region so there is always something to colour.
        // It is the largest region, and hit testing prefers the smallest, so it only
        // wins where nothing is drawn. It carries no outline of its own.
        val backdrop = ColoringRegion(
            id = CANVAS_REGION_ID,
            path = ColoringPath(
                id = CANVAS_REGION_ID,
                points = listOf(
                    ColoringPoint(0.0, 0.0),
                    ColoringPoint(canvas.width, 0.0),
                    ColoringPoint(canvas.width, canvas.height),
                    ColoringPoint(0.0, canvas.height),
                ),
            ),
            zIndex = -1,
        )
        require(regions.none { it.id == CANVAS_REGION_ID }) {
            "\"$CANVAS_REGION_ID\" is reserved for the page backdrop; rename that path"
        }

        return ColoringDocument(
            id = documentId,
            canvas = canvas,
            regions = listOf(backdrop) + regions,
            outlines = regions.map { it.path },
            metadata = ColoringMetadata(title = title),
        )
    }

    /** Region id of the implicit full-canvas backdrop added to every imported page. */
    const val CANVAS_REGION_ID: String = "canvas"

    /**
     * An SVG viewBox may start anywhere, but the engine and every renderer treat the
     * canvas as `0,0 .. width,height`. Keeping the offset lets artwork drawn at, say,
     * `viewBox="100 100 200 200"` sit entirely outside its own canvas, so translate
     * geometry into canvas space at import time.
     */
    private data class Viewport(
        val minX: Double,
        val minY: Double,
        val width: Double,
        val height: Double,
    ) {
        fun toCanvasSpace(path: ColoringPath): ColoringPath {
            if (minX == 0.0 && minY == 0.0) return path
            return path.copy(points = path.points.map { ColoringPoint(it.x - minX, it.y - minY) })
        }
    }

    private fun validateSafeMarkup(svg: String) {
        val normalized = svg.lowercase()
        val forbidden = forbiddenMarkup.firstOrNull(normalized::contains)
        require(forbidden == null) { "Unsupported or unsafe SVG markup: $forbidden" }
        require("<svg" in normalized) { "Input is not an SVG document" }
    }

    private fun parseViewport(svg: String): Viewport {
        val viewBox = viewBoxRegex.find(svg)?.groupValues?.get(1)
            ?.trim()
            ?.split(Regex("[ ,]+"))
            ?.mapNotNull(String::toDoubleOrNull)

        if (viewBox != null && viewBox.size == 4) {
            require(viewBox[2] > 0 && viewBox[3] > 0) { "SVG viewBox must have a positive size" }
            return Viewport(minX = viewBox[0], minY = viewBox[1], width = viewBox[2], height = viewBox[3])
        }

        val width = widthRegex.find(svg)?.groupValues?.get(1)?.toDoubleOrNull()
        val height = heightRegex.find(svg)?.groupValues?.get(1)?.toDoubleOrNull()
        require(width != null && height != null && width > 0 && height > 0) {
            "SVG must define a valid viewBox or numeric width and height"
        }
        return Viewport(minX = 0.0, minY = 0.0, width = width, height = height)
    }

    private fun parseAttributes(source: String): Map<String, String> =
        attributeRegex.findAll(source).associate { match ->
            match.groupValues[1].lowercase() to match.groupValues[2]
        }

    private fun parsePath(id: String, data: String): ColoringPath {
        val unsupportedCommand = data.firstOrNull { character ->
            character.isLetter() && character !in "MmLlHhVvZzEe"
        }
        require(unsupportedCommand == null) { "Unsupported path command $unsupportedCommand in $id" }

        val tokens = tokenRegex.findAll(data).map { it.value }.toList()
        require(tokens.isNotEmpty()) { "Path $id is empty" }

        val points = mutableListOf<ColoringPoint>()
        var index = 0
        var command: Char? = null
        var current = ColoringPoint(0.0, 0.0)
        var start: ColoringPoint? = null
        var closed = false

        fun hasNumber(): Boolean = index < tokens.size && tokens[index].firstOrNull()?.isLetter() != true
        fun number(): Double {
            require(hasNumber()) { "Path $id is missing a coordinate" }
            return tokens[index++].toDouble()
        }
        fun append(point: ColoringPoint) {
            current = point
            if (points.lastOrNull() != point) points += point
            if (start == null) start = point
        }

        while (index < tokens.size) {
            val token = tokens[index]
            if (token.length == 1 && token[0].isLetter()) {
                command = token[0]
                index += 1
                if (command == 'Z' || command == 'z') {
                    closed = true
                    current = start ?: current
                    continue
                }
            }

            val active = requireNotNull(command) { "Path $id must begin with a command" }
            val relative = active.isLowerCase()
            when (active.uppercaseChar()) {
                'M', 'L' -> {
                    val x = number()
                    val y = number()
                    // A second move-to starts a new sub-path. Appending its points to the
                    // same list silently welds two disjoint shapes into one polygon, which
                    // then hit-tests as filled across the empty space between them. This
                    // importer handles one region per <path>, so say so instead.
                    require(!(active.uppercaseChar() == 'M' && points.isNotEmpty())) {
                        "Path $id contains more than one sub-path; split each region into its own <path> element"
                    }
                    val next = if (relative) ColoringPoint(current.x + x, current.y + y) else ColoringPoint(x, y)
                    append(next)
                    if (active == 'M') command = 'L'
                    if (active == 'm') command = 'l'
                }
                'H' -> {
                    val x = number()
                    append(ColoringPoint(if (relative) current.x + x else x, current.y))
                }
                'V' -> {
                    val y = number()
                    append(ColoringPoint(current.x, if (relative) current.y + y else y))
                }
                else -> error("Unsupported path command $active in $id")
            }
        }

        require(closed) { "Coloring path $id must be closed" }
        require(points.size >= 3) { "Coloring path $id must contain at least three points" }
        return ColoringPath(id = id, points = points, closed = true)
    }
}
