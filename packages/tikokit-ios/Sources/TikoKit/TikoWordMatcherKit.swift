import Foundation

// MARK: - Language code helper

public enum TikoLanguageCode {
    /// "nl-BE" → "nl"
    public static func normalized(_ code: String) -> String {
        code.replacingOccurrences(of: "_", with: "-")
            .split(separator: "-").first.map { String($0).lowercased() } ?? "en"
    }
}

// MARK: - Match result

public enum TikoMatchType: Equatable, Sendable {
    case exact
    case alternative
    case approvedPhrase
    case fuzzy
}

// MARK: - Config

/// Conservative matcher configuration: answers only whether the transcript
/// contains a configured target or an approved equivalent — never a score.
public struct TikoWordMatcherConfig: Equatable, Sendable {
    /// Words shorter than this never fuzzy-match (unless `allowShortWordFuzzy`).
    public var fuzzyMinLength: Int
    /// 4–5 character words allow at most this many edits.
    public var shortWordMaxEdits: Int
    /// Words of 6+ characters need at least this normalized similarity.
    public var longWordSimilarityThreshold: Double
    /// When true, fuzzy matching is also attempted against each individual word
    /// (or word-span) of a multi-word transcript, not just the whole string —
    /// so a mispronounced word buried in filler still counts.
    public var perWordFuzzy: Bool
    /// When true, targets as short as 3 characters may fuzzy-match within
    /// `shortWordMaxEdits`. Off by default so early attempts still nudge a child
    /// toward the correct sound of short words ("dog", "cat") before the net
    /// widens.
    public var allowShortWordFuzzy: Bool

    public static let standard = TikoWordMatcherConfig()
    /// "Relaxed" matcher for a late attempt: still conservative, slightly wider
    /// net for long words only. Short-word rules never relax here.
    public static let relaxed = TikoWordMatcherConfig(longWordSimilarityThreshold: 0.72)
    /// The most forgiving tier, used only after several attempts when a child is
    /// clearly struggling. Scans individual words, widens long-word similarity,
    /// and lets short words match within a single edit — so a near-miss with the
    /// intended word is celebrated rather than trapping the child in retries.
    public static let forgiving = TikoWordMatcherConfig(
        longWordSimilarityThreshold: 0.66,
        perWordFuzzy: true,
        allowShortWordFuzzy: true
    )

    public init(
        fuzzyMinLength: Int = 4,
        shortWordMaxEdits: Int = 1,
        longWordSimilarityThreshold: Double = 0.8,
        perWordFuzzy: Bool = false,
        allowShortWordFuzzy: Bool = false
    ) {
        self.fuzzyMinLength = fuzzyMinLength
        self.shortWordMaxEdits = shortWordMaxEdits
        self.longWordSimilarityThreshold = longWordSimilarityThreshold
        self.perWordFuzzy = perWordFuzzy
        self.allowShortWordFuzzy = allowShortWordFuzzy
    }
}

// MARK: - Per-language approved phrases

/// Per-language approved leading phrases: `a dog`, `de hond`, `un perro`…
/// Data, not code branches, so new languages only add entries here.
public enum TikoLanguageRules {
    public static func approvedPrefixes(for languageCode: String) -> [String] {
        switch TikoLanguageCode.normalized(languageCode) {
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

// MARK: - Matcher

public struct TikoWordMatcher {
    public let languageCode: String
    public var config: TikoWordMatcherConfig

    public init(languageCode: String, config: TikoWordMatcherConfig = .standard) {
        self.languageCode = languageCode
        self.config = config
    }

    private var locale: Locale { Locale(identifier: languageCode) }

    /// Matching order: exact whole-transcript target → other listen-for
    /// alternatives → approved per-language phrase wrapper → the target word(s)
    /// appearing intact inside a longer transcript → conservative fuzzy.
    public func match(transcript: String, listenFor: [String]) -> TikoMatchType? {
        let normalizedTranscript = normalize(transcript)
        guard !normalizedTranscript.isEmpty else { return nil }
        let targets = listenFor.map(normalize).filter { !$0.isEmpty }
        guard !targets.isEmpty else { return nil }

        let transcriptWords = normalizedTranscript.split(separator: " ").map(String.init)

        for (index, target) in targets.enumerated() where normalizedTranscript == target {
            return index == 0 ? .exact : .alternative
        }

        for prefix in TikoLanguageRules.approvedPrefixes(for: languageCode) {
            let normalizedPrefix = normalize(prefix)
            guard !normalizedPrefix.isEmpty,
                  normalizedTranscript.hasPrefix(normalizedPrefix + " ") else { continue }
            let stripped = String(normalizedTranscript.dropFirst(normalizedPrefix.count + 1))
            if targets.contains(stripped) {
                return .approvedPhrase
            }
        }

        // The exact target word(s) appear somewhere in a longer transcript.
        // Children — and the recognizer transcribing them — routinely add extra
        // words ("dog dog", "i see a dog", "the doggy is big"), so hearing the
        // target intact among other words counts as having said it.
        for (index, target) in targets.enumerated() {
            let targetWords = target.split(separator: " ").map(String.init)
            if Self.containsSpan(transcriptWords, targetWords) {
                return index == 0 ? .exact : .alternative
            }
        }

        for target in targets where fuzzyMatches(whole: normalizedTranscript, words: transcriptWords, target: target) {
            return .fuzzy
        }

        return nil
    }

    /// True when `target` appears as a contiguous run of whole words inside
    /// `words` (a single-word target is just membership).
    static func containsSpan(_ words: [String], _ target: [String]) -> Bool {
        guard !target.isEmpty, words.count >= target.count else { return false }
        if target.count == 1 { return words.contains(target[0]) }
        for start in 0...(words.count - target.count) where Array(words[start ..< start + target.count]) == target {
            return true
        }
        return false
    }

    /// Locale-aware lowercase, punctuation removal (apostrophes and hyphens
    /// become spaces so elisions like "l'éléphant" and "il-kelb" split
    /// cleanly), whitespace trimmed and collapsed.
    public func normalize(_ text: String) -> String {
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

    private func fuzzyMatches(whole transcript: String, words: [String], target: String) -> Bool {
        // The whole transcript compared against the target (all tiers).
        if fuzzyMatchesToken(transcript, target: target) { return true }

        // Forgiving tier only: compare each word / word-span so a single
        // mispronounced word surrounded by filler still counts.
        guard config.perWordFuzzy else { return false }
        let targetWordCount = max(1, target.split(separator: " ").count)
        if targetWordCount == 1 {
            return words.contains { fuzzyMatchesToken($0, target: target) }
        }
        guard words.count >= targetWordCount else { return false }
        for start in 0...(words.count - targetWordCount) {
            let span = words[start ..< start + targetWordCount].joined(separator: " ")
            if fuzzyMatchesToken(span, target: target) { return true }
        }
        return false
    }

    private func fuzzyMatchesToken(_ candidate: String, target: String) -> Bool {
        let length = target.count
        let minLength = config.allowShortWordFuzzy ? 3 : config.fuzzyMinLength
        guard length >= minLength else { return false }
        let distance = Self.levenshtein(candidate, target)
        if length <= 5 {
            return distance <= config.shortWordMaxEdits
        }
        let maxLength = max(candidate.count, length)
        guard maxLength > 0 else { return false }
        let similarity = 1.0 - Double(distance) / Double(maxLength)
        return similarity >= config.longWordSimilarityThreshold
    }

    public static func levenshtein(_ a: String, _ b: String) -> Int {
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
