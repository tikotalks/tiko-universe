package mt.tiko.kotlinkit

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Parity tests for [TikoVersion] against `TikoVersion` in `TikoUpdateCheck.swift`.
 *
 * These assert what the **Swift original does**, not what the function arguably
 * ought to do. Where the two languages' defaults differ, the expected value here
 * is Swift's — that is the whole point of the exercise.
 */
class TikoVersionTest {

    @Test
    fun comparesNumerically_notLexically() {
        // The comment in the Swift original calls this out specifically: a plain
        // string comparison gets 1.10 vs 1.9 backwards.
        assertTrue(TikoVersion.isNewer("1.10", than = "1.9"))
        assertFalse(TikoVersion.isNewer("1.9", than = "1.10"))
    }

    @Test
    fun equalVersionsAreNotNewer() {
        assertFalse(TikoVersion.isNewer("1.0", than = "1.0"))
        assertFalse(TikoVersion.isNewer("2.3.4", than = "2.3.4"))
    }

    @Test
    fun missingComponentsCountAsZero() {
        assertTrue(TikoVersion.isNewer("1.0.1", than = "1.0"))
        assertFalse(TikoVersion.isNewer("1.0", than = "1.0.0"))
        assertTrue(TikoVersion.isNewer("2", than = "1.9.9"))
        assertFalse(TikoVersion.isNewer("1.9.9", than = "2"))
    }

    @Test
    fun nonNumericPrefixesAreStripped() {
        // Swift filters each component to its numeric characters, so a "v"
        // prefix is tolerated and "v1.2" equals "1.2".
        assertFalse(TikoVersion.isNewer("v1.2", than = "1.2"))
        assertTrue(TikoVersion.isNewer("v1.3", than = "1.2"))
    }

    @Test
    fun emptyComponentsAreDropped_matchingSwiftSplit() {
        // Swift's `split(separator:)` drops empty subsequences, so "1..2" has
        // TWO components, [1, 2] — not three with a zero in the middle. A naive
        // Kotlin `split(".")` would produce [1, 0, 2] and this would fail.
        assertTrue(TikoVersion.isNewer("1..2", than = "1.0.2"))
        assertFalse(TikoVersion.isNewer("1.0.2", than = "1..2"))
    }

    @Test
    fun nonDecimalNumericCharactersDefeatParsing_matchingSwiftIsNumber() {
        // Swift's `Character.isNumber` keeps Nl/No characters such as "½", so
        // "1½" survives the filter, fails `Int(_:)`, and becomes 0. Kotlin's
        // `isDigit()` would have dropped the "½" and yielded 1 instead.
        assertFalse(TikoVersion.isNewer("1½.0", than = "1.0"))
        assertTrue(TikoVersion.isNewer("1.0", than = "1½.0"))
    }

    @Test
    fun emptyStringsAreTreatedAsZero() {
        assertFalse(TikoVersion.isNewer("", than = ""))
        assertTrue(TikoVersion.isNewer("0.0.1", than = ""))
        assertFalse(TikoVersion.isNewer("", than = "0.0.1"))
    }
}
