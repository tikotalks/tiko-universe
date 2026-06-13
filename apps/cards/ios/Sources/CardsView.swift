import SwiftUI
import TikoKit
import UIKit

private enum CardsSheet: String, Identifiable {
    case add
    case editCollection
    case editCard

    var id: String { rawValue }
}

struct CardsView: View {
    @StateObject private var store = CardsStore()
    private let speechService = CardsSpeechService()

    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("cards.hideDefaultCollections") private var hideDefaultCollections = false
    @AppStorage("cards.showAnimations") private var showAnimations = true
    @AppStorage("cards.cardSizeIndex") private var cardSizeIndex = 1
    @AppStorage("cards.labelSizeIndex") private var labelSizeIndex = 1
    @StateObject private var i18n = TikoI18n(app: .cards)
    @State private var speakingCardID: String?
    @State private var collectionStack: [CardCollection] = []
    @State private var collectionsPage = 0
    @State private var activeSheet: CardsSheet?
    @State private var isEditing = false
    @State private var draggingCollectionID: String?
    @State private var draggingCardID: String?
    @State private var isAdmin = false
    @State private var editingCollection: CardCollection?
    @State private var editingCard: CommunicationCard?
    @State private var editingCardCollectionID: String?
    @State private var selectedCollectionIDs: Set<String> = []
    @State private var showingRootBulkActions = false
    @State private var showingRootBulkMove = false

    @State private var localizedCollections: [CardCollection] = []

    private var visibleCollections: [CardCollection] {
        hideDefaultCollections
            ? localizedCollections.filter { $0.id.hasPrefix("user_") }
            : localizedCollections
    }

    private var currentCollection: CardCollection? { collectionStack.last }

    private var liveCurrentCollection: CardCollection? {
        guard let id = currentCollection?.id else { return nil }
        return localizedCollections.first { $0.id == id }
    }

    private func syncCollectionsFromStore() {
        localizedCollections = store.collections
    }

    private var labelFont: Font {
        switch labelSizeIndex {
        case 0: return Font.system(.caption2, design: .rounded).weight(.heavy)
        case 2: return Font.system(.subheadline, design: .rounded).weight(.heavy)
        default: return Font.system(.caption, design: .rounded).weight(.heavy)
        }
    }

