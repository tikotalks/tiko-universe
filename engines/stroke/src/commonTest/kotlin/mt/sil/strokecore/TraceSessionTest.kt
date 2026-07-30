package mt.sil.strokecore

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The tracing rules, against an inline pack.
 *
 * These live in commonTest rather than jvmTest so the same assertions run on
 * every target the engine ships to. What they check is behaviour a proximity
 * hit-test would get wrong: direction, ordering, and the difference between a
 * wobble and a reversal.
 */
class TraceSessionTest {

    private val packJson = """
    {
      "packId": "test",
      "packSchemaVersion": 1,
      "packVersion": 1,
      "style": "shape",
      "viewBox": [0, 0, 100, 100],
      "groups": [{ "id": "g", "sortOrder": 1 }],
      "glyphs": [
        { "id": "line", "char": "l", "groupId": "g", "sortOrder": 1,
          "strokes": [{ "d": "M10 50 L90 50" }] },
        { "id": "vee", "char": "v", "groupId": "g", "sortOrder": 2,
          "strokes": [{ "d": "M20 10 L50 90 L80 10" }] },
        { "id": "cross", "char": "x", "groupId": "g", "sortOrder": 3,
          "strokes": [{ "d": "M50 10 L50 90" }, { "d": "M10 50 L90 50" }] }
      ]
    }
    """.trimIndent()

    private val pack = StrokeCore.loadPack(packJson)
    private fun glyph(id: String) = assertNotNull(pack.glyph(id), "missing $id")

    /**
     * Drags along the horizontal test line from x=10 to [toX] in small steps.
     * Real input arrives as a dense stream, and the engine rejects jumps, so a
     * test that teleports is testing something a pointer cannot do.
     */
    private fun drag(session: TraceSession, toX: Double, dy: Double = 0.0, step: Double = 4.0): StrokeTag {
        var x = 10.0
        var t = 0L
        var last = StrokeTag.IGNORED
        while (x < toX) {
            x = minOf(toX, x + step)
            t += 8
            last = session.onPoint(x, 50.0 + dy, t).tag
        }
        return last
    }

    /** Replays a stroke's own geometry — the ideal trace. */
    private fun replay(session: TraceSession, stroke: Stroke, samples: Int = 60): List<StrokeTag> {
        val tags = ArrayList<StrokeTag>()
        val p0 = stroke.polylinePoints()
        tags.add(session.begin(p0.x(0), p0.y(0)).tag)
        for (i in 1..samples) {
            val s = i.toDouble() / samples
            val pt = stroke.polyline.pointAt(s)
            tags.add(session.onPoint(pt[0], pt[1], i * 8L).tag)
        }
        return tags
    }

    @Test
    fun aPerfectReplayCompletesTheGlyph() {
        val g = glyph("line")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        val tags = replay(session, g.stroke(0))

        assertEquals(StrokeTag.STROKE_BEGIN_OK, tags.first())
        assertTrue(tags.contains(StrokeTag.GLYPH_COMPLETE), "expected completion, got $tags")
        val result = assertNotNull(session.result())
        assertTrue(result.completed)
        assertEquals(1, result.completedStrokes)
        assertTrue(result.meanDeviation < 0.01, "a perfect replay should not deviate")
    }

    @Test
    fun startingInTheWrongPlaceIsRefused() {
        val g = glyph("line")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        // The far end of the stroke: on the path, but not where it begins.
        val event = session.begin(90.0, 50.0)
        assertEquals(StrokeTag.STROKE_BEGIN_WRONG_PLACE, event.tag)
        // And no input is accepted until a valid begin.
        assertEquals(StrokeTag.IGNORED, session.onPoint(50.0, 50.0, 10L).tag)
    }

    @Test
    fun tracingBackwardsDoesNotAdvance() {
        val g = glyph("line")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        session.begin(10.0, 50.0)
        drag(session, 50.0)
        val advanced = session.currentProgress
        assertTrue(advanced > 0.4, "should have advanced, got $advanced")

        // Back towards the start, still perfectly on the line.
        val event = session.onPoint(20.0, 50.0, 200L)
        assertEquals(StrokeTag.STROKE_WRONG_DIRECTION, event.tag)
        assertEquals(advanced, session.currentProgress, "frontier must not move backwards")
    }

    @Test
    fun leavingTheCorridorStopsTheInkWithoutTakingItAway() {
        val g = glyph("line")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        session.begin(10.0, 50.0)
        drag(session, 40.0)
        val before = session.currentProgress

        val event = session.onPoint(42.0, 95.0, 200L) // far off the line
        assertEquals(StrokeTag.STROKE_OFF_PATH, event.tag)
        assertEquals(before, session.currentProgress, "STAY_IN_PLACE must not rewind")
        assertEquals(0, session.result()?.resetCount ?: 0)
    }

    @Test
    fun backToStartRewindsAndCountsTheReset() {
        val g = glyph("line")
        val session = StrokeCore.newSession(
            g, TraceSettings.forgiving.copy(offPathPolicy = OffPathPolicy.BACK_TO_START)
        )
        session.begin(10.0, 50.0)
        drag(session, 60.0)
        assertTrue(session.currentProgress > 0.4)

        val event = session.onPoint(62.0, 95.0, 200L)
        assertEquals(StrokeTag.STROKE_RESET, event.tag)
        assertEquals(0.0, session.currentProgress)
    }

