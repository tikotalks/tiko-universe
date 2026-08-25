import AVFoundation
import Foundation

/// The languages Tiko ships, each with the BCP-47 tags a text-to-speech voice
/// for it may be published under.
///
/// This is the single source of truth for turning an app language code into a
/// locale — for Atlas requests, for voice cache keys, and for looking up an
/// `AVSpeechSynthesizer` voice.
///
/// Two things this deliberately does not do:
///
/// - **It does not invent a locale.** An unmapped language is passed through
///   as itself. Returning `en-US` for anything unrecognised is what made a
///   Tiko app hand Armenian text to an American English voice.
/// - **It does not assume one tag per language.** Apple renames these between
///   releases: Arabic was `ar-SA` and ships as `ar-001` on iOS 26. A language
///   lists every tag it is known by, preferred first, and `systemVoice(for:)`
///   resolves against the voices the device actually has.
///
/// The switch below has no `default` case, so adding a language to
/// `TikoLanguage.defaultLanguages` without giving it a locale fails to build.
public enum TikoSpeechLanguage: String, CaseIterable, Sendable {
    case ar
    case de
    case en
    case es
    case fr
    case hy
    case it
    case ja
    case ko
    case mt
    case nl
    case pt
    case zh

    /// Every tag a voice for this language may be published under, preferred
    /// first.
    public var localeCandidates: [String] {
        switch self {
        case .ar: return ["ar-001", "ar-SA"]
        case .de: return ["de-DE"]
        case .en: return ["en-US"]
        case .es: return ["es-ES"]
        case .fr: return ["fr-FR"]
        case .hy: return ["hy-AM"]
        case .it: return ["it-IT"]
        case .ja: return ["ja-JP"]
        case .ko: return ["ko-KR"]
        case .mt: return ["mt-MT"]
        case .nl: return ["nl-NL"]
        case .pt: return ["pt-PT"]
        case .zh: return ["zh-CN"]
        }
    }

    /// Tiko's canonical tag for the language.
    public var locale: String { localeCandidates[0] }

    /// The `TikoSpeechLanguage` an app language code belongs to, if Tiko ships
    /// it. `"pt"` and `"pt-BR"` both resolve to `.pt`.
    public static func resolve(_ appLanguageCode: String) -> TikoSpeechLanguage? {
        guard let base = baseCode(of: appLanguageCode) else { return nil }
        return TikoSpeechLanguage(rawValue: base)
    }

    static func baseCode(of appLanguageCode: String) -> String? {
        let base = appLanguageCode
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "_", with: "-")
            .split(separator: "-")
            .first
            .map { $0.lowercased() }
        return base?.isEmpty == false ? base : nil
    }
}
