import Foundation

/// What the globe is showing. Countries is the geography itself; the others are
/// occurrences laid over it, all reading from the same canonical country records.
enum GlobeMode: String, CaseIterable, Identifiable, Sendable {
    case countries
    case capitals
    case animals
    case landmarks

    var id: String { rawValue }

    var labelKey: String { "globe.mode.\(rawValue)" }

    /// The picture on the mode button: a modelled thing rather than a symbol,
    /// which is what the rest of the globe is made of. Falls back to the symbol
    /// if the artwork is ever missing.
    var artworkName: String { "mode-\(rawValue)" }

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

/// A thing that exists in the world, once, wherever it happens to be found: the
/// African elephant, Ħaġar Qim, Valletta. Identity lives here — the name is a
/// fallback for when there is no translation, never the identity itself.
struct GlobeEntity: Identifiable, Equatable, Sendable {
    enum Kind: String, Sendable {
        case capital
        case city
        case animal
        case landmark

        /// The half of the translation key that says what sort of thing this is.
        var translationNamespace: String {
            switch self {
            case .capital: "geography.capitals"
            case .city: "geography.cities"
            case .animal: "geography.animals"
            case .landmark: "geography.landmarks"
            }
        }
    }

    let id: String
    let kind: Kind
    /// English, for debugging and for when a translation is missing.
    let fallbackName: String
    let glyph: String
    /// Bundled Tiko media, where the library has a picture of this subject.
    let imageName: String?
    /// False until an editor has been through the entry.
    let isReviewed: Bool

    /// `geography.animals.african-elephant`, and so on.
    var translationKey: String { "\(kind.translationNamespace).\(id)" }
}

/// One place an entity is found. The same elephant has many of these; each can
/// carry its own importance, because an elephant matters more in Kenya than in
/// the corner of a map.
struct GlobeOccurrence: Identifiable, Equatable, Sendable {
    let id: String
    let entityID: String
    let point: GeoPoint
    /// 1 shows from space, 10 only at the closest zoom. Importance to the map a
    /// child is reading, not rarity.
    let importance: Int
    /// The country this occurrence belongs to, when it belongs to exactly one.
    let countryID: String?
    /// Every country this entity is found in — what the detail panel maps.
    let countryIDs: [String]
    /// Broad wording for a region, where the data carries one.
    let region: String?
    let note: String?
    /// True when the occurrence was authored for one country, and so should only
    /// appear once a child is looking at that country.
    let isWithinCountry: Bool
}

/// Everything the modes draw, and the entities behind it.
struct GlobeContentLibrary: Sendable {
    private(set) var entities: [String: GlobeEntity] = [:]
    private(set) var occurrences: [GlobeMode: [GlobeOccurrence]] = [:]

    func entity(for occurrence: GlobeOccurrence) -> GlobeEntity? {
        entities[occurrence.entityID]
    }

    /// Reads the authored packs. A missing pack is not fatal: Countries and
    /// Capitals still work, and the app says nothing it cannot back up.
    static func load(from bundle: Bundle = .main, countries: [GlobeCountry]) -> GlobeContentLibrary {
        var library = GlobeContentLibrary()
        if !library.addCities(from: bundle) {
            // Without the pack there is still one seat of government per
            // country in the geography itself, which is better than none.
            library.addCapitals(from: countries)
        }
        library.add(pack: "animals", kind: .animal, mode: .animals, from: bundle)
        library.add(pack: "landmarks", kind: .landmark, mode: .landmarks, from: bundle)
        return library
    }

