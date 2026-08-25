import SwiftUI

public enum TikoAppColor: String, CaseIterable, Sendable {
    case yesNo = "yes-no"
    case type
    case cards
    case sequence
    case timer
    case radio
    case talk
    case tiko
    case say
    case sum
    case first
    case write
    case coloring
    case globe
}


public struct TikoAppConfig: Sendable {
    public let id: TikoAppColor
    public let title: String
    public let appColor: TikoAppColor
    public let appIconSystemName: String
    public let appIconMediaCategory: String?
    public let appIconImageUrl: String?
    public let themeColorHex: UInt32

    public init(
        id: TikoAppColor,
        title: String,
        appColor: TikoAppColor,
        appIconSystemName: String,
        appIconMediaCategory: String? = nil,
        appIconImageUrl: String? = nil,
        themeColorHex: UInt32
    ) {
        self.id = id
        self.title = title
        self.appColor = appColor
        self.appIconSystemName = appIconSystemName
        self.appIconMediaCategory = appIconMediaCategory
        self.appIconImageUrl = appIconImageUrl
        self.themeColorHex = themeColorHex
    }
}

public extension TikoAppConfig {
    static let yesNo = TikoAppConfig(id: .yesNo, title: "Yes No", appColor: .yesNo, appIconSystemName: "checkmark.circle", appIconMediaCategory: "emotions", appIconImageUrl: "https://media.tikoapi.org/v1/media/c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec/download", themeColorHex: 0x16b8a6)
    static let type = TikoAppConfig(id: .type, title: "Type", appColor: .type, appIconSystemName: "textformat", appIconMediaCategory: "letters", appIconImageUrl: "https://media.tikoapi.org/v1/media/eecf2917-a885-4025-a762-9c7a8783f5af/download", themeColorHex: 0xff8a1f)
    static let cards = TikoAppConfig(id: .cards, title: "Cards", appColor: .cards, appIconSystemName: "rectangle.grid.2x2.fill", appIconMediaCategory: "animals", appIconImageUrl: "https://media.tikoapi.org/v1/media/e37943b4-582c-40ee-be3a-c47be7c6e658/download", themeColorHex: 0x82b1ff)
    static let sequence = TikoAppConfig(id: .sequence, title: "Sequence", appColor: .sequence, appIconSystemName: "list.bullet.rectangle.fill", appIconMediaCategory: "routines", appIconImageUrl: "https://media.tikoapi.org/v1/media/c2e7188c-1ac4-41d6-a29c-2b122ec812e8/download", themeColorHex: 0xef4f8f)
    static let timer = TikoAppConfig(id: .timer, title: "Timer", appColor: .timer, appIconSystemName: "timer", appIconMediaCategory: "transport", appIconImageUrl: "https://media.tikoapi.org/v1/media/ec6bad5e-8cbe-4934-b1c8-d66d80098f95/download", themeColorHex: 0xe84057)
    static let radio = TikoAppConfig(id: .radio, title: "Radio", appColor: .radio, appIconSystemName: "headphones", appIconMediaCategory: "music", appIconImageUrl: "https://media.tikoapi.org/v1/media/0b59af4c-e3b7-406b-a7f6-45c566d18615/download", themeColorHex: 0xff8a1f)
    static let tiko = TikoAppConfig(id: .tiko, title: "Tiko", appColor: .tiko, appIconSystemName: "heart.fill", appIconMediaCategory: "tiko", appIconImageUrl: "https://data.tikocdn.org/uploads/1756901709154-boy-saying-hi-disney-pixar-style-1.png", themeColorHex: 0xa8e6cf)
    static let talk = TikoAppConfig(id: .talk, title: "Talk", appColor: .talk, appIconSystemName: "message.fill", appIconMediaCategory: "communication", appIconImageUrl: "https://media.tikoapi.org/v1/media/da85b30b-6865-41ef-9b75-71e46999de22/download", themeColorHex: 0xff6b6b)
    static let say = TikoAppConfig(id: .say, title: "Say", appColor: .say, appIconSystemName: "waveform", appIconMediaCategory: "communication", appIconImageUrl: "https://data.tikocdn.org/uploads/1781443432968-speech-balloon.png", themeColorHex: 0x8b5cf6)
    static let sum = TikoAppConfig(id: .sum, title: "Sum", appColor: .sum, appIconSystemName: "plus.forwardslash.minus", appIconMediaCategory: "numbers", appIconImageUrl: "https://data.tikocdn.org/uploads/1755105954065-calculator.png", themeColorHex: 0xdd8966)
    static let write = TikoAppConfig(id: .write, title: "Write", appColor: .write, appIconSystemName: "pencil.and.outline", appIconMediaCategory: "letters", appIconImageUrl: "https://data.tikocdn.org/uploads/1756901709154-boy-saying-hi-disney-pixar-style-1.png", themeColorHex: 0x22c55e)
    static let coloring = TikoAppConfig(id: .coloring, title: "Coloring", appColor: .coloring, appIconSystemName: "paintbrush.pointed.fill", appIconMediaCategory: "art", appIconImageUrl: nil, themeColorHex: 0xf2802b)
    static let globe = TikoAppConfig(id: .globe, title: "Globe", appColor: .globe, appIconSystemName: "globe.europe.africa.fill", appIconMediaCategory: nil, appIconImageUrl: nil, themeColorHex: 0x0ea5e9)
    static let first = TikoAppConfig(id: .first, title: "First", appColor: .first, appIconSystemName: "checklist", appIconMediaCategory: "routines", appIconImageUrl: "https://data.tikocdn.org/uploads/1754413862502-todo.png", themeColorHex: 0x06b6d4)
}

