import SwiftUI
import TikoKit
import UIKit

struct TalkView: View {
    @State private var store = TalkStore()
    @State private var showingTemplates = false
    @State private var showingPhrases = false
    @State private var isSpeaking = false
    @State private var saveMessage: String?
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("talk.nativeSpeechFallback") private var nativeSpeechFallback = true
    @AppStorage("talk.boardMode") private var boardModeRaw = TalkBoardMode.cloud.rawValue

    private var boardMode: TalkBoardMode { TalkBoardMode(rawValue: boardModeRaw) ?? .cloud }

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
                    displayText: store.stripDisplay,
                    canSpeak: store.canSpeak,
                    isSpeaking: isSpeaking,
                    appColor: .talk,
                    onRemove: { word in Task { await removeWord(word) } },
                    onMove: { source, destination in Task { await moveWord(from: source, to: destination) } },
                    onSpeak: { Task { await speakSentence() } },
                    onSave: { Task { await saveSentence() } },
                    onClear: store.clearSentence
                )

                statusSection

                if !store.suggestions.isEmpty {
                    suggestionSection
                }

                if !store.categories.isEmpty {
                    categoryTabs
                }

                boardModePicker

                if boardMode == .cloud {
                    TalkWordCloudView(words: store.filteredWords, appColor: .talk) { word in
                        Task { await addWord(word) }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    wordGrid
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
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
            .sheet(isPresented: $showingTemplates) {
                TalkTemplateSheet(templates: store.templates, appColor: .talk) { template in
                    showingTemplates = false
                    Task { await store.applyTemplate(template) }
                }
            }
            .sheet(isPresented: $showingPhrases) {
                TalkSavedPhrasesSheet(
                    phrases: store.savedPhrases,
                    appColor: .talk,
                    onSelect: { phrase in
                        showingPhrases = false
                        store.selectPhrase(phrase)
                    },
                    onDelete: { phrase in
                        Task { await store.deletePhrase(id: phrase.id) }
                    }
                )
            }
        }
    }

    @ViewBuilder
    private var statusSection: some View {
        if store.isOfflineFallback || store.errorMessage != nil || saveMessage != nil {
            HStack(spacing: 8) {
                if store.isOfflineFallback {
                    Text("Offline limited mode")
                }
                if let error = store.errorMessage, !error.isEmpty {
                    Text(error)
                }
                if let saveMessage {
                    Text(saveMessage)
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

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(store.categories) { category in
                    Button {
                        store.selectCategory(id: category.id)
                    } label: {
                        Label(category.label, systemImage: category.icon ?? "square.grid.2x2.fill")
                            .font(.system(.caption, design: .rounded).weight(.heavy))
                            .foregroundStyle(store.selectedCategoryId == category.id ? .white : TikoAppColor.talk.palette.dark.opacity(0.72))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(store.selectedCategoryId == category.id ? TikoAppColor.talk.palette.primary : Color.white.opacity(0.55))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Show \(category.label) words")
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var boardModePicker: some View {
        Picker("Board layout", selection: $boardModeRaw) {
            Label("Cloud", systemImage: "circle.hexagongrid.fill").tag(TalkBoardMode.cloud.rawValue)
            Label("Tiles", systemImage: "square.grid.2x2.fill").tag(TalkBoardMode.tile.rawValue)
        }
        .pickerStyle(.segmented)
        .accessibilityLabel("Board layout: cloud or tiles")
    }

    private var wordGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(store.filteredWords) { word in
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

    private func moveWord(from source: Int, to destination: Int) async {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        await store.moveWord(from: source, to: destination)
    }

    private func saveSentence() async {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let phrase = await store.saveCurrentPhrase(label: store.sentenceText)
        saveMessage = phrase == nil ? "Save needs identity" : "Saved"
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
