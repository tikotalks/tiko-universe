import XCTest
@testable import TikoKit

final class TikoVersionTests: XCTestCase {
    func testComparesByNumberNotByString() {
        XCTAssertTrue(TikoVersion.isNewer("1.10", than: "1.9"), "1.10 comes after 1.9")
        XCTAssertFalse(TikoVersion.isNewer("1.9", than: "1.10"))
    }

    func testMissingComponentsCountAsZero() {
        XCTAssertTrue(TikoVersion.isNewer("1.1", than: "1"))
        XCTAssertFalse(TikoVersion.isNewer("1.0", than: "1"))
        XCTAssertFalse(TikoVersion.isNewer("1", than: "1.0.0"))
    }

    func testSameVersionIsNotAnUpdate() {
        XCTAssertFalse(TikoVersion.isNewer("2.3.1", than: "2.3.1"))
    }
}

private struct StubLookup: TikoReleaseLookup {
    let release: TikoStoreRelease?
    let failure: Bool

    init(release: TikoStoreRelease?, failure: Bool = false) {
        self.release = release
        self.failure = failure
    }

    func latestRelease(bundleID: String) async throws -> TikoStoreRelease? {
        if failure { throw URLError(.notConnectedToInternet) }
        return release
    }
}

@MainActor
final class TikoUpdateNoticeTests: XCTestCase {
    private func notice(
        current: String,
        store: TikoKeyValueStore,
        lookup: TikoReleaseLookup,
        now: @escaping @Sendable () -> Date = { Date() }
    ) -> TikoUpdateNotice {
        TikoUpdateNotice(
            bundleID: "mt.tiko.test",
            currentVersion: current,
            lookup: lookup,
            store: store,
            now: now
        )
    }

    func testANewerStoreVersionIsReported() async {
        let subject = notice(
            current: "1.0",
            store: TikoInMemoryStore(),
            lookup: StubLookup(release: TikoStoreRelease(version: "1.1", storeURL: nil))
        )

        await subject.checkIfDue()
        XCTAssertEqual(subject.release?.version, "1.1")
    }

    func testTheSameVersionIsNotReported() async {
        let subject = notice(
            current: "1.1",
            store: TikoInMemoryStore(),
            lookup: StubLookup(release: TikoStoreRelease(version: "1.1", storeURL: nil))
        )

        await subject.checkIfDue()
        XCTAssertNil(subject.release)
    }

    func testBeingOfflineIsSilent() async {
        let subject = notice(
            current: "1.0",
            store: TikoInMemoryStore(),
            lookup: StubLookup(release: nil, failure: true)
        )

        await subject.checkIfDue()
        XCTAssertNil(subject.release, "a failed check must not surface anything")
    }

    func testItOnlyAsksOncePerInterval() async {
        let store = TikoInMemoryStore()
        let stamp = Date()

        let first = notice(
            current: "1.0",
            store: store,
            lookup: StubLookup(release: TikoStoreRelease(version: "1.1", storeURL: nil)),
            now: { stamp }
        )
        await first.checkIfDue()
        XCTAssertNotNil(first.release)

        // An hour later the answer is cached, so a lookup that would report an
        // even newer build is not consulted.
        let second = notice(
            current: "1.0",
            store: store,
            lookup: StubLookup(release: TikoStoreRelease(version: "9.9", storeURL: nil)),
            now: { stamp.addingTimeInterval(3_600) }
        )
        await second.checkIfDue()
        XCTAssertNil(second.release, "within the interval it should not have asked again")

        // A day later it asks again.
        let third = notice(
            current: "1.0",
            store: store,
            lookup: StubLookup(release: TikoStoreRelease(version: "9.9", storeURL: nil)),
            now: { stamp.addingTimeInterval(60 * 60 * 25) }
        )
        await third.checkIfDue()
        XCTAssertEqual(third.release?.version, "9.9")
    }
}

@MainActor
final class TikoUpdateDismissalTests: XCTestCase {
    private func notice(current: String, store: TikoKeyValueStore, offering version: String) -> TikoUpdateNotice {
        TikoUpdateNotice(
            bundleID: "mt.tiko.test",
            currentVersion: current,
            lookup: StubLookup(release: TikoStoreRelease(version: version, storeURL: nil)),
            store: store,
            interval: 0
        )
    }

    func testWavingItAwayKeepsThatVersionQuiet() async {
        let store = TikoInMemoryStore()

        let first = notice(current: "1.0", store: store, offering: "1.1")
        await first.checkIfDue()
        XCTAssertNotNil(first.release)
        first.dismiss()
        XCTAssertNil(first.release, "dismissing clears it straight away")

        let again = notice(current: "1.0", store: store, offering: "1.1")
        await again.checkIfDue()
        XCTAssertNil(again.release, "the same version should not come back")
    }

    func testAVersionNewerThanTheDismissedOneStillShows() async {
        let store = TikoInMemoryStore()

        let first = notice(current: "1.0", store: store, offering: "1.1")
        await first.checkIfDue()
        first.dismiss()

        let later = notice(current: "1.0", store: store, offering: "1.2")
        await later.checkIfDue()
        XCTAssertEqual(later.release?.version, "1.2", "a newer release than the dismissed one still counts")
    }
}
