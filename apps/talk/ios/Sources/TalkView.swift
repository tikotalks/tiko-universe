import SwiftUI
import TikoKit
import UIKit

struct TalkView: View {
    @State private var store = TalkStore()
    @State private var isSpeaking = false
    @State private var searchExpanded = false
    @State private var searchText = ""
    @FocusState private var searchFocused: Bool
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("talk.nativeSpeechFallback") private var nativeSpeechFallback = true
    @AppStorage("talk.cloudLayout") private var cloudLayout = true

    private let speechService = TalkSpeechService()
    private let audioPlayer = TalkAudioPlayer()

    // Matches the TikoAppShell background so the top fade blends seamlessly.
    private var shellBackground: Color {
        colorScheme == .dark
            ? Color(red: 0.08, green: 0.055, blue: 0.095)
            : Color(red: 0.973, green: 0.965, blue: 0.945)
    }

    private var visibleBoardWords: [TalkWordTile] {
        let query = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        guard !query.isEmpty else { return store.boardWords }
        return store.boardWords.filter { $0.text.lowercased().contains(query) }
    }

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
                        TalkWordCloudView(words: visibleBoardWords, appColor: .talk) { word in
                            Task { await addWord(word) }
                        }
                    } else {
                        wordGrid
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Top fade so the board doesn't get cut off abruptly under the bar.
                LinearGradient(
                    colors: [shellBackground, shellBackground.opacity(0)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 170)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .allowsHitTesting(false)

                VStack(spacing: 10) {
                    TalkSentenceStripView(
                        words: store.sentenceWords,
                        canSpeak: store.canSpeak,
                        isSpeaking: isSpeaking,
                        appColor: .talk,
                        onSpeakWord: { word in speakWord(word) },
                        onRemove: { word in Task { await removeWord(word) } },
                        onSpeak: { Task { await speakSentence() } },
                        onClear: store.clearSentence
                    )
                    statusSection
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .overlay(alignment: .bottom) { searchControl }
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
                ForEach(visibleBoardWords) { word in
                    TalkWordTileView(word: word, appColor: .talk) {
                        Task { await addWord(word) }
                    }
                }
            }
            .padding(.top, 96)
            .padding(.bottom, 96)
        }
    }

    // Floating search: a colour icon button that expands into a filter field.
    // Filtering narrows the board; the + adds the typed word to the sentence even
    // when it isn't in the board (e.g. a name like "Sil").
    @ViewBuilder
    private var searchControl: some View {
        let trimmed = searchText.trimmingCharacters(in: .whitespaces)
        if searchExpanded {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(TikoAppColor.talk.palette.dark.opacity(0.5))
                TextField("Find or add a word", text: $searchText)
                    .focused($searchFocused)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .rounded).weight(.semibold))
                if !trimmed.isEmpty {
                    Button { addTypedWord() } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(TikoAppColor.talk.palette.primary)
                    }
                    .accessibilityLabel("Add \(trimmed) to the sentence")
                }
                Button { closeSearch() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(TikoAppColor.talk.palette.dark.opacity(0.35))
                }
                .accessibilityLabel("Close search")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white)
            .clipShape(Capsule())
            .shadow(color: TikoAppColor.talk.palette.dark.opacity(0.18), radius: 14, y: 6)
            .frame(maxWidth: 460)
            .padding(.horizontal, 16)
            .padding(.bottom, 18)
        } else {
            Button { openSearch() } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(TikoAppColor.talk.palette.primary)
                    .clipShape(Circle())
                    .shadow(color: TikoAppColor.talk.palette.dark.opacity(0.25), radius: 12, y: 5)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Search or add a word")
            .padding(.bottom, 22)
        }
    }

    private func openSearch() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { searchExpanded = true }
        searchFocused = true
    }

    private func closeSearch() {
        searchText = ""
        searchFocused = false
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { searchExpanded = false }
    }

    private func addTypedWord() {
        let text = searchText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        // A local custom word — added straight to the sentence. (Persisting it for
        // learning needs an identity session, which is a separate follow-up.)
        let tile = TalkWordTile(id: "uword-local-\(UUID().uuidString)", text: text, pos: "noun", category: "mine", isCustom: true)
        Task { await store.addWord(tile) }
        closeSearch()
    }

    private func speakWord(_ word: TalkWordTile) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        speechService.speak(word.text, languageCode: speechLanguageCode)
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
