import Foundation

/// A named piece of water: the five oceans, then seas, gulfs, bays and straits.
/// Natural Earth carries the names in twenty-six languages, so a Dutch child
/// reads "Middellandse Zee" without Tiko translating anything itself.
struct GlobeSea: Identifiable, Equatable, Sendable {
    let id: String
    let fallbackName: String
    /// Language code → name, straight from the source data.
    let names: [String: String]
    let point: GeoPoint
    /// 1 for an ocean, up to 10 for a strait only worth naming close in.
    let importance: Int
    /// How far the label point is from the nearest shore, in degrees. A name
    /// wider than its own water is worse than no name at all.
    let reachDegrees: Double

    func name(languageCode: String) -> String {
        names[languageCode] ?? names[String(languageCode.prefix(2))] ?? fallbackName
    }
}

enum GlobeSeas {
    static func load(from bundle: Bundle = .main) -> [GlobeSea] {
        guard let url = bundle.url(forResource: "seas", withExtension: "json", subdirectory: "generated")
            ?? bundle.url(forResource: "seas", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(Pack.self, from: data)
        else { return [] }
        return file.items.map {
            GlobeSea(
                id: $0.id,
                fallbackName: $0.name,
                names: $0.names ?? [:],
                point: GeoPoint(lat: $0.lat, lon: $0.lon),
                importance: $0.importance,
                reachDegrees: $0.reachDegrees
            )
        }
    }

    private struct Pack: Decodable {
        struct Item: Decodable {
            let id: String
            let name: String
            let names: [String: String]?
            let importance: Int
            let reachDegrees: Double
            let lat: Double
            let lon: Double
        }
        let items: [Item]
    }
}