    var body: some View {
        TikoAppShell(
            appConfig: CardsAppConfig.app,
            appName: liveCurrentCollection?.title ?? i18n.t("cards.appName"),
            onIconTap: !collectionStack.isEmpty ? {
                if isEditing {
                    withAnimation(.spring(response: 0.25)) { isEditing = false }
                } else {
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.85)) {
                        _ = collectionStack.popLast()
                    }
                }
            } : nil,
            actions: isEditing
                ? [TikoHeaderAction(id: "done", label: "Done", systemImage: "checkmark")]
                : [TikoHeaderAction(id: "add", label: "Add", systemImage: "plus")],
            onAction: { id in
                switch id {
                case "add":
                    refreshAdminStateFromStoredSession()
                    activeSheet = .add
                case "done": withAnimation(.spring(response: 0.25)) { isEditing = false; selectedCollectionIDs.removeAll() }
                default: break
                }
            },
            settingsContent: {
                TikoSettingsSection(title: i18n.t("cards.settings.collections")) {
                    TikoSettingsToggleRow(
                        title: i18n.t("cards.settings.hideDefaultSets"),
                        icon: "eye.slash.fill",
                        appColor: .cards,
                        isOn: $hideDefaultCollections
                    )
                }
                TikoSettingsSection(title: i18n.t("cards.settings.display")) {
                    TikoSettingsToggleRow(
                        title: i18n.t("cards.settings.showAnimations"),
                        icon: "sparkles",
                        appColor: .cards,
                        isOn: $showAnimations
                    )
                }
                TikoSettingsSection(title: i18n.t("cards.settings.accessibility")) {
                    TikoSettingsSizeRow(
                        title: i18n.t("cards.settings.cardSize"),
                        icon: "rectangle.grid.2x2.fill",
                        appColor: .cards,
                        selectedIndex: $cardSizeIndex
                    )
                    TikoSettingsSizeRow(
                        title: i18n.t("cards.settings.labelSize"),
                        icon: "textformat.size",
                        appColor: .cards,
                        selectedIndex: $labelSizeIndex
                    )
                }
            }
        ) {
            Group {
                if let collection = currentCollection {
                    let live = liveCurrentCollection ?? collection
                    CollectionDetailView(
                        collection: live,
                        isLoadingMedia: store.loadingCollectionIDs.contains(collection.id),
                        speakingCardID: speakingCardID,
                        isAdmin: isAdmin,
                        isEditing: $isEditing,
                        draggingCardID: $draggingCardID,
                        store: store,
                        onSpeak: speak,
                        onEdit: { card in
                            editingCard = card
                            editingCardCollectionID = collection.id
                            activeSheet = .editCard
                        },
                        onEditCollection: { col in
                            editingCollection = col
                            activeSheet = .editCollection
                        },
                        onStartEditing: {
                            refreshAdminStateFromStoredSession()
                            withAnimation(.spring(response: 0.25)) { isEditing = true }
                        },
                        onNavigate: { sub in
                            withAnimation(.spring(response: 0.38, dampingFraction: 0.85)) {
                                collectionStack.append(sub)
                            }
                        }
                    )
                    .id(collection.id)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                    .task(id: collection.id) {
                        await store.hydrateMedia(for: collection.id)
                    }
                } else if store.isLoading && visibleCollections.isEmpty {
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
                        let rootCollections = visibleCollections.filter { $0.parentID == nil }
                        let pages = rootCollections.chunked(into: perPage)

                        ZStack(alignment: .bottom) {
                            TabView(selection: $collectionsPage) {
                                ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                                    LazyVGrid(
                                        columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                                        spacing: 12
                                    ) {
                                        ForEach(page) { collection in
                                            ZStack(alignment: .topTrailing) {
                                                SubCollectionTile(
                                                    collection: collection,
                                                    thumbnailURL: store.imageURL(for: collection),
                                                    labelFont: labelFont
                                                )
                                                .scaleEffect(isEditing ? 0.92 : 1.0)
                                                .if(isEditing) { view in
                                                    view
                                                        .onDrag {
                                                            draggingCollectionID = collection.id
                                                            return NSItemProvider(object: collection.id as NSString)
                                                        } preview: {
                                                            SubCollectionTile(
                                                                collection: collection,
                                                                thumbnailURL: store.imageURL(for: collection)
                                                            )
                                                            .frame(width: 96, height: 96)
                                                            .shadow(color: .black.opacity(0.22), radius: 14, x: 0, y: 8)
                                                        }
                                                        .onDrop(of: [.text], delegate: CollectionDropDelegate(
                                                            targetID: collection.id,
                                                            store: store,
                                                            draggingID: $draggingCollectionID
                                                        ))
                                                }
                                                .onTapGesture {
                                                    guard !isEditing else { return }
                                                    withAnimation(.spring(response: 0.38, dampingFraction: 0.85)) {
                                                        collectionStack.append(collection)
                                                    }
                                                }

                                                if isEditing && (isAdmin || collection.id.hasPrefix("user_")) {
                                                    Button {
                                                        editingCollection = collection
                                                        activeSheet = .editCollection
                                                    } label: {
                                                        editBadge(isUserOwned: collection.id.hasPrefix("user_"))
                                                    }
                                                    .buttonStyle(.plain)
                                                    .padding([.top, .trailing], 6)
                                                    .transition(.scale(scale: 0.3).combined(with: .opacity))
                                                }
                                            }
                                            .overlay(alignment: .topLeading) {
                                                if isEditing {
                                                    selectionBadge(selected: selectedCollectionIDs.contains(collection.id))
                                                        .padding([.top, .leading], 6)
                                                        .onTapGesture {
                                                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                            withAnimation(.spring(response: 0.2)) {
                                                                if selectedCollectionIDs.contains(collection.id) {
                                                                    selectedCollectionIDs.remove(collection.id)
                                                                } else {
                                                                    selectedCollectionIDs.insert(collection.id)
                                                                }
                                                            }
                                                        }
                                                        .transition(.scale(scale: 0.3).combined(with: .opacity))
                                                }
                                            }
                                            .contentShape(Rectangle())
                                            .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in
                                                let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                                guard !isChild else { return }
                                                refreshAdminStateFromStoredSession()
                                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                                withAnimation(.spring(response: 0.25)) { isEditing = true }
                                            })
                                            .animation(.spring(response: 0.25), value: isEditing)
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

                            if selectedCollectionIDs.count > 0 && isEditing {
                                BulkActionBar(
                                    count: selectedCollectionIDs.count,
                                    onDeselect: {
                                        withAnimation(.spring(response: 0.25)) { selectedCollectionIDs.removeAll() }
                                    },
                                    onActions: { showingRootBulkActions = true }
                                )
                                .padding(.horizontal, sideInset + 16)
                                .padding(.bottom, max(geometry.safeAreaInsets.bottom, 8))
                                .transition(.move(edge: .bottom).combined(with: .opacity))
                                .zIndex(2)
                            }
                        }
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .leading).combined(with: .opacity),
                        removal: .move(edge: .trailing).combined(with: .opacity)
                    ))
                }
            }
            .animation(showAnimations ? .spring(response: 0.38, dampingFraction: 0.85) : .linear(duration: 0), value: currentCollection?.id)
            .task {
                await store.load(languageCode: languageCode)
                syncCollectionsFromStore()
                await store.hydrateRootThumbnails()
                await refreshAdminState()
            }
            .onChange(of: store.collections) { _, _ in syncCollectionsFromStore() }
        }
        .sheet(item: $activeSheet, onDismiss: clearSheetContext) { sheet in
            cardsSheetContent(for: sheet)
                .environmentObject(i18n)
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
        }
        .tikoPopup(isPresented: $showingRootBulkActions) {
            BulkActionsSheet(
                cardCount: 0,
                collectionCount: selectedCollectionIDs.count,
                onClose: { showingRootBulkActions = false },
                onDelete: {
                    for id in selectedCollectionIDs { store.deleteCollection(id: id) }
                    withAnimation { selectedCollectionIDs.removeAll() }
                    showingRootBulkActions = false
                },
                onMove: {
                    showingRootBulkActions = false
                    showingRootBulkMove = true
                },
                onColor: { showingRootBulkActions = false }
            )
        }
        .tikoPopup(isPresented: $showingRootBulkMove) {
            BulkMoveSheet(
                sourceCollectionID: "",
                collections: store.collections,
                onMove: { targetID in
                    store.reparentCollections(ids: selectedCollectionIDs, toParentID: targetID)
                    withAnimation { selectedCollectionIDs.removeAll() }
                    showingRootBulkMove = false
                },
                onClose: { showingRootBulkMove = false }
            )
        }
        .environmentObject(i18n)
        .onAppear { i18n.setLanguage(languageCode) }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
            Task {
                await store.load(languageCode: code)
                syncCollectionsFromStore()
                await store.hydrateRootThumbnails()
            }
        }
        .onChange(of: collectionStack) { _, _ in
            if isEditing { withAnimation(.spring(response: 0.25)) { isEditing = false } }
        }
    }

    private func refreshAdminState() async {
        let sessionStore = TikoDeviceSessionStore()
        guard let bundle = try? sessionStore.load() else {
            isAdmin = false
            return
        }
        isAdmin = Self.hasContentEditingAccess(bundle)
        guard let token = bundle.accessToken else {
            return
        }
        do {
            let refreshed = try await TikoIdentityClient().getSession(accessToken: token)
            let merged = refreshed.preservingSession(from: bundle)
            try sessionStore.save(merged)
            isAdmin = Self.hasContentEditingAccess(merged)
        } catch {
            isAdmin = Self.hasContentEditingAccess(bundle)
        }
    }

    private func refreshAdminStateFromStoredSession() {
        isAdmin = Self.hasContentEditingAccess(try? TikoDeviceSessionStore().load())
    }

    static func hasContentEditingAccess(_ bundle: TikoIdentityBundle?) -> Bool {
        bundle?.capabilities?.canEditContent == true ||
        bundle?.roles?.contains("admin") == true ||
        bundle?.roles?.contains("content_editor") == true
    }

    @ViewBuilder
    private func cardsSheetContent(for sheet: CardsSheet) -> some View {
        switch sheet {
        case .add:
            if let collection = currentCollection {
                AddCardSheet(collection: collection, store: store, isPresented: Binding(
                    get: { activeSheet == .add },
                    set: { if !$0 { activeSheet = nil } }
                ))
            } else {
                AddCategorySheet(store: store, collections: visibleCollections.filter { $0.parentID == nil }, isPresented: Binding(
                    get: { activeSheet == .add },
                    set: { if !$0 { activeSheet = nil } }
                ))
            }
        case .editCollection:
            if let collection = editingCollection {
                EditCollectionSheet(collection: collection, allCollections: localizedCollections, store: store, isAdmin: isAdmin, onClose: {
                    activeSheet = nil
                })
            }
        case .editCard:
            if let card = editingCard, let collectionID = editingCardCollectionID {
                EditCardSheet(card: card, collectionID: collectionID, store: store, isAdmin: isAdmin, onClose: {
                    activeSheet = nil
                })
            }
        }
    }

    private func clearSheetContext() {
        if activeSheet == nil {
            editingCollection = nil
            editingCard = nil
            editingCardCollectionID = nil
        }
    }

    private func columnCount(width: CGFloat, height: CGFloat) -> Int {
        let base: Int
        if width > height * 1.4 {
            base = width >= 800 ? 7 : 6
        } else {
            base = width >= 640 ? 5 : (width >= 480 ? 4 : 3)
        }
        return max(2, base + (1 - cardSizeIndex))
    }

    private func cardDimension(usableWidth: CGFloat, cols: Int) -> CGFloat {
        (usableWidth - 24 - CGFloat(cols - 1) * 12) / CGFloat(cols)
    }

    private func speak(_ card: CommunicationCard) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        speakingCardID = card.id
        speechService.speak(card.speech, languageCode: languageCode)

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 450_000_000)
            if speakingCardID == card.id {
                speakingCardID = nil
            }
        }
    }
}

