import SwiftUI
import TikoKit
import TikoSpeechKit

/// Free-play settings, stored per the family's simple-settings convention.
enum SumSettings {
    static let maxNumberKey = "tiko.sum.maxNumber"
    static let timesEnabledKey = "tiko.sum.op.times"
    static let divideEnabledKey = "tiko.sum.op.dividedBy"
    static let minusEnabledKey = "tiko.sum.op.minus"
    static let answerModeKey = "tiko.sum.answerMode"
}

struct SumView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .sum)
    @StateObject private var store = SumPathStore()
    @State private var selection: Selection?
    @State private var showingPathManager = false
    @State private var editorInitialPath: SumPath?

    enum Selection: Equatable {
        case freePlay
        case path(SumPath)
    }

    var body: some View {
        TikoAppShell(
            appConfig: SumAppConfig.app,
            appName: i18n.t("sum.appName"),
            onIconTap: selection == nil ? nil : { selection = nil },
            actions: [
                TikoHeaderAction(id: "edit-paths", label: i18n.t("sum.settings.editPaths"), systemImage: "pencil"),
            ],
            onAction: { actionID in
                guard actionID == "edit-paths" else { return }
                showingPathManager = true
            },
            settingsContent: {
                SumSettingsContent(i18n: i18n, store: store, languageCode: languageCode) {
                    showingPathManager = true
                }
            },
            content: {
                ZStack {
                    switch selection {
                    case .freePlay:
                        SumPlayView(
                            path: nil,
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { selection = nil },
                            speech: TikoScreenshotMode.isActive ? SumScreenshotSpeechService() : nil
                        )
                        .id("free-\(languageCode)-\(store.revision)")
                    case .path(let path):
                        SumPlayView(
                            path: path,
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { selection = nil },
                            speech: TikoScreenshotMode.isActive ? SumScreenshotSpeechService() : nil
                        )
                        .id("\(path.id)-\(languageCode)-\(store.revision)")
                    case nil:
                        SumHomeView(
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onSelect: { selection = $0 },
                            onEdit: { path in
                                editorInitialPath = path
                                showingPathManager = true
                            }
                        )
                    }
                }
            }
        )
        .tikoPopup(isPresented: $showingPathManager) {
            SumPathManagerSheet(
                store: store,
                i18n: i18n,
                languageCode: languageCode,
                onClose: {
                    showingPathManager = false
                    editorInitialPath = nil
                }
            )
        }
        .onAppear {
            i18n.setLanguage(languageCode)
            if TikoScreenshotMode.isActive {
                switch TikoScreenshotMode.scene {
                case "practice", "celebrate":
                    if let path = store.visiblePaths(language: languageCode, i18n: i18n).first {
                        selection = .path(path)
                    }
                case "keypad":
                    selection = .freePlay
                default:
                    break
                }
            }
        }
        .task {
            // Atlas voices need a session token; bootstrap a device identity on
            // first launch when none exists (same pattern as Say/Talk).
            if (try? TikoDeviceSessionStore().load())?.accessToken == nil,
               !TikoScreenshotMode.isActive {
                if let bundle = try? await TikoIdentityClient().bootstrapDevice(name: UIDevice.current.name, platform: "ios") {
                    try? TikoDeviceSessionStore().save(bundle)
                }
            }
            await store.hydrateMedia(language: languageCode)
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
    }
}

// MARK: - Home

