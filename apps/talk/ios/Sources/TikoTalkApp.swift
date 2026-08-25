import SwiftUI
import TikoKit

@main
struct TikoTalkApp: App {
    init() {
        if CommandLine.arguments.contains("--uitest-reset") {
            let defaults = UserDefaults.standard
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("talk.") {
                defaults.removeObject(forKey: key)
            }
            // Child Mode is shell-level, so its key sits outside the app prefix;
            // a test that locks the app would otherwise leak into the next one.
            TikoParentGate.clearLocalPin()
        }

        TikoDeviceDefaults.register()
        // Debug builds talk to the dev backends end-to-end (identity, translations
        // and — via TalkAPIClient — the sentence worker), so a dev session token
        // validates against the dev sentence worker. Release builds use prod.
        #if DEBUG
        TikoI18n.translationsBaseURL = "https://tiko-translations-api-dev.silvandiepen.workers.dev"
        TikoIdentityClient.identityBaseURL = "https://tiko-identity-api-dev.silvandiepen.workers.dev/v1"
        #else
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
        #endif
        TikoVoiceService.appName = "talk"
    }

    var body: some Scene {
        WindowGroup {
            TalkView()
        }
    }
}
