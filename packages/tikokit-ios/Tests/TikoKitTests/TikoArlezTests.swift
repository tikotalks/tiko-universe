import XCTest
@testable import TikoKit

/// The parts of Support that can be wrong quietly.
///
/// A support form that silently posts to the wrong project, or drops a required
/// field, looks fine on screen and fails only in Sil's inbox — where nobody is
/// watching for the report that never arrived.
final class TikoArlezTests: XCTestCase {

    // MARK: - The project map

    /// Every shipped iOS app must resolve to a product ID. An app missing from
    /// the map hides Support entirely, which is a silent loss of the feature.
    func testEveryShippedIOSAppHasAProject() {
        let shipped = [
            "mt.tiko.cards", "mt.tiko.first", "mt.tiko.radio", "mt.tiko.say",
            "mt.tiko.sum", "mt.tiko.talk", "mt.tiko.timer", "mt.tiko.type",
            "mt.tiko.write", "mt.tiko.yesno"
        ]
        for bundleID in shipped {
            XCTAssertNotNil(
                TikoArlezProjects.productID(forBundleID: bundleID),
                "\(bundleID) has no Arlez project — Support would be hidden in that app"
            )
        }
    }

    func testUnknownBundleResolvesToNothing() {
        XCTAssertNil(TikoArlezProjects.productID(forBundleID: "com.example.other"))
        XCTAssertNil(TikoArlezProjects.productID(forBundleID: nil))
    }

    /// Two apps sharing a product ID would file every report against one
    /// project, which is invisible until you wonder why Radio never reports bugs.
    func testProductIDsAreDistinct() {
        let ids = TikoArlezProjects.productIDsByBundleID.values
        XCTAssertEqual(Set(ids).count, ids.count, "two apps share an Arlez product ID")
    }

    /// The API key is a founder secret. Nothing that ships may contain one.
    func testNoAPIKeyIsCompiledIn() {
        for id in TikoArlezProjects.productIDsByBundleID.values {
            XCTAssertTrue(id.hasPrefix("pub_"), "\(id) is not a public product ID")
            XCTAssertFalse(id.contains("arlez_key"), "an Arlez API key is compiled into the app")
        }
    }

    // MARK: - The contract

    func testConfigurationDecodesWhatArlezPublishes() throws {
        let json = """
        {"id":"set_1","name":"Default","projectName":"Write · iOS","title":"Feedback about Write · iOS",
         "categories":[{"id":"bug","label":"Bug","icon":"ladybug","color":"#4A90E2","fields":[
            {"id":"description","label":"What happened?","kind":"longText","required":true},
            {"id":"steps","label":"Steps","kind":"longText","required":false}]}],
         "appearance":{"mode":"system","accentColor":"#AEC658","cornerStyle":"rounded","showArlezAttribution":true},
         "subjectProjectSelection":{"enabled":false,"required":false}}
        """
        let config = try JSONDecoder().decode(TikoSupportConfiguration.self, from: Data(json.utf8))
        XCTAssertEqual(config.projectName, "Write · iOS")
        XCTAssertEqual(config.categories.first?.fields.first?.required, true)
        XCTAssertEqual(config.categories.first?.fields.first?.kind, .longText)
    }

    /// A field kind Arlez adds later must not crash an app already on a phone.
    func testUnknownFieldKindDecodesRatherThanThrowing() throws {
        let json = """
        {"id":"f","label":"Rating","kind":"starRating","required":false}
        """
        let field = try JSONDecoder().decode(TikoSupportField.self, from: Data(json.utf8))
        XCTAssertEqual(field.kind, .unknown)
    }

    func testConversationDecodesAndSeparatesTheAuthors() throws {
        let json = """
        {"report":{"id":"r1","category":"Question","categoryIcon":"questionmark.circle",
          "message":"Does it work?","status":"new","createdAt":"2026-07-31T12:00:00.000Z",
          "projectName":"Write · iOS","canReply":true,
          "messages":[{"id":"m1","authorType":"reporter","body":"Mine","createdAt":"2026-07-31T12:01:00.000Z"},
                      {"id":"m2","authorType":"founder","body":"Ours","createdAt":"2026-07-31T12:02:00.000Z"}]}}
        """
        struct Envelope: Decodable { let report: TikoSupportConversation }
        let conversation = try JSONDecoder().decode(Envelope.self, from: Data(json.utf8)).report
        XCTAssertTrue(conversation.replyingIsOpen)
        XCTAssertEqual(conversation.messages.count, 2)
        XCTAssertFalse(conversation.messages[0].isFromSupport)
        XCTAssertTrue(conversation.messages[1].isFromSupport)
    }

