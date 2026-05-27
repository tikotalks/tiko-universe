import SwiftUI
import TikoKit

struct YesNoView: View {
    @State private var sentence = "Do you want to go eat?"
    @State private var latestAnswer: String?
    @State private var showingSettings = false
    @State private var showingHistory = false
    @State private var history: [String] = []

    private let choices = [
        TikoAnswerChoice(id: "yes", label: "Yes", symbol: "👍", tone: .primary),
        TikoAnswerChoice(id: "no", label: "No", symbol: "👎", tone: .secondary)
    ]

    var body: some View {
        TikoAppShell(
            appName: "Yes No",
            appIcon: "👍",
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
                        sentence = "Do you want to go eat?"
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

                if let latestAnswer {
                    Text("Last answer: \(latestAnswer)")
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
        latestAnswer = choice.label
        history.insert(choice.label, at: 0)
        if history.count > 5 {
            history.removeLast()
        }
        // TODO: call the shared TTS API once identity/API clients are in place.
    }

    private func speakSentence() {
        // TODO: call the shared TTS API once identity/API clients are in place.
    }
}

#Preview {
    YesNoView()
}
