import SwiftUI
import TikoKit

@main
struct TikoTypeApp: App {
    init() {
        TikoDeviceDefaults.register()
        TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"
        TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
    }

    var body: some Scene {
        WindowGroup {
            TypeView()
        }
    }
}
