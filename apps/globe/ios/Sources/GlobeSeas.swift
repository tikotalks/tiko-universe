import Foundation

/// A named place that is not a country: an ocean, a sea, or an island inside
/// some country's borders. Natural Earth carries the names in twenty-six
/// languages, so a Dutch child reads "Middellandse Zee" and "Sicilië" without
/// Tiko translating anything itself.
struct GlobePlace: Identifiable, Equatable, Sendable {
    let id: String
    let fallbackName: String
    /// Language code → name, straight from the source data.
    let names: [String: String]
    let point: GeoPoint
    /// 1 for an ocean, up to 10 for a strait only worth naming close in.
    let importance: Int
    /// How far the label point is from that place's own edge, in degrees. A name
    /// wider than the thing it names is worse than no name at all.
    let reachDegrees: Double

    func name(languageCode: String) -> String {
        names[languageCode] ?? names[String(languageCode.prefix(2))] ?? fallbackName
    }
}

enum GlobePlaces {
    /// `seas` or `islands`. A missing pack is not fatal: the globe still works,
    /// it just says less.
    static func load(_ name: String, from bundle: Bundle = .main) -> [GlobePlace] {
        guard let url = bundle.url(forResource: name, withExtension: "json", subdirectory: "generated")
            ?? bundle.url(forResource: name, withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(Pack.self, from: data)
        else { return [] }
        return file.items.map {
            GlobePlace(
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
