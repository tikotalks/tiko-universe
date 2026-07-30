package mt.sil.strokecore

import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * SVG path data to a flattened polyline.
 *
 * Flattening is where the engine and the renderer agree: the client draws these
 * same points, so a curve the child sees is the curve the child is measured
 * against. Getting that from one place removes an entire class of bug where a
 * letter looks traceable but is not.
 *
 * Curves subdivide adaptively against [FLATTEN_TOLERANCE] rather than at a fixed
 * step, so a tight bowl gets the points it needs and a long straight does not
 * carry hundreds it does not.
 */
internal object SvgPath {

    /**
     * Maximum deviation between the true curve and its polyline, in viewBox
     * units. Small because a 100-unit viewBox fills a phone screen: at 0.25 the
     * facets on a bowl were visible as flat spots, and a letter a child traces
     * should not look like a polygon.
     */
    const val FLATTEN_TOLERANCE: Double = 0.06

    private val COMMANDS = "MmLlHhVvCcSsQqTtAaZz".toSet()

    class ParseError(message: String) : IllegalArgumentException(message)

    /**
     * Flattens `d` into an ordered list of points. Throws [ParseError] on data
     * the engine will not guess at — a malformed glyph should fail loudly at
     * load rather than silently trace something else.
     */
    fun flatten(d: String): List<Double> {
        val tokens = tokenize(d)
        if (tokens.isEmpty()) throw ParseError("path data has no commands: $d")

        val out = ArrayList<Double>(64)
        var i = 0
        var cx = 0.0
        var cy = 0.0
        var startX = 0.0
        var startY = 0.0
        // Reflection points for the smooth variants S and T.
        var lastCubicCtrlX = 0.0
        var lastCubicCtrlY = 0.0
        var lastQuadCtrlX = 0.0
        var lastQuadCtrlY = 0.0
        var prevCommand = ' '
        var command: Char

        fun push(x: Double, y: Double) {
            // Collapse exact repeats; they carry no length and would create
            // zero-length segments in the arc-length table.
            val n = out.size
            if (n >= 2 && out[n - 2] == x && out[n - 1] == y) return
            out.add(x)
            out.add(y)
        }

        fun number(): Double {
            if (i >= tokens.size) throw ParseError("unexpected end of path data in $d")
            val t = tokens[i]
            if (t.length == 1 && t[0] in COMMANDS) throw ParseError("expected a number, found '$t' in $d")
            i += 1
            return t.toDoubleOrNull() ?: throw ParseError("'$t' is not a number in $d")
        }

        while (i < tokens.size) {
            val head = tokens[i]
            if (head.length == 1 && head[0] in COMMANDS) {
                command = head[0]
                i += 1
            } else {
                if (prevCommand == ' ') throw ParseError("path data must start with a moveto: $d")
                // Repeated argument groups. A repeated moveto continues as a lineto.
                command = when (prevCommand) {
                    'M' -> 'L'
                    'm' -> 'l'
                    else -> prevCommand
                }
            }

            val abs = command.uppercaseChar()
            val rel = command != abs

            when (abs) {
                'M' -> {
                    val x = number(); val y = number()
                    cx = if (rel) cx + x else x
                    cy = if (rel) cy + y else y
                    startX = cx; startY = cy
                    push(cx, cy)
                }
                'L' -> {
                    val x = number(); val y = number()
                    cx = if (rel) cx + x else x
                    cy = if (rel) cy + y else y
                    push(cx, cy)
                }
                'H' -> {
                    val x = number()
                    cx = if (rel) cx + x else x
                    push(cx, cy)
                }
                'V' -> {
                    val y = number()
                    cy = if (rel) cy + y else y
                    push(cx, cy)
                }
                'C', 'S' -> {
                    val x1: Double; val y1: Double
                    if (abs == 'C') {
                        val a = number(); val b = number()
                        x1 = if (rel) cx + a else a
                        y1 = if (rel) cy + b else b
                    } else {
                        // Reflect the previous cubic control point about the current point.
                        if (prevCommand.uppercaseChar() == 'C' || prevCommand.uppercaseChar() == 'S') {
                            x1 = 2 * cx - lastCubicCtrlX
                            y1 = 2 * cy - lastCubicCtrlY
                        } else {
                            x1 = cx; y1 = cy
                        }
                    }
                    val c = number(); val e = number()
                    val x2 = if (rel) cx + c else c
                    val y2 = if (rel) cy + e else e
                    val f = number(); val g = number()
                    val x3 = if (rel) cx + f else f
                    val y3 = if (rel) cy + g else g
                    flattenCubic(cx, cy, x1, y1, x2, y2, x3, y3, ::push)
                    lastCubicCtrlX = x2; lastCubicCtrlY = y2
                    cx = x3; cy = y3
                }
                'Q', 'T' -> {
                    val x1: Double; val y1: Double
                    if (abs == 'Q') {
                        val a = number(); val b = number()
                        x1 = if (rel) cx + a else a
                        y1 = if (rel) cy + b else b
                    } else {
                        if (prevCommand.uppercaseChar() == 'Q' || prevCommand.uppercaseChar() == 'T') {
                            x1 = 2 * cx - lastQuadCtrlX
                            y1 = 2 * cy - lastQuadCtrlY
                        } else {
                            x1 = cx; y1 = cy
                        }
                    }
                    val c = number(); val e = number()
                    val x2 = if (rel) cx + c else c
                    val y2 = if (rel) cy + e else e
                    // A quadratic is a cubic with lifted control points.
                    flattenCubic(
                        cx, cy,
                        cx + 2.0 / 3.0 * (x1 - cx), cy + 2.0 / 3.0 * (y1 - cy),
                        x2 + 2.0 / 3.0 * (x1 - x2), y2 + 2.0 / 3.0 * (y1 - y2),
                        x2, y2, ::push,
                    )
                    lastQuadCtrlX = x1; lastQuadCtrlY = y1
                    cx = x2; cy = y2
                }
                'A' -> {
                    val rx = number(); val ry = number(); val rot = number()
                    val largeArc = number(); val sweep = number()
                    val ex = number(); val ey = number()
                    val tx = if (rel) cx + ex else ex
                    val ty = if (rel) cy + ey else ey
                    if (rx == 0.0 || ry == 0.0) {
                        push(tx, ty) // degenerate radii mean a straight line, per spec
                    } else {
                        flattenArc(cx, cy, rx, ry, rot, largeArc != 0.0, sweep != 0.0, tx, ty, ::push)
                    }
                    cx = tx; cy = ty
                }
                'Z' -> {
                    cx = startX; cy = startY
                    push(cx, cy)
                }
                else -> throw ParseError("unsupported command '$command' in $d")
            }
            prevCommand = command
        }

        if (out.size < 4) throw ParseError("path produced fewer than two points: $d")
        return out
    }