    /// Every named place: the capitals — all of them, because South Africa has
    /// three — then the capitals of states and provinces, then the towns.
    /// Returns false when the pack is missing, so the caller can fall back.
    private mutating func addCities(from bundle: Bundle) -> Bool {
        guard let url = bundle.url(forResource: "cities", withExtension: "json", subdirectory: "generated")
            ?? bundle.url(forResource: "cities", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(CityPack.self, from: data)
        else { return false }

        var found: [GlobeOccurrence] = []
        found.reserveCapacity(file.items.count)
        for item in file.items {
            entities[item.id] = GlobeEntity(
                id: item.id,
                kind: item.isCapital ? .capital : .city,
                fallbackName: item.name,
                glyph: item.isCapital ? "🏛️" : "🏙️",
                imageName: item.mediaId.map { "\($0).png" },
                isReviewed: true
            )
            found.append(GlobeOccurrence(
                id: item.id,
                entityID: item.id,
                point: GeoPoint(lat: item.lat, lon: item.lon),
                importance: item.importance,
                countryID: item.country,
                countryIDs: [item.country],
                region: item.region,
                note: nil,
                isWithinCountry: false
            ))
        }
        occurrences[.capitals] = found
        return true
    }

    private mutating func addCapitals(from countries: [GlobeCountry]) {
        var found: [GlobeOccurrence] = []
        for country in countries {
            guard let capital = country.capital else { continue }
            // The country code is the capital's identity, so a capital renamed
            // — and they are, Astana twice — keeps its picture and its key.
            let id = country.id.lowercased()
            entities[id] = GlobeEntity(
                id: id,
                kind: .capital,
                fallbackName: capital.name,
                glyph: "🏙️",
                imageName: nil,
                isReviewed: true
            )
            found.append(GlobeOccurrence(
                id: id,
                entityID: id,
                point: capital.point,
                // Sovereign capitals surface before a dependency's seat does.
                importance: country.sovereignty == .sovereign ? 2 : 4,
                countryID: country.id,
                countryIDs: [country.id],
                region: nil,
                note: nil,
                isWithinCountry: false
            ))
        }
        occurrences[.capitals] = found
    }

    private mutating func add(pack name: String, kind: GlobeEntity.Kind, mode: GlobeMode, from bundle: Bundle) {
        guard let url = bundle.url(forResource: name, withExtension: "json", subdirectory: "content")
            ?? bundle.url(forResource: name, withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(ContentPack.self, from: data)
        else {
            occurrences[mode] = []
            return
        }

        var found: [GlobeOccurrence] = []
        for item in file.items {
            let entityID = item.entityID(kind: kind)
            entities[entityID] = GlobeEntity(
                id: entityID,
                kind: kind,
                fallbackName: item.name,
                glyph: item.glyph ?? "📍",
                imageName: item.image.map { ($0 as NSString).lastPathComponent },
                isReviewed: item.review?.state == "reviewed" || item.review?.state == "verified"
            )
            found.append(contentsOf: item.occurrences(entityID: entityID, kind: kind))
        }
        occurrences[mode] = found
    }
}

private struct CityPack: Decodable {
    struct Item: Decodable {
        let id: String
        let name: String
        let kind: String
        let isCapital: Bool
        let country: String
        let region: String?
        let importance: Int
        let lat: Double
        let lon: Double
        let mediaId: String?
    }
    let items: [Item]
}

// MARK: - Reading the packs

/// Tolerant on purpose: the geography content is mid-audit, and the shapes
/// before and after it should both load. Identity comes from the id, never from
/// the English name.
private struct ContentPack: Decodable {
    struct Point: Decodable {
        let lat: Double
        let lon: Double
        let country: String?
        let closeUp: Bool?
        let importance: Int?
        let note: String?
    }

    struct Review: Decodable {
        let state: String?
    }

    struct Item: Decodable {
        let id: String?
        let animal: String?
        let name: String
        let glyph: String?
        let image: String?
        let importance: Int?
        /// The old five-band tier, still read so a stale pack loads.
        let tier: Int?
        let region: String?
        let country: String?
        let countries: [String]?
        let marker: Point?
        let markers: [Point]?
        let note: String?
        let review: Review?

        /// `african-elephant`, from whichever field carries the identity.
        func entityID(kind: GlobeEntity.Kind) -> String {
            if let animal, !animal.isEmpty { return animal }
            guard let id, !id.isEmpty else { return Self.slug(name) }
            // Historic ids are prefixed with their kind: `animal.african-elephant`.
            let prefix = "\(kind.rawValue)."
            return id.hasPrefix(prefix) ? String(id.dropFirst(prefix.count)) : id
        }

        /// 1…10. An authored value wins; a stale tier is mapped onto the scale.
        var resolvedImportance: Int {
            if let importance, (1...10).contains(importance) { return importance }
            if let tier { return min(10, max(1, tier * 2)) }
            return 6
        }

        func occurrences(entityID: String, kind: GlobeEntity.Kind) -> [GlobeOccurrence] {
            let points = markers ?? [marker].compactMap { $0 }
            let everywhere = countries ?? [country].compactMap { $0 }
            return points.enumerated().map { index, point in
                GlobeOccurrence(
                    // One entity, many occurrences: each needs its own id.
                    id: points.count > 1 ? "\(entityID)#\(index)" : entityID,
                    entityID: entityID,
                    point: GeoPoint(lat: point.lat, lon: point.lon),
                    importance: point.importance ?? resolvedImportance,
                    countryID: point.country ?? country,
                    countryIDs: everywhere,
                    region: region,
                    note: point.note ?? note,
                    isWithinCountry: point.closeUp ?? false
                )
            }
        }

        private static func slug(_ value: String) -> String {
            value.lowercased()
                .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
                .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        }
    }

    let items: [Item]
}
