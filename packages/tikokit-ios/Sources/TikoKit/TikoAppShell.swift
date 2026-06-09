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
    private let avatarBackground: Color?
    private let appColor: TikoAppColor
    private let actions: [TikoHeaderAction]
    private let isSettingsActive: Bool
    private let showSettingsButton: Bool
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
        avatarBackground: Color? = nil,
        appColor: TikoAppColor,
        actions: [TikoHeaderAction] = [],
        isSettingsActive: Bool = false,
        showSettingsButton: Bool = true,
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
        self.avatarBackground = avatarBackground
        self.appColor = appColor
        self.actions = actions
        self.isSettingsActive = isSettingsActive
        self.showSettingsButton = showSettingsButton
        self.onAction = onAction
        self.onSettings = onSettings
        self.onAccount = onAccount
    }

    private let iconSize: CGFloat = 40
    private var squircle: RoundedRectangle { RoundedRectangle(cornerRadius: 10, style: .continuous) }

    @ViewBuilder
    private var appIconContent: some View {
        if onIconTap != nil {
            Image(systemName: "chevron.left")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: iconSize, height: iconSize)
                .background(appColor.palette.primary)
                .clipShape(squircle)
        } else if let appIconURL {
            AsyncImage(url: appIconURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: appIcon)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: iconSize, height: iconSize)
            .background(appColor.palette.primary)
            .clipShape(squircle)
        } else {
            Image(systemName: appIcon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: iconSize, height: iconSize)
                .background(appColor.palette.primary)
                .clipShape(squircle)
        }
    }

    @ViewBuilder
    private var avatarContent: some View {
        ZStack {
            (avatarBackground ?? appColor.palette.primary)
            if let avatarURL {
                AsyncImage(url: avatarURL) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFit()
                    } else {
                        Image(systemName: avatar)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
            } else {
                Image(systemName: avatar)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: iconSize, height: iconSize)
        .clipShape(squircle)
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
                .foregroundStyle(appColor.palette.primary)

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                ForEach(actions) { action in
                    headerButton(systemImage: action.systemImage, isActive: action.isActive) {
                        onAction(action.id)
                    }
                    .accessibilityLabel(action.label)
                }

                if showSettingsButton {
                    headerButton(systemImage: "gearshape.fill", isActive: isSettingsActive, action: onSettings)
                        .accessibilityLabel("Settings")
                }

                Button(action: onAccount) {
                    avatarContent
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Account")
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }

    private func headerButton(systemImage: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(appColor.palette.primary.opacity(isActive ? 1.0 : 0.7))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
    @StateObject private var profilePrefs = TikoProfilePreferences()
    @State private var identityBundle: TikoIdentityBundle?
    @State private var showingAccount = false
    @State private var showingSettings = false
    @State private var showingProfileMenu = false
    @State private var showingParentCodeEntry = false
    @State private var showingCreateParentCode = false
    @State private var fetchedIconURL: URL? = nil
    @State private var fetchedAvatarURL: URL? = nil
    @State private var splashVisible = true

    /// Derived from API-backed runtime — parent mode means NOT in child mode.
    private var parentMode: Bool { !(identityBundle?.isChildMode ?? false) }


    public init(
        appConfig: TikoAppConfig,
        appName: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder settingsContent: () -> SettingsContent,
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            appName: appName ?? appConfig.title,
            appIcon: appConfig.appIconSystemName,
            appIconMediaCategory: appConfig.appIconMediaCategory,
            onIconTap: onIconTap,
            avatar: avatar,
            appColor: appConfig.appColor,
            backgroundColor: backgroundColor,
            darkBackgroundColor: darkBackgroundColor,
            actions: actions,
            onAction: onAction,
            settingsContent: settingsContent,
            content: content
        )
    }

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
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(selectedColorScheme == .dark ? darkBackgroundColor : backgroundColor)
            .preferredColorScheme(selectedColorScheme)
            .safeAreaInset(edge: .top, spacing: 0) {
                TikoAppHeader(
                    appName: appName,
                    appIcon: appIcon,
                    appIconURL: fetchedIconURL,
                    onIconTap: onIconTap,
                    avatar: avatar,
                    avatarURL: fetchedAvatarURL,
                    avatarBackground: colorFromHex(profilePrefs.favoriteColor),
                    appColor: appColor,
                    actions: parentMode ? actions : [],
                    isSettingsActive: showingSettings,
                    showSettingsButton: parentMode,
                    onAction: onAction,
                    onSettings: { showingSettings = true },
                    onAccount: {
                        if parentMode {
                            showingProfileMenu = true
                        } else {
                            showingParentCodeEntry = true
                        }
                    }
                )
                .background(selectedColorScheme == .dark ? darkBackgroundColor : backgroundColor)
            }
        .tikoSettingsPopup(isPresented: $showingSettings, appColor: appColor) {
            settingsContent
        }
        .tikoAccountPopup(isPresented: $showingAccount, appName: appName, appColor: appColor, profilePrefs: profilePrefs)
        .tikoPopup(isPresented: $showingProfileMenu) {
            TikoProfileMenuSheet(
                appColor: appColor,
                onProfile: {
                    showingProfileMenu = false
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 250_000_000)
                        showingAccount = true
                    }
                },
                onChildMode: { handleChildModeRequest() },
                onClose: { showingProfileMenu = false }
            )
        }
        .tikoPopup(isPresented: $showingParentCodeEntry) {
            TikoParentCodeEntrySheet(
                appColor: appColor,
                onParentMode: { bundle in
                    identityBundle = bundle
                    showingParentCodeEntry = false
                },
                onClose: { showingParentCodeEntry = false }
            )
        }
        .tikoPopup(isPresented: $showingCreateParentCode) {
            TikoCreateParentCodeSheet(
                appColor: appColor,
                onChildMode: { bundle in
                    identityBundle = bundle
                    showingCreateParentCode = false
                },
                onClose: { showingCreateParentCode = false }
            )
        }
        .overlay {
            if splashVisible {
                TikoSplashOverlay(appColor: appColor)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
                    .transition(.opacity)
            }
        }
        .onChange(of: profilePrefs.avatarURL) { _, newValue in
            fetchedAvatarURL = URL(string: newValue)
        }
        .task {
            await fetchIconIfNeeded()
            // Load identity first so avatar is scoped to the correct user
            identityBundle = await refreshIdentityBundle()
            let subjectId = identityBundle?.account?.subjectId ?? identityBundle?.subject.id
            profilePrefs.load(for: subjectId)
            await fetchAvatarIfNeeded()
            try? await Task.sleep(nanoseconds: 500_000_000)
            withAnimation(.easeOut(duration: 0.4)) { splashVisible = false }
        }
    }

    private func colorFromHex(_ hex: String) -> Color? {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard h.count == 6, let value = UInt64(h, radix: 16) else { return nil }
        return Color(
            red:   Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8)  & 0xFF) / 255,
            blue:  Double(value         & 0xFF) / 255
        )
    }

    private var selectedColorScheme: ColorScheme {
        (TikoColorMode(rawValue: colorModeRawValue) ?? .light) == .dark ? .dark : .light
    }

    private func handleChildModeRequest() {
        showingProfileMenu = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            let storedBundle = (try? TikoDeviceSessionStore().load()) ?? identityBundle
            if storedBundle?.isPinConfigured == true {
                guard let token = storedBundle?.accessToken else { return }
                do {
                    let client = TikoIdentityClient()
                    var bundle = storedBundle!
                    if !bundle.isChildModeEnabled {
                        bundle = try await client.enableChildMode(accessToken: token)
                        try TikoDeviceSessionStore().save(bundle)
                    }
                    let childBundle = try await client.enterChildMode(accessToken: bundle.accessToken ?? token)
                    try TikoDeviceSessionStore().save(childBundle)
                    identityBundle = childBundle
                } catch {
                    // Silent fail — stay in parent mode
                }
            } else {
                // No PIN yet — show create flow
                showingCreateParentCode = true
            }
        }
    }

    private func refreshIdentityBundle() async -> TikoIdentityBundle? {
        let sessionStore = TikoDeviceSessionStore()
        guard let bundle = try? sessionStore.load() else { return nil }
        guard let token = bundle.accessToken else { return bundle }
        do {
            let refreshed = try await TikoIdentityClient().getSession(accessToken: token)
            let merged = refreshed.preservingSession(from: bundle)
            try sessionStore.save(merged)
            return merged
        } catch {
            return bundle
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
        if !profilePrefs.avatarURL.isEmpty, let url = URL(string: profilePrefs.avatarURL) {
            fetchedAvatarURL = url
            return
        }
        if let url = await fetchMediaImage(urlString: "https://media.tikoapi.org/v1/media?type=image&limit=100", random: true) {
            profilePrefs.setAvatarURL(url.absoluteString)
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

private struct TikoSplashOverlay: View {
    let appColor: TikoAppColor

    var body: some View {
        appColor.palette.primary
            .overlay {
                GeometryReader { geo in
                    Image("TikoLogo")
                        .resizable()
                        .renderingMode(.template)
                        .scaledToFit()
                        .frame(width: geo.size.width * 0.3, height: geo.size.width * 0.3)
                        .foregroundColor(.white.opacity(0.5))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
    }
}

public extension TikoAppShell where SettingsContent == EmptyView {
    init(
        appConfig: TikoAppConfig,
        appName: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            appConfig: appConfig,
            appName: appName,
            onIconTap: onIconTap,
            avatar: avatar,
            backgroundColor: backgroundColor,
            darkBackgroundColor: darkBackgroundColor,
            actions: actions,
            onAction: onAction,
            settingsContent: { EmptyView() },
            content: content
        )
    }

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
