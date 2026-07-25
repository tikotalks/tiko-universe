import XCTest
@testable import TikoFirst

@MainActor
final class FirstStoreTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "first.store.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    private func makeStore(subject: String = "subject") -> FirstStore {
        FirstStore(defaults: defaults, subjectIDProvider: { subject })
    }

    // MARK: - Defaults

    func testDefaultsAreVisibleAndOrdered() {
        let store = makeStore()
        let routines = store.visibleRoutines(language: "en")
        XCTAssertEqual(routines.count, 8)
        XCTAssertEqual(routines.map(\.sortOrder), Array(0..<8))
        XCTAssertEqual(routines.first?.id, "morning")
    }

    func testDefaultsResolvePerLanguage() {
        let store = makeStore()
        XCTAssertEqual(store.routine(id: "morning", language: "en")?.title, "Morning")
        XCTAssertEqual(store.routine(id: "morning", language: "de")?.title, "Morgen")
    }

    // MARK: - Editing defaults

    func testEditingADefaultCreatesAPerLanguageOverride() {
        let store = makeStore()
        var steps = store.routine(id: "morning", language: "en")!.orderedSteps
        steps[0].title = "Get up"

        store.updateRoutine(id: "morning", language: "en", title: "Our morning", emoji: "🌞", steps: steps)

        XCTAssertEqual(store.routine(id: "morning", language: "en")?.title, "Our morning")
        XCTAssertEqual(store.routine(id: "morning", language: "en")?.emoji, "🌞")
        XCTAssertEqual(store.routine(id: "morning", language: "en")?.orderedSteps.first?.title, "Get up")
        XCTAssertTrue(store.isEdited(routineID: "morning", language: "en"))
        // Another language is untouched.
        XCTAssertEqual(store.routine(id: "morning", language: "de")?.title, "Morgen")
        XCTAssertFalse(store.isEdited(routineID: "morning", language: "de"))
    }

    func testEditingBackToTheDefaultDropsTheOverride() {
        let store = makeStore()
        let bundled = store.routine(id: "tidy", language: "en")!
        store.updateRoutine(id: "tidy", language: "en", title: "Clean up", emoji: bundled.emoji, steps: bundled.orderedSteps)
        XCTAssertTrue(store.isEdited(routineID: "tidy", language: "en"))

        store.updateRoutine(id: "tidy", language: "en", title: bundled.title, emoji: bundled.emoji, steps: bundled.orderedSteps)
        XCTAssertFalse(store.isEdited(routineID: "tidy", language: "en"), "an edit that matches the default is not an edit")
    }

    func testResetToDefaultRestoresBundledContent() {
        let store = makeStore()
        let bundled = store.routine(id: "bath", language: "en")!
        store.updateRoutine(id: "bath", language: "en", title: "Splash", emoji: "💦", steps: bundled.orderedSteps)
        store.resetToDefault(routineID: "bath", language: "en")
        XCTAssertEqual(store.routine(id: "bath", language: "en")?.title, bundled.title)
    }

    func testEmptyTitleOrNoStepsIsRefused() {
        let store = makeStore()
        let bundled = store.routine(id: "morning", language: "en")!
        store.updateRoutine(id: "morning", language: "en", title: "   ", emoji: "🌞", steps: bundled.orderedSteps)
        store.updateRoutine(id: "morning", language: "en", title: "Fine", emoji: "🌞", steps: [])
        XCTAssertFalse(store.isEdited(routineID: "morning", language: "en"))
    }

    func testBlankStepsAreDroppedAndTheRestRenumbered() {
        let store = makeStore()
        let steps = [
            RoutineStep(id: "a", title: "One", emoji: "1️⃣", sortOrder: 0),
            RoutineStep(id: "b", title: "  ", emoji: "2️⃣", sortOrder: 1),
            RoutineStep(id: "c", title: "Three", emoji: "3️⃣", sortOrder: 2),
        ]
        let created = store.addCustomRoutine(language: "en", title: "Mine", emoji: "⭐️", steps: steps)
        XCTAssertEqual(created?.orderedSteps.map(\.title), ["One", "Three"])
        XCTAssertEqual(created?.orderedSteps.map(\.sortOrder), [0, 1])
    }

    // MARK: - Hiding

    func testHidingRemovesARoutineFromTheChildGrid() {
        let store = makeStore()
        store.setHidden(true, routineID: "school", language: "en")
        XCTAssertFalse(store.visibleRoutines(language: "en").contains { $0.id == "school" })
        XCTAssertTrue(store.allRoutines(language: "en").contains { $0.id == "school" })

        store.setHidden(false, routineID: "school", language: "en")
        XCTAssertTrue(store.visibleRoutines(language: "en").contains { $0.id == "school" })
    }

    // MARK: - Custom routines

    func testAddingACustomRoutineAppendsItPerLanguage() {
        let store = makeStore()
        let created = store.addCustomRoutine(
            language: "en",
            title: "Swimming",
            emoji: "🏊",
            steps: [RoutineStep(id: "s1", title: "Swimsuit", emoji: "🩱", sortOrder: 0)]
        )
        XCTAssertNotNil(created)
        XCTAssertTrue(created!.isCustom)
        XCTAssertEqual(store.allRoutines(language: "en").last?.id, created?.id)
        XCTAssertFalse(store.allRoutines(language: "de").contains { $0.id == created?.id })
    }

    func testCustomRoutineNeedsATitleAndAStep() {
        let store = makeStore()
        XCTAssertNil(store.addCustomRoutine(language: "en", title: "", emoji: "⭐️", steps: [
            RoutineStep(id: "s1", title: "Something", emoji: "⭐️", sortOrder: 0),
        ]))
        XCTAssertNil(store.addCustomRoutine(language: "en", title: "Nameless", emoji: "⭐️", steps: []))
        XCTAssertEqual(store.allRoutines(language: "en").count, 8)
    }

    func testDeletingACustomRoutineRemovesIt() {
        let store = makeStore()
        let created = store.addCustomRoutine(
            language: "en",
            title: "Swimming",
            emoji: "🏊",
            steps: [RoutineStep(id: "s1", title: "Swimsuit", emoji: "🩱", sortOrder: 0)]
        )!
        store.deleteCustomRoutine(id: created.id, language: "en")
        XCTAssertFalse(store.allRoutines(language: "en").contains { $0.id == created.id })
    }

    func testDeletingABundledRoutineIsRefused() {
        let store = makeStore()
        store.deleteCustomRoutine(id: "morning", language: "en")
        XCTAssertTrue(store.allRoutines(language: "en").contains { $0.id == "morning" })
    }

    // MARK: - Duplication

    func testDuplicatingGivesAnIndependentCopyWithFreshStepIDs() {
        let store = makeStore()
        let source = store.routine(id: "firstthen", language: "en")!
        let copy = store.duplicateRoutine(id: "firstthen", language: "en")

        XCTAssertNotNil(copy)
        XCTAssertTrue(copy!.isCustom)
        XCTAssertEqual(copy?.title, source.title)
        XCTAssertEqual(copy?.orderedSteps.map(\.title), source.orderedSteps.map(\.title))
        XCTAssertEqual(Set(copy!.orderedSteps.map(\.id)).intersection(source.orderedSteps.map(\.id)), [],
                       "fresh step IDs keep the copy's progress separate from the original")
    }

    func testEditingACopyLeavesTheOriginalAlone() {
        let store = makeStore()
        let copy = store.duplicateRoutine(id: "firstthen", language: "en")!
        store.updateRoutine(id: copy.id, language: "en", title: "Homework", emoji: "📚", steps: copy.orderedSteps)

        XCTAssertEqual(store.routine(id: copy.id, language: "en")?.title, "Homework")
        XCTAssertEqual(store.routine(id: "firstthen", language: "en")?.title, "First, then")
    }

    // MARK: - Per-routine settings

    func testSettingsPersistPerRoutine() {
        let store = makeStore()
        store.setRoutineSettings(id: "mealtime", language: "en", dailyReset: true, allowSkip: true)
        let routine = store.routine(id: "mealtime", language: "en")
        XCTAssertEqual(routine?.dailyReset, true)
        XCTAssertEqual(routine?.allowSkip, true)
    }

    func testPinningIsExclusive() {
        let store = makeStore()
        store.setRoutineSettings(id: "morning", language: "en", isPinned: true)
        XCTAssertEqual(store.pinnedRoutine(language: "en")?.id, "morning")

        store.setRoutineSettings(id: "bedtime", language: "en", isPinned: true)
        XCTAssertEqual(store.pinnedRoutine(language: "en")?.id, "bedtime")
        XCTAssertEqual(store.allRoutines(language: "en").filter(\.isPinned).count, 1)
    }

    func testUnpinningLeavesNothingPinned() {
        let store = makeStore()
        store.setRoutineSettings(id: "morning", language: "en", isPinned: true)
        store.setRoutineSettings(id: "morning", language: "en", isPinned: false)
        XCTAssertNil(store.pinnedRoutine(language: "en"))
    }

    func testAHiddenRoutineIsNeverThePinnedOne() {
        let store = makeStore()
        store.setRoutineSettings(id: "morning", language: "en", isPinned: true)
        store.setHidden(true, routineID: "morning", language: "en")
        XCTAssertNil(store.pinnedRoutine(language: "en"), "a hidden routine must not hijack the launch")
    }

    func testPinningACustomRoutineWorks() {
        let store = makeStore()
        let created = store.addCustomRoutine(
            language: "en",
            title: "Swimming",
            emoji: "🏊",
            steps: [RoutineStep(id: "s1", title: "Swimsuit", emoji: "🩱", sortOrder: 0)]
        )!
        store.setRoutineSettings(id: created.id, language: "en", isPinned: true)
        XCTAssertEqual(store.pinnedRoutine(language: "en")?.id, created.id)
    }

    // MARK: - Reordering

    func testReorderingPersistsForBothDefaultsAndCustoms() {
        let store = makeStore()
        store.addCustomRoutine(
            language: "en",
            title: "Swimming",
            emoji: "🏊",
            steps: [RoutineStep(id: "s1", title: "Swimsuit", emoji: "🩱", sortOrder: 0)]
        )
        // Move the custom routine (last) to the front.
        let before = store.allRoutines(language: "en")
        store.moveRoutine(language: "en", fromOffsets: IndexSet(integer: before.count - 1), toOffset: 0)

        let after = store.allRoutines(language: "en")
        XCTAssertEqual(after.first?.title, "Swimming")
        XCTAssertEqual(after.map(\.sortOrder), Array(0..<after.count))
    }

    // MARK: - Persistence and scoping

    func testEditsSurviveARelaunch() {
        let first = makeStore()
        let bundled = first.routine(id: "morning", language: "en")!
        first.updateRoutine(id: "morning", language: "en", title: "Our morning", emoji: "🌞", steps: bundled.orderedSteps)
        first.setRoutineSettings(id: "morning", language: "en", allowSkip: true)

        let reopened = makeStore()
        XCTAssertEqual(reopened.routine(id: "morning", language: "en")?.title, "Our morning")
        XCTAssertEqual(reopened.routine(id: "morning", language: "en")?.allowSkip, true)
    }

    func testEditsAreScopedPerAccount() {
        let mine = makeStore(subject: "me")
        let bundled = mine.routine(id: "morning", language: "en")!
        mine.updateRoutine(id: "morning", language: "en", title: "Our morning", emoji: "🌞", steps: bundled.orderedSteps)

        let theirs = makeStore(subject: "someone-else")
        XCTAssertEqual(theirs.routine(id: "morning", language: "en")?.title, "Morning")
    }
}
