import SwiftUI
import TikoKit
import UIKit

// MARK: - Data model

struct YesNoAnswerTile: Codable, Identifiable, Equatable {
    var id: String
    var label: String
    var speech: String
    var labelTranslations: [String: String]?
    var speechTranslations: [String: String]?
    var color: String
    var imageRef: String?
    var icon: String?

    var answerChoice: TikoAnswerChoice {
        TikoAnswerChoice(
            id: id,
            label: label,
            speech: speech,
            icon: .openIcon(icon ?? "ui/check-fat"),
            tone: .primary,
            color: color,
            imageRef: imageRef
        )
    }

    init(
        id: String,
        label: String,
        speech: String,
        labelTranslations: [String: String]? = nil,
        speechTranslations: [String: String]? = nil,
        color: String,
        imageRef: String? = nil,
        icon: String? = nil
    ) {
        self.id = id
        self.label = label
        self.speech = speech
        self.labelTranslations = labelTranslations
        self.speechTranslations = speechTranslations
        self.color = color
        self.imageRef = imageRef
        self.icon = icon
    }

    private enum CodingKeys: String, CodingKey {
        case id, label, speech, labelTranslations, speechTranslations, color, imageRef, icon
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        label = try container.decode(String.self, forKey: .label)
        speech = try container.decodeIfPresent(String.self, forKey: .speech) ?? label
        labelTranslations = try container.decodeIfPresent([String: String].self, forKey: .labelTranslations)
        speechTranslations = try container.decodeIfPresent([String: String].self, forKey: .speechTranslations)
        color = try container.decodeIfPresent(String.self, forKey: .color) ?? TikoColors.teal.name
        imageRef = try container.decodeIfPresent(String.self, forKey: .imageRef)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(label, forKey: .label)
        try container.encode(speech, forKey: .speech)
        try container.encodeIfPresent(labelTranslations, forKey: .labelTranslations)
        try container.encodeIfPresent(speechTranslations, forKey: .speechTranslations)
        try container.encode(color, forKey: .color)
        try container.encodeIfPresent(imageRef, forKey: .imageRef)
        try container.encodeIfPresent(icon, forKey: .icon)
    }
}

struct YesNoAnswerSet: Codable, Identifiable, Equatable {
    var id: String
    var title: String
    var description: String?
    var color: String?
    var imageRef: String?
    var order: Int
    var answers: [YesNoAnswerTile]

    init(id: String, title: String, description: String? = nil, color: String? = nil, imageRef: String? = nil, order: Int = 0, answers: [YesNoAnswerTile]) {
        self.id = id
        self.title = title
        self.description = description
        self.color = color
        self.imageRef = imageRef
        self.order = order
        self.answers = answers
    }
}

private let yesNoContentAPIBase = "https://content.tikoapi.org/v1"

private func yesNoImageURL(for imageRef: String?) -> URL? {
    guard let imageRef, !imageRef.isEmpty else { return nil }
    if imageRef.hasPrefix("http") { return URL(string: imageRef) }
    return URL(string: "\(yesNoContentAPIBase)/content/images/\(imageRef)")
}
private let builtInAnswerTranslations: [String: [String: String]] = [
    "yes": ["nl": "Ja", "fr": "Oui", "es": "Sí", "mt": "Iva", "de": "Ja"],
    "no": ["nl": "Nee", "fr": "Non", "es": "No", "mt": "Le", "de": "Nein"],
    "help": ["nl": "Help", "fr": "Aide", "es": "Ayuda", "mt": "Għajnuna", "de": "Hilfe"],
    "more": ["nl": "Meer", "fr": "Encore", "es": "Más", "mt": "Iktar", "de": "Mehr"],
    "stop": ["nl": "Stop", "fr": "Arrêter", "es": "Parar", "mt": "Waqqaf", "de": "Stopp"],
    "finished": ["nl": "Klaar", "fr": "Terminé", "es": "Terminado", "mt": "Lest", "de": "Fertig"],
    "maybe": ["nl": "Misschien", "fr": "Peut-être", "es": "Quizás", "mt": "Forsi", "de": "Vielleicht"],
    "later": ["nl": "Later", "fr": "Plus tard", "es": "Más tarde", "mt": "Aktar tard", "de": "Später"],
]

private func builtInAnswerTile(id: String, label: String, color: String, icon: String, imageRef: String? = nil) -> YesNoAnswerTile {
    let translations = builtInAnswerTranslations[id]
    return YesNoAnswerTile(
        id: id,
        label: label,
        speech: label,
        labelTranslations: translations,
        speechTranslations: translations,
        color: color,
        imageRef: imageRef,
        icon: icon
    )
}

