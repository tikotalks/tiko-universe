import SwiftUI

/// How a board lays out its tiles.
enum CardsLayoutMode: String {
    /// One screenful at a time, swiped sideways. Nothing moves under a finger,
    /// which suits a child who taps where a card was last time.
    case pages
    /// Everything in one grid that scrolls. Suits a child who looks for a card
    /// by moving through all of them.
    case scroll

    static let storageKey = "cards.layoutMode"
}

/// A board's tiles, as swipeable pages or as one scrolling grid. The tiles are
/// the same either way; only how one gets to the next ones differs.
struct CardsBoardLayout<Item: Identifiable, Tile: View>: View {
    let items: [Item]
    let columns: Int
    /// How many tiles fill one page. Unused when scrolling.
    let perPage: Int
    let mode: CardsLayoutMode
    let sideInset: CGFloat
    /// Room kept free under the last row, for a bar that floats over the board.
    var bottomClearance: CGFloat = 0
    @Binding var page: Int
    @ViewBuilder let tile: (Item) -> Tile

    var body: some View {
        switch mode {
        case .pages:
            let pages = items.chunked(into: max(1, perPage))
            ZStack(alignment: .bottom) {
                TabView(selection: $page) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, pageItems in
                        grid(pageItems)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                            .padding(.bottom, max(bottomClearance, pages.count > 1 ? 24 : 8))
                            .tag(pageIndex)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                if pages.count > 1 {
                    PageDots(count: pages.count, current: page)
                        .padding(.bottom, 4)
                }
            }
        case .scroll:
            ScrollView {
                grid(items)
                    .padding(.bottom, max(bottomClearance, 24))
            }
            .scrollIndicators(.hidden)
            .accessibilityIdentifier("CardsScrollBoard")
        }
    }

    private func grid(_ items: [Item]) -> some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: columns),
            spacing: 12
        ) {
            ForEach(items) { item in
                tile(item)
            }
        }
        .padding(.leading, 12 + sideInset)
        .padding(.trailing, 12 + sideInset)
        .padding(.top, 12)
    }
}
