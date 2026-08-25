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
    /// The operator picked in the home header — remembered between launches so
    /// the child lands back on whatever they are working on.
    static let operatorChoiceKey = "tiko.sum.operatorChoice"
}

struct SumView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .sum)
    @StateObject private var store = SumPathStore()
    @State private var selection: Selection?
    @State private var showingPathManager = false

    @AppStorage(SumSettings.minusEnabledKey) private var minusEnabled = true
    @AppStorage(SumSettings.timesEnabledKey) private var timesEnabled = true
    @AppStorage(SumSettings.divideEnabledKey) private var divideEnabled = true
    @AppStorage(SumSettings.operatorChoiceKey) private var operatorChoiceRaw = SumOperator.plus.rawValue

    /// Home → tap a mode → play ten. The operator is already chosen, sitting in
    /// the home header where it stays put between rounds.
    enum Selection: Equatable {
        case freePlay
        case play(game: SumGame, spec: SumRunSpec?)
    }

    private var enabledOperators: [SumOperator] {
        SumOperator.enabled(minus: minusEnabled, times: timesEnabled, divide: divideEnabled)
    }

    /// The remembered choice, resolved against what the parent still allows —
    /// switching × off in settings must not leave × selected in the header.
    private var operatorChoice: Binding<SumOperatorChoice> {
        Binding(
            get: {
                let stored = SumOperatorChoice(storageValue: operatorChoiceRaw)
                if case .single(let op) = stored, !enabledOperators.contains(op) {
                    return .single(enabledOperators.first ?? .plus)
                }
                if case .mixed = stored, enabledOperators.count < 2 {
                    return .single(enabledOperators.first ?? .plus)
                }
                return stored
            },
            set: { operatorChoiceRaw = $0.storageValue }
        )
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
                            game: nil,
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { selection = nil },
                            speech: screenshotSpeech
                        )
                        .id("free-\(languageCode)-\(store.revision)")
                    case .play(let game, let spec):
                        SumPlayView(
                            game: game,
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { selection = nil },
                            regenerate: spec.map { s in { s.makeGame() } },
                            speech: screenshotSpeech
                        )
                        .id("\(game.id)-\(languageCode)-\(store.revision)")
                    case nil:
                        SumHomeView(
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            operatorChoice: operatorChoice,
                            enabledOperators: enabledOperators,
                            onSelect: { selection = $0 }
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
                onClose: { showingPathManager = false }
            )
        }
        .onAppear {
            i18n.setLanguage(languageCode)
            applyScreenshotScene()
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

    private var screenshotSpeech: TikoSpeechServicing? {
        TikoScreenshotMode.isActive ? SumScreenshotSpeechService() : nil
    }

    private func applyScreenshotScene() {
        guard TikoScreenshotMode.isActive else { return }
        switch TikoScreenshotMode.scene {
        case "practice", "celebrate":
            guard let preset = SumCatalog.ranges.first(where: { $0.id == "to10" }) ?? SumCatalog.presets.first else { return }
            let spec = SumRunSpec(preset: preset, operators: [.plus])
            selection = .play(game: spec.makeGame(), spec: spec)
        case "keypad":
            selection = .freePlay
        default:
            break
        }
    }
}

// MARK: - Home

/// The operator sits in the header and is remembered; everything below it is a
/// mode. Tapping a mode starts the ten straight away — there is no second
/// question to answer, because the answer to it is already on screen.
struct SumHomeView: View {
    @ObservedObject var store: SumPathStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    @Binding var operatorChoice: SumOperatorChoice
    let enabledOperators: [SumOperator]
    let onSelect: (SumView.Selection) -> Void

    private let columns = [GridItem(.adaptive(minimum: 132, maximum: 200), spacing: 14)]
    private let appColor = SumAppConfig.app.appColor

