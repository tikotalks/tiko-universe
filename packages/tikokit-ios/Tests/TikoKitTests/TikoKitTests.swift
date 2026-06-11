import XCTest
@testable import TikoKit

final class TikoKitTests: XCTestCase {
    func testAppColorsHaveUniqueRawValues() {
        let rawValues = TikoAppColor.allCases.map(\.rawValue)

        XCTAssertEqual(Set(rawValues).count, rawValues.count)
        XCTAssertEqual(TikoAppColor.yesNo.palette.label, "Yes No")
        XCTAssertTrue(TikoAppColor.allCases.contains(.talk))
        XCTAssertEqual(TikoAppColor.talk.rawValue, "talk")
        XCTAssertEqual(TikoAppColor.talk.palette.label, "Talk")
        XCTAssertEqual(TikoAppConfig.talk.id, .talk)
        XCTAssertEqual(TikoAppConfig.talk.title, "Talk")
        XCTAssertEqual(TikoAppConfig.talk.themeColorHex, 0x2f80ed)
    }

    func testAnswerChoiceWithOpenIcon() {
        let choice = TikoAnswerChoice(id: "yes", label: "Yes", icon: .openIcon("ui/check-fat"), tone: .primary)

        XCTAssertEqual(choice.id, "yes")
        XCTAssertEqual(choice.label, "Yes")
        XCTAssertEqual(choice.icon, .openIcon("ui/check-fat"))
        XCTAssertEqual(choice.tone, .primary)
    }

    func testAnswerChoiceOpenIconConvenience() {
        let choice = TikoAnswerChoice(id: "no", label: "No", symbol: "wayfinding/cross", tone: .secondary)

        XCTAssertEqual(choice.id, "no")
        XCTAssertEqual(choice.icon, .openIcon("wayfinding/cross"))
        XCTAssertEqual(choice.tone, .secondary)
    }

    func testIconEquality() {
        XCTAssertEqual(TikoAnswerChoice.Icon.openIcon("ui/check-fat"), .openIcon("ui/check-fat"))
        XCTAssertNotEqual(TikoAnswerChoice.Icon.openIcon("ui/check-fat"), .openIcon("wayfinding/cross"))
    }

    func testColorModeIsExplicitLightDarkOnly() {
        XCTAssertEqual(TikoColorMode.allCases, [.light, .dark])
        XCTAssertEqual(TikoColorMode.light.title, "Light")
        XCTAssertEqual(TikoColorMode.dark.title, "Dark")
    }

    func testChoiceStylesExposeSettingsLabels() {
        XCTAssertEqual(TikoChoiceStyle.allCases, [.tiles, .buttons, .compact])
        XCTAssertEqual(TikoChoiceStyle.tiles.title, "Tiles")
        XCTAssertEqual(TikoChoiceStyle.buttons.icon, "rectangle.roundedtop.fill")
        XCTAssertEqual(TikoChoiceStyle.compact.rawValue, "compact")
    }

    func testRecoverableIdentityRequiresVerifiedAccount() {
        let deviceOnly = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-device", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-1"),
            account: nil,
            session: TikoIdentitySession(id: "session-1", token: "token", transport: "bearer", expiresAt: "2030-01-01T00:00:00.000Z")
        )
        let unverified = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-email", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-1"),
            account: TikoIdentityAccount(id: "account-1", subjectId: "sub-email", emailVerified: false, email: "sil@example.com"),
            session: nil
        )
        let recoverable = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-recoverable", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-1"),
            account: TikoIdentityAccount(id: "account-2", subjectId: "sub-recoverable", emailVerified: true, email: "sil@example.com"),
            session: nil
        )

        XCTAssertFalse(deviceOnly.isRecoverable)
        XCTAssertFalse(unverified.isRecoverable)
        XCTAssertTrue(recoverable.isRecoverable)
        XCTAssertEqual(TikoIdentityState.from(bundle: recoverable), .recoverableUser(recoverable))
    }

    func testDeviceSessionStoreRoundTripsSharedIdentityBundle() throws {
        let suiteName = "TikoKitTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = TikoDeviceSessionStore(defaults: defaults, namespace: "org.tiko.identity")
        let bundle = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-1", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-1", secret: "device-secret"),
            account: nil,
            session: TikoIdentitySession(id: "session-1", token: "access", transport: "bearer", expiresAt: "2030-01-01T00:00:00.000Z")
        )

        try store.save(bundle)
        XCTAssertEqual(try store.load(), bundle)

        try store.clearSessionKeepingDevice()
        let retained = try XCTUnwrap(try store.load())
        XCTAssertEqual(retained.subject, bundle.subject)
        XCTAssertEqual(retained.device, bundle.device)
        XCTAssertNil(retained.session)

        try store.clearAll()
        XCTAssertNil(try store.load())
    }

    func testSharedNativeIdentityStoreUsesStableAppFamilyNamespace() {
        XCTAssertEqual(TikoDeviceSessionStore.sharedNamespace, "org.tiko.identity")
        XCTAssertEqual(TikoDeviceSessionStore.sharedKeychainAccessGroup(teamId: "38MGF83L2L"), "38MGF83L2L.org.tiko.identity")
    }
}
