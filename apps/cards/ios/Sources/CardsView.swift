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
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color(hex: collection.colorHex).opacity(0.72))

            if let thumbnailURL {
                CachedCardImage(url: thumbnailURL)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(Color.black.opacity(0.16))
            }

            VStack(spacing: 6) {
                Spacer()
                Text(collection.title)
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.72)
                    .shadow(color: .black.opacity(0.35), radius: 5, x: 0, y: 2)

                Text("\(collection.cards.count)")
                    .font(.system(.caption2, design: .rounded).weight(.black))
                    .foregroundStyle(.white.opacity(0.9))
            }
            .padding(10)
        }
        .aspectRatio(1, contentMode: .fit)
        .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.10), radius: 8, x: 0, y: 5)
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
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Color(hex: card.colorHex).opacity(card.imageURL == nil ? 0.82 : 0.45))

                if let imageURL = card.imageURL {
                    CachedCardImage(url: imageURL)
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .overlay(Color.black.opacity(0.08))
                }

                Text(card.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.62)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 7)
                    .frame(maxWidth: .infinity)
                    .background(.black.opacity(card.imageURL == nil ? 0.18 : 0.34), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: .black.opacity(0.32), radius: 4, x: 0, y: 2)
            }
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(isSpeaking ? Color(hex: 0xff8a1f) : .white.opacity(0.28), lineWidth: isSpeaking ? 5 : 1)
            }
            .shadow(color: .black.opacity(isSpeaking ? 0.18 : 0.08), radius: isSpeaking ? 13 : 8, x: 0, y: isSpeaking ? 9 : 5)
            .scaleEffect(isSpeaking ? 1.04 : 1)
            .animation(.spring(response: 0.24, dampingFraction: 0.72), value: isSpeaking)
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
