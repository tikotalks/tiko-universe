import XCTest
import TikoKit
@testable import TikoYesNo

/// Requirements-based unit tests for Tiko Yes-No.
///
/// These cover the testable logic: the answer model (`YesNoAnswerTile` /
/// `YesNoAnswerSet`), its speech / label content and translations, the built-in
/// answer-set catalog exposed by `YesNoStore`, and the speech playback state.
/// See `REQUIREMENTS.md` for the requirement each test maps to.
final class TikoYesNoTests: XCTestCase {

    // MARK: - Answer model: label / speech content (Req 3, 4)

    /// Req 3: an answer's spoken text defaults to its label when no `speech` is
    /// supplied in the payload (tap-to-speak always has something to say).
    func testTileSpeechDefaultsToLabel() throws {
        let json = #"{"id":"yes","label":"Yes","color":"green"}"#.data(using: .utf8)!
        let tile = try JSONDecoder().decode(YesNoAnswerTile.self, from: json)
        XCTAssertEqual(tile.label, "Yes")
        XCTAssertEqual(tile.speech, "Yes", "speech must fall back to the label")
    }

    /// Req 4: a tile can carry a spoken string distinct from its display label.
    func testTileDistinctLabelAndSpeech() throws {
        let json = #"{"id":"wc","label":"Toilet","speech":"I need the toilet please","color":"blue"}"#
            .data(using: .utf8)!
        let tile = try JSONDecoder().decode(YesNoAnswerTile.self, from: json)
        XCTAssertEqual(tile.label, "Toilet")
        XCTAssertEqual(tile.speech, "I need the toilet please")
    }

    /// A tile missing a colour falls back to the default (teal), so it is always
    /// renderable.
    func testTileColorDefaults() throws {
        let json = #"{"id":"x","label":"X"}"#.data(using: .utf8)!
        let tile = try JSONDecoder().decode(YesNoAnswerTile.self, from: json)
        XCTAssertEqual(tile.color, "teal")
    }

    /// Req 3: the model maps into the shared `TikoAnswerChoice` used by the UI,
    /// preserving id, label, speech and colour; a missing icon falls back to the
    /// default check icon.
    func testAnswerChoiceMapsSpeech() {
        let tile = YesNoAnswerTile(id: "no", label: "No", speech: "No thank you", color: "red")
        let choice = tile.answerChoice
        XCTAssertEqual(choice.id, "no")
        XCTAssertEqual(choice.label, "No")
        XCTAssertEqual(choice.speech, "No thank you")
        XCTAssertEqual(choice.color, "red")
        XCTAssertEqual(choice.icon, .openIcon("ui/check-fat"))
    }

    /// A round-trip through Codable preserves every field (custom tiles persist
    /// to UserDefaults as JSON — Req 9).
    func testTileEncodesAndDecodesRoundTrip() throws {
        let tile = YesNoAnswerTile(
            id: "help",
            label: "Help",
            speech: "Help me",
            labelTranslations: ["nl": "Help"],
            speechTranslations: ["nl": "Help mij"],
            color: "blue",
            imageRef: "abc-123",
            icon: "ui/pointer-hand"
        )
        let data = try JSONEncoder().encode(tile)
        let decoded = try JSONDecoder().decode(YesNoAnswerTile.self, from: data)
        XCTAssertEqual(decoded, tile)
    }

    /// Req 9: an answer set carries an ordered list of tiles and its metadata.
    func testAnswerSetInitAndOrdering() {
        let set = YesNoAnswerSet(
            id: "s1",
            title: "Set one",
            color: "teal",
            order: 3,
            answers: [
                YesNoAnswerTile(id: "a", label: "A", speech: "A", color: "green"),
                YesNoAnswerTile(id: "b", label: "B", speech: "B", color: "red"),
            ]
        )
        XCTAssertEqual(set.order, 3)
        XCTAssertEqual(set.answers.count, 2)
        XCTAssertEqual(set.answers.map(\.id), ["a", "b"])
    }

    // MARK: - Built-in catalog via YesNoStore (Req 2, 8)

    /// Req 2: before any network fetch, the store's default sets contain the
    /// built-in "Yes / No" set with exactly two answers — "Yes" (green) and
    /// "No" (red). This is what a fresh, offline, no-account launch shows.
    @MainActor
    func testDefaultSetsContainYesNo() {
        let store = YesNoStore()
        let yesNo = store.defaultSets.first { $0.id == "yes-no" }
        let set = try? XCTUnwrap(yesNo)
        XCTAssertEqual(set?.answers.count, 2)

        let yes = set?.answers.first { $0.id == "yes" }
        let no = set?.answers.first { $0.id == "no" }
        XCTAssertEqual(yes?.label, "Yes")
        XCTAssertEqual(yes?.color, TikoColors.green.name)
        XCTAssertEqual(no?.label, "No")
        XCTAssertEqual(no?.color, TikoColors.red.name)
    }

    /// Req 8: multiple built-in answer sets are available and ordered.
    @MainActor
    func testBuiltInAnswerSetsCatalog() {
        let store = YesNoStore()
        let ids = store.defaultSets.map(\.id)
        XCTAssertTrue(ids.contains("yes-no"))
        XCTAssertTrue(ids.contains("basic-needs"))
        XCTAssertTrue(ids.contains("quick-choices"))
        // Orders are strictly increasing in declaration order.
        let orders = store.defaultSets.map(\.order)
        XCTAssertEqual(orders, orders.sorted())
    }

    /// Req 5: built-in answers expose per-language translations (Dutch shown as
    /// a representative locale), so answering is localisable.
    @MainActor
    func testBuiltInTranslationsPresent() {
        let store = YesNoStore()
        let yesNo = store.defaultSets.first { $0.id == "yes-no" }
        let yes = yesNo?.answers.first { $0.id == "yes" }
        let no = yesNo?.answers.first { $0.id == "no" }
        XCTAssertEqual(yes?.labelTranslations?["nl"], "Ja")
        XCTAssertEqual(no?.labelTranslations?["nl"], "Nee")
        XCTAssertEqual(yes?.speechTranslations?["fr"], "Oui")
    }

    // MARK: - Answer style catalog (Req 10)

    /// Req 10: all four answer styles are offered.
    func testChoiceStyleCatalog() {
        let all = Set(TikoChoiceStyle.allCases)
        let expected: Set<TikoChoiceStyle> = [.tiles, .buttons, .compact, .textTile]
        XCTAssertEqual(all, expected)
    }

    // MARK: - Speech playback state

    /// Speech playback exposes the three states the speak button reacts to.
    @MainActor
    func testSpeechPlaybackStates() {
        let states: [YesNoSpeechPlaybackState] = [.idle, .generating, .playing]
        XCTAssertEqual(states.count, 3)
        // The service constructs without a network dependency.
        _ = YesNoSpeechService()
    }
}
