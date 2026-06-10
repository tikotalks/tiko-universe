import SwiftUI
import PopupView

public struct TikoPopupCard<Content: View>: View {
    private let title: String
    private let subtitle: String?
    private let icon: String
    private let appColor: TikoAppColor
    private let onClose: () -> Void
    private let content: Content

    public init(
        title: String,
        subtitle: String? = nil,
        icon: String = "slider.horizontal.3",
        appColor: TikoAppColor,
        onClose: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.appColor = appColor
        self.onClose = onClose
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 18) {
            ZStack {
                HStack {
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.primary.opacity(0.75))
                            .frame(width: 48, height: 48)
                            .background(Color.primary.opacity(0.055))
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close")

                    Spacer()

                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(appColor.palette.primary)
                        .frame(width: 48, height: 48)
                        .background(appColor.palette.primary.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }

                VStack(spacing: 7) {
                    Text(title)
                        .font(.system(size: 21, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.horizontal, 58)
            }

            content
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 22)
        .frame(maxWidth: 390, alignment: .top)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 34, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 28, x: 0, y: 16)
        .padding(.horizontal, 18)
    }
}

public enum TikoColorMode: String, CaseIterable, Codable, Sendable {
    case light
    case dark

    public var title: String {
        switch self {
        case .light: "Light"
        case .dark: "Dark"
        }
    }
}

public struct TikoLanguage: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let nativeTitle: String

    public init(id: String, title: String, nativeTitle: String) {
        self.id = id
        self.title = title
        self.nativeTitle = nativeTitle
    }

    public static let defaultLanguages: [TikoLanguage] = [
        TikoLanguage(id: "en", title: "English", nativeTitle: "English"),
        TikoLanguage(id: "nl", title: "Dutch", nativeTitle: "Nederlands"),
        TikoLanguage(id: "fr", title: "French", nativeTitle: "Français"),
        TikoLanguage(id: "de", title: "German", nativeTitle: "Deutsch"),
        TikoLanguage(id: "es", title: "Spanish", nativeTitle: "Español"),
        TikoLanguage(id: "pt", title: "Portuguese", nativeTitle: "Português"),
        TikoLanguage(id: "it", title: "Italian", nativeTitle: "Italiano"),
        TikoLanguage(id: "mt", title: "Maltese", nativeTitle: "Malti"),
        TikoLanguage(id: "ja", title: "Japanese", nativeTitle: "日本語"),
        TikoLanguage(id: "zh", title: "Chinese", nativeTitle: "中文"),
        TikoLanguage(id: "ko", title: "Korean", nativeTitle: "한국어"),
        TikoLanguage(id: "ar", title: "Arabic", nativeTitle: "العربية"),
        TikoLanguage(id: "hy", title: "Armenian", nativeTitle: "Հայերեն"),
    ]

    public static var supportedLanguageCodes: [String] {
        defaultLanguages.map(\.id)
    }
}

public struct TikoSettingsSection<Content: View>: View {
    private let title: String
    private let content: Content

    public init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
            VStack(spacing: 10) {
                content
            }
        }
    }
}

public struct TikoSettingsActionRow: View {
    private let title: String
    private let value: String?
    private let icon: String
    private let appColor: TikoAppColor
    private let action: () -> Void

    public init(
        title: String,
        value: String? = nil,
        icon: String,
        appColor: TikoAppColor,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.value = value
        self.icon = icon
        self.appColor = appColor
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(appColor.palette.primary)
                    .frame(width: 40, height: 40)
                    .background(appColor.palette.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    if let value, !value.isEmpty {
                        Text(value)
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .tikoSettingsRowSurface()
        }
        .buttonStyle(.plain)
    }
}

public struct TikoSettingsToggleRow: View {
    private let title: String
    private let icon: String
    private let appColor: TikoAppColor
    @Binding private var isOn: Bool

    public init(title: String, icon: String, appColor: TikoAppColor, isOn: Binding<Bool>) {
        self.title = title
        self.icon = icon
        self.appColor = appColor
        self._isOn = isOn
    }

    public var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(appColor.palette.primary)
                .frame(width: 40, height: 40)
                .background(appColor.palette.primary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(title)
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)

            Spacer()

            Toggle(title, isOn: $isOn)
                .labelsHidden()
                .tint(appColor.palette.primary)
        }
        .tikoSettingsRowSurface()
    }
}

