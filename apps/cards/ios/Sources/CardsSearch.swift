import SwiftUI
import TikoKit

// MARK: - Finding

/// Finds cards and categories by a typed word.
enum CardsSearch {
    struct Hit: Identifiable, Equatable {
        enum Kind: Equatable {
            case collection(CardCollection)
            case card(CommunicationCard)
        }

        let kind: Kind

        var id: String {
            switch kind {
            case .collection(let collection): "collection_\(collection.id)"
            case .card(let card): "card_\(card.id)"
            }
        }
    }

    /// How well a title answers what was typed; lower is better, nil is no match.
    /// Case and accents are ignored, so "cafe" finds "Café" and "ei" finds "Ei".
    static func rank(title: String, speech: String? = nil, query: String) -> Int? {
        let wanted = fold(query)
        guard !wanted.isEmpty else { return nil }
        let name = fold(title)
        if name == wanted { return 0 }
        let words = name.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        if words.first?.hasPrefix(wanted) == true { return 1 }
        if words.contains(where: { $0.hasPrefix(wanted) }) { return 2 }
        if name.contains(wanted) { return 3 }
        // What the card says counts too: "toilet" finds "I need the toilet".
        if let speech, fold(speech).contains(wanted) { return 4 }
        return nil
    }

    /// Best answers first; categories ahead of cards that match equally well,
    /// since a category is the shorter way to a whole group of them.
    static func results(for query: String, in collections: [CardCollection], limit: Int = 90) -> [Hit] {
        guard !fold(query).isEmpty else { return [] }
        var ranked: [(rank: Int, order: Int, hit: Hit)] = []
        var seenCards = Set<String>()
        var order = 0

        for collection in collections {
            if let rank = rank(title: collection.title, query: query) {
                ranked.append((rank * 2, order, Hit(kind: .collection(collection))))
                order += 1
            }
            for card in collection.cards {
                guard let rank = rank(title: card.title, speech: card.speech, query: query) else { continue }
                // The same thing filed in two places (milk under Breakfast and
                // under Drinks) is one answer, not two.
                let sameThing = "\(fold(card.title))|\(card.imageRef ?? card.id)"
                guard seenCards.insert(sameThing).inserted else { continue }
                ranked.append((rank * 2 + 1, order, Hit(kind: .card(card))))
                order += 1
            }
        }

        return ranked
            .sorted { ($0.rank, $0.order) < ($1.rank, $1.order) }
            .prefix(limit)
            .map(\.hit)
    }

    private static func fold(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
    }
}

// MARK: - The search screen

/// Search across every category: type a word, tap the card to hear it, or tap a
/// category to open it.
struct CardsSearchView: View {
    let collections: [CardCollection]
    @ObservedObject var store: CardsStore
    let speakingCardID: String?
    let labelFont: Font
    let cardSizeIndex: Int
    let onSpeak: (CommunicationCard) -> Void
    let onOpen: (CardCollection) -> Void

    @EnvironmentObject private var i18n: TikoI18n
    @State private var query = ""
    @FocusState private var fieldFocused: Bool

    private var hits: [CardsSearch.Hit] { CardsSearch.results(for: query, in: collections) }

    var body: some View {
        VStack(spacing: 0) {
            field
                .padding(.horizontal, 12)
                .padding(.top, 10)
                .padding(.bottom, 4)

            if query.trimmingCharacters(in: .whitespaces).isEmpty {
                message(i18n.t("cards.search.hint"), icon: "magnifyingglass")
            } else if hits.isEmpty {
                message(i18n.t("cards.search.empty"), icon: "questionmark.circle")
            } else {
                GeometryReader { geometry in
                    ScrollView {
                        LazyVGrid(
                            columns: Array(
                                repeating: GridItem(.flexible(), spacing: 12),
                                count: columnCount(width: geometry.size.width, height: geometry.size.height)
                            ),
                            spacing: 12
                        ) {
                            ForEach(hits) { hit in
                                tile(for: hit)
                            }
                        }
                        .padding(12)
                        .padding(.bottom, 24)
                    }
                    .scrollIndicators(.hidden)
                    .scrollDismissesKeyboard(.immediately)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .task {
            try? await Task.sleep(nanoseconds: 250_000_000)
            fieldFocused = true
        }
    }

    private var field: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.secondary)
            TextField(i18n.t("cards.search.placeholder"), text: $query)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.primary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .focused($fieldFocused)
                .onSubmit { fieldFocused = false }
                .accessibilityIdentifier("CardsSearchField")
            if !query.isEmpty {
                Button {
                    query = ""
                    fieldFocused = true
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("cards.search.clear"))
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        // `.primary` text on a tint of `.primary`: readable in light and dark.
        .background(Color.primary.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @ViewBuilder
    private func tile(for hit: CardsSearch.Hit) -> some View {
        switch hit.kind {
        case .collection(let collection):
            SubCollectionTile(
                collection: collection,
                thumbnailURL: store.imageURL(for: collection),
                labelFont: labelFont
            )
            .onTapGesture { onOpen(collection) }
        case .card(let card):
            CommunicationCardTile(
                card: card,
                imageURL: store.imageURL(for: card),
                isSpeaking: speakingCardID == card.id,
                isEditing: false,
                labelFont: labelFont,
                onSpeak: { onSpeak(card) }
            )
        }
    }

    private func message(_ text: String, icon: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.secondary)
            Text(text)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
        .padding(.top, 48)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    /// The same column rule the boards use, so a found card is the size it is
    /// everywhere else.
    private func columnCount(width: CGFloat, height: CGFloat) -> Int {
        let base: Int
        if width > height * 1.4 { base = width >= 800 ? 7 : 6 }
        else { base = width >= 640 ? 5 : (width >= 480 ? 4 : 3) }
        return max(2, base + (1 - cardSizeIndex))
    }
}
