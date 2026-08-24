import SwiftUI
import simd

/// The globe's colours, for both appearances. Land tints follow Natural Earth's
/// nine-colour map index, so two countries sharing a border never share a
/// colour — and none of them carries meaning on its own: the name, the flag and
/// the spoken word do that.
extension GlobeAppearance {
    static let lightBackgroundColor = Color(red: 0.973, green: 0.965, blue: 0.945)
    static let darkBackgroundColor = Color(red: 0.08, green: 0.055, blue: 0.095)

    static func appearance(for colorScheme: ColorScheme) -> GlobeAppearance {
        colorScheme == .dark ? dark : light
    }

    /// Outlines are off: with each country a slab, its cut edge already draws
    /// the line between it and its neighbour, and a stroke on top of that reads
    /// as a second border. Raise this to bring them back.
    static let borderWidthPoints: Float = 0

    /// Land colour by climate: ice, forest, grass, scrub, sand. Natural rather
    /// than political — the Earth should look like land, not like an atlas.
    static func landColor(for climate: GlobeClimate, dark: Bool) -> SIMD4<Float> {
        switch (climate, dark) {
        case (.polar, false): SIMD4<Float>(0.93, 0.95, 0.96, 1)
        case (.polar, true): SIMD4<Float>(0.62, 0.68, 0.72, 1)
        case (.boreal, false): SIMD4<Float>(0.55, 0.68, 0.56, 1)
        case (.boreal, true): SIMD4<Float>(0.30, 0.42, 0.33, 1)
        case (.temperate, false): SIMD4<Float>(0.66, 0.78, 0.55, 1)
        case (.temperate, true): SIMD4<Float>(0.36, 0.47, 0.31, 1)
        case (.mediterranean, false): SIMD4<Float>(0.80, 0.79, 0.53, 1)
        case (.mediterranean, true): SIMD4<Float>(0.47, 0.46, 0.29, 1)
        case (.subtropical, false): SIMD4<Float>(0.78, 0.80, 0.52, 1)
        case (.subtropical, true): SIMD4<Float>(0.45, 0.47, 0.28, 1)
        case (.tropical, false): SIMD4<Float>(0.53, 0.72, 0.48, 1)
        case (.tropical, true): SIMD4<Float>(0.28, 0.44, 0.27, 1)
        case (.desert, false): SIMD4<Float>(0.89, 0.82, 0.62, 1)
        case (.desert, true): SIMD4<Float>(0.53, 0.47, 0.33, 1)
        case (.steppe, false): SIMD4<Float>(0.83, 0.79, 0.57, 1)
        case (.steppe, true): SIMD4<Float>(0.49, 0.45, 0.31, 1)
        }
    }

    static let light = GlobeAppearance(
        background: SIMD4<Float>(0.973, 0.965, 0.945, 1),
        ocean: SIMD4<Float>(0.49, 0.76, 0.90, 1),
        // The alpha is how much of the limb glow reaches the edge, not opacity.
        atmosphere: SIMD4<Float>(0.85, 0.93, 1.0, 0.9),
        borderWidth: borderWidthPoints,
        riverWidth: 1.6,
        river: SIMD4<Float>(0.44, 0.72, 0.88, 1),
        border: SIMD4<Float>(0.22, 0.28, 0.34, 1),
        selectedBorder: SIMD4<Float>(0.42, 0.24, 0.02, 1),
        highlight: SIMD4<Float>(1.0, 0.72, 0.13, 1),
        isDark: false
    )

    /// Dark mode dims the water and the land together. An Earth that turns into
    /// a black disc with outlines is not a globe a child can read.
    static let dark = GlobeAppearance(
        background: SIMD4<Float>(0.08, 0.055, 0.095, 1),
        ocean: SIMD4<Float>(0.10, 0.24, 0.35, 1),
        atmosphere: SIMD4<Float>(0.24, 0.48, 0.68, 0.85),
        borderWidth: borderWidthPoints,
        riverWidth: 1.6,
        river: SIMD4<Float>(0.30, 0.52, 0.68, 1),
        border: SIMD4<Float>(0.78, 0.84, 0.89, 1),
        selectedBorder: SIMD4<Float>(1.0, 0.94, 0.80, 1),
        highlight: SIMD4<Float>(1.0, 0.78, 0.30, 1),
        isDark: true
    )
}