    /** Splits path data into command letters and numbers. */
    private fun tokenize(d: String): List<String> {
        val out = ArrayList<String>(32)
        var i = 0
        while (i < d.length) {
            val c = d[i]
            when {
                c.isWhitespace() || c == ',' -> i += 1
                c in COMMANDS -> { out.add(c.toString()); i += 1 }
                else -> {
                    val start = i
                    if (d[i] == '+' || d[i] == '-') i += 1
                    var seenDot = false
                    while (i < d.length) {
                        val ch = d[i]
                        if (ch.isDigit()) { i += 1 }
                        else if (ch == '.' && !seenDot) { seenDot = true; i += 1 }
                        else if ((ch == 'e' || ch == 'E') && i + 1 < d.length) {
                            i += 1
                            if (i < d.length && (d[i] == '+' || d[i] == '-')) i += 1
                        } else break
                    }
                    if (i == start) throw ParseError("unexpected character '$c' in $d")
                    out.add(d.substring(start, i))
                }
            }
        }
        return out
    }

    /**
     * Recursive de Casteljau subdivision, stopping when the control polygon is
     * flat to within [FLATTEN_TOLERANCE].
     */
    private fun flattenCubic(
        x0: Double, y0: Double, x1: Double, y1: Double,
        x2: Double, y2: Double, x3: Double, y3: Double,
        push: (Double, Double) -> Unit,
        depth: Int = 0,
    ) {
        if (depth >= 18 || isFlat(x0, y0, x1, y1, x2, y2, x3, y3)) {
            push(x3, y3)
            return
        }
        val x01 = (x0 + x1) / 2; val y01 = (y0 + y1) / 2
        val x12 = (x1 + x2) / 2; val y12 = (y1 + y2) / 2
        val x23 = (x2 + x3) / 2; val y23 = (y2 + y3) / 2
        val x012 = (x01 + x12) / 2; val y012 = (y01 + y12) / 2
        val x123 = (x12 + x23) / 2; val y123 = (y12 + y23) / 2
        val xm = (x012 + x123) / 2; val ym = (y012 + y123) / 2
        flattenCubic(x0, y0, x01, y01, x012, y012, xm, ym, push, depth + 1)
        flattenCubic(xm, ym, x123, y123, x23, y23, x3, y3, push, depth + 1)
    }

