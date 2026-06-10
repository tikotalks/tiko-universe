import SwiftUI
import TikoKit
import UIKit

// MARK: - Data model

struct YesNoAnswerTile: Codable, Identifiable, Equatable {
    var id: String
    var label: String
    var speech: String
    var color: String
    var imageURL: URL?
    var icon: String?

    var answerChoice: TikoAnswerChoice {
        TikoAnswerChoice(
            id: id,
            label: label,
            speech: speech,
            icon: icon.map { .systemName($0) } ?? .systemName("checkmark"),
            tone: .primary,
            color: color,
            imageURL: imageURL
        )
    }

    init(id: String, label: String, speech: String, color: String, imageURL: URL? = nil, icon: String? = nil) {
        self.id = id
        self.label = label
        self.speech = speech
        self.color = color
        self.imageURL = imageURL
        self.icon = icon
    }

    private enum CodingKeys: String, CodingKey {
        case id, label, speech, color, colorHex, imageURL, icon
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        label = try container.decode(String.self, forKey: .label)
        speech = try container.decodeIfPresent(String.self, forKey: .speech) ?? label
        if let color = try container.decodeIfPresent(String.self, forKey: .color) {
            self.color = color
        } else if let colorHex = try container.decodeIfPresent(UInt32.self, forKey: .colorHex) {
            self.color = String(format: "#%06X", colorHex)
        } else {
            self.color = TikoColors.teal.name
        }
        imageURL = try container.decodeIfPresent(URL.self, forKey: .imageURL)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(label, forKey: .label)
        try container.encode(speech, forKey: .speech)
        try container.encode(color, forKey: .color)
        try container.encodeIfPresent(imageURL, forKey: .imageURL)
        try container.encodeIfPresent(icon, forKey: .icon)
    }
}

// MARK: - Store

@MainActor
final class YesNoStore: ObservableObject {
    @Published var defaultAnswers: [YesNoAnswerTile] = []

    private static let appAPIBase = "https://app.tikoapi.org/v1"

    func fetchDefaults() async {
        guard let url = URL(string: "\(Self.appAPIBase)/apps/defaults/yes-no/state") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return }
            let decoded = try JSONDecoder().decode(DefaultsResponse.self, from: data)
            defaultAnswers = decoded.data.answers ?? []
        } catch {}
    }

    private struct DefaultsResponse: Decodable {
        let data: StatePayload
        struct StatePayload: Decodable {
            let answers: [YesNoAnswerTile]?
        }
    }
}

// MARK: - Main view

struct YesNoView: View {
    private let speechService = YesNoSpeechService()

    @AppStorage("yesno.sentence") private var sentence = ""
    @AppStorage("yesno.speechEnabled") private var speechEnabled = true
    @AppStorage("yesno.choiceStyle") private var choiceStyleRawValue = TikoChoiceStyle.tiles.rawValue
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("yesno.questionHistory") private var historyData = Data()
    @AppStorage("yesno.customAnswers") private var customAnswersData = Data()

    @StateObject private var i18n = TikoI18n(app: .yesNo)
    @StateObject private var store = YesNoStore()

    @State private var history: [String] = []
    @State private var customAnswers: [YesNoAnswerTile] = []
    @State private var feedbackBackground: Color?
    @State private var showingHistory = false
    @State private var showingChoiceStyle = false
    @State private var showingTileEditor = false

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

    private var choiceStyle: TikoChoiceStyle {
        TikoChoiceStyle(rawValue: choiceStyleRawValue) ?? .tiles
    }

    private var hardcodedChoices: [TikoAnswerChoice] {
        [
            TikoAnswerChoice(id: "yes", label: i18n.t("yesNo.answers.yes"), icon: .systemName("checkmark"), tone: .primary),
            TikoAnswerChoice(id: "no", label: i18n.t("yesNo.answers.no"), icon: .systemName("xmark"), tone: .secondary)
        ]
    }

    private var effectiveChoices: [TikoAnswerChoice] {
        if !customAnswers.isEmpty { return customAnswers.map(\.answerChoice) }
        if !store.defaultAnswers.isEmpty { return store.defaultAnswers.map(\.answerChoice) }
        return hardcodedChoices
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
                        value: customAnswers.isEmpty ? i18n.t("yesNo.settings.answerTilesDefault") : "\(customAnswers.count)",
                        icon: "square.grid.2x2",
                        appColor: .yesNo
                    ) {
                        showingTileEditor = true
                    }
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
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(Color(hex: 0x93ee3f))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Speak sentence")

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

