import Foundation

/// Conservative matcher: answers only whether Apple heard one of the card's
/// listen-for targets or an approved equivalent. Never a pronunciation score.
struct WordMatcherConfig: Equatable {
    /// Words shorter than this never fuzzy-match.
    var fuzzyMinLength = 4
    /// 4–5 character words allow at most this many edits.
    var shortWordMaxEdits = 1
    /// Words of 6+ characters need at least this normalized similarity.
    var longWordSimilarityThreshold = 0.8

    static let standard = WordMatcherConfig()
    /// Attempt-4 "relaxed" matcher: still conservative, slightly wider net for
    /// long words only. Short-word rules never relax.
    static let relaxed = WordMatcherConfig(longWordSimilarityThreshold: 0.72)

    init(fuzzyMinLength: Int = 4, shortWordMaxEdits: Int = 1, longWordSimilarityThreshold: Double = 0.8) {
        self.fuzzyMinLength = fuzzyMinLength
        self.shortWordMaxEdits = shortWordMaxEdits
        self.longWordSimilarityThreshold = longWordSimilarityThreshold
    }
}

/// Per-language approved leading phrases: `a dog`, `de hond`, `un perro`…
/// Data, not code branches, so new languages only add entries here.
enum SayLanguageRules {
    static func approvedPrefixes(for languageCode: String) -> [String] {
        switch SayCatalog.normalizedLanguage(languageCode) {
        case "en":
            return ["a", "an", "the", "it s a", "it s an", "it is a", "it is an", "that s a", "that s an"]
        case "nl":
            return ["de", "het", "een", "dat is een", "dit is een"]
        case "fr":
            return ["un", "une", "le", "la", "les", "l", "c est un", "c est une"]
        case "es":
            return ["un", "una", "el", "la", "los", "las", "es un", "es una"]
        case "de":
            return ["der", "die", "das", "ein", "eine", "das ist ein", "das ist eine"]
        case "mt":
            return ["il", "l", "it", "id", "ir", "is", "ix", "iz", "in"]
        default:
            return []
        }
    }
}

struct WordMatcher {
    let languageCode: String
    var config: WordMatcherConfig = .standard

    private var locale: Locale { Locale(identifier: languageCode) }

    /// Matching order per the plan: exact primary target → other listen-for
    /// alternatives → approved per-language phrase wrapper → conservative fuzzy.
    func match(transcript: String, listenFor: [String]) -> MatchType? {
        let normalizedTranscript = normalize(transcript)
        guard !normalizedTranscript.isEmpty else { return nil }
        let targets = listenFor.map(normalize).filter { !$0.isEmpty }
        guard !targets.isEmpty else { return nil }

        for (index, target) in targets.enumerated() where normalizedTranscript == target {
            return index == 0 ? .exact : .alternative
        }

        for prefix in SayLanguageRules.approvedPrefixes(for: languageCode) {
            let normalizedPrefix = normalize(prefix)
            guard !normalizedPrefix.isEmpty,
                  normalizedTranscript.hasPrefix(normalizedPrefix + " ") else { continue }
            let stripped = String(normalizedTranscript.dropFirst(normalizedPrefix.count + 1))
            if targets.contains(stripped) {
                return .approvedPhrase
            }
        }

        for target in targets where fuzzyMatches(normalizedTranscript, target: target) {
            return .fuzzy
        }

        return nil
    }

    /// Locale-aware lowercase, punctuation removal (apostrophes and hyphens
    /// become spaces so elisions like "l'éléphant" and "il-kelb" split
    /// cleanly), whitespace trimmed and collapsed.
    func normalize(_ text: String) -> String {
        let separatorSet = CharacterSet(charactersIn: "'\u{2019}\u{02BC}-\u{2010}\u{2011}")
        var scalars = String.UnicodeScalarView()
        for scalar in text.unicodeScalars {
            if separatorSet.contains(scalar) {
                scalars.append(" ")
            } else if CharacterSet.punctuationCharacters.contains(scalar) || CharacterSet.symbols.contains(scalar) {
                continue
            } else {
                scalars.append(scalar)
            }
        }
        return String(scalars)
            .lowercased(with: locale)
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    private func fuzzyMatches(_ transcript: String, target: String) -> Bool {
        let length = target.count
        guard length >= config.fuzzyMinLength else { return false }
        let distance = Self.levenshtein(transcript, target)
        if length <= 5 {
            return distance <= config.shortWordMaxEdits
        }
        let maxLength = max(transcript.count, length)
        guard maxLength > 0 else { return false }
        let similarity = 1.0 - Double(distance) / Double(maxLength)
        return similarity >= config.longWordSimilarityThreshold
    }

    static func levenshtein(_ a: String, _ b: String) -> Int {
        let aChars = Array(a), bChars = Array(b)
        if aChars.isEmpty { return bChars.count }
        if bChars.isEmpty { return aChars.count }
        var previous = Array(0...bChars.count)
        var current = [Int](repeating: 0, count: bChars.count + 1)
        for i in 1...aChars.count {
            current[0] = i
            for j in 1...bChars.count {
                let cost = aChars[i - 1] == bChars[j - 1] ? 0 : 1
                current[j] = Swift.min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + cost
                )
            }
            swap(&previous, &current)
        }
        return previous[bChars.count]
    }
}