private let builtInAnswerSets: [YesNoAnswerSet] = [
    YesNoAnswerSet(
        id: "yes-no",
        title: "Yes / No",
        description: "Simple yes and no answers.",
        color: TikoColors.green.name,
        order: 0,
        answers: [
            builtInAnswerTile(id: "yes", label: "Yes", color: TikoColors.green.name, icon: "ui/check-fat", imageRef: "c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec"),
            builtInAnswerTile(id: "no", label: "No", color: TikoColors.red.name, icon: "wayfinding/cross", imageRef: "c3c40f22-8968-413c-82d5-8cbd5bf57c55")
        ]
    ),
    YesNoAnswerSet(
        id: "basic-needs",
        title: "Basic needs",
        description: "Common needs and requests.",
        color: TikoColors.teal.name,
        order: 1,
        answers: [
            builtInAnswerTile(id: "help", label: "Help", color: TikoColors.blue.name, icon: "ui/pointer-hand"),
            builtInAnswerTile(id: "more", label: "More", color: TikoColors.teal.name, icon: "ui/add-fat"),
            builtInAnswerTile(id: "stop", label: "Stop", color: TikoColors.orange.name, icon: "ui/pointer-cross"),
            builtInAnswerTile(id: "finished", label: "Finished", color: TikoColors.purple.name, icon: "ui/check-fat")
        ]
    ),
    YesNoAnswerSet(
        id: "quick-choices",
        title: "Quick choices",
        description: "Fast everyday responses.",
        color: TikoColors.yellow.name,
        order: 2,
        answers: [
            builtInAnswerTile(id: "yes", label: "Yes", color: TikoColors.green.name, icon: "ui/check-fat"),
            builtInAnswerTile(id: "no", label: "No", color: TikoColors.red.name, icon: "wayfinding/cross"),
            builtInAnswerTile(id: "maybe", label: "Maybe", color: TikoColors.yellow.name, icon: "ui/question-mark-fat"),
            builtInAnswerTile(id: "later", label: "Later", color: TikoColors.purple.name, icon: "ui/clock")
        ]
    )
]

// MARK: - Store

@MainActor
final class YesNoStore: ObservableObject {
    @Published var defaultAnswers: [YesNoAnswerTile] = []
    @Published var defaultSets: [YesNoAnswerSet] = builtInAnswerSets
    @Published var defaultSelectedSetId: String?

    func fetchDefaults(languageCode: String = "en") async {
        guard var components = URLComponents(string: "\(yesNoContentAPIBase)/yes-no/content") else { return }
        components.queryItems = [URLQueryItem(name: "language", value: languageCode)]
        guard let url = components.url else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return }
            let decoded = try JSONDecoder().decode(DefaultsResponse.self, from: data)
            defaultAnswers = decoded.data.answers ?? []
            defaultSelectedSetId = decoded.data.selectedSetId
            if let answerSets = decoded.data.answerSets, !answerSets.isEmpty {
                defaultSets = answerSets.sorted { $0.order < $1.order }
            } else if !defaultAnswers.isEmpty {
                defaultSets = [
                    YesNoAnswerSet(id: "default", title: "Default", color: TikoColors.teal.name, order: 0, answers: defaultAnswers)
                ]
            }
        } catch {}
    }

    private struct DefaultsResponse: Decodable {
        let data: StatePayload
        struct StatePayload: Decodable {
            let answers: [YesNoAnswerTile]?
            let answerSets: [YesNoAnswerSet]?
            let selectedSetId: String?
        }
    }
}

// MARK: - Main view

struct YesNoView: View {
    private let speechService = YesNoSpeechService()

    @AppStorage("yesno.sentence") private var sentence = ""
    @AppStorage("yesno.speechEnabled") private var speechEnabled = true
    @AppStorage("yesno.choiceStyle") private var choiceStyleRawValue = TikoChoiceStyle.tiles.rawValue
    @AppStorage("yesno.labelSizeIndex") private var labelSizeIndex = 2
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.system.rawValue
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("yesno.questionHistory") private var historyData = Data()
    @AppStorage("yesno.customAnswers") private var customAnswersData = Data()
    @AppStorage("yesno.customAnswerSets") private var customAnswerSetsData = Data()
    @AppStorage("yesno.selectedAnswerSetId") private var selectedAnswerSetId = ""

    @StateObject private var i18n = TikoI18n(app: .yesNo)
    @StateObject private var store = YesNoStore()

    @State private var history: [String] = []
    @State private var customAnswers: [YesNoAnswerTile] = []
    @State private var customAnswerSets: [YesNoAnswerSet] = []
    @State private var feedbackBackground: Color?
    @State private var showingHistory = false
    @State private var showingChoiceStyle = false
    @State private var showingTileEditor = false
    @State private var sentenceSpeechState: YesNoSpeechPlaybackState = .idle

    private var defaultSentence: String { i18n.t("yesNo.sentence.default") }

    private var effectiveSentence: String {
        sentence.isEmpty ? defaultSentence : sentence
    }

    private var shellBackground: Color {
        feedbackBackground ?? Color(red: 0.973, green: 0.965, blue: 0.945)
    }

    private var darkShellBackground: Color {
        feedbackBackground ?? Color(red: 0.08, green: 0.055, blue: 0.095)
    }

    private var effectiveColorScheme: ColorScheme {
        (TikoColorMode(rawValue: colorModeRawValue) ?? .light) == .dark ? .dark : .light
    }

    private var fieldBackground: Color {
        effectiveColorScheme == .dark ? .white.opacity(0.12) : .white.opacity(0.68)
    }

    private var clearButtonForeground: Color {
        effectiveColorScheme == .dark ? .white.opacity(0.72) : Color(hex: 0x0b5a7a).opacity(0.65)
    }

