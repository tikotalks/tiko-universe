package mt.sil.strokecore

import java.io.File
import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Every authored glyph, replayed against the engine.
 *
 * This is the criterion that matters for the content: a glyph nobody can trace
 * is a glyph a child will fail at forever, and no amount of looking at a contact
 * sheet reveals it. It runs on the JVM rather than in commonTest only because it
 * reads the packs off disk.
 */
class RealPackReplayTest {

    private val sourceDir = File("../../packages/write-glyphs/source")

    private fun packs(): List<Pair<String, GlyphPack>> {
        assertTrue(sourceDir.isDirectory, "cannot find ${sourceDir.absolutePath}")
        val files = sourceDir.listFiles { f: File -> f.extension == "json" }?.sortedBy { it.name }
            ?: emptyList()
        assertTrue(files.isNotEmpty(), "no packs found")
        return files.map { it.name to StrokeCore.loadPack(it.readText()) }
    }

    /** Traces a glyph exactly along its own geometry. */
    private fun traceIdeally(glyph: Glyph, settings: TraceSettings): AttemptResult? {
        val session = StrokeCore.createSession(glyph, settings)
        for (i in 0 until glyph.strokeCount) {
            val stroke = glyph.stroke(i)
            val start = stroke.polyline.pointAt(0.0)
            session.begin(start[0], start[1])
            // Dense sampling, as a real pointer produces.
            val steps = 240
            for (step in 1..steps) {
                val p = stroke.polyline.pointAt(step.toDouble() / steps)
                session.onPoint(p[0], p[1], (step * 4).toLong())
            }
        }
        return session.result()
    }

    @Test
    fun everyAuthoredGlyphCanBeTraced() {
        val failures = mutableListOf<String>()
        var count = 0

        for ((name, pack) in packs()) {
            for (i in 0 until pack.glyphCount) {
                val glyph = pack.glyphAt(i)
                count += 1
                val result = traceIdeally(glyph, TraceSettings.forgiving)
                if (result == null || !result.completed) {
                    failures += "$name/${glyph.id} (${glyph.strokeCount} strokes)"
                }
            }
        }

        assertTrue(count >= 75, "expected the full authored set, saw $count")
        if (failures.isNotEmpty()) {
            fail("${failures.size} of $count glyphs could not be traced:\n  " + failures.joinToString("\n  "))
        }
        println("traced $count glyphs")
    }

    @Test
    fun everyGlyphIsTraceableAtTheHardestRungOfTheLadder() {
        // The ladder tightens the corridor to 60%. A glyph that only passes on
        // attempt 1 is a glyph the app will make unwinnable later.
        val settings = TraceSettings.forgiving.copy(attemptCount = 5)
        val failures = mutableListOf<String>()

        for ((name, pack) in packs()) {
            for (i in 0 until pack.glyphCount) {
                val glyph = pack.glyphAt(i)
                val session = StrokeCore.createSession(glyph, settings, attempt = 5)
                for (s in 0 until glyph.strokeCount) {
                    val stroke = glyph.stroke(s)
                    val start = stroke.polyline.pointAt(0.0)
                    session.begin(start[0], start[1])
                    for (step in 1..240) {
                        val p = stroke.polyline.pointAt(step / 240.0)
                        session.onPoint(p[0], p[1], (step * 4).toLong())
                    }
                }
                val r = session.result()
                if (r == null || !r.completed) failures += "$name/${glyph.id}"
            }
        }
        if (failures.isNotEmpty()) {
            fail("${failures.size} glyphs fail at attempt 5:\n  " + failures.joinToString("\n  "))
        }
    }

    @Test
    fun everyStrokeHasSomethingToAimThrough() {
        // A stroke with no key points is satisfiable by hugging the corridor,
        // which is the failure mode this engine exists to prevent.
        val bare = mutableListOf<String>()
        for ((name, pack) in packs()) {
            for (i in 0 until pack.glyphCount) {
                val glyph = pack.glyphAt(i)
                for (s in 0 until glyph.strokeCount) {
                    if (glyph.stroke(s).keyPointCount == 0) bare += "$name/${glyph.id}#$s"
                }
            }
        }
        if (bare.isNotEmpty()) {
            fail("${bare.size} strokes have no key points:\n  " + bare.joinToString("\n  "))
        }
    }

    @Test
    fun aWobblyTraceStillSucceedsBecauseChildrenWobble() {
        // ±2 viewBox units of jitter, which is a lot at this scale, on every
        // glyph. If this fails the app is too strict to be kind.
        val failures = mutableListOf<String>()
        for ((name, pack) in packs()) {
            for (i in 0 until pack.glyphCount) {
                val glyph = pack.glyphAt(i)
                val session = StrokeCore.createSession(glyph, TraceSettings.forgiving)
                for (s in 0 until glyph.strokeCount) {
                    val stroke = glyph.stroke(s)
                    val start = stroke.polyline.pointAt(0.0)
                    session.begin(start[0], start[1])
                    for (step in 1..240) {
                        val p = stroke.polyline.pointAt(step / 240.0)
                        val jitter = if (step % 2 == 0) 2.0 else -2.0
                        session.onPoint(p[0] + jitter, p[1] - jitter, (step * 4).toLong())
                    }
                }
                val r = session.result()
                if (r == null || !r.completed) failures += "$name/${glyph.id}"
            }
        }
        if (failures.isNotEmpty()) {
            fail("${failures.size} glyphs reject a wobbly trace:\n  " + failures.joinToString("\n  "))
        }
    }
}
