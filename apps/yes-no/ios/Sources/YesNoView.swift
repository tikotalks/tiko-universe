import SwiftUI
import TikoKit
import UIKit

struct YesNoView: View {
    private let speechService = YesNoSpeechService()

    @AppStorage("yesno.sentence") private var sentence = ""
    @AppStorage("yesno.speechEnabled") private var speechEnabled = true
    @AppStorage("yesno.choiceStyle") private var choiceStyleRawValue = TikoChoiceStyle.tiles.rawValue
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @AppStorage("tiko.language") private var languageCode = "en"
    @State private var showingHistory = false
    @State private var showingChoiceStyle = false
    @AppStorage("yesno.questionHistory") private var historyData = Data()

    @StateObject private var i18n = TikoI18n(app: .yesNo)

    @State private var history: [String] = []
    @State private var feedbackBackground: Color?

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

    private var localizedChoices: [TikoAnswerChoice] {
        [
            TikoAnswerChoice(id: "yes", label: i18n.t("yesNo.answers.yes"), icon: .systemName("checkmark"), tone: .primary),
            TikoAnswerChoice(id: "no", label: i18n.t("yesNo.answers.no"), icon: .systemName("xmark"), tone: .secondary)
        ]
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

                TikoChoiceGrid(choices: localizedChoices, style: choiceStyle, onSelect: selectChoice)
            }
            .padding(.top, 18)
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            loadHistory()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
        .tikoPopup(isPresented: $showingHistory) {
            QuestionHistorySheet(questions: history) {
                showingHistory = false
            }
        }
        .tikoPopup(isPresented: $showingChoiceStyle) {
            ChoiceStyleSheet(selectedStyle: choiceStyle) { style in
                choiceStyleRawValue = style.rawValue
                showingChoiceStyle = false
            } onClose: {
                showingChoiceStyle = false
            }
        }
    }

    private func handleHeaderAction(_ id: String) {
        switch id {
        case "history":
            showingHistory.toggle()
        default:
            break
        }
    }

    private func selectChoice(_ choice: TikoAnswerChoice) {
        UIImpactFeedbackGenerator(style: choice.id == "yes" ? .medium : .rigid).impactOccurred()
        rememberCurrentQuestion()
        flashBackground(for: choice)
        if speechEnabled {
            speechService.speak(choice.label)
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
        if history.count > 12 {
            history.removeLast(history.count - 12)
        }
        saveHistory()
    }

    private func flashBackground(for choice: TikoAnswerChoice) {
        let color = choice.id == "yes"
            ? Color(hex: 0x93ee3f).opacity(effectiveColorScheme == .dark ? 0.18 : 0.24)
            : Color(hex: 0xef405d).opacity(effectiveColorScheme == .dark ? 0.18 : 0.22)

        withAnimation(.easeInOut(duration: 0.18)) {
            feedbackBackground = color
        }

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 650_000_000)
            withAnimation(.easeInOut(duration: 0.45)) {
                feedbackBackground = nil
            }
        }
    }

    private func loadHistory() {
        guard let decoded = try? JSONDecoder().decode([String].self, from: historyData) else {
            history = []
            return
        }
        history = decoded
    }

    private func saveHistory() {
        historyData = (try? JSONEncoder().encode(history)) ?? Data()
    }
}

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
                    Button {
                        onSelect(style)
                    } label: {
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
                        .overlay {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct QuestionHistorySheet: View {
    let questions: [String]
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
                            }
                            .padding(14)
                            .background(Color(.systemBackground))
                            .overlay {
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
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

#Preview {
    YesNoView()
}
