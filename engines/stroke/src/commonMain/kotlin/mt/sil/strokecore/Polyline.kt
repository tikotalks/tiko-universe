package mt.sil.strokecore

import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/**
 * A flattened stroke with an arc-length table.
 *
 * Everything downstream measures progress in **normalized arc length** `s` in
 * `[0, 1]` rather than in points or time, because that is the only measure that
 * behaves the same on a long diagonal and a tight bowl. A child halfway along a
 * stroke is at `s = 0.5` whether that stroke is straight or curled.
 *
 * Exposed to Swift through [FlatPolyline] rather than as an array: a
 * `DoubleArray` surfaces as `KotlinDoubleArray` across the Objective-C bridge,
 * which is unpleasant to use and easy to copy badly.
 */
public class FlatPolyline internal constructor(
    private val xs: DoubleArray,
    private val ys: DoubleArray,
) {
    public val count: Int get() = xs.size
    public fun x(index: Int): Double = xs[index]
    public fun y(index: Int): Double = ys[index]
}

/** Where a point falls relative to a stroke. */
public class Projection internal constructor(
    /** Normalized arc length of the closest point on the stroke. */
    public val s: Double,
    /** Perpendicular distance to the stroke, in viewBox units. */
    public val distance: Double,
    public val x: Double,
    public val y: Double,
)

internal class Polyline private constructor(
    private val xs: DoubleArray,
    private val ys: DoubleArray,
    /** Cumulative length at each vertex; `cum[last]` is the total. */
    private val cum: DoubleArray,
) {
    val length: Double get() = cum[cum.size - 1]
    val pointCount: Int get() = xs.size

    companion object {
        fun fromPathData(d: String): Polyline {
            val flat = SvgPath.flatten(d)
            val n = flat.size / 2
            val xs = DoubleArray(n)
            val ys = DoubleArray(n)
            for (i in 0 until n) {
                xs[i] = flat[i * 2]
                ys[i] = flat[i * 2 + 1]
            }
            return of(xs, ys)
        }

        fun of(xs: DoubleArray, ys: DoubleArray): Polyline {
            require(xs.size >= 2) { "a stroke needs at least two points" }
            val cum = DoubleArray(xs.size)
            var total = 0.0
            for (i in 1 until xs.size) {
                total += hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1])
                cum[i] = total
            }
            require(total > 0.0) { "a stroke needs non-zero length" }
            return Polyline(xs, ys, cum)
        }
    }

    fun flat(): FlatPolyline = FlatPolyline(xs, ys)

    /** The point at normalized arc length [s], clamped to the stroke. */
    fun pointAt(s: Double): DoubleArray {
        val target = s.coerceIn(0.0, 1.0) * length
        val i = segmentFor(target)
        val segLen = cum[i + 1] - cum[i]
        val t = if (segLen <= 0.0) 0.0 else (target - cum[i]) / segLen
        return doubleArrayOf(xs[i] + (xs[i + 1] - xs[i]) * t, ys[i] + (ys[i + 1] - ys[i]) * t)
    }

    /** Unit direction of travel at [s]. */
    fun tangentAt(s: Double): DoubleArray {
        val target = s.coerceIn(0.0, 1.0) * length
        val i = segmentFor(target)
        val dx = xs[i + 1] - xs[i]
        val dy = ys[i + 1] - ys[i]
        val len = hypot(dx, dy)
        return if (len <= 0.0) doubleArrayOf(0.0, 0.0) else doubleArrayOf(dx / len, dy / len)
    }

    /**
     * Closest point on the stroke to `(px, py)`.
     *
     * Brute force over segments. A glyph stroke flattens to a few hundred points
     * and this runs once per input sample, so the constant is small and the
     * predictability is worth more than a spatial index would save.
     */
    fun project(px: Double, py: Double): Projection {
        var bestDist = Double.MAX_VALUE
        var bestS = 0.0
        var bestX = xs[0]
        var bestY = ys[0]

        for (i in 0 until xs.size - 1) {
            val ax = xs[i]; val ay = ys[i]
            val bx = xs[i + 1]; val by = ys[i + 1]
            val dx = bx - ax; val dy = by - ay
            val segLenSq = dx * dx + dy * dy
            val t = if (segLenSq <= 0.0) 0.0 else (((px - ax) * dx + (py - ay) * dy) / segLenSq).coerceIn(0.0, 1.0)
            val cxp = ax + dx * t
            val cyp = ay + dy * t
            val dist = hypot(px - cxp, py - cyp)
            if (dist < bestDist) {
                bestDist = dist
                bestX = cxp
                bestY = cyp
                bestS = (cum[i] + hypot(cxp - ax, cyp - ay)) / length
            }
        }
        return Projection(bestS.coerceIn(0.0, 1.0), bestDist, bestX, bestY)
    }

    /** Index of the segment containing cumulative length [target]. */
    private fun segmentFor(target: Double): Int {
        var lo = 0
        var hi = cum.size - 1
        while (lo < hi - 1) {
            val mid = (lo + hi) / 2
            if (cum[mid] <= target) lo = mid else hi = mid
        }
        return min(lo, xs.size - 2)
    }

    /**
     * Turn angle at each interior vertex, in radians. Used to find the corners
     * and curve peaks that become key points.
     */
    fun turnAngles(): DoubleArray {
        val out = DoubleArray(xs.size)
        for (i in 1 until xs.size - 1) {
            val ax = xs[i] - xs[i - 1]; val ay = ys[i] - ys[i - 1]
            val bx = xs[i + 1] - xs[i]; val by = ys[i + 1] - ys[i]
            val la = hypot(ax, ay); val lb = hypot(bx, by)
            if (la <= 0.0 || lb <= 0.0) continue
            val cosT = ((ax * bx + ay * by) / (la * lb)).coerceIn(-1.0, 1.0)
            out[i] = kotlin.math.acos(cosT)
        }
        return out
    }

    /** Normalized arc length at vertex [index]. */
    fun sAt(index: Int): Double = cum[index] / length

    fun xAt(index: Int): Double = xs[index]
    fun yAt(index: Int): Double = ys[index]

    /** Total turning across the stroke, in radians — a curliness measure. */
    fun totalTurning(): Double = turnAngles().sum()

    fun boundsMaxDimension(): Double {
        var minX = Double.MAX_VALUE; var maxX = -Double.MAX_VALUE
        var minY = Double.MAX_VALUE; var maxY = -Double.MAX_VALUE
        for (i in xs.indices) {
            minX = min(minX, xs[i]); maxX = max(maxX, xs[i])
            minY = min(minY, ys[i]); maxY = max(maxY, ys[i])
        }
        return max(maxX - minX, maxY - minY)
    }
}
