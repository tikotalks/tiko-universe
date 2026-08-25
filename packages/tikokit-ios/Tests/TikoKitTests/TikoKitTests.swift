import SwiftUI
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

        XCTAssertTrue(TikoAppColor.allCases.contains(.say))
        XCTAssertEqual(TikoAppColor.say.rawValue, "say")
        XCTAssertEqual(TikoAppColor.say.palette.label, "Say")
        XCTAssertEqual(TikoAppConfig.say.id, .say)
        XCTAssertEqual(TikoAppConfig.say.title, "Say")
        XCTAssertEqual(TikoAppConfig.say.themeColorHex, 0x8b5cf6)

        XCTAssertTrue(TikoAppColor.allCases.contains(.sum))
        XCTAssertEqual(TikoAppColor.sum.rawValue, "sum")
        XCTAssertEqual(TikoAppColor.sum.palette.label, "Sum")
        XCTAssertEqual(TikoAppConfig.sum.id, .sum)
        XCTAssertEqual(TikoAppConfig.sum.themeColorHex, 0xdd8966)
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

    func testOpenIconsUseNativeSymbols() throws {
        XCTAssertGreaterThanOrEqual(TikoOpenIcons.all.count, 60)
        XCTAssertEqual(TikoOpenIcons.systemSymbol(named: "ui/check-fat"), "checkmark")
        XCTAssertEqual(TikoOpenIcons.systemSymbol(named: "food-drinks/hamburger"), "fork.knife")
        XCTAssertEqual(TikoOpenIcons.systemSymbol(named: "unknown/icon"), "questionmark")

        let sourceURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Sources/TikoKit/TikoOpenIcon.swift")
        let source = try String(contentsOf: sourceURL)
        XCTAssertFalse(source.contains("import WebKit"))
        XCTAssertFalse(source.contains("WKWebView"))
        XCTAssertFalse(source.contains("loadHTMLString"))
    }

    /// The user picks the backgrounds; the text colour is derived. These
    /// assert that no pair of choices can produce unreadable text — including
    /// picking a pale colour for "dark".
    func testForegroundIsDerivedFromWhateverBackgroundIsChosen() {
        XCTAssertEqual(Color(hex: 0xffffff).tikoForeground, Color(hex: 0x17131c))
        XCTAssertEqual(Color(hex: 0x000000).tikoForeground, Color(hex: 0xf6f4ef))
        // A pale "dark" surface flips the text dark rather than leaving it light.
        XCTAssertEqual(Color(hex: 0xf2f2f2).tikoForeground, Color(hex: 0x17131c))
    }

    func testSurfacesFallBackThroughUserThenAppThenDefault() {
        let appLight = Color(hex: 0x112233)
        let appDark = Color(hex: 0x445566)

        // Nothing chosen: the app's own values stand.
        let untouched = TikoSurfaceResolver.surfaces(lightHex: "", darkHex: "", appLight: appLight, appDark: appDark)
        XCTAssertEqual(untouched.light, appLight)
        XCTAssertEqual(untouched.dark, appDark)

        // Chosen: the user wins.
        let chosen = TikoSurfaceResolver.surfaces(lightHex: "#fffdf7", darkHex: "#101014", appLight: appLight, appDark: appDark)
        XCTAssertEqual(chosen.light, Color(hex: 0xfffdf7))
        XCTAssertEqual(chosen.dark, Color(hex: 0x101014))

        // Garbage in storage must not blank the screen.
        let broken = TikoSurfaceResolver.surfaces(lightHex: "nope", darkHex: "#zz", appLight: appLight, appDark: appDark)
        XCTAssertEqual(broken.light, appLight)
        XCTAssertEqual(broken.dark, appDark)
    }

    func testHexRoundTripsSoAColorPickerChoiceSurvivesRelaunch() {
        XCTAssertEqual(Color(hex: 0xf8f6f1).tikoHexString, "#f8f6f1")
        XCTAssertEqual(Color(hex: 0x140e18).tikoHexString, "#140e18")
        let picked = Color(hex: 0x3a7bd5)
        XCTAssertEqual(Color(hexString: picked.tikoHexString), picked)
    }

    func testColorModeIsExplicitLightDarkOnly() {
        XCTAssertEqual(TikoColorMode.allCases, [.system, .light, .dark])
        XCTAssertEqual(TikoColorMode.light.title, "Light")
        XCTAssertEqual(TikoColorMode.dark.title, "Dark")
    }

    func testChoiceStylesExposeSettingsLabels() {
        XCTAssertEqual(TikoChoiceStyle.allCases, [.tiles, .buttons, .compact, .textTile])
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
        XCTAssertEqual(TikoSpeech.languageCode(for: "hy"), "hy-AM")
        XCTAssertEqual(TikoSpeech.languageCode(for: "pt-BR"), "pt-BR")
    }

    /// Every language Tiko offers in its picker must have a speech locale.
    /// Without this a language can be added to the picker and quietly speak
    /// English, which is exactly what happened to Armenian.
    func testEveryOfferedLanguageHasASpeechLocale() {
        let offered = Set(TikoLanguage.supportedLanguageCodes)
        let mapped = Set(TikoSpeechLanguage.allCases.map(\.rawValue))
        XCTAssertEqual(offered, mapped, "TikoSpeechLanguage and the language picker have drifted apart")

        for code in TikoLanguage.supportedLanguageCodes {
            let locale = TikoSpeech.languageCode(for: code)
            XCTAssertTrue(locale.hasPrefix("\(code)-"), "\(code) resolved to \(locale)")
        }
    }

    /// An unmapped language must be passed through as itself. Inventing a
    /// locale is how Armenian text ended up at an American English voice.
    func testUnmappedLanguageIsNotRewrittenToEnglish() {
        XCTAssertEqual(TikoSpeech.languageCode(for: "sw"), "sw")
        XCTAssertEqual(TikoSpeech.languageCode(for: "xx"), "xx")
        XCTAssertNotEqual(TikoSpeech.languageCode(for: "sw"), "en-US")
    }

    /// Apple has never shipped a Maltese or Armenian voice, so the synthesizer
    /// must report that it cannot speak them rather than reading the text in
    /// whatever voice it defaults to.
    func testMalteseAndArmenianHaveNoSystemVoice() {
        XCTAssertFalse(TikoSpeech.hasSystemVoice(for: "mt"))
        XCTAssertFalse(TikoSpeech.hasSystemVoice(for: "hy"))
        XCTAssertTrue(TikoSpeech.hasSystemVoice(for: "en"))
    }

    /// Arabic is published as `ar-001` on iOS 26 and was `ar-SA` before, so
    /// the voice lookup has to try both instead of trusting one tag.
    func testArabicResolvesAcrossAppleRegionalRenames() {
        XCTAssertEqual(TikoSpeechLanguage.ar.localeCandidates, ["ar-001", "ar-SA"])
        XCTAssertTrue(TikoSpeech.hasSystemVoice(for: "ar"))
    }

    @MainActor
    func testVoiceServiceIgnoresBlankSpeech() async {
        let voice = TikoVoiceService()

        await voice.speak("   ", languageCode: "en")
        voice.stop()
    }

    @MainActor
    func testAtlasSpeechRequestUsesBearerSessionToken() throws {
        let request = try TikoVoiceService.makeAtlasSpeechRequest(
            text: "Hello",
            locale: "en-US",
            app: "test",
            atlasSpeechURL: URL(string: "https://api.tikotalks.com/v1/atlas/speech")!,
            accessToken: "session-token"
        )

        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer session-token")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")

        let body = try XCTUnwrap(request.httpBody)
        let decoded = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: Any])
        // The Atlas capability registry only allows this purpose; anything
        // else is a 403 that silently degrades the app to the device voice.
        XCTAssertEqual(decoded["purpose"] as? String, "speech-playback")
        XCTAssertEqual(decoded["locale"] as? String, "en-US")
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