    /// A closed conversation must not offer a reply box that the API rejects.
    func testMissingCanReplyIsTreatedAsClosed() throws {
        let json = """
        {"report":{"id":"r1","messages":[]}}
        """
        struct Envelope: Decodable { let report: TikoSupportConversation }
        let conversation = try JSONDecoder().decode(Envelope.self, from: Data(json.utf8)).report
        XCTAssertFalse(conversation.replyingIsOpen)
    }

    // MARK: - Submitting

    func testSubmitRefusesAnEmptyRequiredField() async {
        let category = TikoSupportCategory(
            id: "bug", label: "Bug", helpText: nil, icon: nil, color: nil,
            fields: [TikoSupportField(id: "description", label: "What happened?", kind: .longText, required: true)]
        )
        let client = TikoArlezClient(session: .shared)
        do {
            _ = try await client.submit(
                productID: "pub_x", category: category,
                fields: ["description": "   "], email: nil, installationID: nil, metadata: [:]
            )
            XCTFail("whitespace should not count as a filled required field")
        } catch let error as TikoSupportError {
            XCTAssertEqual(error, .missingRequiredField("description"))
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }

    /// A withdrawn conversation should be forgotten, not shown as a broken row.
    func testGoneRecognisesWithdrawnAndUnauthorised() {
        XCTAssertTrue(TikoSupportError.server(statusCode: 404, body: "").isGone)
        XCTAssertTrue(TikoSupportError.server(statusCode: 401, body: "").isGone)
        XCTAssertFalse(TikoSupportError.server(statusCode: 500, body: "").isGone)
        XCTAssertFalse(TikoSupportError.invalidResponse.isGone)
    }

    // MARK: - Keeping the ticket

    func testTicketRoundTripsThroughTheStore() throws {
        let store = TikoInMemoryTicketStore()
        let ticket = TikoSupportTicket(
            id: UUID().uuidString, accessToken: "token", productID: "pub_x",
            categoryLabel: "Bug", createdAt: Date(timeIntervalSince1970: 1_750_000_000)
        )
        store.add(ticket)
        let loaded = store.load()
        XCTAssertEqual(loaded.count, 1)
        XCTAssertEqual(loaded.first?.accessToken, "token")

        store.remove(id: ticket.id)
        XCTAssertTrue(store.load().isEmpty)
    }

    /// Sending twice about the same report must not leave two rows.
    func testAddingTheSameTicketTwiceKeepsOne() {
        let store = TikoInMemoryTicketStore()
        let ticket = TikoSupportTicket(
            id: "same", accessToken: "a", productID: "pub_x", categoryLabel: "Bug", createdAt: Date()
        )
        store.add(ticket)
        store.add(TikoSupportTicket(
            id: "same", accessToken: "b", productID: "pub_x", categoryLabel: "Bug", createdAt: Date()
        ))
        XCTAssertEqual(store.load().count, 1)
        XCTAssertEqual(store.load().first?.accessToken, "b")
    }

    // MARK: - Words

    /// Every language the shared sheets cover must translate Support, or a
    /// Dutch parent gets an English error at the worst moment.
    func testEveryCoveredLanguageIsTranslated() {
        let english = TikoSupportLabels.forLanguage("en")
        for code in ["nl", "de", "fr", "es", "mt"] {
            let labels = TikoSupportLabels.forLanguage(code)
            XCTAssertNotEqual(labels.send, english.send, "\(code) never translates Send")
            XCTAssertNotEqual(labels.couldNotSend, english.couldNotSend, "\(code) never translates the send failure")
            XCTAssertNotEqual(labels.unavailable, english.unavailable, "\(code) never translates the offline message")
        }
    }

    func testAnUnknownLanguageFallsBackToEnglish() {
        XCTAssertEqual(TikoSupportLabels.forLanguage("zz").send, TikoSupportLabels.forLanguage("en").send)
    }
}
