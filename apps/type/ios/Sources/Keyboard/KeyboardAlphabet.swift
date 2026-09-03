import Foundation

/// The letters a language types with.
///
/// Kept as data per language because Tiko ships far more than English, and a keyboard
/// hard-coded to A–Z is not a keyboard for a Russian or an Armenian speller.
struct KeyboardAlphabet: Sendable, Equatable {
    /// The arrangement this language's typists already know, as rows.
    ///
    /// Three rows, always: a physical keyboard's letters live on three rows, and a fourth
    /// short row of accented letters would be the one thing a keyboard never has. Where a
    /// language has letters beyond A–Z they go where that language's own keyboard puts
    /// them — at the right-hand end of the top and home rows.
    ///
    /// `nil` where Tiko does not ship one for that script yet; those languages get the
    /// alphabetical arrangement instead, which is a real keyboard rather than a guess at
    /// one.
    var familiarRows: [String]?
    /// The alphabet in its own order, which every script has.
    var letters: String

    private static let latin = "abcdefghijklmnopqrstuvwxyz"

    /// The alphabet for a Tiko language code (`tiko.language`).
    ///
    /// Anything Tiko offers that is not listed here gets the Latin alphabet, which is
    /// exactly what every language got before this file existed — so no language loses a
    /// keyboard, and the ones named here gain their own.
    static func alphabet(forLanguageCode code: String) -> KeyboardAlphabet {
        switch base(of: code) {
        case "en", "nl":
            KeyboardAlphabet(familiarRows: ["qwertyuiop", "asdfghjkl", "zxcvbnm"], letters: latin)
        case "de":
            KeyboardAlphabet(
                familiarRows: ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"],
                letters: latin + "äöüß"
            )
        case "fr":
            // AZERTY, with the accented letters at the ends of the top and bottom rows
            // rather than on a stub row of their own. `ù` after `m` is where a French
            // keyboard actually keeps it.
            KeyboardAlphabet(
                familiarRows: ["azertyuiopéè", "qsdfghjklmù", "wxcvbnàç"],
                letters: latin + "àçéèù"
            )
        case "es":
            KeyboardAlphabet(
                familiarRows: ["qwertyuiop", "asdfghjklñ", "zxcvbnm"],
                letters: "abcdefghijklmnñopqrstuvwxyz"
            )
        case "mt":
            // The Maltese keyboard is QWERTY with `ġ ħ` past `p` and `ż ċ` past `l`,
            // which is exactly where they sit on the physical one.
            KeyboardAlphabet(
                familiarRows: ["qwertyuiopġħ", "asdfghjklżċ", "zxcvbnm"],
                letters: "abċdefġghħijklmnopqrstuvwxżz"
            )
        case "ru":
            KeyboardAlphabet(
                familiarRows: ["ёйцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"],
                letters: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
            )
        case "hy":
            // No familiar arrangement is shipped for Armenian yet. Alphabetical is a
            // complete Armenian keyboard, so this is a missing *option*, not a missing
            // keyboard.
            KeyboardAlphabet(
                familiarRows: nil,
                letters: "աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆև"
            )
        default:
            KeyboardAlphabet(familiarRows: ["qwertyuiop", "asdfghjkl", "zxcvbnm"], letters: latin)
        }
    }

    /// `en-GB` and `en` are the same keyboard.
    private static func base(of code: String) -> String {
        String(code.split(separator: "-").first ?? "").lowercased()
    }

    /// The letter rows for a named arrangement.
    ///
    /// A language keeps its own rows when the named layout is the one it actually types
    /// on — German QWERTZ has ü, ö and ä where a German keyboard puts them. Asked for an
    /// arrangement that is not its own, it gets the canonical rows for that name, because
    /// there is no such thing as "German AZERTY".
    ///
    /// `nil` where the canonical rows are for another script entirely; the caller then
    /// falls back to the alphabetical grid, which is a real keyboard for every script
    /// rather than a guess at one.
    static func rows(
        for layout: TypeKeyboardLayout,
        languageCode: String,
        alphabet: KeyboardAlphabet
    ) -> [String]? {
        if TypeKeyboardLayout.familiarArrangement(forLanguageCode: languageCode) == layout,
           let own = alphabet.familiarRows {
            return own
        }
        let canonical: [String]
        switch layout {
        case .azerty: canonical = ["azertyuiop", "qsdfghjklm", "wxcvbn"]
        case .qwertz: canonical = ["qwertzuiop", "asdfghjkl", "yxcvbnm"]
        case .jcuken: canonical = ["йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"]
        case .dvorak: canonical = ["pyfgcrl", "aoeuidhtns", "qjkxbmwvz"]
        default: canonical = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
        }
        // A Latin arrangement is not a keyboard for Armenian, and ЙЦУКЕН is not one for
        // English. Where fewer than half this alphabet's letters appear in the canonical
        // rows there is nothing to adapt.
        let shared = Set(canonical.joined()).intersection(Set(alphabet.letters))
        guard shared.count * 2 >= alphabet.letters.count else { return nil }
        return carrying(alphabet.letters, in: canonical)
    }

    /// Adds any letter of the alphabet the canonical rows do not have.
    ///
    /// There is no such thing as Spanish AZERTY, but a Spanish speaker who chooses it must
    /// still be able to type ñ. Missing letters go to the end of the shortest row, which
    /// is where a physical keyboard puts a language's extra letters anyway.
    private static func carrying(_ letters: String, in rows: [String]) -> [String] {
        let present = Set(rows.joined())
        let missing = letters.filter { !present.contains($0) }
        guard !missing.isEmpty else { return rows }
        var result = rows
        for letter in missing {
            let shortest = result.indices.min { result[$0].count < result[$1].count } ?? 0
            result[shortest].append(letter)
        }
        return result
    }
}
