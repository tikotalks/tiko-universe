import SwiftUI
import TikoKit

/// The app, inside the shared Tiko chrome. The header, settings sheet and account
/// handling all come from `TikoAppShell`, so this looks and navigates like the rest
/// of the family rather than like a stock SwiftUI app.
struct ColoringHomeView: View {
    @State private var openPage: ColoringPage?

    var body: some View {
        TikoAppShell(
            appConfig: ColoringAppConfig.app,
            appName: ColoringAppConfig.app.title,
            // The shell turns the app icon into a back button when this is non-nil,
            // which is how every other Tiko app leaves a detail screen.
            onIconTap: openPage == nil ? nil : { openPage = nil },
            settingsContent: {
                ColoringSettingsContent()
            },
            content: {
                if let page = openPage {
                    ColoringView(page: page)
                        .id(page.id)
                } else {
                    ColoringLibraryView(onSelect: { openPage = $0 })
                }
            }
        )
    }
}

private struct ColoringSettingsContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Colouring")
                .font(.headline)
            Text("Tap a shape to fill it, or pick the brush to colour by hand. Staying inside the lines keeps every stroke within the shape you started in.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
