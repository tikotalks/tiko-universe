import SwiftUI
import TikoKit

@main
struct TikoRadioApp: App {
    init() {
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
    }

    var body: some Scene {
        WindowGroup {
            RadioView()
        }
    }
}
