import SwiftUI
import TikoKit

@main
struct TikoSayApp: App {
    init() {
        // UI-test isolation: with `--uitest-reset` on the launch arguments, wipe
        // this app's persisted state so every UI test starts from a clean,
        // deterministic slate. Guarded by the launch argument, so it never
        // affects normal runs.
        if CommandLine.arguments.contains("--uitest-reset") {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("tiko.say.ios.") {
                defaults.removeObject(forKey: key)
            }
            // Child Mode is shell-level, so its key sits outside the app prefix;
            // a test that locks the app would otherwise leak into the next one.
            TikoParentGate.clearLocalPin()
        }

        TikoDeviceDefaults.register()
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
        TikoVoiceService.appName = "say"
    }

    var body: some Scene {
        WindowGroup {
            SayView()
        }
    }
}
