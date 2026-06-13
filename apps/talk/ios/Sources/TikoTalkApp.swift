import SwiftUI
import TikoKit

@main
struct TikoTalkApp: App {
    init() {
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
    }

    var body: some Scene {
        WindowGroup {
            TalkView()
        }
    }
}
