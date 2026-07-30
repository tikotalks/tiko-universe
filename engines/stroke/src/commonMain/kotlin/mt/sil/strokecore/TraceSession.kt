package mt.sil.strokecore

import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max

/**
 * What just happened, as a tag. Never prose.
 *
 * The client maps these to copy, voice and haptics. That indirection is not
 * ceremony: Tiko's design principles forbid a spoken "wrong", a red cross or a
 * failure animation, and an engine that returned English would make that a
 * matter of discipline. Returning `STROKE_OFF_PATH` makes it a matter of
 * mapping — and every failure tag maps to a soft tone and a silent reset.
 */
public enum class StrokeTag {
    STROKE_BEGIN_OK,
    STROKE_BEGIN_WRONG_PLACE,
    STROKE_PROGRESS,
    STROKE_KEYPOINT,
    STROKE_OFF_PATH,
    STROKE_WRONG_DIRECTION,
    STROKE_LIFTED_EARLY,
    STROKE_RESET,
    STROKE_COMPLETE,
    GLYPH_STROKE_OUT_OF_ORDER,
    GLYPH_COMPLETE,
    ATTEMPT_FINISHED,
    IGNORED,
}

/**
 * The result of one input sample.
 *
 * Flat primitives on purpose: this is the hot path, called once per touch sample
 * at up to 240 Hz on an Apple Pencil, and it crosses the Objective-C bridge.
 * Allocating a list per sample would be felt.
 */
public class StrokeEvent internal constructor(
    public val tag: StrokeTag,
    /** Index of the stroke this refers to. */
    public val strokeIndex: Int,
    /** Validated progress along the stroke, normalized. */
    public val inkS: Double,
    /** Where the ink tip should be drawn — on the path, not under the finger. */
    public val inkX: Double,
    public val inkY: Double,
    /** Index of the key point just crossed, or -1. */
    public val keyPointCrossed: Int,
)

/** How an attempt went. The only place a number appears; Parent Mode reads it. */
public class AttemptResult internal constructor(
    public val completed: Boolean,
    public val completedStrokes: Int,
    public val totalStrokes: Int,
    /** Mean perpendicular deviation across accepted samples, in viewBox units. */
    public val meanDeviation: Double,
    public val maxDeviation: Double,
    public val resetCount: Int,
    public val durationMs: Long,
    public val sampleCount: Int,
)

/**
 * One attempt at one glyph.
 *
 * The rules it enforces are the pedagogy: start near the start, travel the right
 * way, pass the key points in order, and draw the strokes in order. A tracing
 * app that only checks proximity teaches nothing about forming a letter, which
 * is the entire reason this engine exists rather than a hit-test.
 */
