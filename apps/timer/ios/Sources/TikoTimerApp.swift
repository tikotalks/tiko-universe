import SwiftUI
import TikoKit

@main
struct TikoTimerApp: App {
    init() {
        if CommandLine.arguments.contains("--uitest-reset") {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("timer.") {
                defaults.removeObject(forKey: key)
            }
            // Child Mode is shell-level, so its key sits outside the app prefix;
            // a test that locks the app would otherwise leak into the next one.
            TikoParentGate.clearLocalPin()
        }

        TikoDeviceDefaults.register()
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
    }

    var body: some Scene {
        WindowGroup {
            TimerView()
        }
    }
}