    var body: some View {
        VStack(spacing: 0) {
            operatorBar
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    section(i18n.t("sum.home.sectionRanges"), presets: SumCatalog.ranges)
                    section(i18n.t("sum.home.sectionBands"), presets: SumCatalog.bands)
                    section(i18n.t("sum.home.sectionFamilies"), presets: SumCatalog.families)
                    pathSection
                    freePlaySection
                }
                .padding(20)
            }
        }
    }

    // MARK: Operator header

    /// What we are practising, kept where the child can change it without
    /// leaving home. One tap, remembered for next time.
    private var operatorBar: some View {
        HStack(spacing: 10) {
            ForEach(enabledOperators, id: \.self) { op in
                operatorButton(
                    .single(op),
                    systemImage: op.systemImage,
                    identifier: "sum.op.\(op.rawValue)",
                    label: op.symbol
                )
            }
            if enabledOperators.count > 1 {
                operatorButton(
                    .mixed,
                    systemImage: "shuffle",
                    identifier: "sum.op.mixed",
                    label: i18n.t("sum.home.mixed")
                )
            }
        }
        .frame(maxWidth: 560)
        .padding(.horizontal, 20)
        .padding(.top, 4)
        .padding(.bottom, 14)
        .frame(maxWidth: .infinity)
        .accessibilityLabel(i18n.t("sum.home.operator"))
    }

    private func operatorButton(
        _ choice: SumOperatorChoice,
        systemImage: String,
        identifier: String,
        label: String
    ) -> some View {
        let isSelected = operatorChoice == choice
        return Button {
            operatorChoice = choice
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(isSelected ? .white : appColor.palette.primary)
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(isSelected ? appColor.palette.primary : appColor.palette.primary.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(identifier)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: Sections

    @ViewBuilder
    private func section(_ title: String, presets: [SumPreset]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title)
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(presets) { preset in
                    presetTile(preset)
                }
            }
        }
    }

    @ViewBuilder
    private var pathSection: some View {
        let paths = store.visiblePaths(language: languageCode)
        if !paths.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionHeader(i18n.t("sum.home.sectionPaths"))
                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(paths) { path in
                        pathTile(path)
                    }
                }
            }
        }
    }

    private var freePlaySection: some View {
        LazyVGrid(columns: columns, spacing: 14) {
            freePlayTile
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(.subheadline, design: .rounded).weight(.heavy))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .accessibilityAddTraits(.isHeader)
    }

    // MARK: Tiles

    private func presetTile(_ preset: SumPreset) -> some View {
        Button {
            let spec = SumRunSpec(
                preset: preset,
                operators: operatorChoice.operators(allowed: enabledOperators)
            )
            onSelect(.play(game: spec.makeGame(), spec: spec))
        } label: {
            VStack(spacing: 8) {
                tileImage(id: preset.id, emoji: preset.emoji)
                Text(preset.label(for: operatorChoice, familyFormat: i18n.t("sum.home.familyMixed")))
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .foregroundStyle(.primary)
            }
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity, minHeight: 142)
            .background(appColor.palette.primary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.preset.\(preset.id)")
        .accessibilityLabel(presetAccessibilityLabel(preset))
    }

    private func presetAccessibilityLabel(_ preset: SumPreset) -> String {
        switch preset.kind {
        case .range(let low, let high) where low <= 1:
            return i18n.t("sum.home.upTo", ["n": high])
        case .range(let low, let high):
            return i18n.t("sum.home.range", ["min": low, "max": high])
        case .family:
            return preset.label(for: operatorChoice, familyFormat: i18n.t("sum.home.familyMixed"))
        }
    }

    private func pathTile(_ path: SumPath) -> some View {
        Button {
            onSelect(.play(game: SumGame(path: path), spec: nil))
        } label: {
            VStack(spacing: 10) {
                tileImage(id: path.id, emoji: path.emoji)
                Text(path.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, minHeight: 142)
            .padding(.horizontal, 8)
            .background(appColor.palette.primary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.path.\(path.id)")
        .accessibilityLabel(path.title)
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
            .frame(maxWidth: .infinity, minHeight: 142)
            .background(appColor.palette.primary.opacity(0.22))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.home.freePlay")
        .accessibilityLabel(i18n.t("sum.home.freePlay"))
    }

    @ViewBuilder
    private func tileImage(id: String, emoji: String) -> some View {
        ZStack {
            if let imageURL = store.tileImages[id] {
                TikoCachedRemoteImage(url: imageURL) {
                    Text(emoji).font(.system(size: 40))
                }
            } else {
                Text(emoji).font(.system(size: 40))
            }
        }
        .frame(width: 62, height: 62)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityHidden(true)
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