public struct TikoColorSwatchPicker: View {
    public static let colors: [UInt32] = [
        0xFF6B6B, 0xFF922B, 0xFFD43B, 0x69DB7C,
        0x4DABF7, 0x748FFC, 0xCC5DE8, 0xF783AC,
        0x63E6BE, 0xA9E34B, 0x868E96, 0x2C2C2E,
    ]

    private let appColor: TikoAppColor
    @Binding private var hexValue: String

    public init(appColor: TikoAppColor, hexValue: Binding<String>) {
        self.appColor = appColor
        self._hexValue = hexValue
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(selectedColor ?? appColor.palette.primary.opacity(0.4))
                    .frame(width: 40, height: 40)
                    .overlay {
                        Image(systemName: "paintpalette.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                    }
                Text("Favourite colour")
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(.primary)
                Spacer()
                if !hexValue.isEmpty {
                    Button {
                        withAnimation(.spring(response: 0.2)) { hexValue = "" }
                    } label: {
                        Text("None")
                            .font(.system(size: 13, weight: .heavy, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6), spacing: 10) {
                ForEach(Self.colors, id: \.self) { color in
                    let hex = String(format: "%06X", color)
                    ZStack {
                        Circle().fill(Color(hex: color))
                        if hexValue.uppercased() == hex {
                            Circle().strokeBorder(Color.white, lineWidth: 2.5)
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .black))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(height: 38)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.2)) { hexValue = hex }
                    }
                }
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        }
    }

    private var selectedColor: Color? {
        let h = hexValue.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard h.count == 6, let v = UInt64(h, radix: 16) else { return nil }
        return Color(
            red:   Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8)  & 0xFF) / 255,
            blue:  Double(v         & 0xFF) / 255
        )
    }
}

public struct TikoSettingsSegmentedRow: View {
    private let title: String
    private let icon: String
    private let appColor: TikoAppColor
    private let options: [String]
    @Binding private var selectedIndex: Int

    public init(title: String, icon: String, appColor: TikoAppColor, options: [String], selectedIndex: Binding<Int>) {
        self.title = title
        self.icon = icon
        self.appColor = appColor
        self.options = options
        self._selectedIndex = selectedIndex
    }

    public var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(appColor.palette.primary)
                .frame(width: 40, height: 40)
                .background(appColor.palette.primary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(title)
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)

            Spacer()

            Picker(title, selection: $selectedIndex) {
                ForEach(Array(options.enumerated()), id: \.offset) { i, label in
                    Text(label).tag(i)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 150)
        }
        .tikoSettingsRowSurface()
    }
}

public struct TikoSettingsSizeRow: View {
    private let title: String
    private let icon: String
    private let appColor: TikoAppColor
    @Binding private var selectedIndex: Int

    public init(title: String, icon: String, appColor: TikoAppColor, selectedIndex: Binding<Int>) {
        self.title = title
        self.icon = icon
        self.appColor = appColor
        self._selectedIndex = selectedIndex
    }

    public var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(appColor.palette.primary)
                .frame(width: 40, height: 40)
                .background(appColor.palette.primary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(title)
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)

            Spacer()