// MARK: - Edit / selection badges

@ViewBuilder
private func selectionBadge(selected: Bool) -> some View {
    ZStack {
        Circle()
            .fill(selected ? Color.accentColor : Color(.systemBackground).opacity(0.85))
            .frame(width: 24, height: 24)
            .shadow(color: .black.opacity(0.15), radius: 2, x: 0, y: 1)
        if selected {
            Image(systemName: "checkmark")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
        } else {
            Circle()
                .strokeBorder(Color.secondary.opacity(0.5), lineWidth: 1.5)
                .frame(width: 24, height: 24)
        }
    }
}

@ViewBuilder
private func editBadge(isUserOwned: Bool) -> some View {
    ZStack {
        Circle()
            .fill(isUserOwned ? TikoAppColor.cards.palette.primary : Color(hex: 0xFF922B))
            .frame(width: 28, height: 28)
        Image(systemName: isUserOwned ? "pencil" : "wand.and.stars")
            .font(.system(size: 12, weight: .black))
            .foregroundStyle(.white)
    }
    .shadow(color: .black.opacity(0.28), radius: 4, x: 0, y: 2)
}

// MARK: - Drop delegates

private struct CollectionDropDelegate: DropDelegate {
    let targetID: String
    let store: CardsStore
    @Binding var draggingID: String?

    func performDrop(info: DropInfo) -> Bool { draggingID = nil; return true }
    func dropEntered(info: DropInfo) {
        guard let dragID = draggingID, dragID != targetID else { return }
        withAnimation(.spring(response: 0.3)) { store.reorderCollection(draggingID: dragID, targetID: targetID) }
    }
    func dropUpdated(info: DropInfo) -> DropProposal? { DropProposal(operation: .move) }
}

private struct CardDropDelegate: DropDelegate {
    let targetID: String
    let collectionID: String
    let store: CardsStore
    @Binding var draggingID: String?

    func performDrop(info: DropInfo) -> Bool { draggingID = nil; return true }
    func dropEntered(info: DropInfo) {
        guard let dragID = draggingID, dragID != targetID else { return }
        withAnimation(.spring(response: 0.3)) { store.reorderCard(draggingID: dragID, targetID: targetID, inCollectionID: collectionID) }
    }
    func dropUpdated(info: DropInfo) -> DropProposal? { DropProposal(operation: .move) }
}

// MARK: - Tiles

private struct CollectionTile: View {
    let collection: CardCollection
    let thumbnailURL: URL?
    let labelFont: Font

    init(collection: CardCollection, thumbnailURL: URL?, labelFont: Font = Font.system(.caption, design: .rounded).weight(.heavy)) {
        self.collection = collection
        self.thumbnailURL = thumbnailURL
        self.labelFont = labelFont
    }

    var body: some View {
        TikoSquareTile(
            title: collection.title,
            background: cardColor(collection.color),
            labelFont: labelFont
        ) {
            if let thumbnailURL {
                CachedCardImage(url: thumbnailURL)
            }
        }
    }
}

private struct SubCollectionTile: View {
    let collection: CardCollection
    let thumbnailURL: URL?
    let labelFont: Font
    @Environment(\.colorScheme) private var colorScheme

    init(collection: CardCollection, thumbnailURL: URL?, labelFont: Font = Font.system(.caption, design: .rounded).weight(.heavy)) {
        self.collection = collection
        self.thumbnailURL = thumbnailURL
        self.labelFont = labelFont
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                cardColor(collection.color)
                if let url = thumbnailURL {
                    CachedCardImage(url: url)
                }
            }

            Text(collection.title)
                .font(labelFont)
                .foregroundStyle(colorScheme == .dark ? Color.black : Color.white)
                .lineLimit(2)
                .minimumScaleFactor(0.65)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 6)
                .padding(.vertical, 5)
                .frame(maxWidth: .infinity)
                .background(colorScheme == .dark ? Color.white : Color(.label))
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .aspectRatio(1, contentMode: .fit)
        .shadow(color: .black.opacity(0.10), radius: 8, x: 0, y: 5)
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(.white.opacity(0.15), lineWidth: 1)
        }
        .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityLabel(collection.title)
    }
}

private enum CollectionItem: Identifiable {
    case subcollection(CardCollection)
    case card(CommunicationCard)
    var id: String {
        switch self {
        case .subcollection(let c): return "col_\(c.id)"
        case .card(let c):          return "card_\(c.id)"
        }
    }
}

private struct CollectionDetailView: View {
    let collection: CardCollection
    let isLoadingMedia: Bool
    let speakingCardID: String?
    let isAdmin: Bool
    @Binding var isEditing: Bool
    @Binding var draggingCardID: String?
    let store: CardsStore
    let onSpeak: (CommunicationCard) -> Void
    let onEdit: (CommunicationCard) -> Void
    let onEditCollection: (CardCollection) -> Void
    let onStartEditing: () -> Void
    let onNavigate: (CardCollection) -> Void

    @State private var currentPage = 0
    @State private var selectedCardIDs: Set<String> = []
    @State private var selectedCollectionIDs: Set<String> = []
    @State private var fullscreenCard: CommunicationCard?
    @State private var showingBulkActions = false
    @State private var showingBulkMove = false
    @State private var showingBulkColor = false
    @AppStorage("cards.cardSizeIndex") private var cardSizeIndex = 1
    @AppStorage("cards.labelSizeIndex") private var labelSizeIndex = 1

