import XCTest
import TikoKit
@testable import TikoSum

@MainActor
final class SumPathStoreTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!
    private var i18n: TikoI18n!

    override func setUp() {
        super.setUp()
        suiteName = "sum-store-tests-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
        i18n = TikoI18n(app: .sum)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    private func makeStore(subject: String = "subject-a") -> SumPathStore {
        SumPathStore(defaults: defaults, subjectIDProvider: { subject })
    }

    func testTwelveDefaultPathsResolve() {
        let store = makeStore()
        let paths = store.visiblePaths(language: "en", i18n: i18n)
        XCTAssertEqual(paths.count, 12)
        XCTAssertTrue(paths.allSatisfy { !$0.formulas.isEmpty })
        XCTAssertTrue(paths.allSatisfy { $0.formulas.allSatisfy(\.isValid) })
    }

    func testOverrideEditsPathAndReset() {
        let store = makeStore()
        let newFormulas = [Formula(a: 1, op: .plus, b: 2), Formula(a: 2, op: .plus, b: 3)]
        store.updatePath(id: "counting", language: "en", i18n: i18n, title: "My counting", emoji: "🐸", formulas: newFormulas)

        var path = store.visiblePaths(language: "en", i18n: i18n).first { $0.id == "counting" }!
        XCTAssertEqual(path.title, "My counting")
        XCTAssertEqual(path.emoji, "🐸")
        XCTAssertEqual(path.formulas, newFormulas)
        XCTAssertTrue(store.isEdited(pathID: "counting", language: "en"))

        // Other languages untouched.
        XCTAssertFalse(store.isEdited(pathID: "counting", language: "nl"))

        store.resetToDefault(pathID: "counting", language: "en")
        path = store.visiblePaths(language: "en", i18n: i18n).first { $0.id == "counting" }!
        XCTAssertEqual(path.formulas.count, 5)
        XCTAssertFalse(store.isEdited(pathID: "counting", language: "en"))
    }

    func testInvalidFormulasAreDroppedOnSave() {
        let store = makeStore()
        store.updatePath(
            id: "counting", language: "en", i18n: i18n, title: "X", emoji: "🐸",
            formulas: [Formula(a: 7, op: .dividedBy, b: 2), Formula(a: 1, op: .plus, b: 1)]
        )
        let path = store.visiblePaths(language: "en", i18n: i18n).first { $0.id == "counting" }!
        XCTAssertEqual(path.formulas, [Formula(a: 1, op: .plus, b: 1)])
    }

    func testHideAndCustomLifecycle() {
        let store = makeStore()
        store.setHidden(true, pathID: "tens", language: "en")
        XCTAssertFalse(store.visiblePaths(language: "en", i18n: i18n).contains { $0.id == "tens" })
        XCTAssertTrue(store.allPaths(language: "en", i18n: i18n).contains { $0.id == "tens" })

        let custom = store.addCustomPath(
            language: "en", title: "Sevens", emoji: "7️⃣",
            formulas: [Formula(a: 7, op: .plus, b: 7)], i18n: i18n
        )
        XCTAssertNotNil(custom)
        XCTAssertTrue(custom!.isCustom)
        store.deleteCustomPath(id: custom!.id, language: "en")
        XCTAssertFalse(store.visiblePaths(language: "en", i18n: i18n).contains { $0.id == custom!.id })

        // Defaults cannot be deleted.
        store.deleteCustomPath(id: "tens", language: "en")
        XCTAssertTrue(store.allPaths(language: "en", i18n: i18n).contains { $0.id == "tens" })
    }

    func testPersistenceAcrossRelaunchAndAccounts() {
        let store = makeStore()
        store.updatePath(id: "doubles", language: "en", i18n: i18n, title: "Twins", emoji: "🧦", formulas: [Formula(a: 8, op: .plus, b: 8)])
        store.setOperatorWords(
            SumCatalog.OperatorWords(plus: "and", minus: "min", times: "times", dividedBy: "split by", equals: "makes"),
            language: "en"
        )

        let relaunched = makeStore()
        XCTAssertEqual(relaunched.visiblePaths(language: "en", i18n: i18n).first { $0.id == "doubles" }?.title, "Twins")
        XCTAssertEqual(relaunched.operatorWords(language: "en").plus, "and")

        let otherAccount = makeStore(subject: "subject-b")
        XCTAssertNotEqual(otherAccount.visiblePaths(language: "en", i18n: i18n).first { $0.id == "doubles" }?.title, "Twins")
    }

    func testOperatorWordsResetToDefaultWhenMatching() {
        let store = makeStore()
        store.setOperatorWords(SumCatalog.defaultOperatorWords(language: "en"), language: "en")
        let relaunched = makeStore()
        XCTAssertEqual(relaunched.operatorWords(language: "en"), SumCatalog.defaultOperatorWords(language: "en"))
    }

    func testReorderPersists() {
        let store = makeStore()
        let before = store.allPaths(language: "en", i18n: i18n).map(\.id)
        store.movePath(language: "en", i18n: i18n, fromOffsets: IndexSet(integer: 0), toOffset: 3)
        let after = store.allPaths(language: "en", i18n: i18n).map(\.id)
        XCTAssertNotEqual(before, after)
        XCTAssertEqual(Set(before), Set(after))
    }
}
