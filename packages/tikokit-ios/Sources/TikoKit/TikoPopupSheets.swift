import SwiftUI
import PopupView
import CryptoKit

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

public struct TikoAccountSheet: View {
    private let appName: String
    private let appColor: TikoAppColor
    private let onClose: () -> Void

    @AppStorage("tiko.userName") private var userName = ""
    @AppStorage("tiko.userEmail") private var userEmail = ""

    // Session state — drives which screen is shown
    @State private var isSignedIn = false
    @State private var signedInEmail: String? = nil

    // Login flow state
    @State private var emailInput = ""
    @State private var emailSent = false
    @State private var otpCode = ""
    @State private var isLoading = false
    @State private var identityError: String? = nil

    private let identityClient = TikoIdentityClient()
    private let sessionStore = TikoDeviceSessionStore()

    public init(appName: String, appColor: TikoAppColor, onClose: @escaping () -> Void) {
        self.appName = appName
        self.appColor = appColor
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
                isSignedIn = true
                signedInEmail = bundle.account?.email
            }
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
                // Verified email row
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
                    }
                    Spacer()
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(appColor.palette.primary)
                }
                .tikoSettingsRowSurface()

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

                // Sign out
                Button {
                    try? sessionStore.clearAll()
                    isSignedIn = false
                    signedInEmail = nil
                    emailInput = ""
                    emailSent = false
                    otpCode = ""
                    identityError = nil
                } label: {
                    Text("Sign out")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.red.opacity(0.08))
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
            try await identityClient.requestRecoveryEmail(email: email)
            userEmail = email
            emailSent = true
        } catch {
            identityError = "Could not send the code. Please try again."
        }
        isLoading = false
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
            isLoading = false
            // Show profile instead of silently closing
            signedInEmail = bundle.account?.email ?? emailInput
            isSignedIn = true
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
    private let onLogOut: () -> Void
    private let onClose: () -> Void

    public init(
        appColor: TikoAppColor,
        onProfile: @escaping () -> Void,
        onChildMode: @escaping () -> Void,
        onLogOut: @escaping () -> Void,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.onProfile = onProfile
        self.onChildMode = onChildMode
        self.onLogOut = onLogOut
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
                TikoSettingsActionRow(
                    title: "Log out",
                    icon: "rectangle.portrait.and.arrow.right",
                    appColor: appColor,
                    action: onLogOut
                )
            }
        }
    }
}

public struct TikoParentCodeEntrySheet: View {
    private let appColor: TikoAppColor
    private let onClose: () -> Void

    @AppStorage("tiko.parentMode") private var parentMode = true
    @AppStorage("tiko.parentCodeHash") private var storedCodeHash = ""
    @State private var enteredCode = ""
    @State private var error: String? = nil

    public init(appColor: TikoAppColor, onClose: @escaping () -> Void) {
        self.appColor = appColor
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
                    verifyCode()
                } label: {
                    Text("Enable parent mode")
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(appColor.palette.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(enteredCode.count != 4)
            }
        }
    }

    private func verifyCode() {
        if tikoHashPin(enteredCode) == storedCodeHash {
            parentMode = true
            onClose()
        } else {
            error = "Incorrect PIN. Please try again."
            enteredCode = ""
        }
    }
}

public struct TikoCreateParentCodeSheet: View {
    private let appColor: TikoAppColor
    private let onClose: () -> Void

    @AppStorage("tiko.parentMode") private var parentMode = true
    @AppStorage("tiko.parentCodeHash") private var storedCodeHash = ""
    @State private var code = ""
    @State private var confirmCode = ""
    @State private var error: String? = nil

    public init(appColor: TikoAppColor, onClose: @escaping () -> Void) {
        self.appColor = appColor
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
                    saveCode()
                } label: {
                    Text("Save and enter child mode")
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(appColor.palette.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(code.count != 4 || confirmCode.count != 4)
            }
        }
    }

    private func saveCode() {
        guard code.count == 4, confirmCode.count == 4 else { return }
        guard code == confirmCode else {
            error = "PINs don't match. Please try again."
            return
        }
        let hash = tikoHashPin(code)
        storedCodeHash = hash
        parentMode = false
        onClose()
        Task {
            guard let token = (try? TikoDeviceSessionStore().load())?.accessToken else { return }
            try? await TikoIdentityClient().updateProfile(
                accessToken: token,
                patch: TikoIdentityProfile(parentCodeHash: hash)
            )
        }
    }
}

/// Matches the web: SHA-256("tiko:parent-code:{pin}") as lowercase hex.
private func tikoHashPin(_ pin: String) -> String {
    let data = Data("tiko:parent-code:\(pin)".utf8)
    let hash = SHA256.hash(data: data)
    return hash.compactMap { String(format: "%02x", $0) }.joined()
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
