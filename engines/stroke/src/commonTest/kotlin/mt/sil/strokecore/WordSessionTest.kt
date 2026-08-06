package mt.sil.strokecore

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Words: several glyphs in order, on one line.
 *
 * The thing worth testing is the seam — that a touch at word-space x belongs to
 * the right letter, and that finishing one letter moves to the next without
 * celebrating mid-word.
 */
class WordSessionTest {

    private val packJson = """
    {
      "packId": "w", "packSchemaVersion": 1, "packVersion": 1, "style": "print",
      "viewBox": [0, 0, 100, 100],
      "guides": { "baseline": 90 },
      "groups": [{ "id": "g", "sortOrder": 1 }],
      "glyphs": [
        { "id": "a", "char": "a", "groupId": "g", "sortOrder": 1,
          "strokes": [{ "d": "M20 50 L80 50" }] },
        { "id": "b", "char": "b", "groupId": "g", "sortOrder": 2,
          "strokes": [{ "d": "M20 20 L20 80" }] },
        { "id": "c", "char": "c", "groupId": "g", "sortOrder": 3,
          "strokes": [{ "d": "M80 20 L20 20" }] }
      ]
    }
    """.trimIndent()

    private val pack = StrokeCore.loadPack(packJson)

    private fun word(vararg ids: String) =
        StrokeCore.createWordSession(pack, ids.toList(), TraceSettings.forgiving)

    /** Traces the active letter along its own geometry, in word space. */
    private fun traceCurrentLetter(session: WordSession): StrokeTag {
        val glyph = session.glyphAt(session.currentIndex)
        val stroke = glyph.stroke(session.currentStrokeIndex)
        val originX = session.originX(session.currentIndex)
        val start = stroke.polyline.pointAt(0.0)
        session.begin(start[0] + originX, start[1])
        for (i in 1..200) {
            val p = stroke.polyline.pointAt(i / 200.0)
            val tag = session.onPoint(p[0] + originX, p[1], i * 4L).tag
            // Stop at completion: points sent after a letter finishes belong to
            // the next letter and are rightly ignored.
            if (tag == StrokeTag.STROKE_COMPLETE || tag == StrokeTag.GLYPH_COMPLETE) return tag
        }
        return StrokeTag.IGNORED
    }

    @Test
    fun lettersAreLaidOutOneAdvanceWidthApart() {
        val w = word("a", "b", "c")
        assertEquals(3, w.letterCount)
        assertEquals(100.0, w.advanceWidth)
        assertEquals(0.0, w.originX(0))
        assertEquals(100.0, w.originX(1))
        assertEquals(200.0, w.originX(2))
    }

    @Test
    fun aTouchInWordSpaceReachesTheRightLetter() {
        val w = word("a", "b", "c")
        // Letter "a" starts at local (20,50); in word space that is still (20,50).
        assertEquals(StrokeTag.STROKE_BEGIN_OK, w.begin(20.0, 50.0).tag)
        // The same local point on letter two would be (120,50) — beginning there
        // while letter one is active must not be accepted.
        val fresh = word("a", "b", "c")
        assertEquals(StrokeTag.STROKE_BEGIN_WRONG_PLACE, fresh.begin(120.0, 50.0).tag)
    }

    @Test
    fun finishingALetterAdvancesWithoutFinishingTheWord() {
        val w = word("a", "b", "c")
        val tag = traceCurrentLetter(w)
        // A finished letter mid-word is a finished STROKE, not a finished glyph:
        // a client that celebrated on GLYPH_COMPLETE would celebrate mid-word.
        assertEquals(StrokeTag.STROKE_COMPLETE, tag)
        assertEquals(1, w.currentIndex)
        assertFalse(w.isComplete)
        assertTrue(w.isLetterComplete(0))
        assertFalse(w.isLetterComplete(1))
    }

    @Test
    fun tracingEveryLetterCompletesTheWord() {
        val w = word("a", "b", "c")
        traceCurrentLetter(w)
        traceCurrentLetter(w)
        val last = traceCurrentLetter(w)
        assertEquals(StrokeTag.GLYPH_COMPLETE, last)
        assertTrue(w.isComplete)
        assertEquals(3, w.letterCount)
        assertTrue(w.isLetterComplete(2))
    }

    @Test
    fun aSingleLetterWordCompletesImmediately() {
        val w = word("a")
        assertEquals(StrokeTag.GLYPH_COMPLETE, traceCurrentLetter(w))
        assertTrue(w.isComplete)
    }

    @Test
    fun aRepeatedLetterIsTracedTwice() {
        // "aa" — the same glyph in two places, which must be two separate traces
        // rather than one that satisfies both.
        val w = word("a", "a")
        assertEquals(StrokeTag.STROKE_COMPLETE, traceCurrentLetter(w))
        assertFalse(w.isComplete)
        assertEquals(StrokeTag.GLYPH_COMPLETE, traceCurrentLetter(w))
        assertTrue(w.isComplete)
    }

    @Test
    fun aChildCanGoBackToAnEarlierLetter() {
        val w = word("a", "b", "c")
        traceCurrentLetter(w)
        assertEquals(1, w.currentIndex)
        assertTrue(w.selectLetter(0))
        assertEquals(0, w.currentIndex)
        // And that letter is traceable again from its own start.
        assertEquals(StrokeTag.STROKE_BEGIN_OK, w.begin(20.0, 50.0).tag)
    }

    @Test
    fun selectingALetterOutsideTheWordIsRefused() {
        val w = word("a", "b")
        assertFalse(w.selectLetter(5))
        assertFalse(w.selectLetter(-1))
        assertEquals(0, w.currentIndex)
    }

    @Test
    fun restartClearsTheWholeWord() {
        val w = word("a", "b")
        traceCurrentLetter(w)
        traceCurrentLetter(w)
        assertTrue(w.isComplete)
        w.restart()
        assertFalse(w.isComplete)
        assertEquals(0, w.currentIndex)
        assertFalse(w.isLetterComplete(0))
    }

    @Test
    fun aWordAskingForAMissingLetterIsRefusedRatherThanShortened() {
        // A child asked to write their name should never be handed a name with a
        // letter quietly missing.
        val error = assertFailsWith<PackDecodeError> {
            StrokeCore.createWordSession(pack, listOf("a", "zzz"), TraceSettings.forgiving)
        }
        assertTrue(error.message!!.contains("zzz"), error.message!!)
    }

    @Test
    fun anEmptyWordIsRefused() {
        assertFailsWith<PackDecodeError> {
            StrokeCore.createWordSession(pack, emptyList(), TraceSettings.forgiving)
        }
    }

    @Test
    fun theWordReportsAccuracyForTheLetterInHand() {
        val w = word("a", "b")
        assertNotNull(w.glyphAt(0))
        traceCurrentLetter(w)
        // Having advanced, the previous letter's result is gone and the new
        // letter has not finished — Parent Mode reads per-letter, not per-word.
        assertEquals(null, w.letterResult())
    }
}