struct SumHomeView: View {
    @ObservedObject var store: SumPathStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let onSelect: (SumView.Selection) -> Void
    let onEdit: (SumPath) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 240), spacing: 16)]
    private let appColor = SumAppConfig.app.appColor

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                freePlayTile
                ForEach(store.visiblePaths(language: languageCode, i18n: i18n)) { path in
                    pathTile(path)
                }
            }
            .padding(20)
        }
    }

    private var freePlayTile: some View {
        Button {
            onSelect(.freePlay)
        } label: {
            VStack(spacing: 10) {
                Image(systemName: "plus.forwardslash.minus")
                    .font(.system(size: 44, weight: .heavy))
                    .foregroundStyle(appColor.palette.primary)
                    .accessibilityHidden(true)
                Text(i18n.t("sum.home.freePlay"))
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity, minHeight: 150)
            .background(appColor.palette.primary.opacity(0.22))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.home.freePlay")
        .accessibilityLabel(i18n.t("sum.home.freePlay"))
    }

    private func pathTile(_ path: SumPath) -> some View {
        Button {
            onSelect(.path(path))
        } label: {
            VStack(spacing: 10) {
                ZStack {
                    if let imageURL = store.pathImages[path.id] {
                        TikoCachedRemoteImage(url: imageURL) {
                            Text(path.emoji).font(.system(size: 46))
                        }
                    } else {
                        Text(path.emoji).font(.system(size: 46))
                    }
                }
                .frame(width: 76, height: 76)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityHidden(true)
                Text(path.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, minHeight: 150)
            .padding(.horizontal, 8)
            .background(appColor.palette.primary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.path.\(path.id)")
        .accessibilityLabel(path.title)
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.6).onEnded { _ in
                let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                guard !isChild else { return }
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onEdit(path)
            }
        )
    }
}

// MARK: - Settings content (parent-facing, inside the shell settings sheet)

struct SumSettingsContent: View {
    @ObservedObject var i18n: TikoI18n
    @ObservedObject var store: SumPathStore
    let languageCode: String
    let onEditPaths: () -> Void

    @AppStorage(SumSettings.maxNumberKey) private var maxNumber = 20
    @AppStorage(SumSettings.minusEnabledKey) private var minusEnabled = true
    @AppStorage(SumSettings.timesEnabledKey) private var timesEnabled = true
    @AppStorage(SumSettings.divideEnabledKey) private var divideEnabled = true
    @AppStorage(SumSettings.answerModeKey) private var answerModeRaw = SumAnswerMode.choice.rawValue

    private let appColor = SumAppConfig.app.appColor

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button(action: onEditPaths) {
                HStack {
                    Image(systemName: "pencil")
                        .font(.system(size: 16, weight: .bold))
                    Text(i18n.t("sum.settings.editPaths"))
                        .font(.system(.body, design: .rounded).weight(.bold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 14)
                .background(appColor.palette.primary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)

            TikoFormField(label: i18n.t("sum.settings.maxNumber")) {
                Picker(i18n.t("sum.settings.maxNumber"), selection: $maxNumber) {
                    Text("10").tag(10)
                    Text("20").tag(20)
                    Text("100").tag(100)
                }
                .pickerStyle(.segmented)
            }

            VStack(alignment: .leading, spacing: 8) {
                TikoFieldLabel(i18n.t("sum.settings.operators"))
                operatorToggle("minus", isOn: $minusEnabled)
                operatorToggle("multiply", isOn: $timesEnabled)
                operatorToggle("divide", isOn: $divideEnabled)
            }

            VStack(alignment: .leading, spacing: 6) {
                TikoFieldLabel(i18n.t("sum.settings.answerMode"))
                Picker(i18n.t("sum.settings.answerMode"), selection: answerModeBinding) {
                    ForEach(SumAnswerMode.allCases, id: \.self) { mode in
                        Image(systemName: mode.systemImage).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                if answerModeBinding.wrappedValue == .voice {
                    Text(i18n.t("sum.settings.voiceAnswerHint"))
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            SumSpokenWordsEditor(i18n: i18n, store: store, languageCode: languageCode)
        }
    }

    /// Selecting the voice mode requests permissions right here, in the
    /// parent context — the child flow never prompts. Choice and type modes
    /// never touch the microphone at all.
    private var answerModeBinding: Binding<SumAnswerMode> {
        Binding(
            get: { SumAnswerMode(rawValue: answerModeRaw) ?? .choice },
            set: { mode in
                guard mode == .voice else {
                    answerModeRaw = mode.rawValue
                    return
                }
                Task { @MainActor in
                    let service = TikoSpeechPracticeService()
                    if service.permissionState() == .granted {
                        answerModeRaw = SumAnswerMode.voice.rawValue
                    } else if await service.requestPermissions() {
                        answerModeRaw = SumAnswerMode.voice.rawValue
                    }
                }
            }
        )
    }

    private func operatorToggle(_ symbol: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .heavy))
                .foregroundStyle(appColor.palette.primary)
        }
        .tint(appColor.palette.primary)
        .accessibilityLabel(symbol)
    }
}

/// Parent-editable operator pronunciation for the active language.
struct SumSpokenWordsEditor: View {
    @ObservedObject var i18n: TikoI18n
    @ObservedObject var store: SumPathStore
    let languageCode: String

    @State private var words: SumCatalog.OperatorWords?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TikoFieldLabel(i18n.t("sum.settings.spokenWords"))
            if let binding = wordsBinding {
                wordField("plus", text: binding.plus)
                wordField("minus", text: binding.minus)
                wordField("multiply", text: binding.times)
                wordField("divide", text: binding.dividedBy)
                wordField("equal", text: binding.equals)
            }
        }
        .onAppear {
            words = store.operatorWords(language: languageCode)
        }
    }

    private var wordsBinding: Binding<SumCatalog.OperatorWords>? {
        guard words != nil else { return nil }
        return Binding(
            get: { words ?? SumCatalog.defaultOperatorWords(language: languageCode) },
            set: { newValue in
                words = newValue
                store.setOperatorWords(newValue, language: languageCode)
            }
        )
    }

    private func wordField(_ symbol: String, text: Binding<String>) -> some View {
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(SumAppConfig.app.appColor.palette.primary)
                .frame(width: 26)
            TextField("", text: text)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .padding(10)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(symbol)
    }
}