    private var clearButtonBackground: Color {
        effectiveColorScheme == .dark ? .white.opacity(0.12) : .white.opacity(0.36)
    }

    private var speakButtonBackground: Color {
        switch sentenceSpeechState {
        case .idle:
            return Color(hex: 0x93ee3f)
        case .generating:
            return Color(hex: 0x0b5a7a)
        case .playing:
            return Color(hex: 0x006c67)
        }
    }

    @ViewBuilder
    private var speakButtonContent: some View {
        switch sentenceSpeechState {
        case .generating:
            ProgressView()
                .progressViewStyle(.circular)
                .tint(.white)
        case .playing:
            Image(systemName: "waveform")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)
        case .idle:
            Image(systemName: "speaker.wave.2.fill")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)
        }
    }

    private var choiceStyle: TikoChoiceStyle {
        TikoChoiceStyle(rawValue: choiceStyleRawValue) ?? .tiles
    }

    private var labelFont: Font {
        switch labelSizeIndex {
        case 0: return Font.system(.caption, design: .rounded).weight(.heavy)
        case 1: return Font.system(.title3, design: .rounded).weight(.heavy)
        default: return Font.system(.title2, design: .rounded).weight(.heavy)
        }
    }

    private var hardcodedChoices: [TikoAnswerChoice] {
        [
            TikoAnswerChoice(id: "yes", label: i18n.t("yesNo.answers.yes"), icon: .openIcon("ui/check-fat"), tone: .primary, imageRef: "c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec"),
            TikoAnswerChoice(id: "no", label: i18n.t("yesNo.answers.no"), icon: .openIcon("wayfinding/cross"), tone: .secondary, imageRef: "c3c40f22-8968-413c-82d5-8cbd5bf57c55")
        ]
    }

    private var availableAnswerSets: [YesNoAnswerSet] {
        let sets = !customAnswerSets.isEmpty ? customAnswerSets : store.defaultSets
        return sets.isEmpty ? builtInAnswerSets : sets.sorted { $0.order < $1.order }
    }

    private var selectedAnswerSet: YesNoAnswerSet {
        availableAnswerSets.first { $0.id == selectedAnswerSetId } ?? availableAnswerSets.first ?? builtInAnswerSets[0]
    }

    private var effectiveChoices: [TikoAnswerChoice] {
        if !selectedAnswerSet.answers.isEmpty { return selectedAnswerSet.answers.map(localizedAnswerTile).map(\.answerChoice) }
        if !customAnswers.isEmpty { return customAnswers.map(localizedAnswerTile).map(\.answerChoice) }
        if !store.defaultAnswers.isEmpty { return store.defaultAnswers.map(localizedAnswerTile).map(\.answerChoice) }
        return hardcodedChoices
    }

    private func localizedAnswerTile(_ tile: YesNoAnswerTile) -> YesNoAnswerTile {
        var next = tile
        let label = tile.labelTranslations?[languageCode] ?? tile.label
        next.label = label
        next.speech = tile.speechTranslations?[languageCode] ?? tile.speech
        return next
    }

    var body: some View {
        TikoAppShell(
            appConfig: YesNoAppConfig.app,
            appName: i18n.t("yesNo.settings.title"),
            backgroundColor: shellBackground,
            darkBackgroundColor: darkShellBackground,
            actions: [
                TikoHeaderAction(id: "history", label: i18n.t("yesNo.history.title"), systemImage: "clock", isActive: showingHistory)
            ],
            onAction: handleHeaderAction,
            onAccountDeleted: { resetLocalDataToDefaults() },
            onLoggedOut: { resetLocalDataToDefaults() },
            settingsContent: {
                TikoSettingsSection(title: i18n.t("yesNo.settings.title")) {
                    TikoSettingsToggleRow(title: i18n.t("yesNo.settings.speakAnswers"), icon: "speaker.wave.2.fill", appColor: .yesNo, isOn: $speechEnabled)
                    TikoSettingsActionRow(
                        title: i18n.t("yesNo.settings.answerStyle"),
                        value: choiceStyle.title,
                        icon: choiceStyle.icon,
                        appColor: .yesNo
                    ) {
                        showingChoiceStyle = true
                    }
                    TikoSettingsActionRow(
                        title: i18n.t("yesNo.settings.answerTiles"),
                        value: selectedAnswerSet.title,
                        icon: "square.grid.2x2",
                        appColor: .yesNo
                    ) {
                        showingTileEditor = true
                    }
                    TikoSettingsSizeRow(
                        title: i18n.t("yesNo.settings.labelSize"),
                        icon: "textformat.size",
                        appColor: .yesNo,
                        selectedIndex: $labelSizeIndex
                    )
                }
            }
        ) {
            VStack(spacing: 22) {
                TextField("Sentence", text: $sentence, axis: .vertical)
                    .font(.system(.title2, design: .rounded).weight(.semibold))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .foregroundStyle(.primary)
                    .background(fieldBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal, 24)

                HStack(spacing: 12) {
                    Button(action: speakSentence) {
                        speakButtonContent
                            .frame(width: 56, height: 56)
                            .background(speakButtonBackground)
                            .clipShape(Circle())
                            .shadow(
                                color: speakButtonBackground.opacity(sentenceSpeechState == .idle ? 0.0 : 0.32),
                                radius: sentenceSpeechState == .idle ? 0 : 10,
                                y: sentenceSpeechState == .idle ? 0 : 4
                            )
                    }
                    .disabled(!speechEnabled || sentenceSpeechState != .idle || effectiveSentence.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel("Speak sentence")
                    .accessibilityValue(sentenceSpeechState == .generating ? "Generating" : sentenceSpeechState == .playing ? "Playing" : "")

                    Button(action: { sentence = "" }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundStyle(clearButtonForeground)
                            .frame(width: 44, height: 44)
                            .background(clearButtonBackground)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Clear sentence")
                }

                TikoChoiceGrid(choices: effectiveChoices, style: choiceStyle, labelFont: labelFont, onSelect: selectChoice)
            }
            .padding(.top, 18)
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            loadHistory()
            loadCustomAnswers()
            loadCustomAnswerSets()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
            Task {
                await store.fetchDefaults(languageCode: code)
            }
        }
        .task {
            // App Store capture: render a fixed, offline-stable scene and skip
            // the network fetch so screenshots are deterministic. Other apps
            // follow the same TikoScreenshotMode pattern in their root view.
            if TikoScreenshotMode.isActive {
                selectedAnswerSetId = TikoScreenshotMode.scene == "answered" ? "yes-no" : "yes-no"
                return
            }
            await store.fetchDefaults(languageCode: languageCode)
            if customAnswerSets.isEmpty {
                if let defaultSelected = store.defaultSelectedSetId,
                   availableAnswerSets.contains(where: { $0.id == defaultSelected }) {
                    selectedAnswerSetId = defaultSelected
                } else if !availableAnswerSets.contains(where: { $0.id == selectedAnswerSetId }) {
                    selectedAnswerSetId = availableAnswerSets.first?.id ?? ""
                }
            }
        }
        .tikoPopup(isPresented: $showingHistory) {
            QuestionHistorySheet(questions: history) { question in
                sentence = question
                showingHistory = false
            } onClose: {
                showingHistory = false
            }
            .environmentObject(i18n)
        }
        .tikoPopup(isPresented: $showingChoiceStyle) {
            ChoiceStyleSheet(selectedStyle: choiceStyle) { style in
                choiceStyleRawValue = style.rawValue
                showingChoiceStyle = false
            } onClose: {
                showingChoiceStyle = false
            }
            .environmentObject(i18n)
        }
        .tikoPopup(isPresented: $showingTileEditor) {
            TileEditorSheet(
                answerSets: customAnswerSets.isEmpty ? availableAnswerSets : customAnswerSets,
                selectedSetId: selectedAnswerSet.id,
                onSave: { sets, selected in
                    customAnswerSets = sets
                    selectedAnswerSetId = selected ?? sets.first?.id ?? ""
                    customAnswers = []
                    saveCustomAnswerSets()
                    saveCustomAnswers()
                    showingTileEditor = false
                },
                onPersist: { sets, selected in
                    customAnswerSets = sets
                    selectedAnswerSetId = selected ?? sets.first?.id ?? ""
                    customAnswers = []
                    saveCustomAnswerSets()
                    saveCustomAnswers()
                },
                onClose: { showingTileEditor = false }
            )
            .environmentObject(i18n)
        }
    }

    private func handleHeaderAction(_ id: String) {
        switch id {
        case "history": showingHistory.toggle()
        default: break
        }
    }

    private func selectChoice(_ choice: TikoAnswerChoice) {
        UIImpactFeedbackGenerator(style: choice.tone == .primary ? .medium : .rigid).impactOccurred()
        rememberCurrentQuestion()
        flashBackground(for: choice)
        if speechEnabled {
            speechService.speak(choice.speech, languageCode: languageCode)
        }
    }

    private func speakSentence() {
        guard speechEnabled, sentenceSpeechState == .idle else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        rememberCurrentQuestion()
        speechService.speak(effectiveSentence, languageCode: languageCode) { state in
            sentenceSpeechState = state
        }
    }

    private func rememberCurrentQuestion() {
        let question = effectiveSentence.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty else { return }
        history.removeAll { $0.caseInsensitiveCompare(question) == .orderedSame }
        history.insert(question, at: 0)
        if history.count > 12 { history.removeLast(history.count - 12) }
        saveHistory()
    }

    private func flashBackground(for choice: TikoAnswerChoice) {
        let base: Color
        if let color = choice.color, let parsed = TikoColors.color(named: color) {
            base = parsed
        } else {
            base = choice.tone == .primary ? Color(hex: 0x93ee3f) : Color(hex: 0xef405d)
        }
        let opacity = effectiveColorScheme == .dark ? 0.18 : 0.24
        withAnimation(.easeInOut(duration: 0.18)) { feedbackBackground = base.opacity(opacity) }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 650_000_000)
            withAnimation(.easeInOut(duration: 0.45)) { feedbackBackground = nil }
        }
    }

    private func loadHistory() {
        history = (try? JSONDecoder().decode([String].self, from: historyData)) ?? []
    }

    private func saveHistory() {
        historyData = (try? JSONEncoder().encode(history)) ?? Data()
    }

    private func loadCustomAnswers() {
        customAnswers = (try? JSONDecoder().decode([YesNoAnswerTile].self, from: customAnswersData)) ?? []
    }

    private func saveCustomAnswers() {
        customAnswersData = (try? JSONEncoder().encode(customAnswers)) ?? Data()
    }

    private func loadCustomAnswerSets() {
        customAnswerSets = (try? JSONDecoder().decode([YesNoAnswerSet].self, from: customAnswerSetsData)) ?? []
        if customAnswerSets.isEmpty, !customAnswers.isEmpty {
            customAnswerSets = [
                YesNoAnswerSet(id: "custom", title: "Custom answers", color: TikoColors.teal.name, order: 0, answers: customAnswers)
            ]
        }
        if selectedAnswerSetId.isEmpty {
            selectedAnswerSetId = (customAnswerSets.first ?? store.defaultSets.first ?? builtInAnswerSets.first)?.id ?? ""
        }
    }

    private func saveCustomAnswerSets() {
        customAnswerSetsData = (try? JSONEncoder().encode(customAnswerSets)) ?? Data()
    }

    /// Called by the shell on logout and account deletion: wipe this user's
    /// content and reset settings to their defaults so the next user doesn't
    /// inherit the previous user's state. (Shared device-level prefs like
    /// tiko.language / tiko.colorMode are intentionally left untouched.)
    private func resetLocalDataToDefaults() {
        // Content
        sentence = ""
        historyData = Data()
        customAnswersData = Data()
        customAnswerSetsData = Data()
        selectedAnswerSetId = ""

        // Settings → declared defaults
        speechEnabled = true
        choiceStyleRawValue = TikoChoiceStyle.tiles.rawValue
        labelSizeIndex = 2

        // Shared device-level prefs → device defaults (language follows the
        // device locale / English; colour mode follows the device appearance).
        TikoDeviceDefaults.resetSharedPreferences()

        // Refresh in-memory state (rebuilds the default answer set, etc.)
        loadHistory()
        loadCustomAnswers()
        loadCustomAnswerSets()
    }
}

