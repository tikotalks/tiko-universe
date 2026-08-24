import Foundation

/// What the globe is showing. Countries is the geography itself; the others are
/// markers laid over it, all reading from the same canonical country records.
enum GlobeMode: String, CaseIterable, Identifiable, Sendable {
    case countries
    case capitals
    case animals
    case landmarks

    var id: String { rawValue }

    var labelKey: String { "globe.mode.\(rawValue)" }

    /// Icon for the selector. Deliberately not colour alone — every mode has a
    /// distinct shape and a written label beside it.
    var systemImage: String {
        switch self {
        case .countries: "globe.europe.africa.fill"
        case .capitals: "building.2.fill"
        case .animals: "pawprint.fill"
        case .landmarks: "building.columns.fill"
        }
    }
}

/// One thing a child can tap that is not a country: a capital, an animal or a
/// landmark. Capitals come from the geography; the other two are authored in
/// `packages/geography/content`.
struct GlobeMarker: Identifiable, Equatable, Sendable {
    enum Kind: String, Sendable {
        case capital
        case animal
        case landmark
    }

    let id: String
    let kind: Kind
    let name: String
    let glyph: String
    /// Bundled Tiko media, where the library had a picture of this subject.
    let imageName: String?
    let point: GeoPoint
    /// Larger shows earlier as the child zooms out.
    let priority: Int
    /// 1 is a lion, 5 is a sea anemone: what decides how far out it shows.
    let tier: Int
    /// Placed inside one country, and only drawn once the child is looking at
    /// that country — the guarantee that every country has something to find.
    let isCloseUp: Bool
    /// The country this belongs to, where it belongs to exactly one.
    let countryID: String?
    /// Every country this subject covers — one for a capital or a landmark, a
    /// whole region's worth for an animal. Drives the panel's little map.
    let countryIDs: [String]
    /// Broad wording for something that lives in more than one place. Never a
    /// habitat claim — see `packages/geography/content/animals.json`.
    let region: String?
    /// False until an editor has been through the entry.
    let isReviewed: Bool
}

private struct ContentFile: Decodable {
    struct Marker: Decodable {
        let lat: Double
        let lon: Double
        let country: String?
        let closeUp: Bool?
    }

    struct Review: Decodable {
        let state: String
    }

    struct Item: Decodable {
        let id: String
        let name: String
        let glyph: String
        let priority: Int
        let tier: Int?
        let region: String?
        let image: String?
        let country: String?
        let countries: [String]?
        let marker: Marker?
        let markers: [Marker]?
        let review: Review
    }

    let schemaVersion: Int
    let items: [Item]
}

enum GlobeContent {
    /// Reads the authored packs. A missing pack is not fatal: Countries and
    /// Capitals still work, and the app says nothing it cannot back up.
    static func markers(from bundle: Bundle = .main, countries: [GlobeCountry]) -> [GlobeMode: [GlobeMarker]] {
        var markers: [GlobeMode: [GlobeMarker]] = [:]
        markers[.capitals] = capitals(from: countries)
        markers[.animals] = load(named: "animals", kind: .animal, from: bundle)
        markers[.landmarks] = load(named: "landmarks", kind: .landmark, from: bundle)
        return markers
    }

    private static func capitals(from countries: [GlobeCountry]) -> [GlobeMarker] {
        countries.compactMap { country in
            guard let capital = country.capital else { return nil }
            return GlobeMarker(
                id: "capital.\(country.id)",
                kind: .capital,
                name: capital.name,
                glyph: "🏙️",
                imageName: nil,
                point: capital.point,
                // Sovereign capitals surface before a dependency's seat does.
                priority: country.sovereignty == .sovereign ? 80 : 50,
                tier: country.sovereignty == .sovereign ? 1 : 2,
                isCloseUp: false,
                countryID: country.id,
                countryIDs: [country.id],
                region: nil,
                isReviewed: true
            )
        }
    }

    private static func load(named name: String, kind: GlobeMarker.Kind, from bundle: Bundle) -> [GlobeMarker] {
        guard let url = bundle.url(forResource: name, withExtension: "json", subdirectory: "content")
            ?? bundle.url(forResource: name, withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(ContentFile.self, from: data)
        else { return [] }

        return file.items.flatMap { item -> [GlobeMarker] in
            let points = item.markers ?? [item.marker].compactMap { $0 }
            return points.enumerated().map { index, marker in
                GlobeMarker(
                    // One entry can appear in several places; each needs its own id.
                    id: points.count > 1 ? "\(item.id)#\(index)" : item.id,
                    kind: kind,
                    name: item.name,
                    glyph: item.glyph,
                    imageName: item.image.map { ($0 as NSString).lastPathComponent },
                    point: GeoPoint(lat: marker.lat, lon: marker.lon),
                    priority: item.priority,
                    tier: item.tier ?? 2,
                    isCloseUp: marker.closeUp ?? false,
                    countryID: marker.country ?? item.country,
                    countryIDs: item.countries ?? [item.country].compactMap { $0 },
                    region: item.region,
                    isReviewed: item.review.state == "reviewed"
                )
            }
        }
    }
}
