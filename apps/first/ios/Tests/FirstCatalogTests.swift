import XCTest
@testable import TikoFirst

final class FirstCatalogTests: XCTestCase {
    func testEightBundledRoutines() {
        XCTAssertEqual(FirstCatalog.defaultRoutines.count, 8)
    }

    func testRoutineIDsAreUnique() {
        let ids = FirstCatalog.defaultRoutines.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testStepIDsAreUniqueAcrossAllRoutines() {
        let ids = FirstCatalog.defaultRoutines.flatMap { $0.steps.map(\.id) }
        XCTAssertEqual(Set(ids).count, ids.count, "step IDs key progress, so they must never collide")
    }

    func testEveryRoutineHasAtLeastTwoSteps() {
        for routine in FirstCatalog.defaultRoutines {
            XCTAssertGreaterThanOrEqual(routine.steps.count, 2, "\(routine.id) needs at least a first and a then")
            XCTAssertLessThanOrEqual(routine.steps.count, 8, "\(routine.id) is too long for one screenful of strip")
        }
    }

    func testMorningAndBedtimeResetDaily() {
        let daily = FirstCatalog.defaultRoutines.filter(\.dailyReset).map(\.id)
        XCTAssertEqual(Set(daily), ["morning", "bedtime"])
    }

    func testEveryRoutineTitleIsLocalizedInEverySupportedLanguage() {
        for routine in FirstCatalog.defaultRoutines {
            for language in FirstCatalog.supportedLanguages {
                let title = FirstCatalog.routineTitle(routine.id, language: language)
                XCTAssertFalse(title.isEmpty, "\(routine.id) has no \(language) title")
                XCTAssertNotEqual(title, routine.id, "\(routine.id) is missing a \(language) title")
            }
        }
    }

    func testEveryStepTitleIsLocalizedInEverySupportedLanguage() {
        for routine in FirstCatalog.defaultRoutines {
            for step in routine.steps {
                for language in FirstCatalog.supportedLanguages {
                    let title = FirstCatalog.stepTitle(step.id, language: language)
                    XCTAssertFalse(title.isEmpty, "\(step.id) has no \(language) title")
                    XCTAssertNotEqual(title, step.id, "\(step.id) is missing a \(language) title")
                }
            }
        }
    }

    func testUnknownLanguageFallsBackToEnglish() {
        XCTAssertEqual(
            FirstCatalog.routineTitle("morning", language: "pt"),
            FirstCatalog.routineTitle("morning", language: "en")
        )
    }

    func testRegionalLanguageCodeResolves() {
        XCTAssertEqual(
            FirstCatalog.routineTitle("morning", language: "nl-BE"),
            FirstCatalog.routineTitle("morning", language: "nl")
        )
    }

    func testResolvedRoutineCarriesStepsInOrderWithSpeakTextDefaultingToTitle() {
        let definition = FirstCatalog.defaultRoutines.first { $0.id == "morning" }!
        let routine = FirstCatalog.routine(definition, language: "nl")

        XCTAssertEqual(routine.title, "Ochtend")
        XCTAssertEqual(routine.orderedSteps.map(\.sortOrder), Array(0..<definition.steps.count))
        XCTAssertEqual(routine.orderedSteps.first?.title, "Wakker worden")
        for step in routine.steps {
            XCTAssertEqual(step.spoken, step.title, "a bundled step says exactly what it shows")
        }
        XCTAssertFalse(routine.isCustom)
        XCTAssertFalse(routine.isHidden)
        XCTAssertFalse(routine.allowSkip, "skipping is off until a parent turns it on")
        XCTAssertFalse(routine.isPinned)
    }

    func testEveryStepHasAnEmojiFallback() {
        for routine in FirstCatalog.defaultRoutines {
            XCTAssertFalse(routine.emoji.isEmpty, "\(routine.id) needs an emoji fallback")
            for step in routine.steps {
                XCTAssertFalse(step.emoji.isEmpty, "\(step.id) needs an emoji fallback")
            }
        }
    }

    func testMediaMatchKeysCoverRoutinesAndSteps() {
        let keys = FirstCatalog.mediaMatchKeys
        XCTAssertFalse(keys.isEmpty)
        // Every entry points at a real routine or step ID.
        let knownIDs = Set(
            FirstCatalog.defaultRoutines.map(\.id)
                + FirstCatalog.defaultRoutines.flatMap { $0.steps.map(\.id) }
        )
        for key in keys {
            XCTAssertTrue(knownIDs.contains(key.id), "\(key.id) is not a routine or step")
            XCTAssertFalse(key.matchKey.isEmpty)
        }
        // And no ID is resolved twice.
        let ids = keys.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testFirstThenTemplateIsTwoSteps() {
        let template = FirstCatalog.defaultRoutines.first { $0.id == "firstthen" }
        XCTAssertEqual(template?.steps.count, 2)
    }
}
