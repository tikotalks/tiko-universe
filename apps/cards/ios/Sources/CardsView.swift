import SwiftUI
import TikoKit
import UIKit

struct CardsView: View {
    @StateObject private var store = CardsStore()
    private let speechService = CardsSpeechService()

    @AppStorage("cards.speechEnabled") private var speechEnabled = true
    @State private var speakingCardID: String?

    var body: some View {
        TikoAppShell(
            appName: "Cards",
            appIcon: "square.grid.2x2.fill",
            appIconMediaCategory: "animals",
            appColor: .cards,
            actions: [
                TikoHeaderAction(id: "edit", label: "Edit cards", systemImage: "pencil"),
                TikoHeaderAction(id: "speak", label: "Speech settings", systemImage: "speaker.wave.2.fill")
            ],
            settingsContent: {
                TikoSettingsSection(title: "Cards") {
                    TikoSettingsToggleRow(title: "Speak cards", icon: "speaker.wave.2.fill", appColor: .cards, isOn: $speechEnabled)
                }
            }
        ) {
            NavigationStack {
                GeometryReader { geometry in
                    ScrollView {
                        LazyVGrid(columns: gridColumns(for: geometry.size.width), spacing: 12) {
                            ForEach(store.collections) { collection in
                                NavigationLink {
                                    CollectionDetailView(
                                        collection: collection,
                                        isLoadingMedia: store.loadingCollectionIDs.contains(collection.id),
                                        speakingCardID: speakingCardID,
                                        onSpeak: speak
                                    )
                                    .task {
                                        await store.hydrateMedia(for: collection.id)
                                    }
                                } label: {
                                    CollectionTile(
                                        collection: collection,
                                        thumbnailURL: store.collectionThumbnails[collection.id]
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(12)
                    }
                    .navigationTitle("Choose a board")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
            .task {
                await store.hydrateRootThumbnails()
            }
        }
    }

    private func gridColumns(for width: CGFloat) -> [GridItem] {
        let count = width >= 640 ? 5 : (width >= 480 ? 4 : 3)
        return Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
    }

    private func speak(_ card: CommunicationCard) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        guard speechEnabled else { return }
        speakingCardID = card.id
        speechService.speak(card.speech)

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 450_000_000)
            if speakingCardID == card.id {
                speakingCardID = nil
            }
        }
    }
}

private struct CollectionTile: View {
    let collection: CardCollection
    let thumbnailURL: URL?

    var body: some View {
        TikoSquareTile(
            title: collection.title,
            subtitle: "\(collection.cards.count)",
            background: Color(hex: collection.colorHex).opacity(0.72)
        ) {
            if let thumbnailURL {
                CachedCardImage(url: thumbnailURL)
                    .overlay(Color.black.opacity(0.16))
            }
        }
    }
}

private struct CollectionDetailView: View {
    let collection: CardCollection
    let isLoadingMedia: Bool
    let speakingCardID: String?
    let onSpeak: (CommunicationCard) -> Void

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                LazyVGrid(columns: gridColumns(for: geometry.size.width), spacing: 12) {
                    ForEach(collection.cards) { card in
                        CommunicationCardTile(
                            card: card,
                            isSpeaking: speakingCardID == card.id,
                            onSpeak: { onSpeak(card) }
                        )
                    }
                }
                .padding(12)
            }
            .overlay(alignment: .top) {
                if isLoadingMedia {
                    ProgressView("Loading pictures…")
                        .font(.system(.caption, design: .rounded).weight(.bold))
                        .padding(10)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.top, 8)
                }
            }
        }
        .navigationTitle(collection.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func gridColumns(for width: CGFloat) -> [GridItem] {
        let count = width >= 640 ? 5 : (width >= 480 ? 4 : 3)
        return Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
    }
}

private struct CommunicationCardTile: View {
    let card: CommunicationCard
    let isSpeaking: Bool
    let onSpeak: () -> Void

    var body: some View {
        Button(action: onSpeak) {
            TikoSquareTile(
                title: card.title,
                background: Color(hex: card.colorHex).opacity(card.imageURL == nil ? 0.82 : 0.45),
                isActive: isSpeaking
            ) {
                if let imageURL = card.imageURL {
                    CachedCardImage(url: imageURL)
                        .overlay(Color.black.opacity(0.08))
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(card.speech)
    }
}

private struct CachedCardImage: View {
    let url: URL
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.white.opacity(0.18))
            }
        }
        .clipped()
        .task(id: url) {
            image = await CardsImageCache.shared.image(for: url)
        }
    }
}

#Preview {
    CardsView()
}
