import SwiftUI
import TikoKit

@main
struct TikoTypeApp: App {
    init() {
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
    }

    var body: some Scene {
        WindowGroup {
            TypeView()
        }
    }
}
