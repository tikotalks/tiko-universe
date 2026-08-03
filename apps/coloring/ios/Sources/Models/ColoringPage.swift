import Foundation

/// A bundled coloring page. The artwork is an SVG in the app bundle that satisfies
/// the ColoringCore importer contract — see `engines/coloring/README.md`.
///
/// Pages are content, not user input: a malformed one is a build-time mistake, and
/// `ColoringPageTests` imports every bundled page so it fails there rather than on a
/// child's iPad.
struct ColoringPage: Identifiable, Hashable {
    let id: String
    let title: String

    /// Every page shipped with the app, in the order they appear in the library.
    static let bundled: [ColoringPage] = [
        ColoringPage(id: "house", title: "House"),
        ColoringPage(id: "boat", title: "Boat"),
        ColoringPage(id: "flower", title: "Flower"),
        ColoringPage(id: "cat", title: "Cat"),
    ]

    func loadSVG(from bundle: Bundle = .main) throws -> String {
        guard let url = bundle.url(forResource: id, withExtension: "svg") else {
            throw ColoringPageError.missingArtwork(id)
        }
        return try String(contentsOf: url, encoding: .utf8)
    }
}

enum ColoringPageError: LocalizedError {
    case missingArtwork(String)

    var errorDescription: String? {
        switch self {
        case let .missingArtwork(id):
            "The artwork for \"\(id)\" is missing from the app bundle."
        }
    }
}
