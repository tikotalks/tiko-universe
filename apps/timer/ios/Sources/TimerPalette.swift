import SwiftUI
import TikoKit

/// Colour choices for the countdown, split out of the view so they can be
/// asserted in tests.
///
/// `TikoAppPalette.dark` is a deep maroon intended for text on a light
/// background. Timer used it unconditionally, so on the dark shell the
/// countdown, the ring and every control glyph were dark red on near-black and
/// effectively invisible. Radio and Type already guarded the same value behind
/// the colour scheme; this makes that guard explicit and testable.
enum TimerPalette {
    static let primary = TikoAppColor.timer.palette.primary

    /// Foreground for the countdown digits and control glyphs.
    static func foreground(for scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : TikoAppColor.timer.palette.dark
    }

    /// Fill behind the play / pause / resume controls.
    static func controlBackground(for scheme: ColorScheme) -> Color {
        scheme == .dark ? .white.opacity(0.16) : primary.opacity(0.22)
    }

    /// Fill behind the reset control, one step quieter than the others.
    static func resetBackground(for scheme: ColorScheme) -> Color {
        scheme == .dark ? .white.opacity(0.10) : primary.opacity(0.14)
    }

    /// The unfilled part of the countdown ring.
    static func ringTrack(for scheme: ColorScheme) -> Color {
        primary.opacity(scheme == .dark ? 0.30 : 0.22)
    }

    static func presetBackground(for scheme: ColorScheme) -> Color {
        scheme == .dark ? .white.opacity(0.12) : .white
    }

    static func presetForeground(for scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : Color(hex: 0x8a5d00)
    }
}
