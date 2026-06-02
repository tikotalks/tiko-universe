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
    private let appIconURL: URL?
    private let onIconTap: (() -> Void)?
    private let avatar: String
    private let avatarURL: URL?
    private let appColor: TikoAppColor
    private let actions: [TikoHeaderAction]
    private let isSettingsActive: Bool
    private let onAction: (String) -> Void
    private let onSettings: () -> Void
    private let onAccount: () -> Void

    public init(
        appName: String,
        appIcon: String = "checkmark.circle",
        appIconURL: URL? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        avatarURL: URL? = nil,
        appColor: TikoAppColor,
        actions: [TikoHeaderAction] = [],
        isSettingsActive: Bool = false,
        onAction: @escaping (String) -> Void = { _ in },
        onSettings: @escaping () -> Void = {},
        onAccount: @escaping () -> Void = {}
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.appIconURL = appIconURL
        self.onIconTap = onIconTap
        self.avatar = avatar
        self.avatarURL = avatarURL
        self.appColor = appColor
        self.actions = actions
        self.isSettingsActive = isSettingsActive
        self.onAction = onAction
        self.onSettings = onSettings
        self.onAccount = onAccount
    }

    @ViewBuilder
    private var appIconContent: some View {
        if onIconTap != nil {
            Image(systemName: "chevron.left")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.white.opacity(0.28))
                .clipShape(Circle())
        } else if let appIconURL {
            AsyncImage(url: appIconURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: appIcon)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 48, height: 48)
            .background(.white.opacity(0.28))
            .clipShape(Circle())
        } else {
            Image(systemName: appIcon)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.white.opacity(0.28))
                .clipShape(Circle())
        }
    }

    @ViewBuilder
    private var avatarContent: some View {
        if let avatarURL {
            AsyncImage(url: avatarURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: avatar)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 48, height: 48)
            .background(.white.opacity(0.28))
            .clipShape(Circle())
        } else {
            Image(systemName: avatar)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.white.opacity(0.28))
                .clipShape(Circle())
        }
    }

    public var body: some View {
        HStack(spacing: 12) {
            if let onIconTap {
                Button(action: onIconTap) {
                    appIconContent
                }
                .buttonStyle(.plain)
            } else {
                appIconContent
            }

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
                    avatarContent
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Account")
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(appColor.palette.primary)
        .clipShape(Capsule())
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
    private let appIconMediaCategory: String?
    private let onIconTap: (() -> Void)?
    private let avatar: String
    private let appColor: TikoAppColor
    private let backgroundColor: Color
    private let darkBackgroundColor: Color
    private let actions: [TikoHeaderAction]
    private let onAction: (String) -> Void
    private let content: Content
    private let settingsContent: SettingsContent

    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""
    @AppStorage("tiko.avatarURL") private var storedAvatarURLString = ""
    @State private var showingAccount = false
    @State private var showingSettings = false
    @State private var fetchedIconURL: URL? = nil
    @State private var fetchedAvatarURL: URL? = nil

    public init(
        appName: String,
        appIcon: String = "checkmark.circle",
        appIconMediaCategory: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder settingsContent: () -> SettingsContent,
        @ViewBuilder content: () -> Content
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.appIconMediaCategory = appIconMediaCategory
        self.onIconTap = onIconTap
        self.avatar = avatar
        self.appColor = appColor
        self.backgroundColor = backgroundColor
        self.darkBackgroundColor = darkBackgroundColor
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
                appIconURL: fetchedIconURL,
                onIconTap: onIconTap,
                avatar: avatar,
                avatarURL: fetchedAvatarURL,
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
        .background(selectedColorScheme == .dark ? darkBackgroundColor : backgroundColor)
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
        .task {
            await fetchIconIfNeeded()
            await fetchAvatarIfNeeded()
        }
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

    private func fetchIconIfNeeded() async {
        guard let category = appIconMediaCategory else { return }
        let key = "tiko.icon.\(appName.lowercased())"
        if let stored = UserDefaults.standard.string(forKey: key), let url = URL(string: stored) {
            fetchedIconURL = url
            return
        }
        if let url = await fetchMediaImage(urlString: "https://media.tikoapi.org/v1/media?type=image&category=\(category)&limit=20", random: false) {
            UserDefaults.standard.set(url.absoluteString, forKey: key)
            fetchedIconURL = url
        }
    }

    private func fetchAvatarIfNeeded() async {
        if !storedAvatarURLString.isEmpty, let url = URL(string: storedAvatarURLString) {
            fetchedAvatarURL = url
            return
        }
        if let url = await fetchMediaImage(urlString: "https://media.tikoapi.org/v1/media?type=image&limit=100", random: true) {
            storedAvatarURLString = url.absoluteString
            fetchedAvatarURL = url
        }
    }

    private func fetchMediaImage(urlString: String, random: Bool) async -> URL? {
        guard let url = URL(string: urlString),
              let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["data"] as? [[String: Any]],
              !items.isEmpty else { return nil }
        let item = random ? items.randomElement()! : items[0]
        guard let urlString = item["original_url"] as? String,
              let imageURL = URL(string: urlString) else { return nil }
        return resizedCDNURL(imageURL, size: 100)
    }

    private func resizedCDNURL(_ url: URL, size: Int) -> URL {
        guard url.host == "data.tikocdn.org", url.path.hasPrefix("/uploads/") else { return url }
        return URL(string: "https://data.tikocdn.org/cdn-cgi/image/width=\(size),quality=80,f=auto\(url.path)") ?? url
    }
}

public extension TikoAppShell where SettingsContent == EmptyView {
    init(
        appName: String,
        appIcon: String = "checkmark.circle",
        appIconMediaCategory: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            appName: appName,
            appIcon: appIcon,
            appIconMediaCategory: appIconMediaCategory,
            onIconTap: onIconTap,
            avatar: avatar,
            appColor: appColor,
            backgroundColor: backgroundColor,
            darkBackgroundColor: darkBackgroundColor,
            actions: actions,
            onAction: onAction,
            settingsContent: { EmptyView() },
            content: content
        )
    }
}
