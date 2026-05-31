import SwiftUI

public struct TikoHeaderAction: Identifiable, Sendable {
    public let id: String
    public let label: String
    public let systemImage: String
    public let isActive: Bool

    public init(id: String, label: String, systemImage: String, isActive: Bool = false) {
        self.id = id
        self.label = label
        self.systemImage = systemImage
        self.isActive = isActive
    }
}

public struct TikoAppHeader: View {
    private let appName: String
    private let appIcon: String
    private let avatar: String
    private let appColor: TikoAppColor
    private let actions: [TikoHeaderAction]
    private let isSettingsActive: Bool
    private let onAction: (String) -> Void
    private let onSettings: () -> Void
    private let onAccount: () -> Void

    public init(
        appName: String,
        appIcon: String = "checkmark.circle",
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        actions: [TikoHeaderAction] = [],
        isSettingsActive: Bool = false,
        onAction: @escaping (String) -> Void = { _ in },
        onSettings: @escaping () -> Void = {},
        onAccount: @escaping () -> Void = {}
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.avatar = avatar
        self.appColor = appColor
        self.actions = actions
        self.isSettingsActive = isSettingsActive
        self.onAction = onAction
        self.onSettings = onSettings
        self.onAccount = onAccount
    }

    public var body: some View {
        HStack(spacing: 12) {
            Image(systemName: appIcon)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.white.opacity(0.28))
                .clipShape(Circle())

            Text(appName)
                .font(.system(.title3, design: .rounded).weight(.heavy))
                .foregroundStyle(.white)

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                ForEach(actions) { action in
                    headerButton(systemImage: action.systemImage, isActive: action.isActive) {
                        onAction(action.id)
                    }
                    .accessibilityLabel(action.label)
                }

                headerButton(systemImage: "gearshape.fill", isActive: isSettingsActive, action: onSettings)
                    .accessibilityLabel("Settings")

                Button(action: onAccount) {
                    Image(systemName: avatar)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 48, height: 48)
                        .background(.white.opacity(0.28))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Account")
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(appColor.palette.primary)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.12), radius: 0, x: 0, y: 4)
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }

    private func headerButton(systemImage: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(appColor.palette.dark.opacity(isActive ? 0.88 : 0.56))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

public struct TikoAppShell<Content: View, SettingsContent: View>: View {
    private let appName: String
    private let appIcon: String
    private let avatar: String
    private let appColor: TikoAppColor
    private let backgroundColor: Color
    private let actions: [TikoHeaderAction]
    private let onAction: (String) -> Void
    private let content: Content
    private let settingsContent: SettingsContent

    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""
    @State private var showingAccount = false
    @State private var showingSettings = false

    public init(
        appName: String,
        appIcon: String = "checkmark.circle",
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder settingsContent: () -> SettingsContent,
        @ViewBuilder content: () -> Content
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.avatar = avatar
        self.appColor = appColor
        self.backgroundColor = backgroundColor
        self.actions = actions.filter { $0.id != "settings" }
        self.onAction = onAction
        self.settingsContent = settingsContent()
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) {
            TikoAppHeader(
                appName: appName,
                appIcon: appIcon,
                avatar: avatar,
                appColor: appColor,
                actions: actions,
                isSettingsActive: showingSettings,
                onAction: onAction,
                onSettings: { showingSettings = true },
                onAccount: { showingAccount = true }
            )

            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(backgroundColor)
        .preferredColorScheme(selectedColorScheme)
        .tikoSettingsPopup(
            isPresented: $showingSettings,
            appColor: appColor,
            accountTitle: accountRowTitle,
            onOpenAccount: openAccountFromSettings
        ) {
            settingsContent
        }
        .tikoAccountPopup(isPresented: $showingAccount, appName: appName, appColor: appColor)
    }

    private var selectedColorScheme: ColorScheme {
        (TikoColorMode(rawValue: colorModeRawValue) ?? .light) == .dark ? .dark : .light
    }

    private var accountRowTitle: String {
        if !userEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "Account" }
        if !userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "Add recovery email" }
        return "Setup user"
    }

    private func openAccountFromSettings() {
        showingSettings = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            showingAccount = true
        }
    }
}

public extension TikoAppShell where SettingsContent == EmptyView {
    init(
        appName: String,
        appIcon: String = "checkmark.circle",
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            appName: appName,
            appIcon: appIcon,
            avatar: avatar,
            appColor: appColor,
            backgroundColor: backgroundColor,
            actions: actions,
            onAction: onAction,
            settingsContent: { EmptyView() },
            content: content
        )
    }
}