    @Test
    fun skippingTheCornerOfAVeeDoesNotComplete() {
        // Straight from the top-left to the top-right, staying wide of the point.
        // A generous corridor would accept this; a key point will not, and that
        // is the whole difference between tracing and scribbling.
        val g = glyph("vee")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        val stroke = g.stroke(0)
        assertTrue(stroke.keyPointCount > 0, "the vee's corner should be a key point")

        session.begin(20.0, 10.0)
        for (i in 1..200) {
            val t = i / 200.0
            session.onPoint(20.0 + 60.0 * t, 10.0, i * 8L)
        }
        assertNull(session.result(), "a trace that missed the corner must not finish")
    }

    @Test
    fun theVeeCompletesWhenTheCornerIsVisited() {
        val g = glyph("vee")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        val tags = replay(session, g.stroke(0), samples = 120)
        assertTrue(tags.contains(StrokeTag.STROKE_KEYPOINT), "the corner should register")
        assertTrue(tags.contains(StrokeTag.GLYPH_COMPLETE))
    }

    @Test
    fun strokesRunInOrderAndTheGlyphCompletesOnTheLast() {
        val g = glyph("cross")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)

        val first = replay(session, g.stroke(0))
        assertTrue(first.contains(StrokeTag.STROKE_COMPLETE), "first stroke should complete, got $first")
        assertTrue(!first.contains(StrokeTag.GLYPH_COMPLETE), "glyph is not done after one of two strokes")
        assertEquals(1, session.currentStrokeIndex)

        val second = replay(session, g.stroke(1))
        assertTrue(second.contains(StrokeTag.GLYPH_COMPLETE))
        val result = assertNotNull(session.result())
        assertEquals(2, result.completedStrokes)
    }

    @Test
    fun theWrongStrokeIsRefusedWhenOrderIsEnforced() {
        val g = glyph("cross")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        val event = session.selectStroke(1)
        assertEquals(StrokeTag.GLYPH_STROKE_OUT_OF_ORDER, event.tag)
        assertEquals(0, session.currentStrokeIndex, "the expected stroke must not change")
    }

    @Test
    fun theLadderTightensTheCorridorAndFadesTheModel() {
        val settings = TraceSettings.forgiving.copy(attemptCount = 5)
        assertEquals(ModelVisibility.FULL, settings.modelVisibilityFor(1))
        assertEquals(ModelVisibility.NONE, settings.modelVisibilityFor(5))

        // A wobble accepted on attempt 1 is refused on attempt 5.
        val g = glyph("line")
        val offset = 8.0 // extent 80: attempt 1 allows 10.4, attempt 5 allows 6.24
        val early = StrokeCore.newSession(g, settings, attempt = 1)
        early.begin(10.0, 50.0)
        val earlyTag = drag(early, 40.0, offset)
        assertTrue(
            earlyTag == StrokeTag.STROKE_PROGRESS || earlyTag == StrokeTag.STROKE_KEYPOINT,
            "attempt 1 should accept a ${offset}u wobble, got $earlyTag",
        )

        val late = StrokeCore.newSession(g, settings, attempt = 5)
        late.begin(10.0, 50.0)
        assertEquals(StrokeTag.STROKE_OFF_PATH, drag(late, 40.0, offset))
    }

    @Test
    fun deviationIsMeasuredEvenWhenTheTraceSucceeds() {
        // Ink snapping means a wobbly child still sees a clean letter; the engine
        // still has to know how wobbly it was, because Parent Mode shows that.
        val g = glyph("line")
        val session = StrokeCore.newSession(g, TraceSettings.forgiving)
        session.begin(10.0, 50.0)
        for (i in 1..60) {
            val t = i / 60.0
            val wobble = if (i % 2 == 0) 2.0 else -2.0
            session.onPoint(10.0 + 80.0 * t, 50.0 + wobble, i * 8L)
        }
        session.lift()
        val result = assertNotNull(session.result())
        assertTrue(result.completed)
        assertTrue(result.meanDeviation > 1.0, "the wobble should be recorded, got ${result.meanDeviation}")
    }

    @Test
    fun authoredKeyPointsWinOverDerivedOnes() {
        val json = """
        {"packId":"kp","packSchemaVersion":1,"packVersion":1,"style":"shape",
         "viewBox":[0,0,100,100],"groups":[{"id":"g","sortOrder":1}],
         "glyphs":[{"id":"a","char":"a","groupId":"g","sortOrder":1,
           "strokes":[{"d":"M10 50 L90 50","keyPoints":[0.5]}]}]}
        """.trimIndent()
        val g = assertNotNull(StrokeCore.loadPack(json).glyph("a"))
        assertEquals(1, g.stroke(0).keyPointCount)
    }

    @Test
    fun anUnknownSchemaVersionIsRefused() {
        val json = packJson.replace("\"packSchemaVersion\": 1", "\"packSchemaVersion\": 2")
        val error = assertFailsWith<PackDecodeError> { StrokeCore.loadPack(json) }
        assertTrue(error.message!!.contains("schema version 2"), error.message!!)
    }

    @Test
    fun malformedPathDataFailsAtLoadNotAtTraceTime() {
        val json = packJson.replace("M10 50 L90 50", "M10 50 L")
        assertFailsWith<PackDecodeError> { StrokeCore.loadPack(json) }
    }
}
