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
}


public struct TikoAppConfig: Sendable {
    public let id: TikoAppColor
    public let title: String
    public let appColor: TikoAppColor
    public let appIconSystemName: String
    public let appIconMediaCategory: String?
    public let themeColorHex: UInt32

    public init(
        id: TikoAppColor,
        title: String,
        appColor: TikoAppColor,
        appIconSystemName: String,
        appIconMediaCategory: String? = nil,
        themeColorHex: UInt32
    ) {
        self.id = id
        self.title = title
        self.appColor = appColor
        self.appIconSystemName = appIconSystemName
        self.appIconMediaCategory = appIconMediaCategory
        self.themeColorHex = themeColorHex
    }
}

public extension TikoAppConfig {
    static let yesNo = TikoAppConfig(id: .yesNo, title: "Yes No", appColor: .yesNo, appIconSystemName: "checkmark.circle", appIconMediaCategory: "emotions", themeColorHex: 0x9b3fbd)
    static let type = TikoAppConfig(id: .type, title: "Type", appColor: .type, appIconSystemName: "textformat", appIconMediaCategory: "letters", themeColorHex: 0x2488ff)
    static let cards = TikoAppConfig(id: .cards, title: "Cards", appColor: .cards, appIconSystemName: "rectangle.grid.2x2.fill", appIconMediaCategory: "animals", themeColorHex: 0xff8a1f)
    static let sequence = TikoAppConfig(id: .sequence, title: "Sequence", appColor: .sequence, appIconSystemName: "list.bullet.rectangle.fill", appIconMediaCategory: "routines", themeColorHex: 0x16b8a6)
    static let timer = TikoAppConfig(id: .timer, title: "Timer", appColor: .timer, appIconSystemName: "timer", appIconMediaCategory: "transport", themeColorHex: 0xf8c22e)
    static let radio = TikoAppConfig(id: .radio, title: "Radio", appColor: .radio, appIconSystemName: "headphones", appIconMediaCategory: "music", themeColorHex: 0xe84057)
    static let talk = TikoAppConfig(id: .talk, title: "Talk", appColor: .talk, appIconSystemName: "bubble.left.and.bubble.right.fill", appIconMediaCategory: "communication", themeColorHex: 0x2f80ed)
    static let tiko = TikoAppConfig(id: .tiko, title: "Tiko", appColor: .tiko, appIconSystemName: "heart.fill", appIconMediaCategory: "tiko", themeColorHex: 0xef4f8f)
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
            TikoAppPalette(label: "Yes No", primary: Color(hex: 0x9b3fbd), dark: Color(hex: 0x49125e))
        case .type:
            TikoAppPalette(label: "Type", primary: Color(hex: 0x2488ff), dark: Color(hex: 0x0d3f91))
        case .cards:
            TikoAppPalette(label: "Cards", primary: Color(hex: 0xff8a1f), dark: Color(hex: 0x9a3d00))
        case .sequence:
            TikoAppPalette(label: "Sequence", primary: Color(hex: 0x16b8a6), dark: Color(hex: 0x08665d))
        case .timer:
            TikoAppPalette(label: "Timer", primary: Color(hex: 0xf8c22e), dark: Color(hex: 0x8a5d00))
        case .radio:
            TikoAppPalette(label: "Radio", primary: Color(hex: 0xe84057), dark: Color(hex: 0x7a1e2d))
        case .talk:
            TikoAppPalette(label: "Talk", primary: Color(hex: 0x2f80ed), dark: Color(hex: 0x123f7a))
        case .tiko:
            TikoAppPalette(label: "Tiko", primary: Color(hex: 0xef4f8f), dark: Color(hex: 0x8d1c4f))
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
}
