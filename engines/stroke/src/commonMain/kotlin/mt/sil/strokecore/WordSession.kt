package mt.sil.strokecore

/**
 * A word: several glyphs traced in order, along one line.
 *
 * The sequencing lives here rather than in a client so that iOS, a future
 * Android app and the admin preview cannot disagree about when a letter is
 * finished or which letter is next — the same reason the single-glyph rules do.
 *
 * Coordinates arrive in **word space**: one continuous canvas where letter `i`
 * occupies `x` from `i * advanceWidth` to `(i + 1) * advanceWidth`. The session
 * translates them into the active glyph's own space, so the client can draw a
 * whole word on a line and hand through raw touches without doing any of the
 * bookkeeping itself.
 */
public class WordSession internal constructor(
    private val glyphs: List<Glyph>,
    private val settings: TraceSettings,
    /** Horizontal step between letters, in viewBox units — the pack's width. */
    public val advanceWidth: Double,
) {
    private var index = 0
    private var session: TraceSession = StrokeCore.createSession(glyphs[0], settings)
    private var finished = false
    private var completedLetters = 0

    public val letterCount: Int get() = glyphs.size
    public val currentIndex: Int get() = index
    public val isComplete: Boolean get() = finished

    /** Progress on the letter being traced now, 0…1. */
    public val currentProgress: Double get() = session.currentProgress
    public val currentStrokeIndex: Int get() = session.currentStrokeIndex

    public fun glyphAt(index: Int): Glyph = glyphs[index]

    /** Left edge of letter [index] in word space. */
    public fun originX(index: Int): Double = index * advanceWidth

    /** Letters finished so far, for drawing ink that is already committed. */
    public fun isLetterComplete(index: Int): Boolean = index < completedLetters

    public fun begin(x: Double, y: Double): StrokeEvent =
        if (finished) ignored() else translate(session.begin(x - originX(index), y))

    public fun onPoint(x: Double, y: Double, tMs: Long): StrokeEvent =
        if (finished) ignored() else translate(session.onPoint(x - originX(index), y, tMs))

    public fun lift(): StrokeEvent = if (finished) ignored() else translate(session.lift())

    /**
     * Jumps to a letter. A child who taps back to an earlier letter should get
     * it, rather than being held on whichever one the app decided was next.
     */
    public fun selectLetter(index: Int): Boolean {
        if (finished || index < 0 || index >= glyphs.size) return false
        this.index = index
        session = StrokeCore.createSession(glyphs[index], settings)
        return true
    }

    public fun restart() {
        index = 0
        completedLetters = 0
        finished = false
        session = StrokeCore.createSession(glyphs[0], settings)
    }

    /** The active letter's own result, or null while it is unfinished. */
    public fun letterResult(): AttemptResult? = session.result()

    /**
     * Advances when a letter finishes. The word's own completion is reported as
     * [StrokeTag.GLYPH_COMPLETE] on the final letter — clients read
     * [isComplete] rather than a separate tag, so there is one source of truth
     * about whether the word is done.
     */
    private fun translate(event: StrokeEvent): StrokeEvent {
        if (event.tag != StrokeTag.GLYPH_COMPLETE) return event

        completedLetters = index + 1
        if (index + 1 >= glyphs.size) {
            finished = true
            return event
        }
        index += 1
        session = StrokeCore.createSession(glyphs[index], settings)
        // Reported as a finished letter, not a finished word: the child has more
        // to do, and a client that celebrated here would celebrate mid-word.
        return StrokeEvent(
            StrokeTag.STROKE_COMPLETE,
            event.strokeIndex,
            1.0,
            event.inkX,
            event.inkY,
            -1,
        )
    }

    private fun ignored(): StrokeEvent = StrokeEvent(StrokeTag.IGNORED, 0, 0.0, 0.0, 0.0, -1)
}
