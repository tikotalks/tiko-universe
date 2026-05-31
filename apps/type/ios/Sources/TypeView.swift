import SwiftUI
import TikoKit

struct TypeView: View {
    @AppStorage("type.text") private var text = ""
    @AppStorage("type.phrases") private var phrasesData = Data()
    @AppStorage("type.speechEnabled") private var speechEnabled = true
    @State private var phrases: [String] = []

    private let layouts: [(label: String, keys: [[String]])] = [
        ("ABC", [["a","b","c","d","e","f","g","h","i"],["j","k","l","m","n","o","p","q","r"],["s","t","u","v","w","x","y","z"]]),
        ("QWERTY", [["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["z","x","c","v","b","n","m"]]),
    ]

    @State private var layoutIndex = 0

    private var typePrimary: Color { TikoAppColor.type.palette.primary }
    private var typeDark: Color { TikoAppColor.type.palette.dark }

    var body: some View {
        TikoAppShell(
            appName: "Type",
            appIcon: "text.cursor",
            appColor: .type,
            settingsContent: {
                TikoSettingsSection(title: "Type") {
                    TikoSettingsToggleRow(title: "Speak typed text", icon: "speaker.wave.2.fill", appColor: .type, isOn: $speechEnabled)
                }
            }
        ) {
            VStack(spacing: 18) {
                // Compose area
                TextEditor(text: $text)
                    .font(.system(.title2, design: .rounded).weight(.semibold))
                    .multilineTextAlignment(.center)
                    .frame(minHeight: 80)
                    .padding(12)
                    .background(.white.opacity(0.68))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal, 24)

                // Action buttons
                HStack(spacing: 16) {
                    Button(action: speakText) {
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(typeDark)
                            .frame(width: 56, height: 56)
                            .background(typePrimary.opacity(0.22))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Speak")

                    Button(action: { text = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(typeDark)
                            .frame(width: 56, height: 56)
                            .background(typePrimary.opacity(0.14))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Clear")

                    Button(action: savePhrase) {
                        Image(systemName: "square.and.arrow.down.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(typeDark)
                            .frame(width: 56, height: 56)
                            .background(typePrimary.opacity(0.22))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Save phrase")
                }

                // Keyboard layout toggle
                Button(layouts[layoutIndex].label) {
                    layoutIndex = (layoutIndex + 1) % layouts.count
                }
                .font(.system(.caption, design: .rounded).weight(.heavy))
                .foregroundStyle(typeDark.opacity(0.78))
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(typePrimary.opacity(0.12))
                .clipShape(Capsule())

                // Virtual keyboard
                let currentLayout = layouts[layoutIndex]
                VStack(spacing: 6) {
                    ForEach(0..<currentLayout.keys.count, id: \.self) { rowIdx in
                        HStack(spacing: 4) {
                            ForEach(currentLayout.keys[rowIdx], id: \.self) { key in
                                Button(key.uppercased()) {
                                    text += key
                                }
                                .font(.system(.body, design: .rounded).weight(.bold))
                                .foregroundStyle(Color(hex: 0x0d3f91))
                                .frame(width: 32, height: 44)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                        }
                    }
                    HStack(spacing: 8) {
                        Button("Space") { text += " " }
                            .frame(width: 140, height: 40)
                        Button("Del") { if !text.isEmpty { text.removeLast() } }
                            .frame(width: 60, height: 40)
                    }
                    .font(.system(.body, design: .rounded).weight(.bold))
                    .foregroundStyle(Color(hex: 0x0d3f91))
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                // Saved phrases
                if !phrases.isEmpty {
                    VStack(spacing: 6) {
                        Text("Saved phrases")
                            .font(.system(.headline, design: .rounded).weight(.heavy))
                        ForEach(phrases, id: \.self) { phrase in
                            Text(phrase)
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
        .onAppear { loadPhrases() }
    }

    private func speakText() {
        guard speechEnabled, !text.isEmpty else { return }
        // TODO: call shared TTS API
    }

    private func savePhrase() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        phrases.insert(trimmed, at: 0)
        if phrases.count > 10 { phrases.removeLast() }
        savePhrases()
    }

    private func loadPhrases() {
        guard let decoded = try? JSONDecoder().decode([String].self, from: phrasesData) else {
            phrases = []
            return
        }
        phrases = decoded
    }

    private func savePhrases() {
        phrasesData = (try? JSONEncoder().encode(phrases)) ?? Data()
    }
}

#Preview {
    TypeView()
}
