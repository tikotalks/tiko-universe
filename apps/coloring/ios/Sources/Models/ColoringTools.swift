import SwiftUI

/// What a tap or drag does. Kept in the app rather than the engine because it is a
/// UI mode: the engine already takes a tool and a "stay inside the lines" flag.
enum ColoringMode: String, CaseIterable, Identifiable {
    case fill
    case brush

    var id: String { rawValue }

    var label: String {
        switch self {
        case .fill: "Fill"
        case .brush: "Brush"
        }
    }

    var systemImage: String {
        switch self {
        case .fill: "drop.fill"
        case .brush: "paintbrush.pointed.fill"
        }
    }
}

/// Brush sizes, in canvas units. Canvas widths are ~100–200, so these read as
/// roughly thin/medium/thick regardless of which page is open.
enum BrushSize: Double, CaseIterable, Identifiable {
    case small = 4
    case medium = 9
    case large = 18

    var id: Double { rawValue }

    var label: String {
        switch self {
        case .small: "Thin"
        case .medium: "Medium"
        case .large: "Thick"
        }
    }

    /// Dot size in the picker, scaled to read as the brush it selects.
    var previewDiameter: CGFloat {
        switch self {
        case .small: 12
        case .medium: 20
        case .large: 30
        }
    }
}

/// The crayon box. Ten colours a child can name, ordered as a rainbow so it reads
/// like a real set rather than a developer's array — plus skin-friendly browns,
/// black and white so faces and highlights are possible.
enum ColoringPalette {
    struct Crayon: Identifiable, Hashable {
        let hex: String
        let name: String
        var id: String { hex }
    }

    static let crayons: [Crayon] = [
        Crayon(hex: "#E23B3B", name: "Red"),
        Crayon(hex: "#F4772C", name: "Orange"),
        Crayon(hex: "#FBC02D", name: "Yellow"),
        Crayon(hex: "#7CB342", name: "Green"),
        Crayon(hex: "#1F9E8F", name: "Teal"),
        Crayon(hex: "#2C7BE5", name: "Blue"),
        Crayon(hex: "#7B5BE0", name: "Purple"),
        Crayon(hex: "#E8639F", name: "Pink"),
        Crayon(hex: "#8D5A3B", name: "Brown"),
        Crayon(hex: "#F2C6A0", name: "Sand"),
        Crayon(hex: "#3A3A3A", name: "Black"),
        Crayon(hex: "#FFFFFF", name: "White"),
    ]
}
