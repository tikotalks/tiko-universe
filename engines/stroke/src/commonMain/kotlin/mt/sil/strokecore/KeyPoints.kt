package mt.sil.strokecore

import kotlin.math.max

/**
 * Key points: the ordered positions a trace must pass through.
 *
 * They are what stops a stroke being satisfied by scribbling along its corridor.
 * The corners and curve peaks are where a letter's *shape* lives — a `V` traced
 * without visiting its point is not a `V`, however close every sample was to the
 * path.
 *
 * Authored positions always win. Derivation exists because hand-placing
 * normalized arc lengths for 75 glyphs is error-prone in a way curvature
 * detection is not, but an author who knows better than the heuristic should be
 * able to say so.
 */
internal object KeyPoints {

    /** Turn angle above which a vertex is a corner rather than curve sampling. */
    private const val CORNER_RADIANS = 0.55 // ~31 degrees

    /** Never place two key points closer than this in normalized arc length. */
    private const val MIN_SPACING = 0.08

    /** Longest gap tolerated along a stroke before one is inserted. */
    private const val MAX_GAP = 0.34

    /**
     * Resolves the key points for a stroke: [authored] if given, else derived
     * from corners and spacing. Positions exclude 0 and 1, which are implicit —
     * the start and end of a stroke are always required.
     */
    fun resolve(polyline: Polyline, authored: List<Double>?): DoubleArray {
        if (authored != null) {
            val cleaned = authored.filter { it > 0.0 && it < 1.0 }.sorted()
            return cleaned.toDoubleArray()
        }
        return derive(polyline)
    }

    private fun derive(polyline: Polyline): DoubleArray {
        val turns = polyline.turnAngles()
        val corners = ArrayList<Double>(8)

        // Corners first. Consecutive vertices can each exceed the threshold on a
        // rounded corner, so take the local maximum rather than every vertex.
        var i = 1
        while (i < polyline.pointCount - 1) {
            if (turns[i] >= CORNER_RADIANS) {
                var best = i
                var j = i
                while (j < polyline.pointCount - 1 && turns[j] >= CORNER_RADIANS) {
                    if (turns[j] > turns[best]) best = j
                    j += 1
                }
                val s = polyline.sAt(best)
                if (s > MIN_SPACING && s < 1.0 - MIN_SPACING) corners.add(s)
                i = j
            } else {
                i += 1
            }
        }

        // Then fill gaps, so a long smooth curve still has something to aim
        // through. A stroke with no corners at all — a straight line — gets an
        // even spread rather than nothing.
        val out = ArrayList<Double>(corners.size + 4)
        var previous = 0.0
        for (s in corners) {
            insertGapFillers(previous, s, out)
            if (out.isEmpty() || s - out.last() >= MIN_SPACING) out.add(s)
            previous = s
        }
        insertGapFillers(previous, 1.0, out)

        return out.toDoubleArray()
    }

    /** Adds evenly spaced points between [from] and [to] when the gap is long. */
    private fun insertGapFillers(from: Double, to: Double, out: ArrayList<Double>) {
        val gap = to - from
        if (gap <= MAX_GAP) return
        val count = max(1, ((gap / MAX_GAP).toInt()))
        for (k in 1..count) {
            val s = from + gap * k / (count + 1)
            if (s <= MIN_SPACING || s >= 1.0 - MIN_SPACING) continue
            if (out.isEmpty() || s - out.last() >= MIN_SPACING) out.add(s)
        }
    }
}
