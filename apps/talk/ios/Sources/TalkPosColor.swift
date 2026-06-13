import SwiftUI
import TikoKit

/// Colour per part of speech, used to tint sentence-bar chips (solid) and to
/// subtly border words in the cloud and tiles. Distinct, child-friendly hues.
enum TalkPosColor {
    static func color(for pos: String) -> Color {
        switch pos {
        case "pronoun": return Color(hex: 0x4f86ff)      // blue
        case "verb": return Color(hex: 0x35b87a)         // green (actions)
        case "noun": return Color(hex: 0xff8a1f)         // orange (things)
        case "adjective": return Color(hex: 0xa463f2)    // purple (describing)
        case "adverb": return Color(hex: 0xe85aa0)       // pink
        case "determiner": return Color(hex: 0x18b5c4)   // teal
        case "question": return Color(hex: 0xe84057)     // red
        case "preposition": return Color(hex: 0x6c63ff)  // indigo
        case "conjunction": return Color(hex: 0x8a94a6)  // grey
        case "social": return Color(hex: 0xf0a92e)       // amber/yellow
        default: return Color(hex: 0xff6b6b)             // Talk primary fallback
        }
    }
}