    /** Distance of both control points from the chord, against the tolerance. */
    private fun isFlat(
        x0: Double, y0: Double, x1: Double, y1: Double,
        x2: Double, y2: Double, x3: Double, y3: Double,
    ): Boolean {
        val dx = x3 - x0
        val dy = y3 - y0
        val len = hypot(dx, dy)
        if (len < 1e-9) {
            // Degenerate chord: fall back to control-point spread.
            return hypot(x1 - x0, y1 - y0) + hypot(x2 - x0, y2 - y0) < FLATTEN_TOLERANCE
        }
        val d1 = abs((x1 - x0) * dy - (y1 - y0) * dx) / len
        val d2 = abs((x2 - x0) * dy - (y2 - y0) * dx) / len
        return max(d1, d2) <= FLATTEN_TOLERANCE
    }

    /**
     * Endpoint to centre parameterization, per the SVG implementation notes
     * (W3C F.6.5), then sampled at a step small enough to hold the tolerance.
     */
    private fun flattenArc(
        x0: Double, y0: Double, rxIn: Double, ryIn: Double, rotationDeg: Double,
        largeArc: Boolean, sweep: Boolean, x1: Double, y1: Double,
        push: (Double, Double) -> Unit,
    ) {
        val phi = rotationDeg * PI_OVER_180
        val cosPhi = cos(phi)
        val sinPhi = sin(phi)
        val dx2 = (x0 - x1) / 2
        val dy2 = (y0 - y1) / 2
        val x1p = cosPhi * dx2 + sinPhi * dy2
        val y1p = -sinPhi * dx2 + cosPhi * dy2

        var rx = abs(rxIn)
        var ry = abs(ryIn)
        // Scale radii up when they are too small to span the endpoints.
        val lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
        if (lambda > 1.0) {
            val s = sqrt(lambda)
            rx *= s
            ry *= s
        }

        val sign = if (largeArc != sweep) 1.0 else -1.0
        val num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
        val den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
        val coef = sign * sqrt(max(0.0, num / den))
        val cxp = coef * rx * y1p / ry
        val cyp = -coef * ry * x1p / rx
        val cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2
        val cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2

        val theta1 = angle(1.0, 0.0, (x1p - cxp) / rx, (y1p - cyp) / ry)
        var delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
        if (!sweep && delta > 0) delta -= TWO_PI
        if (sweep && delta < 0) delta += TWO_PI

        // Step from the tolerance: the sagitta of a segment subtending angle a on
        // radius r is r(1 - cos(a/2)), so bound a by the larger radius.
        val r = max(rx, ry)
        val maxAngle = 2.0 * acos(max(-1.0, min(1.0, 1.0 - FLATTEN_TOLERANCE / r)))
        val steps = max(2, ceil(abs(delta) / max(maxAngle, 1e-3)).toInt())

        for (step in 1..steps) {
            val t = theta1 + delta * step / steps
            val ct = cos(t)
            val st = sin(t)
            push(
                cx + rx * cosPhi * ct - ry * sinPhi * st,
                cy + rx * sinPhi * ct + ry * cosPhi * st,
            )
        }
    }

    private fun angle(ux: Double, uy: Double, vx: Double, vy: Double): Double {
        val dot = ux * vx + uy * vy
        val len = hypot(ux, uy) * hypot(vx, vy)
        if (len < 1e-12) return 0.0
        var a = acos(max(-1.0, min(1.0, dot / len)))
        if (ux * vy - uy * vx < 0) a = -a
        return a
    }

    private const val PI_OVER_180 = 0.017453292519943295
    private const val TWO_PI = 6.283185307179586
}