            HStack(spacing: 0) {
                ForEach(0..<3, id: \.self) { i in
                    Button {
                        withAnimation(.spring(response: 0.2)) { selectedIndex = i }
                    } label: {
                        Text("A")
                            .font(.system(i == 0 ? .caption2 : i == 1 ? .callout : .title3, design: .rounded).weight(.heavy))
                            .frame(width: 44, height: 34)
                            .background(selectedIndex == i ? appColor.palette.primary : Color.clear)
                            .foregroundStyle(selectedIndex == i ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color(.systemFill))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .tikoSettingsRowSurface()
    }
}

public struct TikoSettingsSheet<AppSettings: View>: View {
    private let appColor: TikoAppColor
    private let onClose: () -> Void
    private let appSettings: AppSettings

    @AppStorage("tiko.language") private var languageID = "en"
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @State private var showingLanguagePicker = false
    @State private var showingColorModePicker = false

    public init(
        appColor: TikoAppColor,
        onClose: @escaping () -> Void,
        @ViewBuilder appSettings: () -> AppSettings
    ) {
        self.appColor = appColor
        self.onClose = onClose
        self.appSettings = appSettings()
    }

    public var body: some View {
        TikoPopupCard(
            title: "Settings",
            subtitle: "Language, appearance and app preferences.",
            icon: "gearshape.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 16) {
                TikoSettingsSection(title: "Tiko") {
                    TikoSettingsActionRow(
                        title: "Language",
                        value: selectedLanguageTitle,
                        icon: "globe",
                        appColor: appColor
                    ) { showingLanguagePicker = true }

                    TikoSettingsActionRow(
                        title: "Color mode",
                        value: selectedColorMode.title,
                        icon: "circle.lefthalf.filled",
                        appColor: appColor
                    ) { showingColorModePicker = true }
                }

                appSettings
            }
        }
        .tikoPopup(isPresented: $showingLanguagePicker) {
            TikoLanguagePickerSheet(
                appColor: appColor,
                languages: TikoLanguage.defaultLanguages,
                selectedLanguageID: languageID,
                onSelect: { language in
                    languageID = language.id
                    showingLanguagePicker = false
                },
                onClose: { showingLanguagePicker = false }
            )
        }
        .tikoPopup(isPresented: $showingColorModePicker) {
            TikoColorModePickerSheet(
                appColor: appColor,
                selectedMode: selectedColorMode,
                onSelect: { mode in
                    colorModeRawValue = mode.rawValue
                    showingColorModePicker = false
                },
                onClose: { showingColorModePicker = false }
            )
        }
    }

    private var selectedLanguageTitle: String {
        TikoLanguage.defaultLanguages.first { $0.id == languageID }?.nativeTitle ?? "English"
    }

    private var selectedColorMode: TikoColorMode {
        TikoColorMode(rawValue: colorModeRawValue) ?? .light
    }
}

public extension TikoSettingsSheet where AppSettings == EmptyView {
    init(appColor: TikoAppColor, onClose: @escaping () -> Void) {
        self.init(appColor: appColor, onClose: onClose) { EmptyView() }
    }
}

public struct TikoLanguagePickerSheet: View {
    private let appColor: TikoAppColor
    private let languages: [TikoLanguage]
    private let selectedLanguageID: String
    private let onSelect: (TikoLanguage) -> Void
    private let onClose: () -> Void
    @State private var query = ""

    public init(
        appColor: TikoAppColor,
        languages: [TikoLanguage],
        selectedLanguageID: String,
        onSelect: @escaping (TikoLanguage) -> Void,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.languages = languages
        self.selectedLanguageID = selectedLanguageID
        self.onSelect = onSelect
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(title: "Language", subtitle: "Choose the language for Tiko apps.", icon: "globe", appColor: appColor, onClose: onClose) {
            VStack(spacing: 12) {
                TextField("Search languages", text: $query)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .padding(14)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filteredLanguages) { language in
                            Button {
                                onSelect(language)
                            } label: {
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(language.nativeTitle)
                                            .font(.system(size: 17, weight: .heavy, design: .rounded))
                                            .foregroundStyle(.primary)
                                        Text(language.title)
                                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    if language.id == selectedLanguageID {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 20, weight: .bold))
                                            .foregroundStyle(appColor.palette.primary)
                                    }
                                }
                                .tikoSettingsRowSurface()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 300)
            }
        }
    }

    private var filteredLanguages: [TikoLanguage] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return languages }
        return languages.filter {
            $0.title.localizedCaseInsensitiveContains(trimmed) ||
                $0.nativeTitle.localizedCaseInsensitiveContains(trimmed) ||
                $0.id.localizedCaseInsensitiveContains(trimmed)
        }
    }
}

public struct TikoColorModePickerSheet: View {
    private let appColor: TikoAppColor
    private let selectedMode: TikoColorMode
    private let onSelect: (TikoColorMode) -> Void
    private let onClose: () -> Void

