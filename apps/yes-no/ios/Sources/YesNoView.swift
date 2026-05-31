import SwiftUI
import TikoKit
import UIKit

struct YesNoView: View {
    private let defaultSentence = "Do you want to go eat?"
    private let speechService = YesNoSpeechService()

    @AppStorage("yesno.sentence") private var sentence = ""
    @AppStorage("yesno.speechEnabled") private var speechEnabled = true
    @State private var showingHistory = false
    @AppStorage("yesno.questionHistory") private var historyData = Data()

    @State private var history: [String] = []
    @State private var feedbackBackground: Color?

    private var effectiveSentence: String {
        sentence.isEmpty ? defaultSentence : sentence
    }

    private var shellBackground: Color {
        feedbackBackground ?? Color(red: 0.973, green: 0.965, blue: 0.945)
    }

    private let choices = [
        TikoAnswerChoice(id: "yes", label: "Yes", icon: .systemName("checkmark"), tone: .primary),
        TikoAnswerChoice(id: "no", label: "No", icon: .systemName("xmark"), tone: .secondary)
    ]

    var body: some View {
        TikoAppShell(
            appName: "Yes No",
            appIcon: "checkmark.circle",
            appColor: .yesNo,
            backgroundColor: shellBackground,
            actions: [
                TikoHeaderAction(id: "history", label: "History", systemImage: "clock", isActive: showingHistory)
            ],
            onAction: handleHeaderAction,
            settingsContent: {
                TikoSettingsSection(title: "Yes No") {
                    TikoSettingsToggleRow(title: "Speak answers", icon: "speaker.wave.2.fill", appColor: .yesNo, isOn: $speechEnabled)
                }
            }
        ) {
            VStack(spacing: 22) {
                TextField("Sentence", text: $sentence, axis: .vertical)
                    .font(.system(.title2, design: .rounded).weight(.semibold))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(.white.opacity(0.68))
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
                            .foregroundStyle(Color(hex: 0x0b5a7a).opacity(0.65))
                            .frame(width: 44, height: 44)
                            .background(.white.opacity(0.36))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Clear sentence")
                }

                TikoChoiceGrid(choices: choices, onSelect: selectChoice)
            }
            .padding(.top, 18)
        }
        .onAppear {
            loadHistory()
        }
        .tikoPopup(isPresented: $showingHistory) {
            QuestionHistorySheet(questions: history) {
                showingHistory = false
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
            ? Color(hex: 0x93ee3f).opacity(0.24)
            : Color(hex: 0xef405d).opacity(0.22)

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

private struct QuestionHistorySheet: View {
    let questions: [String]
    let onClose: () -> Void

    var body: some View {
        TikoPopupCard(
            title: "Question history",
            subtitle: "Recently typed questions.",
            icon: "clock",
            appColor: .yesNo,
            onClose: onClose
        ) {
            if questions.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "text.bubble")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(Color(hex: 0x0b5a7a).opacity(0.45))
                    Text("No questions yet")
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    Text("Questions appear here after you ask them with Yes or No.")
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
