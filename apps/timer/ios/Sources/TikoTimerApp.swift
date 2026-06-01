import SwiftUI
import TikoKit

@main
struct TikoTimerApp: App {
    init() {
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
    }

    var body: some Scene {
        WindowGroup {
            TimerView()
        }
    }
}