    public init(
        appColor: TikoAppColor,
        selectedMode: TikoColorMode,
        onSelect: @escaping (TikoColorMode) -> Void,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.selectedMode = selectedMode
        self.onSelect = onSelect
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(title: "Color mode", subtitle: "Pick a clear light or dark appearance.", icon: "circle.lefthalf.filled", appColor: appColor, onClose: onClose) {
            VStack(spacing: 12) {
                ForEach(TikoColorMode.allCases, id: \.rawValue) { mode in
                    Button {
                        onSelect(mode)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: mode == .light ? "sun.max.fill" : "moon.fill")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(appColor.palette.primary)
                                .frame(width: 40, height: 40)
                                .background(appColor.palette.primary.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            Text(mode.title)
                                .font(.system(size: 17, weight: .heavy, design: .rounded))
                                .foregroundStyle(.primary)
                            Spacer()
                            if mode == selectedMode {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundStyle(appColor.palette.primary)
                            }
                        }
                        .tikoSettingsRowSurface()
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

@MainActor
public final class TikoProfilePreferences: ObservableObject {
    @Published public var avatarURL: String = ""
    @Published public var favoriteColor: String = ""

    private var subjectId: String?

    public init() {}

    public func load(for subjectId: String?) {
        guard self.subjectId != subjectId else { return }
        self.subjectId = subjectId
        guard let id = subjectId, !id.isEmpty else {
            avatarURL = ""
            favoriteColor = ""
            return
        }
        avatarURL = UserDefaults.standard.string(forKey: "tiko.avatarURL.\(id)") ?? ""
        favoriteColor = UserDefaults.standard.string(forKey: "tiko.favoriteColor.\(id)") ?? ""
    }

    public func setAvatarURL(_ url: String) {
        avatarURL = url
        guard let id = subjectId, !id.isEmpty else { return }
        UserDefaults.standard.set(url, forKey: "tiko.avatarURL.\(id)")
    }

    public func setFavoriteColor(_ color: String) {
        favoriteColor = color
        guard let id = subjectId, !id.isEmpty else { return }
        UserDefaults.standard.set(color, forKey: "tiko.favoriteColor.\(id)")
    }
}

public struct TikoAccountSheet: View {
    private let appName: String
    private let appColor: TikoAppColor
    private let onClose: () -> Void

    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""
    @ObservedObject private var profilePrefs: TikoProfilePreferences

    // Session state — drives which screen is shown
    @State private var isSignedIn = false
    @State private var signedInEmail: String? = nil
    @State private var showingAvatarPicker = false
    @State private var showingAccountActions = false
    @State private var currentIdentityBundle: TikoIdentityBundle?

    // Login flow state
    @State private var emailInput = ""
    @State private var emailSent = false
    @State private var otpCode = ""
    @State private var isLoading = false
    @State private var identityError: String? = nil
    @State private var showDeleteConfirmation = false

    private let identityClient = TikoIdentityClient()
    private let sessionStore = TikoDeviceSessionStore()

    public init(appName: String, appColor: TikoAppColor, profilePrefs: TikoProfilePreferences, onClose: @escaping () -> Void) {
        self.appName = appName
        self.appColor = appColor
        self._profilePrefs = ObservedObject(wrappedValue: profilePrefs)
        self.onClose = onClose
    }

    public var body: some View {
        Group {
            if isSignedIn {
                profileCard
            } else if emailSent {
                otpCard
            } else {
                loginCard
            }
        }
        .task {
            if let bundle = try? sessionStore.load(),
               bundle.account?.emailVerified == true {
                currentIdentityBundle = bundle
                isSignedIn = true
                signedInEmail = bundle.account?.email
                if let email = bundle.account?.email { userEmail = email }
                await refreshIdentityBundle(accessToken: bundle.accessToken)
            }
        }
        .tikoMediaPickerPopup(
            isPresented: $showingAvatarPicker,
            appColor: appColor,
            title: "Choose avatar"
        ) { url in
            profilePrefs.setAvatarURL(url.absoluteString)
        }
        .tikoPopup(isPresented: $showingAccountActions) {
            accountActionsCard
        }
        .alert("Delete this Tiko user?", isPresented: $showDeleteConfirmation) {
            Button("Delete", role: .destructive) { Task { await deleteAccount() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes the account and sessions.")
        }
    }

    // MARK: - Profile (signed-in state)

    private var profileCard: some View {
        TikoPopupCard(
            title: "Your account",
            icon: "person.crop.circle.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                // Avatar — favourite colour background + image on top
                Button { showingAvatarPicker = true } label: {
                    ZStack(alignment: .bottomTrailing) {
                        ZStack {
                            // Background: favourite colour or default
                            Circle().fill(profileFavoriteColor ?? appColor.palette.primary.opacity(0.18))

                            // Image (assumed transparent background, sits on the colour)
                            if let url = URL(string: profilePrefs.avatarURL), !profilePrefs.avatarURL.isEmpty {
                                AsyncImage(url: url) { phase in
                                    if case .success(let image) = phase {
                                        image.resizable().scaledToFit()
                                    } else {
                                        Image(systemName: "person.crop.circle.fill")
                                            .font(.system(size: 46))
                                            .foregroundStyle(.white.opacity(0.6))
                                    }
                                }
                            } else {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.system(size: 46))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                        }
                        .frame(width: 80, height: 80)
                        .clipShape(Circle())

                        Image(systemName: "camera.circle.fill")
                            .font(.system(size: 26))
                            .foregroundStyle(appColor.palette.primary)
                            .background(.regularMaterial, in: Circle())
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)

                // Verified email row — tap to manage account
                Button { showingAccountActions = true } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(appColor.palette.primary)
                            .frame(width: 40, height: 40)
                            .background(appColor.palette.primary.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(signedInEmail ?? userEmail)
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(.primary)
                            Text("Verified account")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(appColor.palette.primary)
                            if let accountRoleTitle {
                                Text(accountRoleTitle)
                                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(appColor.palette.primary, in: Capsule())
                                    .padding(.top, 2)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .tikoSettingsRowSurface()
                }
                .buttonStyle(.plain)

                // Editable display name
                VStack(alignment: .leading, spacing: 7) {
                    Text("Display name")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                    TextField("Your name", text: $userName)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .textInputAutocapitalization(.words)
                        .padding(15)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                // Favourite colour
                TikoColorSwatchPicker(appColor: appColor, hexValue: Binding(
                    get: { profilePrefs.favoriteColor },
                    set: { profilePrefs.setFavoriteColor($0) }
                ))

                Button {
                    Task { await saveProfileName() }
                } label: {
                    Text("Save profile")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(appColor.palette.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Account actions sheet (sign out / delete)

    private var accountActionsCard: some View {
        TikoPopupCard(
            title: signedInEmail ?? userEmail,
            icon: "person.crop.circle",
            appColor: appColor,
            onClose: { showingAccountActions = false }
        ) {
            VStack(spacing: 10) {
                Button {
                    showingAccountActions = false
                    try? sessionStore.clearAll()
                    isSignedIn = false
                    signedInEmail = nil
                    emailInput = ""
                    emailSent = false
                    otpCode = ""
                    identityError = nil
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 28)
                        Text("Sign out")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(.primary)
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(Color(uiColor: .systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    showDeleteConfirmation = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "trash.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.red)
                            .frame(width: 28)
                        Text("Delete account")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(.red)
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(Color(uiColor: .systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Email input (start login)

    private var loginCard: some View {
        TikoPopupCard(
            title: "Sign in",
            subtitle: "Enter your email to receive a sign-in code.",
            icon: "envelope.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 7) {
                    Text("Email")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                    TextField("you@example.com", text: $emailInput)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(15)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                if let msg = identityError {
                    Text(msg)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await sendMagicLink() }
                } label: {
                    Group {
                        if isLoading { ProgressView().tint(.white) }
                        else { Text("Send sign-in code") }
                    }
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(isLoading || emailInput.trimmingCharacters(in: .whitespaces).isEmpty)

                Button("Skip for now") { onClose() }
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - OTP verification

    private var otpCard: some View {
        TikoPopupCard(
            title: "Check your email",
            subtitle: "We sent a 6-digit code to \(emailInput).",
            icon: "envelope.badge.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                TextField("123 456", text: $otpCode)
                    .font(.system(size: 32, weight: .heavy, design: .monospaced))
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.center)
                    .padding(15)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .onChange(of: otpCode) { _, new in
                        let digits = new.filter(\.isNumber)
                        otpCode = digits.count > 6 ? String(digits.prefix(6)) : digits
                    }

                if let msg = identityError {
                    Text(msg)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await submitOtp() }
                } label: {
                    Group {
                        if isLoading { ProgressView().tint(.white) }
                        else { Text("Verify code") }
                    }
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(isLoading || otpCode.filter(\.isNumber).count != 6)

                Button("Resend code") {
                    emailSent = false
                    otpCode = ""
                    identityError = nil
                }
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(appColor.palette.primary)

                Button("Use a different email") {
                    emailSent = false
                    otpCode = ""
                    emailInput = ""
                    identityError = nil
                }
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Colour helpers

    private var profileFavoriteColor: Color? {
        let h = profilePrefs.favoriteColor.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard h.count == 6, let v = UInt64(h, radix: 16) else { return nil }
        return Color(
            red:   Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8)  & 0xFF) / 255,
            blue:  Double(v         & 0xFF) / 255
        )
    }

    private var accountRoleTitle: String? {
        guard let bundle = currentIdentityBundle ?? (try? sessionStore.load()) else { return nil }
        if bundle.roles?.contains("admin") == true { return "Admin" }
        if bundle.roles?.contains("content_editor") == true { return "Content editor" }
        if bundle.capabilities?.canEditContent == true { return "Admin" }
        if bundle.account?.accountType == "profile_manager" || bundle.capabilities?.canManageChildAccounts == true {
            return "Profile manager"
        }
        return nil
    }

    private func refreshIdentityBundle(accessToken: String?) async {
        guard let accessToken else { return }
        let existing = try? sessionStore.load()
        do {
            let refreshed = try await identityClient.getSession(accessToken: accessToken)
            let merged = existing.map { refreshed.preservingSession(from: $0) } ?? refreshed
            try sessionStore.save(merged)
            currentIdentityBundle = merged
            isSignedIn = merged.account?.emailVerified == true
            signedInEmail = merged.account?.email
            if let email = merged.account?.email { userEmail = email }
        } catch {}
    }

    // MARK: - Actions

    private func sendMagicLink() async {
        let email = emailInput.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty, email.contains("@") else {
            identityError = "Enter a valid email address."
            return
        }
        isLoading = true
        identityError = nil
        do {
            let accessToken = (try? sessionStore.load())?.accessToken
            try await identityClient.requestRecoveryEmail(email: email, accessToken: accessToken)
            userEmail = email
            emailSent = true
        } catch {
            identityError = "Could not send the code. Please try again."
        }
        isLoading = false
    }

    private func saveProfileName() async {
        guard let accessToken = (try? sessionStore.load())?.accessToken else { return }
        do {
            _ = try await identityClient.updateProfile(
                accessToken: accessToken,
                patch: TikoIdentityProfile(displayName: userName.trimmingCharacters(in: .whitespacesAndNewlines))
            )
            identityError = nil
            onClose()
        } catch {
            identityError = "Could not save the profile. Please try again."
        }
    }

    private func deleteAccount() async {
        guard let accessToken = (try? sessionStore.load())?.accessToken else { return }
        isLoading = true
        identityError = nil
        do {
            _ = try await identityClient.createDeletionRequest(accessToken: accessToken, scope: .account)
            try? sessionStore.clearAll()
            isSignedIn = false
            signedInEmail = nil
            userName = ""
            userEmail = ""
            profilePrefs.setAvatarURL("")
            profilePrefs.setFavoriteColor("")
            emailInput = ""
            emailSent = false
            otpCode = ""
            isLoading = false
            onClose()
        } catch {
            identityError = "Could not delete the account. Please try again."
            isLoading = false
        }
    }

    private func submitOtp() async {
        let digits = otpCode.filter(\.isNumber)
        guard digits.count == 6 else { return }
        isLoading = true
        identityError = nil
        do {
            let bundle = try await identityClient.verifyOtp(otp: digits)
            try sessionStore.save(bundle)
            if userName.isEmpty, let name = bundle.account?.email?.components(separatedBy: "@").first {
                userName = name
            }
            userEmail = bundle.account?.email ?? emailInput
            isLoading = false
            onClose()
        } catch {
            otpCode = ""
            identityError = "Incorrect code — please try again or resend."
            isLoading = false
        }
    }
}

public struct TikoProfileMenuSheet: View {
    private let appColor: TikoAppColor
    private let onProfile: () -> Void
    private let onChildMode: () -> Void
    private let onClose: () -> Void

    public init(
        appColor: TikoAppColor,
        onProfile: @escaping () -> Void,
        onChildMode: @escaping () -> Void,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.onProfile = onProfile
        self.onChildMode = onChildMode
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(
            title: "Profile",
            icon: "person.crop.circle",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 10) {
                TikoSettingsActionRow(
                    title: "Profile",
                    icon: "person.crop.circle",
                    appColor: appColor,
                    action: onProfile
                )
                TikoSettingsActionRow(
                    title: "Child mode",
                    icon: "figure.child",
                    appColor: appColor,
                    action: onChildMode
                )
            }
        }
    }
}

public struct TikoParentCodeEntrySheet: View {
    private let appColor: TikoAppColor
    private let onParentMode: (TikoIdentityBundle) -> Void
    private let onClose: () -> Void

    @State private var enteredCode = ""
    @State private var isLoading = false
    @State private var error: String? = nil

    private let identityClient = TikoIdentityClient()
    private let sessionStore = TikoDeviceSessionStore()

    public init(appColor: TikoAppColor, onParentMode: @escaping (TikoIdentityBundle) -> Void, onClose: @escaping () -> Void) {
        self.appColor = appColor
        self.onParentMode = onParentMode
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(
            title: "Parent mode",
            subtitle: "Enter your 4-digit PIN to enable parent mode.",
            icon: "lock.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                TextField("••••", text: $enteredCode)
                    .font(.system(size: 28, weight: .heavy, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .padding(15)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .onChange(of: enteredCode) { _, new in
                        let filtered = String(new.filter { $0.isNumber }.prefix(4))
                        if filtered != new { enteredCode = filtered }
                    }

                if let error {
                    Text(error)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await verifyCode() }
                } label: {
                    Group {
                        if isLoading { ProgressView().tint(.white) }
                        else { Text("Enable parent mode") }
                    }
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(enteredCode.count != 4 || isLoading)
            }
        }
    }

    private func verifyCode() async {
        guard enteredCode.count == 4 else { return }
        isLoading = true
        error = nil
        do {
            let storedBundle = try sessionStore.load()
            var activeBundle = try await recoverParentModeSession(from: storedBundle)
            if !activeBundle.isChildMode {
                try sessionStore.save(activeBundle)
                onParentMode(activeBundle)
                isLoading = false
                return
            }
            guard let token = activeBundle.accessToken else { throw TikoIdentityClientError.missingSessionToken }
            let bundle: TikoIdentityBundle
            do {
                bundle = try await identityClient.enterParentMode(accessToken: token, pin: enteredCode)
            } catch TikoIdentityClientError.server(let statusCode, _) where statusCode == 401 {
                let recoveredBundle = try await recoverParentModeSession(from: storedBundle, usingExistingToken: false)
                if !recoveredBundle.isChildMode {
                    try sessionStore.save(recoveredBundle)
                    onParentMode(recoveredBundle)
                    isLoading = false
                    return
                }
                guard let recoveredToken = recoveredBundle.accessToken else { throw TikoIdentityClientError.missingSessionToken }
                activeBundle = recoveredBundle
                bundle = try await identityClient.enterParentMode(accessToken: recoveredToken, pin: enteredCode)
            }
            let merged = bundle.preservingSession(from: activeBundle)
            try sessionStore.save(merged)
            onParentMode(merged)
        } catch _ {
            error = "Incorrect PIN. Please try again."
            enteredCode = ""
        }
        isLoading = false
    }

    private func recoverParentModeSession(from storedBundle: TikoIdentityBundle?, usingExistingToken: Bool = true) async throws -> TikoIdentityBundle {
        if usingExistingToken, let token = storedBundle?.accessToken, !token.isEmpty {
            return storedBundle!
        }

        if let device = storedBundle?.device {
            let fresh = try await identityClient.bootstrapDevice(id: device.id, secret: device.secret)
            let merged = storedBundle.map { fresh.preservingSession(from: $0) } ?? fresh
            try sessionStore.save(merged)
            return merged
        }

        let fresh = try await identityClient.bootstrapDevice()
        try sessionStore.save(fresh)
        return fresh
    }
}

public struct TikoCreateParentCodeSheet: View {
    private let appColor: TikoAppColor
    private let onChildMode: (TikoIdentityBundle) -> Void
    private let onClose: () -> Void

    @State private var code = ""
    @State private var confirmCode = ""
    @State private var isLoading = false
    @State private var error: String? = nil

    private let identityClient = TikoIdentityClient()
    private let sessionStore = TikoDeviceSessionStore()

    public init(appColor: TikoAppColor, onChildMode: @escaping (TikoIdentityBundle) -> Void, onClose: @escaping () -> Void) {
        self.appColor = appColor
        self.onChildMode = onChildMode
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(
            title: "Create parent PIN",
            subtitle: "Set a 4-digit PIN to protect parent mode.",
            icon: "lock.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 7) {
                    Text("PIN")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                    TextField("••••", text: $code)
                        .font(.system(size: 28, weight: .heavy, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .keyboardType(.numberPad)
                        .padding(15)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .onChange(of: code) { _, new in
                            let filtered = String(new.filter { $0.isNumber }.prefix(4))
                            if filtered != new { code = filtered }
                        }
                }

                VStack(alignment: .leading, spacing: 7) {
                    Text("Confirm PIN")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                    TextField("••••", text: $confirmCode)
                        .font(.system(size: 28, weight: .heavy, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .keyboardType(.numberPad)
                        .padding(15)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .onChange(of: confirmCode) { _, new in
                            let filtered = String(new.filter { $0.isNumber }.prefix(4))
                            if filtered != new { confirmCode = filtered }
                        }
                }

                if let error {
                    Text(error)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await saveCode() }
                } label: {
                    Group {
                        if isLoading { ProgressView().tint(.white) }
                        else { Text("Save and enter child mode") }
                    }
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(code.count != 4 || confirmCode.count != 4 || isLoading)
            }
        }
    }

    private func saveCode() async {
        guard code.count == 4, confirmCode.count == 4 else { return }
        guard code == confirmCode else {
            error = "PINs don't match. Please try again."
            return
        }
        isLoading = true
        error = nil
        do {
            guard let token = try sessionStore.load()?.accessToken else {
                error = "No active session."
                isLoading = false
                return
            }
            let initialBundle = try sessionStore.load()!
            var bundle: TikoIdentityBundle
            do {
                // Set PIN on the server
                bundle = try await identityClient.setPin(accessToken: token, pin: code)
            } catch TikoIdentityClientError.server(let statusCode, let body)
                where statusCode == 403 && body.contains("invalid_pin") {
                bundle = try await identityClient.getSession(accessToken: token)
                guard bundle.isPinConfigured else { throw TikoIdentityClientError.server(statusCode: statusCode, body: body) }
            }
            try sessionStore.save(bundle.preservingSession(from: initialBundle))
            // Enable child mode (one-time opt-in)
            if !(bundle.isChildModeEnabled) {
                bundle = try await identityClient.enableChildMode(accessToken: token)
                try sessionStore.save(bundle.preservingSession(from: initialBundle))
            }
            // Enter child mode — preserve session so exit PIN works without re-auth
            bundle = try await identityClient.enterChildMode(accessToken: token)
            let childBundle = bundle.preservingSession(from: initialBundle)
            try sessionStore.save(childBundle)
            onChildMode(childBundle)
        } catch {
            self.error = "Could not save PIN. Please try again."
        }
        isLoading = false
    }
}

extension View {
    func tikoSettingsRowSurface() -> some View {
        padding(14)
            .background(Color(.systemBackground))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.primary.opacity(0.08), lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

public extension View {
    func tikoPopup<PopupContent: View>(
        isPresented: Binding<Bool>,
        @ViewBuilder content: @escaping () -> PopupContent
    ) -> some View {
        popup(isPresented: isPresented) {
            content()
        } customize: {
            $0
                .type(.default)
                .position(.center)
                .appearFrom(.centerScale)
                .animation(.spring(response: 0.32, dampingFraction: 0.86))
                .closeOnTapOutside(true)
                .closeOnTap(false)
                .dragToDismiss(true)
                .backgroundColor(.black.opacity(0.22))
                .useKeyboardSafeArea(true)
        }
    }

    func tikoSettingsPopup<SettingsContent: View>(
        isPresented: Binding<Bool>,
        appColor: TikoAppColor,
        @ViewBuilder appSettings: @escaping () -> SettingsContent
    ) -> some View {
        tikoPopup(isPresented: isPresented) {
            TikoSettingsSheet(
                appColor: appColor,
                onClose: { isPresented.wrappedValue = false },
                appSettings: appSettings
            )
        }
    }

    func tikoSettingsPopup(isPresented: Binding<Bool>, appColor: TikoAppColor) -> some View {
        tikoSettingsPopup(isPresented: isPresented, appColor: appColor) { EmptyView() }
    }

    func tikoAccountPopup(isPresented: Binding<Bool>, appName: String, appColor: TikoAppColor, profilePrefs: TikoProfilePreferences) -> some View {
        tikoPopup(isPresented: isPresented) {
            TikoAccountSheet(appName: appName, appColor: appColor, profilePrefs: profilePrefs) {
                isPresented.wrappedValue = false
            }
        }
    }
}
