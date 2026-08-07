package mt.sil.strokecore

import kotlin.math.max

/** What happens when the pointer leaves the corridor. */
public enum class OffPathPolicy {
    /** Ink stops until the pointer comes back. The kindest, and the default. */
    STAY_IN_PLACE,

    /** Rewind to the last key point that was crossed. */
    BACK_TO_LAST_KEY_POINT,

    /** Rewind to the start of the stroke. */
    BACK_TO_START,
}

/** How much of the model to show. Resolved per attempt, inside the engine. */
public enum class ModelVisibility { FULL, FAINT, START_DOT_AND_KEY_POINTS, START_DOT_ONLY, NONE }

/**
 * Difficulty, as authored by a caregiver.
 *
 * Resolution against the attempt number happens **here** rather than in a client
 * so iOS, Android and the admin preview cannot drift on what attempt 3 means.
 */
public data class TraceSettings(
    /** Corridor half-width as a fraction of the glyph's extent. */
    public val toleranceFraction: Double = 0.13,

    /**
     * How far back the pointer may drift before it counts as reversing, as a
     * fraction of the glyph's extent — a **physical** distance, normalized per
     * stroke by the engine.
     *
     * Expressing this in arc length directly would punish short strokes: the dot
     * on an `i` is 8 units long, so 2 units of ordinary hand tremor is a quarter
     * of the stroke and would read as a reversal, while the same tremor on a
     * 50-unit stem is nothing. A child's hand does not get steadier because the
     * stroke got shorter.
     */
    public val backtrackSlack: Double = 0.04,

    public val offPathPolicy: OffPathPolicy = OffPathPolicy.STAY_IN_PLACE,

    /** Whether strokes must be traced in the authored order. */
    public val strokeOrderStrict: Boolean = true,

    /** Whether the pointer may lift between key points without penalty. */
    public val allowLiftBetweenKeyPoints: Boolean = true,

    /** How close to the start the pointer must go down, as a fraction of extent. */
    public val startToleranceFraction: Double = 0.18,

    /**
     * The furthest one sample may advance along the stroke, in normalized arc
     * length. Progress has to be *continuous*, not merely forward.
     *
     * Without this the engine is trivially defeatable: a pointer near the end of
     * a stroke projects to s close to 1, so touching the start and then jumping
     * to the end would satisfy every key point at once and complete a glyph that
     * was never traced. At any real sampling rate a finger moves a fraction of a
     * percent per sample, so this is generous.
     */
    public val maxAdvancePerSample: Double = 0.15,

    /** Number of attempts in the fading-help ladder. 1 disables it. */
    public val attemptCount: Int = 1,
) {
    init {
        require(toleranceFraction > 0) { "toleranceFraction must be positive" }
        require(attemptCount >= 1) { "attemptCount must be at least 1" }
    }

    /**
     * The corridor tightens with each attempt of the ladder, ending at 60% of
     * the first attempt's width. With [attemptCount] of 1 nothing changes.
     */
    internal fun toleranceFor(attempt: Int): Double {
        if (attemptCount <= 1) return toleranceFraction
        val step = attempt.coerceIn(1, attemptCount) - 1
        val factor = 1.0 - 0.4 * (step.toDouble() / (attemptCount - 1))
        return toleranceFraction * factor
    }

    /** Guidance falls away as the ladder progresses. */
    public fun modelVisibilityFor(attempt: Int): ModelVisibility {
        if (attemptCount <= 1) return ModelVisibility.FULL
        val step = attempt.coerceIn(1, attemptCount)
        val ratio = (step - 1).toDouble() / max(1, attemptCount - 1)
        return when {
            ratio <= 0.0 -> ModelVisibility.FULL
            ratio <= 0.25 -> ModelVisibility.FAINT
            ratio <= 0.5 -> ModelVisibility.START_DOT_AND_KEY_POINTS
            ratio < 1.0 -> ModelVisibility.START_DOT_ONLY
            else -> ModelVisibility.NONE
        }
    }

    public companion object {
        /** Comfortable defaults for a first-time child. */
        public val forgiving: TraceSettings = TraceSettings()

        /** Tighter corridor and rewinding, for a child who has the idea already. */
        public val exacting: TraceSettings = TraceSettings(
            toleranceFraction = 0.08,
            offPathPolicy = OffPathPolicy.BACK_TO_LAST_KEY_POINT,
            allowLiftBetweenKeyPoints = false,
        )
    }
}
