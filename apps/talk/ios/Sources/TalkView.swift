import SwiftUI
import TikoKit
import UIKit

struct TalkView: View {
    @State private var store = TalkStore()
    @State private var showingTemplates = false
    @State private var showingPhrases = false
    @State private var isSpeaking = false
    @AppStorage("talk.nativeSpeechFallback") private var nativeSpeechFallback = true

    private let speechService = TalkSpeechService()
    private let audioPlayer = TalkAudioPlayer()

    private let columns = [
        GridItem(.adaptive(minimum: 104), spacing: 12)
    ]

    var body: some View {
        TikoAppShell(
            appConfig: TalkAppConfig.app,
            actions: [
                TikoHeaderAction(id: "templates", label: "Templates", systemImage: "text.bubble.fill", isActive: showingTemplates),
                TikoHeaderAction(id: "phrases", label: "Saved phrases", systemImage: "star.bubble.fill", isActive: showingPhrases)
            ],
            onAction: handleHeaderAction,
            settingsContent: {
                TikoSettingsSection(title: "Talk") {
                    TikoSettingsToggleRow(
                        title: "Native speech fallback",
                        icon: "speaker.wave.2.fill",
                        appColor: .talk,
                        isOn: $nativeSpeechFallback
                    )
                }
            }
        ) {
            VStack(spacing: 14) {
                TalkSentenceStripView(
                    words: store.sentenceWords,
                    canSpeak: store.canSpeak,
                    isSpeaking: isSpeaking,
                    appColor: .talk,
                    onRemove: { word in Task { await removeWord(word) } },
                    onSpeak: { Task { await speakSentence() } },
                    onClear: store.clearSentence
                )

                if store.isOfflineFallback {
                    Text("Offline limited mode")
                        .font(.system(.caption, design: .rounded).weight(.bold))
                        .foregroundStyle(TikoAppColor.talk.palette.dark.opacity(0.7))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(TikoAppColor.talk.palette.primary.opacity(0.12))
                        .clipShape(Capsule())
                }

                if !store.suggestions.isEmpty {
                    suggestionSection
                }

                wordGrid
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .task {
                await store.load()
            }
            .sheet(isPresented: $showingTemplates) {
                TalkTemplateSheet(templates: store.templates, appColor: .talk) { template in
                    showingTemplates = false
                    Task { await store.applyTemplate(template) }
                }
            }
            .sheet(isPresented: $showingPhrases) {
                TalkSavedPhrasesSheet(phrases: store.savedPhrases, appColor: .talk) { phrase in
                    showingPhrases = false
                    store.selectPhrase(phrase)
                }
            }
        }
    }

    private var suggestionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Suggestions")
                .font(.system(.caption, design: .rounded).weight(.heavy))
                .foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(store.suggestions) { word in
                        TalkWordTileView(word: word, appColor: .talk, isSuggested: true) {
                            Task { await addWord(word) }
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var wordGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(store.visibleWords) { word in
                    TalkWordTileView(word: word, appColor: .talk) {
                        Task { await addWord(word) }
                    }
                }
            }
            .padding(.bottom, 24)
        }
    }

    private func handleHeaderAction(_ id: String) {
        switch id {
        case "templates":
            showingTemplates = true
        case "phrases":
            showingPhrases = true
        default:
            break
        }
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
            speechService.speak(store.completedSentence ?? store.sentenceText)
        }
    }
}
