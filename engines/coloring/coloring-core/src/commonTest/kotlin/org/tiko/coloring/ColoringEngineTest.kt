package org.tiko.coloring

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ColoringEngineTest {
    private val sampleSvg = """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
          <path id="background" data-z-index="0" d="M 5 5 H 195 V 115 H 5 Z"/>
          <path id="house" data-parent-region="background" data-z-index="1" d="M 35 55 L 100 15 L 165 55 V 108 H 35 Z"/>
          <path id="door" data-parent-region="house" data-z-index="2" d="M 82 65 H 118 V 108 H 82 Z"/>
        </svg>
    """.trimIndent()

    @Test
    fun importsClosedRegionsWithStableIDs() {
        val snapshot = ColoringEngine.fromSvg("sample-house", sampleSvg, "House").snapshot()

        assertEquals(200.0, snapshot.document.canvas.width)
        assertEquals(120.0, snapshot.document.canvas.height)
        assertEquals(listOf("background", "house", "door"), snapshot.document.regions.map { it.id })
        assertEquals("House", snapshot.document.metadata.title)
    }

    @Test
    fun selectsTheSmallestNestedRegion() {
        val engine = ColoringEngine.fromSvg("sample-house", sampleSvg)

        assertEquals("background", engine.regionAt(10.0, 10.0))
        assertEquals("house", engine.regionAt(60.0, 75.0))
        assertEquals("door", engine.regionAt(100.0, 80.0))
        assertNull(engine.regionAt(250.0, 80.0))
    }

    @Test
    fun fillsUndoAndRedo() {
        val engine = ColoringEngine.fromSvg("sample-house", sampleSvg)

        val fill = engine.fill(100.0, 80.0, "#ff3366")
        assertTrue(fill.changed)
        assertEquals(ColoringResultCode.FILLED, fill.code)
        assertEquals("#FF3366", engine.snapshot().document.regions.single { it.id == "door" }.fill?.hex)
        assertTrue(engine.snapshot().canUndo)
        assertFalse(engine.snapshot().canRedo)

        assertEquals(ColoringResultCode.UNDONE, engine.undo().code)
        assertNull(engine.snapshot().document.regions.single { it.id == "door" }.fill)
        assertTrue(engine.snapshot().canRedo)

        assertEquals(ColoringResultCode.REDONE, engine.redo().code)
        assertEquals("#FF3366", engine.snapshot().document.regions.single { it.id == "door" }.fill?.hex)
    }

    @Test
    fun serializationRoundTripsTheEditableDocument() {
        val original = ColoringEngine.fromSvg("sample-house", sampleSvg)
        original.fill(60.0, 75.0, "#12345678")

        val restored = ColoringEngine.open(original.serialize())

        assertEquals(original.snapshot().document, restored.snapshot().document)
        assertFalse(restored.snapshot().canUndo)
        assertFalse(restored.snapshot().canRedo)
    }

    @Test
    fun ignoresTapsOutsideThePage() {
        val engine = ColoringEngine.fromSvg("sample-house", sampleSvg)

        val result = engine.fill(300.0, 300.0, "#000000")

        assertFalse(result.changed)
        assertEquals(ColoringResultCode.NO_REGION, result.code)
    }

    @Test
    fun rejectsUnsafeOrUnsupportedSvg() {
        assertFailsWith<IllegalArgumentException> {
            ColoringEngine.fromSvg("unsafe", "<svg viewBox='0 0 10 10'><script>alert(1)</script><path id='a' d='M0 0 H10 V10 H0 Z'/></svg>")
        }
        assertFailsWith<IllegalArgumentException> {
            ColoringEngine.fromSvg("curve", "<svg viewBox='0 0 10 10'><path id='a' d='M0 0 C 2 2 8 2 10 10 Z'/></svg>")
        }
    }
}
