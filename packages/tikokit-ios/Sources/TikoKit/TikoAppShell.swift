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

    private var fallbackAppIcon: some View {
        Image(systemName: appIcon)
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(.white)
    }

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
            ZStack {
                appColor.palette.primary
                TikoCachedRemoteImage(url: appIconURL) {
                    fallbackAppIcon
                }
            }
            .frame(width: iconSize, height: iconSize)
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
                .foregroundStyle(.primary)

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
    private let appIconImageUrl: String?
    private let appIconMediaCategory: String?
    private let onIconTap: (() -> Void)?
    private let avatar: String
    private let appColor: TikoAppColor
    private let backgroundColor: Color
    private let darkBackgroundColor: Color
    private let actions: [TikoHeaderAction]
    private let onAction: (String) -> Void
    private let onAccountDeleted: () -> Void
    private let onLoggedOut: () -> Void
    private let content: Content
    private let settingsContent: SettingsContent

    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.system.rawValue
    @Environment(\.colorScheme) private var deviceScheme
    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""
    @StateObject private var profilePrefs = TikoProfilePreferences()
    @State private var identityBundle: TikoIdentityBundle?
    @State private var showingAccount = false
    @State private var showingSettings = false
    @State private var showingProfileMenu = false
    @State private var showingParentCodeEntry = false
    @State private var showingCreateParentCode = false
    /// Mirrors `TikoParentGate.isLocalChildModeActive` so SwiftUI re-renders
    /// when a device without a verified email enters or leaves child mode.
    @State private var localChildMode = TikoParentGate.isLocalChildModeActive
    @State private var fetchedIconURL: URL? = nil
    @State private var fetchedAvatarURL: URL? = nil
    @State private var splashVisible = true

    /// Parent mode means NOT in child mode — either the API-backed runtime or,
    /// for a device with no verified email, the local gate.
    private var parentMode: Bool { !(localChildMode || (identityBundle?.isChildMode ?? false)) }


    public init(
        appConfig: TikoAppConfig,
        appName: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        onAccountDeleted: @escaping () -> Void = {},
        onLoggedOut: @escaping () -> Void = {},
        @ViewBuilder settingsContent: () -> SettingsContent,
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            appName: appName ?? appConfig.title,
            appIcon: appConfig.appIconSystemName,
            appIconImageUrl: appConfig.appIconImageUrl,
            appIconMediaCategory: appConfig.appIconMediaCategory,
            onIconTap: onIconTap,
            avatar: avatar,
            appColor: appConfig.appColor,
            backgroundColor: backgroundColor,
            darkBackgroundColor: darkBackgroundColor,
            actions: actions,
            onAction: onAction,
            onAccountDeleted: onAccountDeleted,
            onLoggedOut: onLoggedOut,
            settingsContent: settingsContent,
            content: content
        )
    }

    public init(
        appName: String,
        appIcon: String = "checkmark.circle",
        appIconImageUrl: String? = nil,
        appIconMediaCategory: String? = nil,
        onIconTap: (() -> Void)? = nil,
        avatar: String = "person.crop.circle.fill",
        appColor: TikoAppColor,
        backgroundColor: Color = Color(red: 0.973, green: 0.965, blue: 0.945),
        darkBackgroundColor: Color = Color(red: 0.08, green: 0.055, blue: 0.095),
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        onAccountDeleted: @escaping () -> Void = {},
        onLoggedOut: @escaping () -> Void = {},
        @ViewBuilder settingsContent: () -> SettingsContent,
        @ViewBuilder content: () -> Content
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.appIconImageUrl = appIconImageUrl
        self.appIconMediaCategory = appIconMediaCategory
        self.onIconTap = onIconTap
        self.avatar = avatar
        self.appColor = appColor
        self.backgroundColor = backgroundColor
        self.darkBackgroundColor = darkBackgroundColor
        self.actions = actions.filter { $0.id != "settings" }
        self.onAction = onAction
        self.onAccountDeleted = onAccountDeleted
        self.onLoggedOut = onLoggedOut
        self.settingsContent = settingsContent()
        self.content = content()
    }

    public var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(selectedColorScheme == .dark ? darkBackgroundColor : backgroundColor)
            .preferredColorScheme(preferredColorSchemeValue)
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
        .tikoAccountPopup(isPresented: $showingAccount, appName: appName, appColor: appColor, profilePrefs: profilePrefs, onIdentityChanged: {
            Task { @MainActor in
                let bundle = await refreshIdentityBundle()
                identityBundle = bundle
                let subjectId = bundle?.account?.subjectId ?? bundle?.subject.id
                profilePrefs.load(for: subjectId)
                // Fetch full profile (name, avatar, color) and restore locally
                if let token = bundle?.accessToken {
                    if let profile = try? await TikoIdentityClient().getProfile(accessToken: token) {
                        if let name = profile.displayName, !name.isEmpty { userName = name }
                        if let avatar = profile.avatarUrl, !avatar.isEmpty {
                            profilePrefs.setAvatarURL(avatar)
                        }
                        if let color = profile.favoriteColor, !color.isEmpty {
                            profilePrefs.setFavoriteColor(color)
                        }
                    }
                }
                fetchedAvatarURL = nil
                await fetchAvatarIfNeeded()
            }
        }, onAccountDeleted: onAccountDeleted, onLoggedOut: onLoggedOut)
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
                    if let bundle { identityBundle = bundle }
                    localChildMode = TikoParentGate.isLocalChildModeActive
                    showingParentCodeEntry = false
                },
                onClose: { showingParentCodeEntry = false }
            )
        }
        .tikoPopup(isPresented: $showingCreateParentCode) {
            TikoCreateParentCodeSheet(
                appColor: appColor,
                onChildMode: { bundle in
                    if let bundle { identityBundle = bundle }
                    localChildMode = TikoParentGate.isLocalChildModeActive
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
            Task {
                if newValue.isEmpty {
                    fetchedAvatarURL = nil
                } else {
                    fetchedAvatarURL = await MediaImageResolver.shared.resolve(newValue)
                }
            }
        }
        .task {
            if TikoScreenshotMode.isActive {
                // Deterministic, offline launch for screenshots/promo video: every
                // call below is network-bound, and on a cold simulator they hang
                // until URLSession times out — long past the capture window, so
                // the splash is all that gets photographed. Drop straight to the
                // app content instead.
                splashVisible = false
                // The "settings" scene is shell-level, so every app gets it here.
                if TikoScreenshotMode.scene == "settings" { showingSettings = true }
                return
            }
            await fetchIconIfNeeded()
            // Load identity first so avatar is scoped to the correct user
            identityBundle = await refreshIdentityBundle()
            let subjectId = identityBundle?.account?.subjectId ?? identityBundle?.subject.id
            profilePrefs.load(for: subjectId)
            if let token = identityBundle?.accessToken {
                await syncAvatarFromProfile(accessToken: token)
            }
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

    private var colorMode: TikoColorMode { TikoColorMode(rawValue: colorModeRawValue) ?? .system }

    /// What we hand to `.preferredColorScheme` — nil means "follow the device".
    private var preferredColorSchemeValue: ColorScheme? {
        switch colorMode {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    /// The scheme actually shown — resolves `.system` to the live device scheme
    /// so background colours match.
    private var selectedColorScheme: ColorScheme {
        switch colorMode {
        case .system: deviceScheme
        case .light: .light
        case .dark: .dark
        }
    }

    private func handleChildModeRequest() {
        showingProfileMenu = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            let storedBundle = (try? TikoDeviceSessionStore().load()) ?? identityBundle
            // If device is already in child mode (stored state may differ from in-memory),
            // show the PIN entry to EXIT child mode rather than trying to enter again.
            if TikoParentGate.isLocalChildModeActive || storedBundle?.isChildMode == true {
                showingParentCodeEntry = true
                return
            }
            // Without a verified email the server refuses to hold a PIN, so the
            // device keeps its own gate rather than refusing child mode outright.
            if TikoParentGate.usesLocalGate(storedBundle) {
                if TikoParentGate.isLocalPinConfigured {
                    TikoParentGate.enterLocalChildMode()
                    localChildMode = true
                } else {
                    showingCreateParentCode = true
                }
                return
            }
            if storedBundle?.isPinConfigured == true {
                guard let token = storedBundle?.accessToken else {
                    showingCreateParentCode = true
                    return
                }
                // PIN already set — just enable + enter child mode.
                // Ignore decode errors (server returns { ok: true }).
                let client = TikoIdentityClient()
                do { _ = try await client.enableChildMode(accessToken: token) } catch TikoIdentityClientError.server(let statusCode, let body) {
                    showingCreateParentCode = true
                    return
                } catch {}
                do { _ = try await client.enterChildMode(accessToken: token) } catch TikoIdentityClientError.server(let statusCode, let body) {
                    showingCreateParentCode = true
                    return
                } catch {}

                // Construct child-mode bundle locally
                let childBundle = TikoIdentityBundle(
                    subject: storedBundle!.subject,
                    device: storedBundle!.device,
                    account: storedBundle!.account,
                    session: storedBundle!.session,
                    runtime: TikoRuntimeSummary(mode: .child, childModeEnabled: true, pinConfigured: true),
                    capabilities: storedBundle!.capabilities,
                    roles: storedBundle!.roles
                )
                try? TikoDeviceSessionStore().save(childBundle)
                identityBundle = childBundle
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

    private func rebootstrapIdentity() async -> TikoIdentityBundle? {
        let sessionStore = TikoDeviceSessionStore()
        try? sessionStore.clearAll()
        do {
            let bundle = try await TikoIdentityClient().bootstrapDevice(platform: "ios")
            try sessionStore.save(bundle)
            return bundle
        } catch {
            return nil
        }
    }

    private func syncAvatarFromProfile(accessToken: String) async {
        guard let profile = try? await TikoIdentityClient().getProfile(accessToken: accessToken),
              let avatarId = profile.avatarUrl, !avatarId.isEmpty else { return }
        profilePrefs.setAvatarURL(avatarId)
        // Pre-populate cache if we can resolve quickly
        if let resolved = await MediaImageResolver.shared.resolve(avatarId) {
            fetchedAvatarURL = resolved
        }
    }

    private func fetchIconIfNeeded() async {
        if let iconUrl = appIconImageUrl, let url = URL(string: iconUrl), !iconUrl.isEmpty {
            fetchedIconURL = await resolveAppIconURL(url, size: 100)
            return
        }
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
        if !profilePrefs.avatarURL.isEmpty {
            // profilePrefs.avatarURL stores a media ID — resolve to URL for display
            let resolved = await MediaImageResolver.shared.resolve(profilePrefs.avatarURL)
            fetchedAvatarURL = resolved
            return
        }
        // Pick a random avatar and store its media ID
        if let mediaId = await fetchRandomMediaId() {
            profilePrefs.setAvatarURL(mediaId)
            // Sync to server profile
            if let token = identityBundle?.accessToken {
                try? await TikoIdentityClient().updateProfile(
                    accessToken: token,
                    patch: TikoIdentityProfile(avatarUrl: mediaId)
                )
            }
            let resolved = await MediaImageResolver.shared.resolve(mediaId)
            fetchedAvatarURL = resolved
        }
    }

    private func fetchRandomMediaId() async -> String? {
        guard let url = URL(string: "https://media.tikoapi.org/v1/media?type=image&limit=100"),
              let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["data"] as? [[String: Any]],
              !items.isEmpty else { return nil }
        let item = items.randomElement()!
        return item["id"] as? String
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

    private func resolveAppIconURL(_ url: URL, size: Int) async -> URL {
        if let mediaId = mediaDownloadId(from: url) {
            let mediaURL = url.deletingLastPathComponent()
            if let originalURL = await fetchOriginalMediaURL(url: mediaURL) {
                return resizedCDNURL(originalURL, size: size)
            }
            let fallbackMediaURL = URL(string: "https://media.tikoapi.org/v1/media/\(mediaId)")
            if let fallbackMediaURL, let originalURL = await fetchOriginalMediaURL(url: fallbackMediaURL) {
                return resizedCDNURL(originalURL, size: size)
            }
        }
        return resizedCDNURL(url, size: size)
    }

    private func mediaDownloadId(from url: URL) -> String? {
        guard url.host == "media.tikoapi.org" else { return nil }
        let parts = url.pathComponents
        guard let mediaIndex = parts.firstIndex(of: "media"),
              parts.indices.contains(mediaIndex + 2),
              parts[mediaIndex + 2] == "download" else { return nil }
        return parts[mediaIndex + 1]
    }

    private func fetchOriginalMediaURL(url: URL) async -> URL? {
        guard let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }

        let media = (json["data"] as? [String: Any]) ?? json
        guard let urlString = media["original_url"] as? String,
              let imageURL = URL(string: urlString) else { return nil }
        return imageURL
    }

    private func resizedCDNURL(_ url: URL, size: Int) -> URL {
        TikoImageURL.resized(url, width: size, quality: 80)
    }
}

private struct TikoSplashOverlay: View {
    let appColor: TikoAppColor

    var body: some View {
        appColor.palette.primary
            .overlay {
                GeometryReader { geo in
                    // Try main bundle first (each app has TikoLogo in Assets.xcassets),
                    // then TikoKit's SPM bundle as fallback.
                    let logo = UIImage(named: "TikoLogo")
                        ?? UIImage(named: "TikoLogo", in: .module, with: nil)
                    if let logo {
                        Image(uiImage: logo)
                            .renderingMode(.template)
                            .resizable()
                            .scaledToFit()
                            .frame(width: geo.size.width * 0.28, height: geo.size.width * 0.28)
                            .foregroundColor(.white.opacity(0.88))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
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
        appIconImageUrl: String? = nil,
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
            appIconImageUrl: appIconImageUrl,
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
