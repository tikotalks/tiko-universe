import XCTest
@testable import TikoGlobe

/// The contract between the geography data and the globe: entities are
/// identified by a slug, occurrences carry their own position and importance,
/// and nothing in the app is keyed on an English name. These run against the
/// real bundled packs, because the point of the contract is that the shipped
/// data keeps it.
final class GlobeContentTests: XCTestCase {
    private static var library: GlobeContentLibrary!

    override class func setUp() {
        super.setUp()
        let bundle = Bundle(for: GlobeContentTests.self)
        let geography = (try? GlobeGeography.loadFromBundle(bundle)) ?? (try? GlobeGeography.loadFromBundle())
        library = GlobeContentLibrary.load(
            from: (bundle.url(forResource: "animals", withExtension: "json", subdirectory: "content") != nil
                || bundle.url(forResource: "animals", withExtension: "json") != nil) ? bundle : .main,
            countries: geography?.countries ?? []
        )
    }

    private var library: GlobeContentLibrary {
        get throws { try XCTUnwrap(Self.library) }
    }

    func testEveryEntityIsIdentifiedByASlugAndNotByItsName() throws {
        let library = try library
        XCTAssertGreaterThan(library.entities.count, 500)
        for (id, entity) in library.entities {
            XCTAssertEqual(id, entity.id, "the map key and the entity should agree")
            XCTAssertFalse(id.isEmpty)
            XCTAssertNil(
                id.rangeOfCharacter(from: CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789-").inverted),
                "\(id) is not a slug — ids are lowercase, digits and hyphens"
            )
            XCTAssertFalse(entity.fallbackName.isEmpty, "\(id) has no English fallback to show")
        }
    }

    func testATranslationKeyFollowsFromTheIdAndItsKind() throws {
        let library = try library
        for entity in library.entities.values {
            XCTAssertEqual(entity.translationKey, "\(entity.kind.translationNamespace).\(entity.id)")
        }
        XCTAssertTrue(library.entities.values.contains { $0.translationKey.hasPrefix("geography.animals.") })
        XCTAssertTrue(library.entities.values.contains { $0.translationKey.hasPrefix("geography.landmarks.") })
        XCTAssertTrue(library.entities.values.contains { $0.translationKey.hasPrefix("geography.capitals.") })
    }

    func testEveryOccurrenceHasARealPositionAnImportanceAndAnEntityBehindIt() throws {
        let library = try library
        for mode in [GlobeMode.capitals, .animals, .landmarks] {
            let found = library.occurrences[mode] ?? []
            XCTAssertFalse(found.isEmpty, "\(mode.rawValue) should carry occurrences")
            for occurrence in found {
                XCTAssertNotNil(library.entity(for: occurrence), "\(occurrence.id) has no entity")
                XCTAssertTrue((-90...90).contains(occurrence.point.lat), "\(occurrence.id) is off the planet")
                XCTAssertTrue((-180...180).contains(occurrence.point.lon), "\(occurrence.id) is off the planet")
                XCTAssertTrue((1...10).contains(occurrence.importance), "\(occurrence.id) has importance \(occurrence.importance)")
            }
        }
    }

    func testOneEntityHoldsManyOccurrencesRatherThanBeingRepeated() throws {
        let library = try library
        let animals = try XCTUnwrap(library.occurrences[.animals])
        let entityIDs = Set(animals.map(\.entityID))
        XCTAssertLessThan(entityIDs.count, animals.count, "animals are found in more than one place")
        XCTAssertEqual(Set(animals.map(\.id)).count, animals.count, "each occurrence is its own row")
    }

    func testACountrysOwnOccurrencesWaitUntilAChildIsLookingAtThatCountry() throws {
        let library = try library
        let animals = try XCTUnwrap(library.occurrences[.animals])
        let within = animals.filter(\.isWithinCountry)
        XCTAssertFalse(within.isEmpty)
        for occurrence in within {
            XCTAssertNotNil(occurrence.countryID, "an occurrence authored for a country should say which")
        }
    }

    /// The point of the people pack: wherever a child lands, somebody lives
    /// there. Only Heard Island and the Siachen Glacier are empty, and nobody
    /// lives on either of those.
    func testEveryCountryHasSomebodyLivingInIt() throws {
        let library = try library
        let people = library.entities.values.filter { $0.kind == .person }
        XCTAssertGreaterThan(people.count, 200, "a people for nearly every country")

        let bundle = Bundle(for: GlobeContentTests.self)
        let geography = try XCTUnwrap(
            (try? GlobeGeography.loadFromBundle(bundle)) ?? (try? GlobeGeography.loadFromBundle())
        )
        var peopled = Set<String>()
        for occurrence in library.occurrences[.people] ?? [] {
            if let country = occurrence.countryID { peopled.insert(country) }
        }
        let empty = geography.countries.map(\.id).filter { !peopled.contains($0) }
        XCTAssertEqual(
            Set(empty), ["HMD", "KAS"],
            "only the places nobody lives should have nobody: \(empty.sorted())"
        )
    }

    func testZoomBandsOpenUpAsTheChildComesCloserAndNeverTheOtherWay() {
        let radii: [Double] = [90, 60, 40, 20, 15, 8, 5, 3, 1.5, 0.8]
        let deepest = radii.map(GlobeImportanceBands.deepest(forVisibleRadius:))
        XCTAssertEqual(deepest, deepest.sorted(), "coming closer can only ever show more")
        XCTAssertEqual(GlobeImportanceBands.deepest(forVisibleRadius: 90), 2, "from space, only the very biggest")
        XCTAssertEqual(GlobeImportanceBands.deepest(forVisibleRadius: 0.8), 10, "up close, everything")
    }
}
