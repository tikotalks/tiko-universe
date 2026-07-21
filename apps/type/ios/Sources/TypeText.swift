import Foundation

/// Pure, side-effect-free text rules for Tiko Type.
///
/// The keyboard flow in `TypeView` accumulates letters into an in-progress word
/// (`currentWord`) and commits completed words onto a `words` chip list. The
/// decisions worth testing — how a completed word becomes a chip, what string is
/// spoken, and how a legacy stored sentence is split back into chips — are
/// isolated here so they can be unit-tested without driving SwiftUI state. See
/// `REQUIREMENTS.md` for the requirement each function maps to.
enum TypeText {

    /// The string spoken by the speak button: every committed word followed by
    /// the in-progress word (when non-empty), separated by single spaces.
    /// Returns "" when there is nothing to say.
    static func speechString(words: [String], currentWord: String) -> String {
        (words + (currentWord.isEmpty ? [] : [currentWord])).joined(separator: " ")
    }

    /// Committing the in-progress word (the space key) appends it as a new chip.
    /// An empty in-progress word commits nothing (a leading/undefined space does
    /// not create an empty chip).
    static func committing(words: [String], currentWord: String) -> [String] {
        guard !currentWord.isEmpty else { return words }
        return words + [currentWord]
    }

    /// Split a legacy single-string sentence (migrated from the old `type.text`
    /// store) back into committed word chips plus a trailing in-progress word.
    /// A trailing space means the last word was already committed, so there is
    /// no in-progress word.
    static func split(sentence: String) -> (words: [String], current: String) {
        let parts = sentence.split(separator: " ").map(String.init)
        if let last = parts.last, !sentence.hasSuffix(" ") {
            return (Array(parts.dropLast()), last)
        }
        return (parts, "")
    }
}
