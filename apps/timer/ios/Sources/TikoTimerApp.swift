import SwiftUI
import TikoKit

@main
struct TikoTimerApp: App {
    init() {
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://api.tikotalks.com/v1"
    }

    var body: some Scene {
        WindowGroup {
            TimerView()
        }
    }
}
