import XCTest
@testable import TikoKit

final class TikoKitTests: XCTestCase {
    func testAppColorsHaveUniqueRawValues() {
        let rawValues = TikoAppColor.allCases.map(\.rawValue)

        XCTAssertEqual(Set(rawValues).count, rawValues.count)
        XCTAssertEqual(TikoAppColor.yesNo.palette.label, "Yes No")
    }

    func testAnswerChoiceWithSystemName() {
        let choice = TikoAnswerChoice(id: "yes", label: "Yes", icon: .systemName("checkmark"), tone: .primary)

        XCTAssertEqual(choice.id, "yes")
        XCTAssertEqual(choice.label, "Yes")
        XCTAssertEqual(choice.icon, .systemName("checkmark"))
        XCTAssertEqual(choice.tone, .primary)
    }

    func testAnswerChoiceBackwardCompatSymbol() {
        let choice = TikoAnswerChoice(id: "no", label: "No", symbol: "xmark", tone: .secondary)

        XCTAssertEqual(choice.id, "no")
        XCTAssertEqual(choice.icon, .text("xmark"))
        XCTAssertEqual(choice.tone, .secondary)
    }

    func testIconEquality() {
        XCTAssertEqual(TikoAnswerChoice.Icon.systemName("checkmark"), .systemName("checkmark"))
        XCTAssertNotEqual(TikoAnswerChoice.Icon.systemName("checkmark"), .systemName("xmark"))
        XCTAssertEqual(TikoAnswerChoice.Icon.text("A"), .text("A"))
        XCTAssertNotEqual(TikoAnswerChoice.Icon.systemName("A"), .text("A"))
    }

    func testColorModeIsExplicitLightDarkOnly() {
        XCTAssertEqual(TikoColorMode.allCases, [.light, .dark])
        XCTAssertEqual(TikoColorMode.light.title, "Light")
        XCTAssertEqual(TikoColorMode.dark.title, "Dark")
    }

    func testRecoverableUserRequiresVerifiedEmail() {
        let deviceOnly = TikoUser(id: "user-device")
        let unverifiedEmail = TikoUser(id: "user-email", email: "sil@example.com", emailVerified: false)
        let recoverable = TikoUser(id: "user-recoverable", email: "sil@example.com", emailVerified: true)

        XCTAssertFalse(deviceOnly.isRecoverable)
        XCTAssertFalse(unverifiedEmail.isRecoverable)
        XCTAssertTrue(recoverable.isRecoverable)
        XCTAssertEqual(TikoIdentityState.from(user: recoverable), .recoverableUser(recoverable))
    }

    func testDeviceSessionStoreRoundTripsSession() {
        let suiteName = "TikoKitTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = TikoDeviceSessionStore(defaults: defaults, namespace: "test")
        let session = TikoIdentitySession(
            user: TikoUser(id: "user-1", displayName: "Sil"),
            device: TikoIdentityDevice(id: "device-1"),
            session: TikoIdentitySessionTokens(accessToken: "access", refreshToken: "refresh")
        )

        store.save(session)
        XCTAssertEqual(store.load(), session)

        store.clear()
        XCTAssertNil(store.load())
    }
}
