import SwiftUI

public enum TikoAppColor: String, CaseIterable, Sendable {
    case yesNo = "yes-no"
    case type
    case cards
    case sequence
    case timer
    case radio
    case tiko
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