    private var labelFont: Font {
        switch labelSizeIndex {
        case 0: return Font.system(.caption2, design: .rounded).weight(.heavy)
        case 2: return Font.system(.subheadline, design: .rounded).weight(.heavy)
        default: return Font.system(.caption, design: .rounded).weight(.heavy)
        }
    }

    private var childCollections: [CardCollection] {
        store.collections.filter { $0.parentID == collection.id }.sorted { $0.order < $1.order }
    }

    private var allItems: [CollectionItem] {
        childCollections.map { .subcollection($0) } + collection.cards.map { .card($0) }
    }

    var body: some View {
        GeometryReader { geometry in
            let sideInset = max(geometry.safeAreaInsets.leading, geometry.safeAreaInsets.trailing)
            let usableWidth = geometry.size.width - geometry.safeAreaInsets.leading - geometry.safeAreaInsets.trailing
            let usableHeight = geometry.size.height - geometry.safeAreaInsets.top - geometry.safeAreaInsets.bottom
            let cols = columnCount(width: usableWidth, height: usableHeight)
            let cardSize = (usableWidth - 24 - CGFloat(cols - 1) * 12) / CGFloat(cols)
            let rows = max(1, Int((usableHeight - 24) / (cardSize + 12)))
            let perPage = cols * rows
            let pages = allItems.chunked(into: perPage)

            ZStack(alignment: .bottom) {
                TabView(selection: $currentPage) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, pageItems in
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                            spacing: 12
                        ) {
                            ForEach(pageItems) { item in
                                switch item {
                                case .subcollection(let sub):
                                    ZStack(alignment: .topTrailing) {
                                        SubCollectionTile(
                                            collection: sub,
                                            thumbnailURL: store.imageURL(for: sub),
                                            labelFont: labelFont
                                        )
                                        .scaleEffect(isEditing ? 0.92 : 1.0)
                                        .onTapGesture {
                                            guard !isEditing else { return }
                                            onNavigate(sub)
                                        }

                                        if isEditing && (isAdmin || sub.id.hasPrefix("user_")) {
                                            editBadge(isUserOwned: sub.id.hasPrefix("user_"))
                                                .padding([.top, .trailing], 6)
                                                .onTapGesture { onEditCollection(sub) }
                                                .transition(.scale(scale: 0.3).combined(with: .opacity))
                                        }
                                    }
                                    .overlay(alignment: .topLeading) {
                                        if isEditing {
                                            selectionBadge(selected: selectedCollectionIDs.contains(sub.id))
                                                .padding([.top, .leading], 6)
                                                .onTapGesture {
                                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                    withAnimation(.spring(response: 0.2)) {
                                                        if selectedCollectionIDs.contains(sub.id) {
                                                            selectedCollectionIDs.remove(sub.id)
                                                        } else {
                                                            selectedCollectionIDs.insert(sub.id)
                                                        }
                                                    }
                                                }
                                                .transition(.scale(scale: 0.3).combined(with: .opacity))
                                        }
                                    }
                                    .contentShape(Rectangle())
                                    .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in
                                        let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                        guard !isChild else { return }
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        onStartEditing()
                                    })
                                    .animation(.spring(response: 0.25), value: isEditing)

                                case .card(let card):
                                    ZStack(alignment: .topTrailing) {
                                        CommunicationCardTile(
                                            card: card,
                                            imageURL: store.imageURL(for: card),
                                            isSpeaking: speakingCardID == card.id,
                                            isEditing: isEditing,
                                            labelFont: labelFont,
                                            onSpeak: { onSpeak(card) }
                                        )
                                        .scaleEffect(isEditing ? 0.92 : 1.0)
                                        .if(isEditing) { view in
                                            view
                                                .onDrag {
                                                    draggingCardID = card.id
                                                    return NSItemProvider(object: card.id as NSString)
                                                } preview: {
                                                    CommunicationCardTile(
                                                        card: card,
                                                        imageURL: store.imageURL(for: card),
                                                        isSpeaking: false,
                                                        isEditing: false,
                                                        onSpeak: {}
                                                    )
                                                    .frame(width: 96, height: 96)
                                                    .shadow(color: .black.opacity(0.22), radius: 14, x: 0, y: 8)
                                                }
                                                .onDrop(of: [.text], delegate: CardDropDelegate(
                                                    targetID: card.id,
                                                    collectionID: collection.id,
                                                    store: store,
                                                    draggingID: $draggingCardID
                                                ))
                                        }

                                        if isEditing && (isAdmin || card.id.hasPrefix("user_")) {
                                            editBadge(isUserOwned: card.id.hasPrefix("user_"))
                                                .padding([.top, .trailing], 6)
                                                .onTapGesture { onEdit(card) }
                                                .transition(.scale(scale: 0.3).combined(with: .opacity))
                                        }
                                    }
                                    .overlay(alignment: .topLeading) {
                                        if isEditing && (isAdmin || card.id.hasPrefix("user_")) {
                                            selectionBadge(selected: selectedCardIDs.contains(card.id))
                                                .padding([.top, .leading], 6)
                                                .onTapGesture {
                                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                    withAnimation(.spring(response: 0.2)) {
                                                        if selectedCardIDs.contains(card.id) {
                                                            selectedCardIDs.remove(card.id)
                                                        } else {
                                                            selectedCardIDs.insert(card.id)
                                                        }
                                                    }
                                                }
                                                .transition(.scale(scale: 0.3).combined(with: .opacity))
                                        }
                                    }
                                    .contentShape(Rectangle())
                                    .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in
                                        let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        if isChild {
                                            fullscreenCard = card
                                        } else {
                                            onStartEditing()
                                        }
                                    })
                                    .animation(.spring(response: 0.25), value: isEditing)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(.leading, 12 + sideInset)
                        .padding(.trailing, 12 + sideInset)
                        .padding(.top, 12)
                        .padding(.bottom, (!selectedCardIDs.isEmpty || !selectedCollectionIDs.isEmpty) && isEditing ? 84 : (pages.count > 1 ? 24 : 8))
                        .tag(pageIndex)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                if pages.count > 1 {
                    PageDots(count: pages.count, current: currentPage)
                        .padding(.bottom, 4)
                }

                let totalSelected = selectedCardIDs.count + selectedCollectionIDs.count
                if totalSelected > 0 && isEditing {
                    BulkActionBar(
                        count: totalSelected,
                        onDeselect: {
                            withAnimation(.spring(response: 0.25)) {
                                selectedCardIDs.removeAll()
                                selectedCollectionIDs.removeAll()
                            }
                        },
                        onActions: { showingBulkActions = true }
                    )
                    .padding(.horizontal, sideInset + 16)
                    .padding(.bottom, max(geometry.safeAreaInsets.bottom, 8))
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(2)
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
        .onChange(of: isEditing) { _, newValue in
            if !newValue {
                withAnimation(.spring(response: 0.25)) {
                    selectedCardIDs.removeAll()
                    selectedCollectionIDs.removeAll()
                }
            }
        }
        .tikoPopup(isPresented: $showingBulkActions) {
            BulkActionsSheet(
                cardCount: selectedCardIDs.count,
                collectionCount: selectedCollectionIDs.count,
                onClose: { showingBulkActions = false },
                onDelete: {
                    store.deleteCards(ids: selectedCardIDs, fromCollectionID: collection.id)
                    for id in selectedCollectionIDs { store.deleteCollection(id: id) }
                    withAnimation { selectedCardIDs.removeAll(); selectedCollectionIDs.removeAll() }
                    showingBulkActions = false
                },
                onMove: {
                    showingBulkActions = false
                    showingBulkMove = true
                },
                onColor: {
                    showingBulkActions = false
                    showingBulkColor = true
                }
            )
        }
        .tikoPopup(isPresented: $showingBulkMove) {
            BulkMoveSheet(
                sourceCollectionID: collection.id,
                collections: store.collections,
                onMove: { targetID in
                    if !selectedCardIDs.isEmpty {
                        store.moveCards(ids: selectedCardIDs, fromCollectionID: collection.id, toCollectionID: targetID)
                    }
                    if !selectedCollectionIDs.isEmpty {
                        store.reparentCollections(ids: selectedCollectionIDs, toParentID: targetID)
                    }
                    withAnimation { selectedCardIDs.removeAll(); selectedCollectionIDs.removeAll() }
                    showingBulkMove = false
                },
                onClose: { showingBulkMove = false }
            )
        }
        .tikoPopup(isPresented: $showingBulkColor) {
            BulkColorSheet(
                onSelect: { color in
                    store.recolorCards(ids: selectedCardIDs, inCollectionID: collection.id, color: color)
                    withAnimation { selectedCardIDs.removeAll(); selectedCollectionIDs.removeAll() }
                    showingBulkColor = false
                },
                onClose: { showingBulkColor = false }
            )
        }
        .sheet(item: $fullscreenCard) { card in
            FullscreenCardView(card: card, imageURL: store.imageURL(for: card)) { fullscreenCard = nil }
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
        }
    }

    private func columnCount(width: CGFloat, height: CGFloat) -> Int {
        let base: Int
        if width > height * 1.4 { base = width >= 800 ? 7 : 6 }
        else { base = width >= 640 ? 5 : (width >= 480 ? 4 : 3) }
        return max(2, base + (1 - cardSizeIndex))
    }

}

// MARK: - Bulk selection

private struct BulkActionBar: View {
    let count: Int
    let onDeselect: () -> Void
    let onActions: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onDeselect) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)

            Text("\(count) selected")
                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                .foregroundStyle(.primary)

            Spacer()

            Button("Actions", action: onActions)
                .font(.system(.subheadline, design: .rounded).weight(.bold))
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
        }
    }
}

