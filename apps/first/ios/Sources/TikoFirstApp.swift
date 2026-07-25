import SwiftUI
import TikoKit

@main
struct TikoFirstApp: App {
    init() {
        if CommandLine.arguments.contains("--uitest-reset") {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("tiko.first.") {
                defaults.removeObject(forKey: key)
            }
        }

        // Screenshot captures must be deterministic: a routine that a previous
        // scene finished would otherwise open on its completion screen.
        if TikoScreenshotMode.isActive {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("tiko.first.ios.progress.") {
                defaults.removeObject(forKey: key)
            }
        }

        TikoDeviceDefaults.register()
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
        TikoVoiceService.appName = "first"
    }

    var body: some Scene {
        WindowGroup {
            FirstView()
        }
    }
}