public struct TikoAppPalette {
    public let label: String
    public let primary: Color
    public let dark: Color

    public init(label: String, primary: Color, dark: Color) {
        self.label = label
        self.primary = primary
        self.dark = dark
    }
}

public extension TikoAppColor {
    var palette: TikoAppPalette {
        switch self {
        case .yesNo:
            TikoAppPalette(label: "Yes No", primary: Color(hex: 0x16b8a6), dark: Color(hex: 0x0b6056))
        case .type:
            TikoAppPalette(label: "Type", primary: Color(hex: 0xff8a1f), dark: Color(hex: 0x854810))
        case .cards:
            TikoAppPalette(label: "Cards", primary: Color(hex: 0x82b1ff), dark: Color(hex: 0x445c85))
        case .sequence:
            TikoAppPalette(label: "Sequence", primary: Color(hex: 0xef4f8f), dark: Color(hex: 0x7c294a))
        case .timer:
            TikoAppPalette(label: "Timer", primary: Color(hex: 0xe84057), dark: Color(hex: 0x79212d))
        case .radio:
            TikoAppPalette(label: "Radio", primary: Color(hex: 0xff8a1f), dark: Color(hex: 0x854810))
        case .tiko:
            TikoAppPalette(label: "Tiko", primary: Color(hex: 0xa8e6cf), dark: Color(hex: 0x57786c))
        case .talk:
            TikoAppPalette(label: "Talk", primary: Color(hex: 0xff6b6b), dark: Color(hex: 0x853838))
        case .say:
            TikoAppPalette(label: "Say", primary: Color(hex: 0x8b5cf6), dark: Color(hex: 0x483080))
        case .sum:
            TikoAppPalette(label: "Sum", primary: Color(hex: 0xdd8966), dark: Color(hex: 0x734735))
        case .write:
            TikoAppPalette(label: "Write", primary: Color(hex: 0x22c55e), dark: Color(hex: 0x126631))
        case .coloring:
            TikoAppPalette(label: "Coloring", primary: Color(hex: 0xf2802b), dark: Color(hex: 0x7e4316))
        case .globe:
            TikoAppPalette(label: "Globe", primary: Color(hex: 0x0ea5e9), dark: Color(hex: 0x075679))
        case .first:
            TikoAppPalette(label: "First", primary: Color(hex: 0x06b6d4), dark: Color(hex: 0x035f6e))
        }
    }
}

public extension Color {
    init(hex: UInt32) {
        let red = Double((hex & 0xff0000) >> 16) / 255
        let green = Double((hex & 0x00ff00) >> 8) / 255
        let blue = Double(hex & 0x0000ff) / 255
        self.init(red: red, green: green, blue: blue)
    }

    init?(hexString: String) {
        let normalized = hexString.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "#", with: "")
        guard normalized.count == 6, let hex = UInt32(normalized, radix: 16) else { return nil }
        self.init(hex: hex)
    }
}