private struct BulkActionsSheet: View {
    let cardCount: Int
    let collectionCount: Int
    let onClose: () -> Void
    let onDelete: () -> Void
    let onMove: () -> Void
    let onColor: () -> Void

    @State private var confirmDelete = false

    private var total: Int { cardCount + collectionCount }
    private var title: String {
        var parts: [String] = []
        if cardCount > 0 { parts.append("\(cardCount) card\(cardCount == 1 ? "" : "s")") }
        if collectionCount > 0 { parts.append("\(collectionCount) collection\(collectionCount == 1 ? "" : "s")") }
        return parts.joined(separator: " & ") + " selected"
    }

    var body: some View {
        TikoPopupCard(
            title: title,
            icon: "checklist",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 10) {
                bulkActionRow(label: "Move to Collection", icon: "arrow.right.square", action: onMove)
                bulkActionRow(label: "Change Color", icon: "paintpalette", action: onColor)
                Divider()
                Button(role: .destructive) { confirmDelete = true } label: {
                    Label("Delete Cards", systemImage: "trash")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .alert("Delete \(total) item\(total == 1 ? "" : "s")?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive, action: onDelete)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    private func bulkActionRow(label: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(label, systemImage: icon)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct BulkMoveSheet: View {
    let sourceCollectionID: String
    let collections: [CardCollection]
    let onMove: (String) -> Void
    let onClose: () -> Void

    var body: some View {
        TikoPopupCard(
            title: "Move to Collection",
            icon: "arrow.right.square",
            appColor: .cards,
            onClose: onClose
        ) {
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(collections.filter { $0.id != sourceCollectionID && $0.parentID == nil }) { collection in
                        Button { onMove(collection.id) } label: {
                            HStack(spacing: 12) {
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(cardColor(collection.color))
                                    .frame(width: 32, height: 32)
                                Text(collection.title)
                                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(.tertiary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxHeight: 320)
        }
    }
}

private struct BulkColorSheet: View {
    let onSelect: (String) -> Void
    let onClose: () -> Void

    @State private var pickedColor = TikoColors.all[0].name

    var body: some View {
        TikoPopupCard(
            title: "Change Color",
            icon: "paintpalette",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 16) {
                CardColorPicker(selectedColor: $pickedColor)

                addButton(label: "Apply Color", disabled: false) {
                    onSelect(pickedColor)
                }
            }
        }
    }
}

private struct CommunicationCardTile: View {
    let card: CommunicationCard
    let imageURL: URL?
    let isSpeaking: Bool
    let isEditing: Bool
    let labelFont: Font
    let onSpeak: () -> Void

    init(
        card: CommunicationCard,
        imageURL: URL?,
        isSpeaking: Bool,
        isEditing: Bool,
        labelFont: Font = Font.system(.caption, design: .rounded).weight(.heavy),
        onSpeak: @escaping () -> Void
    ) {
        self.card = card
        self.imageURL = imageURL
        self.isSpeaking = isSpeaking
        self.isEditing = isEditing
        self.labelFont = labelFont
        self.onSpeak = onSpeak
    }

    var body: some View {
        Button(action: { if !isEditing { onSpeak() } }) {
            TikoSquareTile(
                title: card.title,
                background: cardColor(card.color),
                isActive: isSpeaking,
                labelFont: labelFont
            ) {
                if let imageURL {
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

    var body: some View {
        TikoCachedRemoteImage(url: url) {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.white.opacity(0.18))
        }
        .clipped()
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

// MARK: - Fullscreen card (child mode)

private struct FullscreenCardView: View {
    let card: CommunicationCard
    let imageURL: URL?
    let onClose: () -> Void
    @State private var imageScale: CGFloat = 0.82
    @State private var imageOpacity: CGFloat = 0
    @State private var textOpacity: CGFloat = 0

    var body: some View {
        ZStack {
            cardColor(card.color).ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                if let url = imageURL {
                    TikoCachedRemoteImage(url: url) {
                        RoundedRectangle(cornerRadius: 32, style: .continuous)
                            .fill(.white.opacity(0.2))
                    }
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                    .shadow(color: .black.opacity(0.28), radius: 32, x: 0, y: 16)
                    .padding(.horizontal, 32)
                    .scaleEffect(imageScale)
                    .opacity(imageOpacity)
                } else {
                    RoundedRectangle(cornerRadius: 32, style: .continuous)
                        .fill(.white.opacity(0.2))
                        .aspectRatio(1, contentMode: .fit)
                        .padding(.horizontal, 40)
                        .scaleEffect(imageScale)
                        .opacity(imageOpacity)
                }

                Text(card.title)
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 40)
                    .opacity(textOpacity)

                Spacer()
            }

            VStack {
                HStack {
                    Spacer()
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(.black.opacity(0.25))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(20)
                    .opacity(textOpacity)
                }
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.72)) {
                imageScale = 1.0
                imageOpacity = 1.0
            }
            withAnimation(.easeOut(duration: 0.22).delay(0.15)) {
                textOpacity = 1.0
            }
        }
    }
}

// MARK: - Add sheets

private struct CardsFormSheet<Content: View>: View {
    let title: String
    let icon: String
    let onClose: () -> Void
    private let content: Content

    init(title: String, icon: String, onClose: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.onClose = onClose
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.primary.opacity(0.75))
                        .frame(width: 44, height: 44)
                        .background(Color.primary.opacity(0.055))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close")

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    Text("Cards")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: icon)
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(TikoAppColor.cards.palette.primary)
                    .frame(width: 44, height: 44)
                    .background(TikoAppColor.cards.palette.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)
            .padding(.bottom, 14)

            ScrollView {
                content
                    .padding(.horizontal, 20)
                    .padding(.bottom, 28)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(.systemGroupedBackground).ignoresSafeArea())
    }
}

private struct AddCategorySheet: View {
    let store: CardsStore
    let collections: [CardCollection]
    @Binding var isPresented: Bool
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title = ""
    @State private var selectedColor = TikoColors.all[0].name
    @State private var selectedImageURL: URL?
    @State private var selectedParentID: String? = nil
    @State private var showingImagePicker = false

    var body: some View {
        CardsFormSheet(
            title: i18n.t("cards.add.newCategory"),
            icon: "square.grid.2x2.fill",
            onClose: { isPresented = false }
        ) {
            VStack(spacing: 14) {
                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCategory"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                if !collections.isEmpty {
                    CompactParentPicker(selectedParentID: $selectedParentID, collections: collections, label: "Parent Collection (optional)")
                }

                CompactColorPicker(selectedColor: $selectedColor, label: i18n.t("cards.add.color"))

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    if selectedImageURL == nil {
                        MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                            selectedImageURL = url
                        }
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: i18n.t("cards.add.addCategory"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    store.addCollection(title: title, color: selectedColor, imageURL: selectedImageURL, parentID: selectedParentID)
                    isPresented = false
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
    }
}

private struct AddCardSheet: View {
    let collection: CardCollection
    let store: CardsStore
    @Binding var isPresented: Bool
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title = ""
    @State private var speech = ""
    @State private var selectedColor: String
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    init(collection: CardCollection, store: CardsStore, isPresented: Binding<Bool>) {
        self.collection = collection
        self.store = store
        self._isPresented = isPresented
        self._selectedColor = State(initialValue: collection.color)
    }

    var body: some View {
        CardsFormSheet(
            title: i18n.t("cards.add.newCard"),
            icon: "rectangle.badge.plus",
            onClose: { isPresented = false }
        ) {
            VStack(spacing: 14) {
                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCard"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .onChange(of: title) { oldValue, newValue in if speech.isEmpty || speech == oldValue { speech = newValue } }
                }

                cardField(label: i18n.t("cards.add.spokenText")) {
                    TextField(i18n.t("cards.add.whatShouldBeSpoken"), text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                CompactColorPicker(selectedColor: $selectedColor, label: i18n.t("cards.add.color"))

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    if selectedImageURL == nil {
                        MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                            selectedImageURL = url
                        }
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: i18n.t("cards.add.addCard"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    store.addCard(
                        title: title,
                        speech: speech,
                        color: selectedColor,
                        imageURL: selectedImageURL,
                        to: collection.id
                    )
                    isPresented = false
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
    }
}

// MARK: - Edit sheets

private struct EditCollectionSheet: View {
    let collection: CardCollection
    let allCollections: [CardCollection]
    let store: CardsStore
    let isAdmin: Bool
    let onClose: () -> Void
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title: String
    @State private var selectedColor: String
    @State private var selectedParentID: String?
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false
    @State private var showingDefaultConfirmation = false
    @State private var showingPromoteConfirmation = false

    private var isDefault: Bool { !collection.id.hasPrefix("user_") }
    private var eligibleParents: [CardCollection] {
        allCollections.filter { $0.id != collection.id && $0.parentID != collection.id }
    }

    init(collection: CardCollection, allCollections: [CardCollection], store: CardsStore, isAdmin: Bool, onClose: @escaping () -> Void) {
        self.collection = collection
        self.allCollections = allCollections
        self.store = store
        self.isAdmin = isAdmin
        self.onClose = onClose
        self._title = State(initialValue: collection.title)
        self._selectedColor = State(initialValue: collection.color)
        self._selectedParentID = State(initialValue: collection.parentID)
        self._selectedImageURL = State(initialValue: store.imageURL(for: collection))
    }

    var body: some View {
        CardsFormSheet(
            title: i18n.t("cards.add.editCategory"),
            icon: "square.grid.2x2.fill",
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                HStack {
                    Spacer()
                    SubCollectionTile(
                        collection: CardCollection(
                            id: collection.id,
                            title: title.isEmpty ? " " : title,
                            color: selectedColor,
                            order: collection.order,
                            cards: []
                        ),
                        thumbnailURL: selectedImageURL
                    )
                    .frame(width: 88, height: 88)
                    .allowsHitTesting(false)
                    Spacer()
                }

                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCategory"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                CompactColorPicker(selectedColor: $selectedColor, label: i18n.t("cards.add.color"))

                if !eligibleParents.isEmpty {
                    CompactParentPicker(selectedParentID: $selectedParentID, collections: eligibleParents, label: "Parent Collection")
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    if selectedImageURL == nil {
                        MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                            selectedImageURL = url
                        }
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                if !isDefault && isAdmin {
                    Button {
                        showingPromoteConfirmation = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "star.circle")
                                .font(.system(size: 16, weight: .bold))
                            Text("Make default collection")
                                .font(.system(size: 15, weight: .heavy, design: .rounded))
                            Spacer()
                        }
                        .foregroundStyle(TikoAppColor.cards.palette.primary)
                        .padding(14)
                        .background(TikoAppColor.cards.palette.primary.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                if isDefault && isAdmin {
                    defaultWarningBanner()
                }

                addButton(label: i18n.t("cards.add.saveChanges"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    if isDefault && isAdmin {
                        showingDefaultConfirmation = true
                    } else {
                        saveChanges(asDefault: false)
                    }
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
        .alert("Update default collection?", isPresented: $showingDefaultConfirmation) {
            Button("Update for everyone", role: .destructive) { saveChanges(asDefault: true) }
            Button("Just for me") { saveChanges(asDefault: false) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This changes the default \"\(collection.title)\" collection for all users.")
        }
        .alert("Make \"\(collection.title)\" a default?", isPresented: $showingPromoteConfirmation) {
            Button("Make default", role: .destructive) { promoteCollection() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will make \"\(collection.title)\" a default collection visible to all users.")
        }
    }

    private func saveChanges(asDefault: Bool) {
        store.updateCollection(
            id: collection.id,
            title: title.trimmingCharacters(in: .whitespaces),
            color: selectedColor,
            parentID: .some(selectedParentID),
            imageURL: selectedImageURL,
            saveAsDefault: asDefault
        )
        onClose()
    }

    private func promoteCollection() {
        store.promoteCollectionToDefault(collection)
        onClose()
    }
}

private struct EditCardSheet: View {
    let card: CommunicationCard
    let collectionID: String
    let store: CardsStore
    let isAdmin: Bool
    let onClose: () -> Void
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title: String
    @State private var speech: String
    @State private var selectedColor: String
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false
    @State private var showingDefaultConfirmation = false
    @State private var showingDeleteConfirmation = false

    private var isDefault: Bool { !card.id.hasPrefix("user_") }

    init(card: CommunicationCard, collectionID: String, store: CardsStore, isAdmin: Bool, onClose: @escaping () -> Void) {
        self.card = card
        self.collectionID = collectionID
        self.store = store
        self.isAdmin = isAdmin
        self.onClose = onClose
        self._title = State(initialValue: card.title)
        self._speech = State(initialValue: card.speech)
        self._selectedColor = State(initialValue: card.color)
        self._selectedImageURL = State(initialValue: store.imageURL(for: card))
    }

    var body: some View {
        CardsFormSheet(
            title: i18n.t("cards.add.editCard"),
            icon: "rectangle.badge.plus",
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                HStack {
                    Spacer()
                    CommunicationCardTile(
                        card: CommunicationCard(
                            id: card.id,
                            title: title.isEmpty ? " " : title,
                            speech: speech,
                            color: selectedColor
                        ),
                        imageURL: selectedImageURL,
                        isSpeaking: false,
                        isEditing: false,
                        labelFont: Font.system(.caption, design: .rounded).weight(.heavy),
                        onSpeak: {}
                    )
                    .frame(width: 88, height: 88)
                    .allowsHitTesting(false)
                    Spacer()
                }

                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCard"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                cardField(label: i18n.t("cards.add.spokenText")) {
                    TextField(i18n.t("cards.add.whatShouldBeSpoken"), text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                CompactColorPicker(selectedColor: $selectedColor, label: i18n.t("cards.add.color"))

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    if selectedImageURL == nil {
                        MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                            selectedImageURL = url
                        }
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                if isDefault && isAdmin {
                    defaultWarningBanner()
                }

                Button(role: .destructive) {
                    showingDeleteConfirmation = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                            .font(.system(size: 16, weight: .bold))
                        Text("Delete card")
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                        Spacer()
                    }
                    .foregroundStyle(.red)
                    .padding(14)
                    .background(Color.red.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)

                addButton(label: i18n.t("cards.add.saveChanges"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    if isDefault && isAdmin {
                        showingDefaultConfirmation = true
                    } else {
                        saveChanges()
                    }
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
        .alert("Update default card?", isPresented: $showingDefaultConfirmation) {
            Button("Update for everyone", role: .destructive) { saveChanges() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This changes the default \"\(card.title)\" card for all users.")
        }
        .alert("Delete \"\(card.title)\"?", isPresented: $showingDeleteConfirmation) {
            Button(isDefault ? "Delete for everyone" : "Delete", role: .destructive) { deleteCard() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(isDefault
                ? "This permanently deletes the default card \"\(card.title)\" for all users."
                : "Are you sure you want to delete \"\(card.title)\"?")
        }
    }

    private func saveChanges() {
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        let trimmedSpeech = speech.trimmingCharacters(in: .whitespaces)
        store.updateCard(
            id: card.id,
            title: trimmedTitle,
            speech: trimmedSpeech.isEmpty ? trimmedTitle : trimmedSpeech,
            color: selectedColor,
            imageURL: selectedImageURL,
            inCollectionID: collectionID
        )
        onClose()
    }

    private func deleteCard() {
        store.deleteCard(id: card.id, inCollectionID: collectionID)
        onClose()
    }
}

// MARK: - Shared form helpers

@ViewBuilder
private func cardField<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 7) {
        fieldLabel(label)
        content()
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
    }
}

private func fieldLabel(_ text: String) -> some View {
    Text(text)
        .font(.system(size: 13, weight: .heavy, design: .rounded))
        .foregroundStyle(.secondary)
}

private func addButton(label: String, disabled: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
        Text(label)
            .font(.system(size: 17, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(disabled ? Color(.systemFill) : TikoAppColor.cards.palette.primary)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(.plain)
    .disabled(disabled)
}

@ViewBuilder
private func defaultWarningBanner() -> some View {
    HStack(spacing: 10) {
        Image(systemName: "exclamationmark.triangle.fill")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(Color(hex: 0xFF922B))
        Text("Editing a default — changes affect all users")
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            .foregroundStyle(Color(hex: 0xFF922B))
        Spacer()
    }
    .padding(14)
    .background(Color(hex: 0xFF922B).opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .stroke(Color(hex: 0xFF922B).opacity(0.25), lineWidth: 1)
    }
}

// MARK: - Color picker

private struct CompactColorPicker: View {
    @Binding var selectedColor: String
    let label: String
    @State private var showingGrid = false

    var body: some View {
        Button { showingGrid = true } label: {
            HStack(spacing: 10) {
                fieldLabel(label)
                Spacer()
                Circle()
                    .fill(cardColor(selectedColor))
                    .frame(width: 28, height: 28)
                    .shadow(color: .black.opacity(0.18), radius: 3, x: 0, y: 1)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .tikoPopup(isPresented: $showingGrid) {
            TikoPopupCard(title: "Select Color", icon: "paintpalette", appColor: .cards, onClose: { showingGrid = false }) {
                CardColorPicker(selectedColor: Binding(
                    get: { selectedColor },
                    set: { selectedColor = $0; showingGrid = false }
                ))
            }
        }
    }
}

private struct CompactParentPicker: View {
    @Binding var selectedParentID: String?
    let collections: [CardCollection]
    let label: String
    @State private var showingPicker = false

    private var selectedCollection: CardCollection? {
        collections.first { $0.id == selectedParentID }
    }

    var body: some View {
        Button { showingPicker = true } label: {
            HStack(spacing: 10) {
                fieldLabel(label)
                Spacer()
                if let col = selectedCollection {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(cardColor(col.color))
                        .frame(width: 22, height: 22)
                    Text(col.title)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                } else {
                    Text("None")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .tikoPopup(isPresented: $showingPicker) {
            TikoPopupCard(title: label, icon: "folder", appColor: .cards, onClose: { showingPicker = false }) {
                ScrollView {
                    VStack(spacing: 8) {
                        Button {
                            selectedParentID = nil
                            showingPicker = false
                        } label: {
                            HStack(spacing: 12) {
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(Color.primary.opacity(0.08))
                                    .frame(width: 32, height: 32)
                                    .overlay {
                                        Image(systemName: "minus")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(.secondary)
                                    }
                                Text("None (top level)")
                                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.primary)
                                Spacer()
                                if selectedParentID == nil {
                                    Image(systemName: "checkmark")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(TikoAppColor.cards.palette.primary)
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        ForEach(collections) { col in
                            Button {
                                selectedParentID = col.id
                                showingPicker = false
                            } label: {
                                HStack(spacing: 12) {
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .fill(cardColor(col.color))
                                        .frame(width: 32, height: 32)
                                    Text(col.title)
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    if selectedParentID == col.id {
                                        Image(systemName: "checkmark")
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(TikoAppColor.cards.palette.primary)
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 320)
            }
        }
    }
}

private struct CardColorPicker: View {
    @Binding var selectedColor: String

    var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5),
            spacing: 10
        ) {
            ForEach(TikoColors.all, id: \.name) { color in
                ZStack {
                    Circle()
                        .fill(Color(hex: color.hex))
                    if selectedColor == color.name {
                        Circle().strokeBorder(Color.white, lineWidth: 2.5)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                    }
                }
                .frame(height: 38)
                .onTapGesture {
                    withAnimation(.spring(response: 0.2)) { selectedColor = color.name }
                }
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        }
    }
}

// MARK: - Media suggestions

private struct MediaSuggestionRow: View {
    let query: String
    let selectedURL: URL?
    let onSelect: (URL) -> Void

    @State private var results: [URL] = []
    @State private var isLoading = false
    @State private var loadedQuery = ""

    var body: some View {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        VStack(alignment: .leading, spacing: 7) {
            if !trimmed.isEmpty && !results.isEmpty {
                fieldLabel("Suggestions from Tiko")
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(results, id: \.self) { url in
                            Button {
                                withAnimation(.spring(response: 0.2)) { onSelect(url) }
                            } label: {
                                ZStack(alignment: .topTrailing) {
                                    TikoCachedRemoteImage(url: url) {
                                        Color(.systemFill)
                                    }
                                    .frame(width: 64, height: 64)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                                    if selectedURL == url {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundStyle(TikoAppColor.cards.palette.primary)
                                            .background(.white, in: Circle())
                                            .padding(3)
                                    }
                                }
                                .opacity(isLoading && loadedQuery != trimmed ? 0.72 : 1)
                                .overlay {
                                    if isLoading && loadedQuery != trimmed {
                                        ProgressView()
                                            .scaleEffect(0.7)
                                            .tint(TikoAppColor.cards.palette.primary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                }
            }
        }
        .task(id: trimmed) {
            guard !trimmed.isEmpty else { return }
            isLoading = true
            defer { isLoading = false }
            try? await Task.sleep(nanoseconds: 650_000_000)
            guard !Task.isCancelled else { return }
            await fetchSuggestions(query: trimmed)
        }
    }

    private func fetchSuggestions(query: String) async {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://media.tikoapi.org/v1/media?type=image&search=\(encoded)&limit=6")
        else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let items = try JSONDecoder().decode(TikoMediaListResponse.self, from: data).data
            guard !Task.isCancelled else { return }
            let urls = items.map { CardsMediaMatcher.resizedCDNURL($0.originalURL) }
            if !urls.isEmpty {
                results = urls
                loadedQuery = query
                Task { await TikoRemoteImageCache.shared.prefetch(urls) }
            }
        } catch {}
    }
}

// MARK: - Image picker button

private struct ImagePickerButton: View {
    let selectedURL: URL?
    let appColor: TikoAppColor
    let action: () -> Void
    @EnvironmentObject private var i18n: TikoI18n

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                imagePreview
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedURL != nil ? i18n.t("cards.add.changeImage") : i18n.t("cards.add.addImage"))
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    if selectedURL != nil {
                        Text(i18n.t("cards.add.tapToChooseDifferent"))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var imagePreview: some View {
        if let url = selectedURL {
            if url.isFileURL {
                if let img = UIImage(contentsOfFile: url.path) {
                    Image(uiImage: img).resizable().scaledToFill()
                } else { placeholder }
            } else {
                AsyncImage(url: thumbnailURL(url)) { phase in
                    if case .success(let img) = phase { img.resizable().scaledToFill() }
                    else { placeholder }
                }
            }
        } else {
            placeholder
        }
    }

    private var placeholder: some View {
        Image(systemName: "photo.fill")
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(appColor.palette.primary)
            .frame(width: 44, height: 44)
            .background(appColor.palette.primary.opacity(0.12))
    }

    private func thumbnailURL(_ url: URL) -> URL {
        guard url.host?.contains("tikocdn.org") == true else { return url }
        return URL(string: "https://data.tikocdn.org/cdn-cgi/image/width=150,quality=80,f=auto\(url.path)") ?? url
    }
}

// MARK: - Utilities

private func cardColor(_ color: String) -> Color {
    TikoColors.color(named: color) ?? TikoColors.color(named: "gray")!
}

private extension View {
    @ViewBuilder
    func `if`<T: View>(_ condition: Bool, apply: (Self) -> T) -> some View {
        if condition { apply(self) } else { self }
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
