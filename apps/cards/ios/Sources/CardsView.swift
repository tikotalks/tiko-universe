import SwiftUI
import TikoKit
import UIKit

struct CardsView: View {
    @StateObject private var store = CardsStore()
    private let speechService = CardsSpeechService()

    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .cards)
    @State private var speakingCardID: String?
    @State private var selectedCollection: CardCollection?
    @State private var collectionsPage = 0
    @State private var showingAdd = false

    var body: some View {
        TikoAppShell(
            appConfig: CardsAppConfig.app,
            appName: selectedCollection?.title ?? i18n.t("cards.appName"),
            onIconTap: selectedCollection != nil ? { selectedCollection = nil } : nil,
            actions: [TikoHeaderAction(id: "add", label: "Add", systemImage: "plus")],
            onAction: { id in if id == "add" { showingAdd = true } }
        ) {
            Group {
                if let collection = selectedCollection {
                    CollectionDetailView(
                        collection: collection,
                        isLoadingMedia: store.loadingCollectionIDs.contains(collection.id),
                        speakingCardID: speakingCardID,
                        onSpeak: speak
                    )
                    .id(collection.id)
                    .task(id: collection.id) {
                        await store.hydrateMedia(for: collection.id)
                    }
                } else if store.isLoading && store.collections.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    GeometryReader { geometry in
                        let sideInset = max(geometry.safeAreaInsets.leading, geometry.safeAreaInsets.trailing)
                        let usableWidth = geometry.size.width - geometry.safeAreaInsets.leading - geometry.safeAreaInsets.trailing
                        let cols = columnCount(width: usableWidth, height: geometry.size.height - geometry.safeAreaInsets.top - geometry.safeAreaInsets.bottom)
                        let cardSize = cardDimension(usableWidth: usableWidth, cols: cols)
                        let usableHeight = geometry.size.height - geometry.safeAreaInsets.top - geometry.safeAreaInsets.bottom
                        let rows = max(1, Int((usableHeight - 24) / (cardSize + 12)))
                        let perPage = cols * rows
                        let pages = store.collections.chunked(into: perPage)

                        ZStack(alignment: .bottom) {
                            TabView(selection: $collectionsPage) {
                                ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                                    LazyVGrid(
                                        columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                                        spacing: 12
                                    ) {
                                        ForEach(page) { collection in
                                            Button {
                                                selectedCollection = collection
                                            } label: {
                                                CollectionTile(
                                                    collection: collection,
                                                    thumbnailURL: store.collectionThumbnails[collection.id]
                                                )
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                    .padding(.leading, 12 + sideInset)
                                    .padding(.trailing, 12 + sideInset)
                                    .padding(.top, 12)
                                    .padding(.bottom, pages.count > 1 ? 24 : 8)
                                    .tag(pageIndex)
                                }
                            }
                            .tabViewStyle(.page(indexDisplayMode: .never))

                            if pages.count > 1 {
                                PageDots(count: pages.count, current: collectionsPage)
                                    .padding(.bottom, 4)
                            }
                        }
                    }
                }
            }
            .task {
                await store.load()
                await store.hydrateRootThumbnails()
            }
        }
        .sheet(isPresented: $showingAdd) {
            if let collection = selectedCollection {
                AddCardSheet(collection: collection, store: store, isPresented: $showingAdd)
            } else {
                AddCategorySheet(store: store, isPresented: $showingAdd)
            }
        }
        .environmentObject(i18n)
        .onAppear { i18n.setLanguage(languageCode) }
        .onChange(of: languageCode) { _, code in i18n.setLanguage(code) }
    }

    private func columnCount(width: CGFloat, height: CGFloat) -> Int {
        if width > height * 1.4 {
            return width >= 800 ? 7 : 6
        }
        return width >= 640 ? 5 : (width >= 480 ? 4 : 3)
    }

    private func cardDimension(usableWidth: CGFloat, cols: Int) -> CGFloat {
        (usableWidth - 24 - CGFloat(cols - 1) * 12) / CGFloat(cols)
    }

    private func speak(_ card: CommunicationCard) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
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
            background: Color(hex: collection.colorHex)
        ) {
            if let thumbnailURL {
                CachedCardImage(url: thumbnailURL)
            }
        }
    }
}

private struct CollectionDetailView: View {
    let collection: CardCollection
    let isLoadingMedia: Bool
    let speakingCardID: String?
    let onSpeak: (CommunicationCard) -> Void

    @State private var currentPage = 0

    var body: some View {
        GeometryReader { geometry in
            let sideInset = max(geometry.safeAreaInsets.leading, geometry.safeAreaInsets.trailing)
            let usableWidth = geometry.size.width - geometry.safeAreaInsets.leading - geometry.safeAreaInsets.trailing
            let usableHeight = geometry.size.height - geometry.safeAreaInsets.top - geometry.safeAreaInsets.bottom
            let cols = columnCount(width: usableWidth, height: usableHeight)
            let cardSize = (usableWidth - 24 - CGFloat(cols - 1) * 12) / CGFloat(cols)
            let rows = max(1, Int((usableHeight - 24) / (cardSize + 12)))
            let perPage = cols * rows
            let pages = collection.cards.chunked(into: perPage)

            ZStack(alignment: .bottom) {
                TabView(selection: $currentPage) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, pageCards in
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                            spacing: 12
                        ) {
                            ForEach(pageCards) { card in
                                CommunicationCardTile(
                                    card: card,
                                    isSpeaking: speakingCardID == card.id,
                                    onSpeak: { onSpeak(card) }
                                )
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(.leading, 12 + sideInset)
                        .padding(.trailing, 12 + sideInset)
                        .padding(.top, 12)
                        .padding(.bottom, pages.count > 1 ? 24 : 8)
                        .tag(pageIndex)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                if pages.count > 1 {
                    PageDots(count: pages.count, current: currentPage)
                        .padding(.bottom, 4)
                }
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
    }

    private func columnCount(width: CGFloat, height: CGFloat) -> Int {
        if width > height * 1.4 { return width >= 800 ? 7 : 6 }
        return width >= 640 ? 5 : (width >= 480 ? 4 : 3)
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
                background: Color(hex: card.colorHex),
                isActive: isSpeaking
            ) {
                if let imageURL = card.imageURL {
                    CachedCardImage(url: imageURL)
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

private struct PageDots: View {
    let count: Int
    let current: Int

    var body: some View {
        HStack(spacing: 7) {
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(i == current ? Color.primary.opacity(0.55) : Color.primary.opacity(0.18))
                    .frame(width: i == current ? 8 : 6, height: i == current ? 8 : 6)
                    .animation(.spring(response: 0.28, dampingFraction: 0.7), value: current)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.regularMaterial, in: Capsule())
    }
}

private struct AddCategorySheet: View {
    let store: CardsStore
    @Binding var isPresented: Bool
    @State private var title = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Category name") {
                    TextField("e.g. Food", text: $title)
                }
            }
            .navigationTitle("New category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        store.addCollection(title: title)
                        isPresented = false
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

private struct AddCardSheet: View {
    let collection: CardCollection
    let store: CardsStore
    @Binding var isPresented: Bool
    @State private var title = ""
    @State private var speech = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Card name") {
                    TextField("e.g. Apple", text: $title)
                        .onChange(of: title) { _, v in if speech.isEmpty || speech == title { speech = v } }
                }
                Section("Spoken text") {
                    TextField("What should be spoken", text: $speech)
                }
            }
            .navigationTitle("New card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        store.addCard(title: title, speech: speech, to: collection.id)
                        isPresented = false
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [self] }
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}

#Preview {
    CardsView()
}
