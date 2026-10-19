import XCTest
import TikoKit
@testable import TikoSum

@MainActor
final class SumPathStoreTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "sum-store-tests-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    private func makeStore(subject: String = "subject-a") -> SumPathStore {
        SumPathStore(defaults: defaults, subjectIDProvider: { subject })
    }

    func testStartsWithNoPathsBecausePresetsCoverTheLadder() {
        let store = makeStore()
        XCTAssertTrue(store.allPaths(language: "en").isEmpty)
        XCTAssertEqual(SumCatalog.ranges.map(\.maxNumber), [5, 10, 20, 50, 100])
        XCTAssertEqual(SumCatalog.bands.map(\.minNumber), [10, 20, 50])
        XCTAssertEqual(SumCatalog.families.count, 9, "the 2s through the 10s")
        XCTAssertEqual(Set(SumCatalog.presets.map(\.id)).count, SumCatalog.presets.count, "ids must be unique")
    }

    func testAddEditAndDeletePath() {
        let store = makeStore()
        let path = store.addPath(
            language: "en", title: "Sevens", emoji: "7️⃣",
            formulas: [Formula(a: 7, op: .plus, b: 7)]
        )
        XCTAssertNotNil(path)

        store.updatePath(
            id: path!.id, language: "en", title: "Lucky sevens", emoji: "🍀",
            formulas: [Formula(a: 7, op: .plus, b: 3)]
        )
        var stored = store.allPaths(language: "en").first!
        XCTAssertEqual(stored.title, "Lucky sevens")
        XCTAssertEqual(stored.emoji, "🍀")
        XCTAssertEqual(stored.formulas, [Formula(a: 7, op: .plus, b: 3)])

        store.setHidden(true, pathID: path!.id, language: "en")
        XCTAssertTrue(store.visiblePaths(language: "en").isEmpty)
        stored = store.allPaths(language: "en").first!
        XCTAssertTrue(stored.isHidden)

        store.deletePath(id: path!.id, language: "en")
        XCTAssertTrue(store.allPaths(language: "en").isEmpty)
    }

    func testInvalidFormulasAreDroppedOnSave() {
        let store = makeStore()
        let path = store.addPath(
            language: "en", title: "X", emoji: "🐸",
            formulas: [Formula(a: 7, op: .dividedBy, b: 2), Formula(a: 1, op: .plus, b: 1)]
        )
        XCTAssertEqual(path?.formulas, [Formula(a: 1, op: .plus, b: 1)])
    }

    func testPathsStayInTheirOwnLanguage() {
        let store = makeStore()
        store.addPath(language: "en", title: "Sevens", emoji: "7️⃣", formulas: [Formula(a: 7, op: .plus, b: 7)])
        XCTAssertEqual(store.allPaths(language: "en").count, 1)
        XCTAssertTrue(store.allPaths(language: "nl").isEmpty)
    }

    func testPersistenceAcrossRelaunchAndAccounts() {
        let store = makeStore()
        store.addPath(language: "en", title: "Twins", emoji: "🧦", formulas: [Formula(a: 8, op: .plus, b: 8)])
        store.setOperatorWords(
            SumCatalog.OperatorWords(plus: "and", minus: "min", times: "times", dividedBy: "split by", equals: "makes"),
            language: "en"
        )

        let relaunched = makeStore()
        XCTAssertEqual(relaunched.allPaths(language: "en").first?.title, "Twins")
        XCTAssertEqual(relaunched.operatorWords(language: "en").plus, "and")

        let otherAccount = makeStore(subject: "subject-b")
        XCTAssertTrue(otherAccount.allPaths(language: "en").isEmpty)
        XCTAssertEqual(otherAccount.operatorWords(language: "en"), SumCatalog.defaultOperatorWords(language: "en"))
    }

    func testOperatorWordsResetToDefaultWhenMatching() {
        let store = makeStore()
        store.setOperatorWords(SumCatalog.defaultOperatorWords(language: "en"), language: "en")
        let relaunched = makeStore()
        XCTAssertEqual(relaunched.operatorWords(language: "en"), SumCatalog.defaultOperatorWords(language: "en"))
    }

    func testReorderPersists() {
        let store = makeStore()
        for title in ["A", "B", "C"] {
            store.addPath(language: "en", title: title, emoji: "⭐️", formulas: [Formula(a: 1, op: .plus, b: 1)])
        }
        XCTAssertEqual(store.allPaths(language: "en").map(\.title), ["A", "B", "C"])

        store.movePath(language: "en", fromOffsets: IndexSet(integer: 0), toOffset: 3)
        XCTAssertEqual(store.allPaths(language: "en").map(\.title), ["B", "C", "A"])

        let relaunched = makeStore()
        XCTAssertEqual(relaunched.allPaths(language: "en").map(\.title), ["B", "C", "A"])
    }
}
