import XCTest
@testable import TikoKit

private final class MemoryIdentityStore: TikoIdentityStorage, @unchecked Sendable {
    var bundle: TikoIdentityBundle?

    func load() throws -> TikoIdentityBundle? {
        bundle
    }

    func save(_ bundle: TikoIdentityBundle) throws {
        self.bundle = bundle
    }

    func clearSessionKeepingDevice() throws {
        guard let bundle else { return }
        self.bundle = TikoIdentityBundle(
            subject: bundle.subject,
            device: bundle.device,
            account: bundle.account,
            session: nil,
            runtime: bundle.runtime,
            capabilities: bundle.capabilities,
            roles: bundle.roles
        )
    }

    func clearAll() throws {
        bundle = nil
    }
}

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
        XCTAssertNotEqual(TikoAppConfig.talk.themeColorHex, 0x000000)
        XCTAssertFalse(TikoAppConfig.talk.appIconImageUrl?.isEmpty ?? true)
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

    @MainActor
    func testI18nPublishesBundleRevision() {
        let previousBaseURL = TikoI18n.translationsBaseURL
        TikoI18n.translationsBaseURL = nil
        defer { TikoI18n.translationsBaseURL = previousBaseURL }

        let i18n = TikoI18n(app: .yesNo, languageCode: "hy")
        let initialRevision = i18n.revision

        XCTAssertEqual(i18n.t("yesNo.answers.yes"), "Yes")

        i18n.addBundle(languageCode: "hy", translations: ["yesNo.answers.yes": "Runtime yes"])

        XCTAssertEqual(i18n.revision, initialRevision + 1)
        XCTAssertEqual(i18n.t("yesNo.answers.yes"), "Runtime yes")
    }

    @MainActor
    func testI18nHasMalteseFallbacksForCurrentAppKeys() {
        let previousBaseURL = TikoI18n.translationsBaseURL
        TikoI18n.translationsBaseURL = nil
        defer { TikoI18n.translationsBaseURL = previousBaseURL }

        let cases: [(TikoAppKey, String, String)] = [
            (.type, "type.compose.placeholder", "Type what you want to say"),
            (.timer, "timer.controls.start", "Start"),
            (.radio, "radio.collections.title", "Collections"),
            (.cards, "cards.settings.collections", "Collections"),
            (.sequence, "sequence.empty.title", "No sequences yet"),
            (.todo, "todo.empty.title", "No items yet"),
        ]

        for (app, key, english) in cases {
            let i18n = TikoI18n(app: app, languageCode: "mt")
            XCTAssertNotEqual(i18n.t(key), english)
            XCTAssertNotEqual(i18n.t(key), key)
        }
    }

    func testSpeechLanguageMappingUsesAppLanguageCodes() {
        XCTAssertEqual(TikoSpeech.languageCode(for: "en"), "en-US")
        XCTAssertEqual(TikoSpeech.languageCode(for: "nl"), "nl-NL")
        XCTAssertEqual(TikoSpeech.languageCode(for: "mt"), "mt-MT")
        XCTAssertEqual(TikoSpeech.languageCode(for: "pt-BR"), "pt-BR")
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
        let primary = MemoryIdentityStore()
        let store = TikoDeviceSessionStore(primary: primary)
        let bundle = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-1", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-1", secret: "device-secret"),
            account: nil,
            session: TikoIdentitySession(id: "session-1", token: "access", transport: "bearer", expiresAt: "2030-01-01T00:00:00.000Z")
        )

        try store.save(bundle)
        XCTAssertEqual(try store.load(), bundle)
        XCTAssertEqual(primary.bundle, bundle)

        try store.clearSessionKeepingDevice()
        let retained = try XCTUnwrap(try store.load())
        XCTAssertEqual(retained.subject, bundle.subject)
        XCTAssertEqual(retained.device, bundle.device)
        XCTAssertNil(retained.session)

        try store.clearAll()
        XCTAssertNil(try store.load())
        XCTAssertNil(primary.bundle)
    }

    func testDeviceSessionStoreMigratesLegacyUserDefaultsBundle() throws {
        let suiteName = "TikoKitTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let primary = MemoryIdentityStore()
        let legacy = TikoUserDefaultsIdentityStore(defaults: defaults, namespace: "org.tiko.identity")
        let store = TikoDeviceSessionStore(primary: primary, legacy: legacy)
        let bundle = TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "sub-legacy", kind: "anonymous", product: "tiko"),
            device: TikoIdentityDevice(id: "device-legacy", secret: "device-secret"),
            account: nil,
            session: TikoIdentitySession(id: "session-legacy", token: "access", transport: "bearer", expiresAt: "2030-01-01T00:00:00.000Z")
        )

        try legacy.save(bundle)

        XCTAssertEqual(try store.load(), bundle)
        XCTAssertEqual(primary.bundle, bundle)
        XCTAssertNil(try legacy.load())
    }

    func testSharedNativeIdentityStoreUsesStableAppFamilyNamespace() {
        XCTAssertEqual(TikoDeviceSessionStore.sharedNamespace, "org.tiko.identity")
        XCTAssertEqual(TikoDeviceSessionStore.sharedKeychainAccessGroup(teamId: "38MGF83L2L"), "38MGF83L2L.org.tiko.identity")
    }
}