// MARK: - Choice style sheet

private struct ChoiceStyleSheet: View {
    let selectedStyle: TikoChoiceStyle
    let onSelect: (TikoChoiceStyle) -> Void
    let onClose: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    var body: some View {
        TikoPopupCard(
            title: i18n.t("yesNo.answerStyle.popup.title"),
            subtitle: i18n.t("yesNo.answerStyle.popup.subtitle"),
            icon: "square.grid.2x2.fill",
            appColor: .yesNo,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                ForEach(TikoChoiceStyle.allCases, id: \.rawValue) { style in
                    Button { onSelect(style) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: style.icon)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                                .frame(width: 40, height: 40)
                                .background(TikoAppColor.yesNo.palette.primary.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            Text(style.title)
                                .font(.system(size: 17, weight: .heavy, design: .rounded))
                                .foregroundStyle(.primary)
                            Spacer()
                            if style == selectedStyle {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                            }
                        }
                        .padding(14)
                        .background(Color(.systemBackground))
                        .overlay { RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.primary.opacity(0.08), lineWidth: 1) }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - Question history sheet

private struct QuestionHistorySheet: View {
    let questions: [String]
    let onSelect: (String) -> Void
    let onClose: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    var body: some View {
        TikoPopupCard(
            title: i18n.t("yesNo.history.popup.title"),
            subtitle: i18n.t("yesNo.history.popup.subtitle"),
            icon: "clock",
            appColor: .yesNo,
            onClose: onClose
        ) {
            if questions.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "text.bubble")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(Color(hex: 0x0b5a7a).opacity(0.45))
                    Text(i18n.t("yesNo.question.empty"))
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    Text(i18n.t("yesNo.question.hint"))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(questions, id: \.self) { question in
                            Button { onSelect(question) } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "questionmark.bubble.fill")
                                        .font(.system(size: 17, weight: .bold))
                                        .foregroundStyle(Color(hex: 0x93ee3f))
                                        .frame(width: 34, height: 34)
                                        .background(Color(hex: 0x93ee3f).opacity(0.14))
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    Text(question)
                                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                                        .foregroundStyle(.primary)
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                    Image(systemName: "arrow.up.left")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                                .padding(14)
                                .background(Color(.systemBackground))
                                .overlay { RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.primary.opacity(0.08), lineWidth: 1) }
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }
                .scrollIndicators(.hidden)
                .frame(maxHeight: 430)
            }
        }
    }
}

