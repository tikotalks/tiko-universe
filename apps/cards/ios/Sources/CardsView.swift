import SwiftUI
import TikoKit

struct CardsView: View {
    private let collections = defaultCardCollections
    private let columns = [
        GridItem(.adaptive(minimum: 140, maximum: 220), spacing: 16)
    ]

    var body: some View {
        TikoAppShell(
            appName: "Cards",
            appIcon: "square.grid.2x2.fill",
            appColor: .cards,
            actions: [
                TikoHeaderAction(id: "edit", label: "Edit cards", systemImage: "pencil"),
                TikoHeaderAction(id: "speak", label: "Speech settings", systemImage: "speaker.wave.2.fill")
            ]
        ) {
            NavigationStack {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(collections) { collection in
                            NavigationLink {
                                CollectionDetailView(collection: collection)
                            } label: {
                                CollectionTile(collection: collection)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(20)
                }
                .navigationTitle("Choose a board")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
}

private struct CollectionTile: View {
    let collection: CardCollection

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: collection.symbol)
                .font(.system(size: 42, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 84, height: 84)
                .background(Color(hex: collection.colorHex))
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            VStack(spacing: 4) {
                Text(collection.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(Color(hex: 0x0b5a7a))

                Text("\(collection.cards.count) cards")
                    .font(.system(.caption, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 178)
        .padding(16)
        .background(.white.opacity(0.72))
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.10), radius: 12, x: 0, y: 8)
    }
}

private struct CollectionDetailView: View {
    let collection: CardCollection

    private let columns = [
        GridItem(.adaptive(minimum: 128, maximum: 200), spacing: 14)
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(collection.cards) { card in
                    CommunicationCardTile(card: card)
                }
            }
            .padding(20)
        }
        .navigationTitle(collection.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct CommunicationCardTile: View {
    let card: CommunicationCard

    var body: some View {
        VStack(spacing: 12) {
            if let symbol = card.symbol {
                Image(systemName: symbol)
                    .font(.system(size: 42, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 88, height: 88)
                    .background(Color(hex: card.colorHex))
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            }

            Text(card.title)
                .font(.system(.title2, design: .rounded).weight(.heavy))
                .foregroundStyle(Color(hex: 0x0b5a7a))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 162)
        .padding(14)
        .background(.white.opacity(0.76))
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 7)
        .accessibilityLabel(card.speech)
    }
}

#Preview {
    CardsView()
}
