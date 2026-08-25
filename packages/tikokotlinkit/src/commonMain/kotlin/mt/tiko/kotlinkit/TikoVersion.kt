package mt.tiko.kotlinkit

/**
 * Dotted version comparison.
 *
 * Port of the `TikoVersion` enum in `TikoUpdateCheck.swift`. Only that type is
 * ported: the rest of that file is `URLSession`, `UserDefaults`, `Bundle.main`
 * and an `@MainActor ObservableObject`, none of which belong here.
 *
 * Two Swift behaviours are reproduced deliberately rather than tidied, because
 * parity with the shipped Swift is the contract:
 *
 *  - `split(separator:)` **drops empty subsequences**, so `"1..2"` is two
 *    components in Swift and would be three with a naive Kotlin `split`.
 *  - `Character.isNumber` is true for the Unicode *numeric* categories `Nd`,
 *    `Nl` and `No` — broader than Kotlin's `isDigit()`, which is `Nd` only. A
 *    component such as `"1½"` therefore keeps its `½` in Swift, fails to parse,
 *    and becomes `0`; dropping the `½` first would yield `1` instead.
 */
public object TikoVersion {

    /** True when [candidate] is a strictly newer dotted version than [current]. */
    public fun isNewer(candidate: String, than: String): Boolean {
        val left = components(candidate)
        val right = components(than)

        for (index in 0 until maxOf(left.size, right.size)) {
            val lhs = left.getOrElse(index) { 0 }
            val rhs = right.getOrElse(index) { 0 }
            if (lhs != rhs) return lhs > rhs
        }
        return false
    }

    private fun components(version: String): List<Int> =
        version.split('.')
            .filter { it.isNotEmpty() } // Swift's split drops empty subsequences
            .map { part -> part.filter { it.isNumeric() }.toIntOrNull() ?: 0 }

    /** Matches Swift's `Character.isNumber` rather than Kotlin's `isDigit()`. */
    private fun Char.isNumeric(): Boolean = when (category) {
        CharCategory.DECIMAL_DIGIT_NUMBER,
        CharCategory.LETTER_NUMBER,
        CharCategory.OTHER_NUMBER,
        -> true
        else -> false
    }
}
