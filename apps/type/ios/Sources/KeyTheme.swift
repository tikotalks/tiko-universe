import SwiftUI
import TikoKit

/// The colours one key theme paints a keyboard with.
///
/// Every colour a key can be is decided here and nowhere else, so ``KeyGrid`` only ever
/// answers *where* a key goes. Adding an arrangement never means teaching it what
/// "Colorful" means.
struct KeyThemeColors {
    /// A letter, digit or mark, by its title and its position in the grid — the position
    /// is what lets Colorful cycle its palette.
    let key: (String, Int) -> Color
    let keyText: Color
    /// Shift, backspace and `123`/`ABC`.
    let special: Color
    let specialText: Color
    /// The letterboard's DONE: the one key that finishes something.
    let primary: Color
    let primaryText: Color
    /// Background shown briefly while a key is pressed.
    let active: Color
    /// Whether the space bar needs an outline to be visible at all. True only for Ghost,
    /// whose keys have no fill: the space bar is the one key that is all fill and no
    /// glyph, so without a hairline there is nothing there to aim at.
    let outlinesWideKeys: Bool
}

private let colorfulPalette: [Color] = [
    Color(hex: 0xFF6B6B),
    Color(hex: 0xFF922B),
    Color(hex: 0xFCC419),
    Color(hex: 0x69DB7C),
    Color(hex: 0x4DABF7),
    Color(hex: 0xCC5DE8),
    Color(hex: 0xF783AC),
    Color(hex: 0x63E6BE),
]

enum KeyTheme: String, CaseIterable, Identifiable {
    case classic, warm, cool, colorful, contrast, ghost

    var id: String { rawValue }

    var label: String {
        switch self {
        case .classic: "Classic"
        case .warm: "Warm"
        case .cool: "Cool"
        case .colorful: "Colorful"
        case .contrast: "Contrast"
        case .ghost: "Ghost"
        }
    }

    var swatch: Color {
        switch self {
        case .classic: Color(.systemGray5)
        case .warm: TikoAppColor.type.palette.primary
        case .cool: Color(hex: 0x4dabf7)
        case .colorful: colorfulPalette[0]
        case .contrast: .black
        case .ghost: Color(.systemGray3)
        }
    }

    func colors(in scheme: ColorScheme) -> KeyThemeColors {
        switch self {
        case .classic:
            let keyColor = scheme == .dark ? Color(white: 0.24) : Color.white
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: .primary,
                special: scheme == .dark ? Color(white: 0.17) : Color(white: 0.92),
                specialText: .primary,
                primary: TikoAppColor.type.palette.primary,
                primaryText: .white,
                active: TikoAppColor.type.palette.primary.opacity(0.40),
                outlinesWideKeys: false
            )
        case .warm:
            let keyColor = TikoAppColor.type.palette.primary.opacity(scheme == .dark ? 0.30 : 0.18)
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .white : TikoAppColor.type.palette.dark,
                special: TikoAppColor.type.palette.dark.opacity(scheme == .dark ? 0.55 : 0.30),
                specialText: .white,
                primary: TikoAppColor.type.palette.primary,
                primaryText: .white,
                active: TikoAppColor.type.palette.primary.opacity(0.65),
                outlinesWideKeys: false
            )
        case .cool:
            let keyColor = Color(hex: 0x4dabf7).opacity(scheme == .dark ? 0.30 : 0.20)
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .white : Color(hex: 0x1864ab),
                special: Color(hex: 0x1864ab).opacity(scheme == .dark ? 0.60 : 0.35),
                specialText: .white,
                primary: Color(hex: 0x1864ab),
                primaryText: .white,
                active: Color(hex: 0x4dabf7).opacity(0.70),
                outlinesWideKeys: false
            )
        case .colorful:
            return KeyThemeColors(
                key: { _, idx in colorfulPalette[abs(idx) % colorfulPalette.count] },
                keyText: .white,
                special: scheme == .dark ? Color(white: 0.17) : Color(white: 0.88),
                specialText: .primary,
                // The green of the palette: DONE is the key that says yes.
                primary: colorfulPalette[3],
                primaryText: Color(hex: 0x14361f),
                active: Color.white.opacity(0.45),
                outlinesWideKeys: false
            )
        case .contrast:
            let keyColor: Color = scheme == .dark ? .white : .black
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .black : .white,
                special: scheme == .dark ? Color(white: 0.10) : Color(white: 0.96),
                specialText: .primary,
                primary: TikoAppColor.type.palette.primary,
                primaryText: .black,
                active: TikoAppColor.type.palette.primary,
                outlinesWideKeys: false
            )
        case .ghost:
            return KeyThemeColors(
                key: { _, _ in Color.clear },
                keyText: .primary,
                special: Color.clear,
                specialText: .primary.opacity(0.6),
                primary: TikoAppColor.type.palette.primary.opacity(0.85),
                primaryText: .white,
                active: TikoAppColor.type.palette.primary.opacity(0.45),
                outlinesWideKeys: true
            )
        }
    }
}
