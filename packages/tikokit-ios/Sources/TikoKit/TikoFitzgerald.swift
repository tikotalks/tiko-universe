import SwiftUI

/// Six-category modified Fitzgerald Key, shared with packages/data/src/fitzgerald.ts.
public enum TikoFitzgerald: String, Codable, CaseIterable, Identifiable, Sendable {
    case person, action, thing, describing, social, miscellaneous
    public var id: String { rawValue }
    public static func category(for pos: String) -> Self {
        switch pos {
        case "pronoun", "person": .person
        case "verb": .action
        case "noun": .thing
        case "adjective", "adverb": .describing
        case "social", "interjection": .social
        default: .miscellaneous
        }
    }
    public var color: Color {
        switch self {
        case .person: Color(hex: 0xFFE38B)
        case .action: Color(hex: 0xBCE5BA)
        case .thing: Color(hex: 0xFFD0A1)
        case .describing: Color(hex: 0xB8DDF6)
        case .social: Color(hex: 0xFFB8D0)
        case .miscellaneous: Color(hex: 0xF1F1F1)
        }
    }
    public static var ink: Color { Color(hex: 0x202431) }
}