// MARK: - Tile editor sheet

private struct TileEditorSheet: View {
    let onSave: ([YesNoAnswerSet], String?) -> Void
    let onPersist: ([YesNoAnswerSet], String?) -> Void
    let onClose: () -> Void

    @EnvironmentObject private var i18n: TikoI18n
    @State private var sets: [YesNoAnswerSet]
    @State private var selectedSetId: String
    @State private var builderPresentation: BuilderPresentation?
    @State private var pendingScrollSetId: String?

    private enum BuilderPresentation: Identifiable {
        case create
        case edit(YesNoAnswerSet)
        var id: String {
            switch self {
            case .create: return "__create__"
            case .edit(let set): return "edit-\(set.id)"
            }
        }
    }

    init(answerSets: [YesNoAnswerSet], selectedSetId: String, onSave: @escaping ([YesNoAnswerSet], String?) -> Void, onPersist: @escaping ([YesNoAnswerSet], String?) -> Void, onClose: @escaping () -> Void) {
        self.onSave = onSave
        self.onPersist = onPersist
        self.onClose = onClose
        let initialSets = answerSets.isEmpty ? builtInAnswerSets : answerSets
        _sets = State(initialValue: initialSets)
        _selectedSetId = State(initialValue: initialSets.contains { $0.id == selectedSetId } ? selectedSetId : initialSets.first?.id ?? "")
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("yesNo.tileEditor.title"),
            subtitle: i18n.t("yesNo.tileEditor.subtitle"),
            icon: "square.grid.2x2",
            appColor: .yesNo,
            onClose: onClose
        ) {
            VStack(spacing: 12) {
                if sets.isEmpty {
                    VStack(spacing: 8) {
                        Text("No answer sets yet.")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                ForEach(Array(sets.enumerated()), id: \.element.id) { index, set in
                                    setRow(set: set, index: index)
                                        .id(set.id)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                        .scrollIndicators(.hidden)
                        .frame(maxHeight: 420)
                        .onChange(of: pendingScrollSetId) { _, id in
                            guard let id else { return }
                            withAnimation(.snappy) {
                                proxy.scrollTo(id, anchor: .center)
                            }
                        }
                    }
                }

                HStack(spacing: 10) {
                    Button { startNewSet() } label: {
                        Text("Add set")
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                            .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(TikoAppColor.yesNo.palette.primary.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button { resetSets() } label: {
                        Text(i18n.t("yesNo.tileEditor.reset"))
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 14)
                            .background(Color(.systemFill))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                Button { onSave(normalizedSets, selectedSetId) } label: {
                    Text(i18n.t("yesNo.tileEditor.save"))
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(TikoAppColor.yesNo.palette.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(item: $builderPresentation) { presentation in
            let editSet: YesNoAnswerSet? = {
                if case .edit(let s) = presentation { return s }
                return nil
            }()
            SetBuilderView(set: editSet) { saved in
                upsert(saved)
            }
        }
    }

    private var normalizedSets: [YesNoAnswerSet] {
        sets.enumerated().map { index, set in
            var next = set
            next.order = index
            return next
        }
    }

    private func persist() {
        onPersist(normalizedSets, selectedSetId)
    }

    private func startNewSet() {
        builderPresentation = .create
    }

    private func resetSets() {
        sets = builtInAnswerSets
        selectedSetId = builtInAnswerSets.first?.id ?? ""
        persist()
    }

    private func upsert(_ set: YesNoAnswerSet) {
        if let i = sets.firstIndex(where: { $0.id == set.id }) {
            sets[i] = set
        } else {
            var next = set
            next.order = sets.count
            sets.append(next)
            selectedSetId = next.id
            pendingScrollSetId = next.id
        }
        persist()
    }

    private func removeSet(at index: Int) {
        guard sets.indices.contains(index) else { return }
        let removed = sets.remove(at: index)
        if selectedSetId == removed.id {
            selectedSetId = sets.first?.id ?? ""
        }
        persist()
    }

    private func setRow(set: YesNoAnswerSet, index: Int) -> some View {
        HStack(spacing: 12) {
            setThumb(set)

            VStack(alignment: .leading, spacing: 2) {
                Text(set.title)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(.primary)
                Text("\(set.answers.count) tiles")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            Button { selectedSetId = set.id; persist() } label: {
                Image(systemName: selectedSetId == set.id ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(TikoAppColor.yesNo.palette.primary)
            }
            .buttonStyle(.plain)

            Button { builderPresentation = .edit(set) } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 30, height: 30)
                    .background(Color(.systemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)

            Button { removeSet(at: index) } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.red.opacity(0.7))
                    .frame(width: 30, height: 30)
                    .background(Color.red.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color(.systemBackground))
        .overlay { RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.primary.opacity(0.08), lineWidth: 1) }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @ViewBuilder
    private func setThumb(_ set: YesNoAnswerSet) -> some View {
        let color = TikoColors.color(named: set.color ?? "") ?? Color(hexString: set.color ?? "") ?? TikoAppColor.yesNo.palette.primary
        if let ref = set.imageRef, !ref.isEmpty {
            TikoMediaImage(imageRef: ref) { color.opacity(0.18) }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color)
                .frame(width: 44, height: 44)
        }
    }

}

// MARK: - Set builder

/// Full-screen builder for creating or editing one answer set: a title at the top,
/// a grid of its tiles with an empty "add tile" placeholder, set colour + image, and
/// a Save button that commits the whole set in one action.
private struct SetBuilderView: View {
    let isNew: Bool
    let onSave: (YesNoAnswerSet) -> Void

    @State private var id: String
    @State private var title: String
    @State private var description: String
    @State private var color: String
    @State private var imageURL: URL?
    @State private var imageRef: String?
    @State private var order: Int
    @State private var tiles: [YesNoAnswerTile]
    @FocusState private var titleFocused: Bool
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var i18n: TikoI18n

    init(set: YesNoAnswerSet?, onSave: @escaping (YesNoAnswerSet) -> Void) {
        self.onSave = onSave
        self.isNew = (set == nil)
        let base = set ?? YesNoAnswerSet(
            id: "set-\(UUID().uuidString.prefix(8))",
            title: "",
            color: TikoColors.teal.name,
            order: 0,
            answers: []
        )
        _id = State(initialValue: base.id)
        _title = State(initialValue: base.title)
        _description = State(initialValue: base.description ?? "")
        _color = State(initialValue: base.color ?? TikoColors.teal.name)
        _imageRef = State(initialValue: base.imageRef)
        _imageURL = State(initialValue: nil)
        _order = State(initialValue: base.order)
        _tiles = State(initialValue: base.answers)
    }

    private let columns = [GridItem(.adaptive(minimum: 96), spacing: 12)]

    private enum SheetDest: Identifiable {
        case tileEditor(YesNoAnswerTile)
        case mediaPicker
        var id: String {
            switch self {
            case .tileEditor(let t): return "tile-\(t.id)"
            case .mediaPicker: return "media"
            }
        }
    }
    @State private var sheetDest: SheetDest?

    var body: some View {
        TikoFormSheet(
            title: isNew ? i18n.t("yesNo.sheet.newSet") : i18n.t("yesNo.sheet.editSet"),
            icon: "square.grid.2x2.fill",
            appColor: .yesNo,
            onClose: { dismiss() }
        ) {
            VStack(spacing: 14) {
                titleField
                tilesSection
                TikoCompactColorPicker(selectedColor: $color, label: i18n.t("yesNo.sheet.color"), appColor: .yesNo)
                imageSection
                TikoActionButton(
                    label: i18n.t("yesNo.tileEditor.save"),
                    appColor: .yesNo,
                    disabled: title.trimmingCharacters(in: .whitespaces).isEmpty
                ) { save() }
            }
        }
        .sheet(item: $sheetDest) { dest in
            switch dest {
            case .tileEditor(let tile):
                TileDetailEditView(
                    tile: tile,
                    onSave: { updated in
                        if let i = tiles.firstIndex(where: { $0.id == updated.id }) {
                            tiles[i] = updated
                        } else {
                            tiles.append(updated)
                        }
                        sheetDest = nil
                    },
                    onCancel: { sheetDest = nil }
                )
            case .mediaPicker:
                TikoMediaPickerSheet(
                    appColor: .yesNo,
                    title: i18n.t("yesNo.sheet.pickImage"),
                    onSelectMedia: { selection in
                        imageRef = selection.id
                        imageURL = selection.url
                        if let id = selection.id {
                            Task { await MediaImageResolver.shared.cache(id, url: selection.url) }
                        }
                        sheetDest = nil
                    },
                    onClose: { sheetDest = nil }
                )
                .presentationDetents([.large])
            }
        }
        .onAppear { if isNew { titleFocused = true } }
        .task(id: imageRef) {
            if let imageRef, imageURL == nil {
                imageURL = await MediaImageResolver.shared.resolve(imageRef)
            }
        }
    }

    // MARK: Sections

    private var titleField: some View {
        TikoFormField(label: i18n.t("yesNo.sheet.setName")) {
            TextField(i18n.t("yesNo.sheet.setNamePlaceholder"), text: $title)
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .focused($titleFocused)
        }
    }

    private var tilesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            TikoFieldLabel(i18n.t("yesNo.sheet.tiles"))
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(tiles) { tile in
                    tileCell(tile)
                        .onTapGesture { sheetDest = .tileEditor(tile) }
                        .contextMenu {
                            Button(role: .destructive) { removeTile(tile) } label: {
                                Label(i18n.t("yesNo.sheet.delete"), systemImage: "trash")
                            }
                        }
                }
                addTileCell
                    .onTapGesture { addTile() }
            }
        }
    }

    private var imageSection: some View {
        VStack(alignment: .leading, spacing: 7) {
            TikoFieldLabel(i18n.t("yesNo.sheet.image"))
            TikoImagePickerButton(
                selectedURL: imageURL,
                appColor: .yesNo,
                addLabel: i18n.t("yesNo.sheet.addImage"),
                changeLabel: i18n.t("yesNo.sheet.changeImage"),
                action: { sheetDest = .mediaPicker }
            )
        }
    }

    // MARK: Tile cells

    private func tileCell(_ tile: YesNoAnswerTile) -> some View {
        let tileColor = TikoColors.color(named: tile.color) ?? Color(hexString: tile.color) ?? TikoAppColor.yesNo.palette.primary
        return VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(tileColor)
                .frame(height: 80)
                .overlay {
                    if let ref = tile.imageRef, !ref.isEmpty {
                        TikoMediaImage(imageRef: ref) { tileColor.opacity(0.18) }
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    } else if let icon = tile.icon, !icon.isEmpty {
                        TikoOpenIconView(icon)
                            .frame(width: 30, height: 30)
                    }
                }
            Text(tile.label.isEmpty ? "Untitled" : tile.label)
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var addTileCell: some View {
        VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(TikoAppColor.yesNo.palette.primary.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [6]))
                .frame(height: 80)
                .overlay {
                    Image(systemName: "plus")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                }
            Text(i18n.t("yesNo.tileEditor.addTile"))
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                .lineLimit(1)
        }
    }

    // MARK: Actions

    private func addTile() {
        // Present the editor for a brand-new tile; it is appended only when saved.
        sheetDest = .tileEditor(YesNoAnswerTile(
            id: "answer-\(UUID().uuidString.prefix(8))",
            label: "",
            speech: "",
            color: color
        ))
    }

    private func removeTile(_ tile: YesNoAnswerTile) {
        tiles.removeAll { $0.id == tile.id }
    }

    private func save() {
        onSave(YesNoAnswerSet(
            id: id,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "New set" : title,
            description: description.isEmpty ? nil : description,
            color: color,
            imageRef: imageRef,
            order: order,
            answers: tiles
        ))
        dismiss()
    }
}

// MARK: - Tile detail edit view

private struct TileDetailEditView: View {
    let tile: YesNoAnswerTile
    let onSave: (YesNoAnswerTile) -> Void
    let onCancel: () -> Void

    @State private var label: String
    @State private var speech: String
    @State private var color: String
    @State private var icon: String
    @State private var imageURL: URL?
    @State private var imageRef: String?
    @State private var showingMediaPicker = false
    @EnvironmentObject private var i18n: TikoI18n

    init(tile: YesNoAnswerTile, onSave: @escaping (YesNoAnswerTile) -> Void, onCancel: @escaping () -> Void) {
        self.tile = tile
        self.onSave = onSave
        self.onCancel = onCancel
        _label = State(initialValue: tile.label)
        _speech = State(initialValue: tile.speech)
        _color = State(initialValue: tile.color)
        _icon = State(initialValue: tile.icon ?? "")
        _imageRef = State(initialValue: tile.imageRef)
        _imageURL = State(initialValue: nil)
    }

    var body: some View {
        TikoFormSheet(
            title: tile.label.isEmpty ? i18n.t("yesNo.sheet.newTile") : i18n.t("yesNo.sheet.editTile"),
            icon: "rectangle.badge.plus",
            appColor: .yesNo,
            onClose: onCancel
        ) {
            VStack(spacing: 14) {
                HStack {
                    Spacer()
                    tilePreview
                        .frame(width: 88, height: 88)
                        .allowsHitTesting(false)
                    Spacer()
                }

                TikoFormField(label: i18n.t("yesNo.sheet.name")) {
                    TextField(i18n.t("yesNo.sheet.namePlaceholder"), text: $label)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .onChange(of: label) { oldValue, newValue in
                            if speech.isEmpty || speech == oldValue { speech = newValue }
                        }
                }

                TikoFormField(label: i18n.t("yesNo.sheet.spokenText")) {
                    TextField(i18n.t("yesNo.sheet.whatShouldBeSpoken"), text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                TikoCompactColorPicker(selectedColor: $color, label: i18n.t("yesNo.sheet.color"), appColor: .yesNo)

                VStack(alignment: .leading, spacing: 7) {
                    TikoFieldLabel(i18n.t("yesNo.sheet.image"))
                    TikoImagePickerButton(
                        selectedURL: imageURL,
                        appColor: .yesNo,
                        addLabel: i18n.t("yesNo.sheet.addImage"),
                        changeLabel: i18n.t("yesNo.sheet.changeImage"),
                        action: { showingMediaPicker = true }
                    )
                    if imageURL != nil {
                        Button(role: .destructive) {
                            imageRef = nil
                            imageURL = nil
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "trash")
                                    .font(.system(size: 14, weight: .bold))
                                Text(i18n.t("yesNo.sheet.delete"))
                                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                                Spacer()
                            }
                            .foregroundStyle(.red)
                            .padding(12)
                            .background(Color.red.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }

                TikoActionButton(
                    label: i18n.t("yesNo.tileEditor.save"),
                    appColor: .yesNo,
                    disabled: label.trimmingCharacters(in: .whitespaces).isEmpty
                ) {
                    onSave(YesNoAnswerTile(
                        id: tile.id,
                        label: label.isEmpty ? "Answer" : label,
                        speech: speech.isEmpty ? label : speech,
                        color: color,
                        imageRef: imageRef,
                        icon: imageRef == nil && !icon.isEmpty ? icon : nil
                    ))
                }
            }
        }
        .tikoMediaPickerSheet(isPresented: $showingMediaPicker, appColor: .yesNo, title: i18n.t("yesNo.sheet.pickImage"), onSelectMedia: { selection in
            imageRef = selection.id
            imageURL = selection.url
            icon = ""
            if let id = selection.id {
                Task { await MediaImageResolver.shared.cache(id, url: selection.url) }
            }
        })
        .task(id: imageRef) {
            if let imageRef, imageURL == nil {
                imageURL = await MediaImageResolver.shared.resolve(imageRef)
            }
        }
    }

    @ViewBuilder
    private var tilePreview: some View {
        let tileColor = TikoColors.color(named: color) ?? TikoAppColor.yesNo.palette.primary
        RoundedRectangle(cornerRadius: 18, style: .continuous)
            .fill(tileColor)
            .overlay {
                if let imageURL {
                    TikoCachedRemoteImage(url: imageURL) { tileColor.opacity(0.18) }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                } else if !icon.isEmpty {
                    TikoOpenIconView(icon)
                        .frame(width: 30, height: 30)
                } else {
                    Image(systemName: "rectangle.badge.plus")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

#Preview {
    YesNoView()
}
