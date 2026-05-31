import SwiftUI
import TikoKit

struct CardsView: View {
    private let previewCollections = [
        PreviewCardCollection(id: "needs", title: "Needs", symbol: "heart.fill", count: 6),
        PreviewCardCollection(id: "feelings", title: "Feelings", symbol: "face.smiling.fill", count: 8),
        PreviewCardCollection(id: "people", title: "People", symbol: "person.2.fill", count: 5),
        PreviewCardCollection(id: "activities", title: "Activities", symbol: "figure.play", count: 7)
    ]

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
                        ForEach(previewCollections) { collection in
                            NavigationLink {
                                PreviewCollectionDetail(collection: collection)
                            } label: {
                                PreviewCollectionTile(collection: collection)
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

private struct PreviewCardCollection: Identifiable, Equatable {
    let id: String
    let title: String
    let symbol: String
    let count: Int
}

private struct PreviewCollectionTile: View {
    let collection: PreviewCardCollection

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: collection.symbol)
                .font(.system(size: 42, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 84, height: 84)
                .background(Color(hex: 0xff8a1f))
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            VStack(spacing: 4) {
                Text(collection.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(Color(hex: 0x0b5a7a))

                Text("\(collection.count) cards")
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

private struct PreviewCollectionDetail: View {
    let collection: PreviewCardCollection

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: collection.symbol)
                .font(.system(size: 72, weight: .heavy))
                .foregroundStyle(Color(hex: 0xff8a1f))

            Text(collection.title)
                .font(.system(.largeTitle, design: .rounded).weight(.heavy))

            Text("Native card grid, speech, haptics, editing, and Photos integration come next.")
                .font(.system(.body, design: .rounded).weight(.semibold))
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle(collection.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    CardsView()
}