public class TraceSession internal constructor(
    private val glyph: Glyph,
    private val settings: TraceSettings,
    private val attempt: Int,
) {
    private val extent: Double = run {
        var e = 0.0
        for (i in 0 until glyph.strokeCount) e = max(e, glyph.stroke(i).extent())
        if (e <= 0.0) 1.0 else e
    }

    private var strokeIndex = 0
    private var cursor = 0.0
    private var frontier = 0.0
    private var keyPointsCrossed = 0
    private var penDown = false
    private var completedStrokes = 0
    private var finished = false

    private var deviationSum = 0.0
    private var maxDeviation = 0.0
    private var acceptedSamples = 0
    private var resetCount = 0
    private var firstMs = -1L
    private var lastMs = 0L

    private val current: Stroke get() = glyph.stroke(strokeIndex)

    private fun tolerance(): Double = extent * settings.toleranceFor(attempt) * current.widthScale
    private fun startTolerance(): Double = extent * settings.startToleranceFraction * current.widthScale

    /**
     * Along-track thresholds are physical distances converted into this stroke's
     * arc length. A short stroke therefore gets proportionally more slack, which
     * is what a steady-handed adult and a wobbly child both need on the dot of
     * an `i`. Capped so a tiny stroke does not become a free pass.
     */
    private fun slackS(): Double =
        ((extent * settings.backtrackSlack) / current.polyline.length).coerceAtMost(0.34)

    private fun maxAdvanceS(): Double =
        ((extent * settings.maxAdvancePerSample) / current.polyline.length).coerceIn(0.05, 0.5)

    /** Progress on the current stroke, for the client's ink layer. */
    public val currentStrokeIndex: Int get() = strokeIndex
    public val currentProgress: Double get() = frontier
    public val isFinished: Boolean get() = finished

    /**
     * Pen down. Rejected unless it lands near the start of the expected stroke —
     * a child who begins a `1` at the bottom is not writing a `1`.
     *
     * Once there is ink, putting the pen back down **where the ink stopped** is
     * also accepted. Children lift constantly: to reposition their hand, because
     * the stroke is longer than their reach, or simply because they paused. If
     * only the stroke's start were accepted, every lift would silently strand
     * them — the pen would be down but nothing would move.
     */
    public fun begin(x: Double, y: Double): StrokeEvent {
        if (finished) return event(StrokeTag.IGNORED)

        val start = current.polyline.pointAt(0.0)
        if (hypot(x - start[0], y - start[1]) <= startTolerance()) {
            penDown = true
            cursor = 0.0
            // Starting over from the top of a stroke is always allowed, and
            // rewinds the ink so the child sees a clean slate for it.
            frontier = 0.0
            keyPointsCrossed = 0
            return event(StrokeTag.STROKE_BEGIN_OK, inkS = 0.0)
        }

        if (frontier > 0.0) {
            val resume = current.polyline.pointAt(frontier)
            if (hypot(x - resume[0], y - resume[1]) <= startTolerance()) {
                penDown = true
                cursor = frontier
                return event(StrokeTag.STROKE_BEGIN_OK, inkS = frontier)
            }
        }

        return event(StrokeTag.STROKE_BEGIN_WRONG_PLACE)
    }

    /**
     * One input sample. Advances only when the pointer is inside the corridor
     * *and* moving forward; anything else applies the off-path policy.
     */
    public fun onPoint(x: Double, y: Double, tMs: Long): StrokeEvent {
        if (finished) return event(StrokeTag.IGNORED)
        if (!penDown) return event(StrokeTag.IGNORED)

        if (firstMs < 0) firstMs = tMs
        lastMs = tMs

        val projection = current.polyline.project(x, y)
        val inCorridor = projection.distance <= tolerance()

        if (!inCorridor) return applyOffPath(StrokeTag.STROKE_OFF_PATH)

        // Backwards past the slack is a reversal, not a wobble.
        if (projection.s < cursor - slackS()) {
            return applyOffPath(StrokeTag.STROKE_WRONG_DIRECTION)
        }

        // Forwards further than a pointer could physically travel in one sample
        // is not progress either. Near a stroke's end the projection returns s
        // close to 1 from a long way off, so without this a child could touch the
        // start, jump to the end, and satisfy every key point at once.
        if (projection.s > cursor + maxAdvanceS()) {
            return applyOffPath(StrokeTag.STROKE_OFF_PATH)
        }

        acceptedSamples += 1
        deviationSum += projection.distance
        maxDeviation = max(maxDeviation, projection.distance)

        cursor = projection.s
        var crossed = -1
        if (projection.s > frontier) {
            frontier = projection.s
            // Key points must be crossed in order; only the next one can fire.
            while (keyPointsCrossed < current.keyPointCount &&
                current.keyPointsS[keyPointsCrossed] <= frontier
            ) {
                crossed = keyPointsCrossed
                keyPointsCrossed += 1
            }
        }

        if (frontier >= 1.0 - COMPLETION_EPSILON && keyPointsCrossed >= current.keyPointCount) {
            return completeStroke()
        }
        return if (crossed >= 0) {
            event(StrokeTag.STROKE_KEYPOINT, inkS = frontier, keyPointCrossed = crossed)
        } else {
            event(StrokeTag.STROKE_PROGRESS, inkS = frontier)
        }
    }

    /**
     * Pen up. A lift short of the end is only a problem when the caregiver has
     * asked for it to be, and even then it is a silent reset rather than a
     * scolding.
     */
    public fun lift(): StrokeEvent {
        if (finished || !penDown) return event(StrokeTag.IGNORED)
        penDown = false

        val complete = frontier >= 1.0 - COMPLETION_EPSILON && keyPointsCrossed >= current.keyPointCount
        if (complete) return completeStroke()

        if (!settings.allowLiftBetweenKeyPoints) {
            return applyOffPath(StrokeTag.STROKE_LIFTED_EARLY)
        }
        return event(StrokeTag.STROKE_LIFTED_EARLY, inkS = frontier)
    }

    /**
     * Declares that the child is starting a different stroke than expected.
     * Returns [StrokeTag.GLYPH_STROKE_OUT_OF_ORDER] when order is enforced.
     */
    public fun selectStroke(index: Int): StrokeEvent {
        if (finished) return event(StrokeTag.IGNORED)
        if (index < 0 || index >= glyph.strokeCount) return event(StrokeTag.IGNORED)
        val ordered = settings.strokeOrderStrict && glyph.strokeOrderStrict
        if (ordered && index != strokeIndex) {
            return event(StrokeTag.GLYPH_STROKE_OUT_OF_ORDER, strokeIndexOverride = index)
        }
        strokeIndex = index
        cursor = 0.0
        frontier = 0.0
        keyPointsCrossed = 0
        penDown = false
        return event(StrokeTag.STROKE_BEGIN_OK)
    }

    /** The attempt's outcome, or null while it is still running. */
    public fun result(): AttemptResult? {
        if (!finished) return null
        return AttemptResult(
            completed = completedStrokes == glyph.strokeCount,
            completedStrokes = completedStrokes,
            totalStrokes = glyph.strokeCount,
            meanDeviation = if (acceptedSamples == 0) 0.0 else deviationSum / acceptedSamples,
            maxDeviation = maxDeviation,
            resetCount = resetCount,
            durationMs = if (firstMs < 0) 0L else lastMs - firstMs,
            sampleCount = acceptedSamples,
        )
    }

    // -----------------------------------------------------------------------

    private fun applyOffPath(reason: StrokeTag): StrokeEvent {
        when (settings.offPathPolicy) {
            OffPathPolicy.STAY_IN_PLACE -> {
                // Ink simply does not advance. Nothing is taken away from the
                // child; they can carry on from where they were.
                return event(reason, inkS = frontier)
            }
            OffPathPolicy.BACK_TO_LAST_KEY_POINT -> {
                val target = if (keyPointsCrossed > 0) current.keyPointsS[keyPointsCrossed - 1] else 0.0
                if (abs(frontier - target) > COMPLETION_EPSILON) resetCount += 1
                cursor = target
                frontier = target
                return event(StrokeTag.STROKE_RESET, inkS = frontier)
            }
            OffPathPolicy.BACK_TO_START -> {
                if (frontier > COMPLETION_EPSILON) resetCount += 1
                cursor = 0.0
                frontier = 0.0
                keyPointsCrossed = 0
                return event(StrokeTag.STROKE_RESET, inkS = 0.0)
            }
        }
    }

    private fun completeStroke(): StrokeEvent {
        frontier = 1.0
        cursor = 1.0
        keyPointsCrossed = current.keyPointCount
        penDown = false
        completedStrokes += 1

        if (strokeIndex + 1 >= glyph.strokeCount) {
            finished = true
            return event(StrokeTag.GLYPH_COMPLETE, inkS = 1.0)
        }
        val finishedIndex = strokeIndex
        strokeIndex += 1
        cursor = 0.0
        frontier = 0.0
        keyPointsCrossed = 0
        return event(StrokeTag.STROKE_COMPLETE, strokeIndexOverride = finishedIndex, inkS = 1.0)
    }

    private fun event(
        tag: StrokeTag,
        inkS: Double = frontier,
        keyPointCrossed: Int = -1,
        strokeIndexOverride: Int = -1,
    ): StrokeEvent {
        val index = if (strokeIndexOverride >= 0) strokeIndexOverride else strokeIndex
        val stroke = glyph.stroke(index.coerceIn(0, glyph.strokeCount - 1))
        val p = stroke.polyline.pointAt(inkS)
        return StrokeEvent(tag, index, inkS, p[0], p[1], keyPointCrossed)
    }

    internal companion object {
        const val COMPLETION_EPSILON = 0.02
    }
}
