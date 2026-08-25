import SwiftUI
import TikoKit

@main
struct TikoGlobeApp: App {
    init() {
        if CommandLine.arguments.contains("--uitest-reset") {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("tiko.globe.") {
                defaults.removeObject(forKey: key)
            }
        }

        TikoDeviceDefaults.register()
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
        TikoVoiceService.appName = "globe"
    }

    var body: some Scene {
        WindowGroup {
            GlobeView()
        }
    }
}
