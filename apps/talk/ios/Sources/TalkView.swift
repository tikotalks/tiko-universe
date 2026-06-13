import SwiftUI
import TikoKit
import UIKit

struct TalkView: View {
    @State private var store = TalkStore()
    @State private var isSpeaking = false
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("talk.nativeSpeechFallback") private var nativeSpeechFallback = true
    @AppStorage("talk.cloudLayout") private var cloudLayout = true

    private let speechService = TalkSpeechService()
    private let audioPlayer = TalkAudioPlayer()

    private let columns = [
        GridItem(.adaptive(minimum: 104), spacing: 12)
    ]

    var body: some View {
        TikoAppShell(
            appConfig: TalkAppConfig.app,
            actions: [],
            onAction: { _ in },
            settingsContent: {
                TikoSettingsSection(title: "Talk") {
                    TikoSettingsToggleRow(
                        title: "Word cloud layout",
                        icon: "circle.hexagongrid.fill",
                        appColor: .talk,
                        isOn: $cloudLayout
                    )
                    TikoSettingsToggleRow(
                        title: "Native speech fallback",
                        icon: "speaker.wave.2.fill",
                        appColor: .talk,
                        isOn: $nativeSpeechFallback
                    )
                }
            }
        ) {
            // The board fills the space; the sentence bar floats on top of it.
            ZStack(alignment: .top) {
                Group {
                    if cloudLayout {
                        TalkWordCloudView(words: store.boardWords, appColor: .talk) { word in
                            Task { await addWord(word) }
                        }
                    } else {
                        wordGrid
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                VStack(spacing: 10) {
                    TalkSentenceStripView(
                        words: store.sentenceWords,
                        canSpeak: store.canSpeak,
                        isSpeaking: isSpeaking,
                        appColor: .talk,
                        onRemove: { word in Task { await removeWord(word) } },
                        onSpeak: { Task { await speakSentence() } },
                        onClear: store.clearSentence
                    )
                    statusSection
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .task {
                store.locale = languageCode
                await store.load()
            }
            .onChange(of: languageCode) { _, code in
                Task {
                    store.locale = code
                    await store.load()
                }
            }
        }
    }

    @ViewBuilder
    private var statusSection: some View {
        if store.isOfflineFallback || (store.errorMessage?.isEmpty == false) {
            HStack(spacing: 8) {
                if store.isOfflineFallback {
                    Text("Offline limited mode")
                }
                if let error = store.errorMessage, !error.isEmpty {
                    Text(error)
                }
            }
            .font(.system(.caption, design: .rounded).weight(.bold))
            .foregroundStyle(TikoAppColor.talk.palette.dark.opacity(0.7))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(TikoAppColor.talk.palette.primary.opacity(0.12))
            .clipShape(Capsule())
            .multilineTextAlignment(.center)
        }
    }

    private var wordGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(store.boardWords) { word in
                    TalkWordTileView(word: word, appColor: .talk) {
                        Task { await addWord(word) }
                    }
                }
            }
            .padding(.bottom, 24)
        }
    }

    private var speechLanguageCode: String {
        TikoSpeech.languageCode(for: languageCode)
    }

    private func addWord(_ word: TalkWordTile) async {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        await store.addWord(word)
    }

    private func removeWord(_ word: TalkWordTile) async {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        await store.removeWord(id: word.id)
    }

    private func speakSentence() async {
        guard store.canSpeak else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        isSpeaking = true
        defer { isSpeaking = false }

        let response = await store.completeSentence()
        if let url = store.audioURL, response != nil {
            audioPlayer.play(url: url)
        } else if nativeSpeechFallback {
            speechService.speak(store.completedSentence ?? store.sentenceText, languageCode: speechLanguageCode)
        }
    }
}