                TikoChoiceGrid(choices: effectiveChoices, style: choiceStyle, onSelect: selectChoice)
            }
            .padding(.top, 18)
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            loadHistory()
            loadCustomAnswers()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
        .task {
            await store.fetchDefaults()
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
                customAnswers: customAnswers,
                defaultAnswers: store.defaultAnswers,
                onSave: { tiles in
                    customAnswers = tiles
                    saveCustomAnswers()
                    showingTileEditor = false
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
            speechService.speak(choice.speech)
        }
    }

    private func speakSentence() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        rememberCurrentQuestion()
        if speechEnabled {
            speechService.speak(effectiveSentence)
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
        if let color = choice.color, let parsed = TikoColors.color(named: color) ?? Color(hexString: color) {
            base = parsed
        } else if let hex = choice.colorHex {
            base = Color(hex: hex)
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
    let defaultAnswers: [YesNoAnswerTile]
    let onSave: ([YesNoAnswerTile]) -> Void
    let onClose: () -> Void

    @EnvironmentObject private var i18n: TikoI18n
    @State private var tiles: [YesNoAnswerTile]
    @State private var editingIndex: Int? = nil

    init(customAnswers: [YesNoAnswerTile], defaultAnswers: [YesNoAnswerTile], onSave: @escaping ([YesNoAnswerTile]) -> Void, onClose: @escaping () -> Void) {
        self.defaultAnswers = defaultAnswers
        self.onSave = onSave
        self.onClose = onClose
        _tiles = State(initialValue: customAnswers)
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
                if tiles.isEmpty {
                    VStack(spacing: 8) {
                        Text(i18n.t("yesNo.tileEditor.empty"))
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(Array(tiles.enumerated()), id: \.element.id) { index, tile in
                                tileRow(tile: tile, index: index)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .scrollIndicators(.hidden)
                    .frame(maxHeight: 320)
                }

                HStack(spacing: 10) {
                    Button {
                        tiles.append(YesNoAnswerTile(
                            id: "answer-\(UUID().uuidString.prefix(8))",
                            label: "Answer",
                            speech: "Answer",
                            color: TikoColors.teal.name
                        ))
                    } label: {
                        Text(i18n.t("yesNo.tileEditor.addTile"))
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                            .foregroundStyle(TikoAppColor.yesNo.palette.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(TikoAppColor.yesNo.palette.primary.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    if !tiles.isEmpty {
                        Button {
                            tiles = []
                        } label: {
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
                }

                Button { onSave(tiles) } label: {
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
        .sheet(item: editingTileBinding) { tile in
            TileDetailEditView(tile: tile) { updated in
                if let i = tiles.firstIndex(where: { $0.id == updated.id }) {
                    tiles[i] = updated
                }
                editingIndex = nil
            }
        }
    }

    private var editingTileBinding: Binding<YesNoAnswerTile?> {
        Binding(
            get: { editingIndex.flatMap { tiles.indices.contains($0) ? tiles[$0] : nil } },
            set: { _ in editingIndex = nil }
        )
    }

    private func tileRow(tile: YesNoAnswerTile, index: Int) -> some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(TikoColors.color(named: tile.color) ?? Color(hexString: tile.color) ?? TikoAppColor.yesNo.palette.primary)
                .frame(width: 36, height: 36)
                .overlay {
                    if let icon = tile.icon {
                        Image(systemName: icon)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(tile.label)
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(.primary)
                if tile.speech != tile.label {
                    Text(tile.speech)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)

            Button { editingIndex = index } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 30, height: 30)
                    .background(Color(.systemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                tiles.remove(at: index)
            } label: {
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
        .overlay { RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.primary.opacity(0.08), lineWidth: 1) }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

// MARK: - Tile detail edit view

private struct TileDetailEditView: View {
    let tile: YesNoAnswerTile
    let onSave: (YesNoAnswerTile) -> Void

    @State private var label: String
    @State private var speech: String
    @State private var color: String
    @State private var icon: String
    @Environment(\.dismiss) private var dismiss

    init(tile: YesNoAnswerTile, onSave: @escaping (YesNoAnswerTile) -> Void) {
        self.tile = tile
        self.onSave = onSave
        _label = State(initialValue: tile.label)
        _speech = State(initialValue: tile.speech)
        _color = State(initialValue: tile.color)
        _icon = State(initialValue: tile.icon ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Label") {
                    TextField("What to display", text: $label)
                }
                Section("Spoken text") {
                    TextField("What to say when tapped", text: $speech)
                }
                Section("Icon (SF Symbol)") {
                    TextField("e.g. checkmark", text: $icon)
                }
                Section("Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 7), spacing: 10) {
                        ForEach(TikoColors.all, id: \.name) { preset in
                            Circle()
                                .fill(preset.color)
                                .frame(height: 36)
                                .overlay {
                                    if color == preset.name {
                                        Circle().strokeBorder(.white, lineWidth: 2.5)
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 11, weight: .black))
                                        .foregroundStyle(.white)
                                    }
                                }
                                .onTapGesture { color = preset.name }
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
            .navigationTitle("Edit answer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(YesNoAnswerTile(
                            id: tile.id,
                            label: label.isEmpty ? "Answer" : label,
                            speech: speech.isEmpty ? label : speech,
                            color: color,
                            imageURL: tile.imageURL,
                            icon: icon.isEmpty ? nil : icon
                        ))
                        dismiss()
                    }
                    .fontWeight(.bold)
                }
            }
        }
    }
}

#Preview {
    YesNoView()
}
