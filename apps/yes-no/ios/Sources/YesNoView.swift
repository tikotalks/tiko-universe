import SwiftUI
import TikoKit

struct YesNoView: View {
    private let defaultSentence = "Do you want to go eat?"

    @AppStorage("yesno.sentence") private var sentence = ""
    @AppStorage("yesno.latestAnswer") private var latestAnswerRaw = ""
    @State private var showingSettings = false
    @State private var showingHistory = false
    @AppStorage("yesno.history") private var historyData = Data()

    @State private var history: [String] = []

    private var effectiveSentence: String {
        sentence.isEmpty ? defaultSentence : sentence
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
            actions: [
                TikoHeaderAction(id: "history", label: "History", systemImage: "clock", isActive: showingHistory),
                TikoHeaderAction(id: "settings", label: "Settings", systemImage: "slider.horizontal.3", isActive: showingSettings)
            ],
            onAction: handleHeaderAction
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

                    Button("Reset") {
                        sentence = ""
                    }
                    .font(.system(.body, design: .rounded).weight(.heavy))
                    .buttonStyle(.borderedProminent)
                }

                if showingSettings {
                    Text("Settings will use the shared API-first language and color contracts.")
                        .font(.system(.body, design: .rounded).weight(.semibold))
                        .padding()
                        .background(.white.opacity(0.35))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.horizontal, 24)
                }

                TikoChoiceGrid(choices: choices, onSelect: selectChoice)

                if !latestAnswerRaw.isEmpty {
                    Text("Last answer: \(latestAnswerRaw)")
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(Color(hex: 0x0b5a7a))
                }

                if showingHistory, !history.isEmpty {
                    VStack(spacing: 6) {
                        Text("History")
                            .font(.system(.headline, design: .rounded).weight(.heavy))
                        ForEach(history, id: \.self) { answer in
                            Text(answer)
                                .font(.system(.body, design: .rounded).weight(.bold))
                        }
                    }
                    .padding()
                    .background(.white.opacity(0.35))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
            .padding(.top, 18)
        }
        .onAppear {
            loadHistory()
        }
    }

    private func handleHeaderAction(_ id: String) {
        switch id {
        case "history":
            showingHistory.toggle()
        case "settings":
            showingSettings.toggle()
        default:
            break
        }
    }

    private func selectChoice(_ choice: TikoAnswerChoice) {
        latestAnswerRaw = choice.label
        history.insert(choice.label, at: 0)
        if history.count > 5 {
            history.removeLast()
        }
        saveHistory()
        // TODO: call the shared TTS API once identity/API clients are in place.
    }

    private func speakSentence() {
        // TODO: call the shared TTS API once identity/API clients are in place.
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

#Preview {
    YesNoView()
}
