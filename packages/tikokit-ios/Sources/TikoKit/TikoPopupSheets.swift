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
            Capsule()
                .fill(Color.primary.opacity(0.16))
                .frame(width: 46, height: 5)

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
        TikoLanguage(id: "mt", title: "Maltese", nativeTitle: "Malti"),
        TikoLanguage(id: "nl", title: "Dutch", nativeTitle: "Nederlands")
    ]
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

public struct TikoSettingsSheet<AppSettings: View>: View {
    private let appColor: TikoAppColor
    private let accountTitle: String
    private let onClose: () -> Void
    private let onOpenAccount: () -> Void
    private let appSettings: AppSettings

    @AppStorage("tiko.language") private var languageID = "en"
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @State private var showingLanguagePicker = false
    @State private var showingColorModePicker = false

    public init(
        appColor: TikoAppColor,
        accountTitle: String = "Setup user",
        onClose: @escaping () -> Void,
        onOpenAccount: @escaping () -> Void,
        @ViewBuilder appSettings: () -> AppSettings
    ) {
        self.appColor = appColor
        self.accountTitle = accountTitle
        self.onClose = onClose
        self.onOpenAccount = onOpenAccount
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
                        title: "Account",
                        value: accountTitle,
                        icon: "person.crop.circle",
                        appColor: appColor,
                        action: onOpenAccount
                    )

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
    init(
        appColor: TikoAppColor,
        accountTitle: String = "Setup user",
        onClose: @escaping () -> Void,
        onOpenAccount: @escaping () -> Void
    ) {
        self.init(appColor: appColor, accountTitle: accountTitle, onClose: onClose, onOpenAccount: onOpenAccount) {
            EmptyView()
        }
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
                if languages.count > 8 {
                    TextField("Search languages", text: $query)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .padding(14)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

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

public struct TikoAccountSheet: View {
    private let appName: String
    private let appColor: TikoAppColor
    private let onClose: () -> Void

    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""
    @AppStorage("tiko.accountSetupDismissed") private var accountSetupDismissed = false
    @State private var showingEmail = false
    @State private var showingRecovery = false

    public init(appName: String, appColor: TikoAppColor, onClose: @escaping () -> Void) {
        self.appName = appName
        self.appColor = appColor
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(
            title: title,
            subtitle: subtitle,
            icon: "person.crop.circle",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                if showingRecovery {
                    recoveryContent
                } else {
                    accountContent
                }
            }
        }
    }

    private var title: String {
        if showingRecovery { return "Recover account" }
        return userName.isEmpty ? "Welcome to \(appName)" : "Your Tiko account"
    }

    private var subtitle: String {
        if showingRecovery { return "Enter your email and we’ll send a magic link." }
        if showingEmail || !userEmail.isEmpty { return "Email is only for recovery and using this profile elsewhere." }
        return "Start with a name. Email is optional for recovery."
    }

    private var accountContent: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 7) {
                Text("Name")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)
                TextField("Name", text: $userName)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .textInputAutocapitalization(.words)
                    .padding(15)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            if showingEmail || !userEmail.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    Text("Email for recovery")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                    TextField("you@example.com", text: $userEmail)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(15)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }

            Button {
                if showingEmail || !userEmail.isEmpty {
                    // Backend magic-link exchange plugs into TikoIdentityClient; keep the UX no-password now.
                    onClose()
                } else {
                    showingEmail = true
                }
            } label: {
                Text(showingEmail || !userEmail.isEmpty ? "Send magic link" : "Continue")
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)

            Button("Recover account") { showingRecovery = true }
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(appColor.palette.primary)

            Button("Use without account for now") {
                accountSetupDismissed = true
                onClose()
            }
            .font(.system(size: 14, weight: .heavy, design: .rounded))
            .foregroundStyle(appColor.palette.primary)
            .padding(.top, 2)
        }
    }

    private var recoveryContent: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 7) {
                Text("Email")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)
                TextField("you@example.com", text: $userEmail)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(15)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            Button {
                // Tiko identity API must return a generic success message here.
                onClose()
            } label: {
                Text("Send magic link")
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)

            Button("Back to setup") { showingRecovery = false }
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(appColor.palette.primary)
        }
    }
}

private extension View {
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
        accountTitle: String = "Setup user",
        onOpenAccount: @escaping () -> Void = {},
        @ViewBuilder appSettings: @escaping () -> SettingsContent
    ) -> some View {
        tikoPopup(isPresented: isPresented) {
            TikoSettingsSheet(
                appColor: appColor,
                accountTitle: accountTitle,
                onClose: { isPresented.wrappedValue = false },
                onOpenAccount: onOpenAccount,
                appSettings: appSettings
            )
        }
    }

    func tikoSettingsPopup(
        isPresented: Binding<Bool>,
        appColor: TikoAppColor,
        accountTitle: String = "Setup user",
        onOpenAccount: @escaping () -> Void = {}
    ) -> some View {
        tikoSettingsPopup(
            isPresented: isPresented,
            appColor: appColor,
            accountTitle: accountTitle,
            onOpenAccount: onOpenAccount
        ) {
            EmptyView()
        }
    }

    func tikoAccountPopup(isPresented: Binding<Bool>, appName: String, appColor: TikoAppColor) -> some View {
        tikoPopup(isPresented: isPresented) {
            TikoAccountSheet(appName: appName, appColor: appColor) {
                isPresented.wrappedValue = false
            }
        }
    }
}
