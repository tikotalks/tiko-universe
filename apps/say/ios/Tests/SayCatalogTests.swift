import XCTest
@testable import TikoSay

final class SayCatalogTests: XCTestCase {
    func testCatalogShape() {
        XCTAssertEqual(SayCatalog.categories.count, 6)
        XCTAssertGreaterThanOrEqual(SayCatalog.defaultCards.count, 50, "the catalogue ships a rich default set")
        for category in SayCatalog.categories {
            XCTAssertGreaterThanOrEqual(
                SayCatalog.defaultCards.filter { $0.categoryID == category.id }.count, 5,
                "category \(category.id) needs at least five default cards"
            )
            XCTAssertFalse(category.mediaCategories.isEmpty, "category \(category.id) must map to media-library categories")
        }
    }

    func testUniqueIDs() {
        let cardIDs = SayCatalog.defaultCards.map(\.id)
        XCTAssertEqual(Set(cardIDs).count, cardIDs.count)
        let categoryIDs = SayCatalog.categories.map(\.id)
        XCTAssertEqual(Set(categoryIDs).count, categoryIDs.count)
    }

    func testValidCategoryReferences() {
        let categoryIDs = Set(SayCatalog.categories.map(\.id))
        for card in SayCatalog.defaultCards {
            XCTAssertTrue(categoryIDs.contains(card.categoryID), "\(card.id) references unknown category \(card.categoryID)")
        }
    }

    func testEveryLanguageHasCompleteContent() {
        for card in SayCatalog.defaultCards {
            for language in SayCatalog.contentLanguages {
                let content = card.content[language]
                XCTAssertNotNil(content, "\(card.id) missing \(language)")
                guard let content else { continue }
                XCTAssertFalse(content.title.trimmingCharacters(in: .whitespaces).isEmpty, "\(card.id) \(language) empty title")
                XCTAssertFalse(content.speakText.trimmingCharacters(in: .whitespaces).isEmpty, "\(card.id) \(language) empty speak text")
                XCTAssertFalse(content.listenFor.isEmpty, "\(card.id) \(language) empty listen-for")
                XCTAssertFalse(content.listenFor.contains { $0.trimmingCharacters(in: .whitespaces).isEmpty }, "\(card.id) \(language) blank listen-for entry")
            }
        }
    }

    func testFallbackLanguageResolution() {
        let card = SayCatalog.defaultCards.first!
        let resolved = SayCatalog.card(card, language: "xx")
        XCTAssertEqual(resolved.title, card.content["en"]?.title)
    }

    func testEmojiAndDifficultyValid() {
        for card in SayCatalog.defaultCards {
            XCTAssertFalse(card.emoji.isEmpty, "\(card.id) missing emoji")
            XCTAssertTrue((1...3).contains(card.difficulty), "\(card.id) difficulty out of range")
        }
        for category in SayCatalog.categories {
            XCTAssertFalse(category.emoji.isEmpty)
            XCTAssertTrue(category.titleKey.hasPrefix("say.category."))
        }
    }

    func testResolvedCardsAreNotHiddenOrCustom() {
        for defaultCard in SayCatalog.defaultCards {
            let card = SayCatalog.card(defaultCard, language: "en")
            XCTAssertFalse(card.isCustom)
            XCTAssertFalse(card.isHidden)
        }
    }
}
