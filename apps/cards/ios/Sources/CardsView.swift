import SwiftUI
import TikoKit
import UIKit

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
    @State private var selectedCollection: CardCollection?
    @State private var collectionsPage = 0
    @State private var showingAdd = false
    @State private var isEditing = false
    @State private var draggingCollectionID: String?
    @State private var draggingCardID: String?
    @State private var isAdmin = false
    @State private var editingCollection: CardCollection?
    @State private var editingCard: CommunicationCard?
    @State private var editingCardCollectionID: String?

    @State private var localizedCollections: [CardCollection] = []

    private var visibleCollections: [CardCollection] {
        hideDefaultCollections
            ? localizedCollections.filter { $0.id.hasPrefix("user_") }
            : localizedCollections
    }

    private var liveSelectedCollection: CardCollection? {
        guard let id = selectedCollection?.id else { return nil }
        return localizedCollections.first { $0.id == id }
    }

    private func applyLocalizedTitles() {
        localizedCollections = store.collections.map { collection in
            var c = collection
            if !collection.id.hasPrefix("user_") {
                let tk = "cards.default.\(collection.id)"
                let tt = i18n.t(tk)
                if tt != tk { c.title = tt }
                c.cards = collection.cards.map { card in
                    if card.id.hasPrefix("user_") { return card }
                    let ck = "cards.default.\(card.id)"
                    let ct = i18n.t(ck)
                    guard ct != ck else { return card }
                    var mc = card; mc.title = ct; mc.speech = ct; return mc
                }
            }
            return c
        }
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
            appName: selectedCollection?.title ?? i18n.t("cards.appName"),
            onIconTap: selectedCollection != nil ? {
                if isEditing {
                    withAnimation(.spring(response: 0.25)) { isEditing = false }
                } else if showAnimations {
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.85)) { selectedCollection = nil }
                } else {
                    selectedCollection = nil
                }
            } : nil,
            actions: isEditing
                ? [TikoHeaderAction(id: "done", label: "Done", systemImage: "checkmark")]
                : [TikoHeaderAction(id: "add", label: "Add", systemImage: "plus")],
            onAction: { id in
                switch id {
                case "add": showingAdd = true
                case "done": withAnimation(.spring(response: 0.25)) { isEditing = false }
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
                if let collection = selectedCollection {
                    CollectionDetailView(
                        collection: liveSelectedCollection ?? collection,
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
                        let pages = visibleCollections.chunked(into: perPage)

                        ZStack(alignment: .bottom) {
                            TabView(selection: $collectionsPage) {
                                ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                                    LazyVGrid(
                                        columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                                        spacing: 12
                                    ) {
                                        ForEach(page) { collection in
                                            ZStack(alignment: .topTrailing) {
                                                CollectionTile(
                                                    collection: collection,
                                                    thumbnailURL: collection.imageURL ?? store.collectionThumbnails[collection.id],
                                                    labelFont: labelFont
                                                )
                                                .scaleEffect(isEditing ? 0.92 : 1.0)
                                                .if(isEditing) { view in
                                                    view
                                                        .onDrag {
                                                            draggingCollectionID = collection.id
                                                            return NSItemProvider(object: collection.id as NSString)
                                                        } preview: {
                                                            CollectionTile(
                                                                collection: collection,
                                                                thumbnailURL: collection.imageURL ?? store.collectionThumbnails[collection.id]
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
                                                    if showAnimations {
                                                        withAnimation(.spring(response: 0.38, dampingFraction: 0.85)) {
                                                            selectedCollection = collection
                                                        }
                                                    } else {
                                                        selectedCollection = collection
                                                    }
                                                }

                                                if isEditing && (isAdmin || collection.id.hasPrefix("user_")) {
                                                    editBadge(isUserOwned: collection.id.hasPrefix("user_"))
                                                        .offset(x: 4, y: -4)
                                                        .onTapGesture { editingCollection = collection }
                                                        .transition(.scale(scale: 0.3).combined(with: .opacity))
                                                }
                                            }
                                            .contentShape(Rectangle())
                                            .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in
                                                let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                                guard !isChild else { return }
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
                        }
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .leading).combined(with: .opacity),
                        removal: .move(edge: .trailing).combined(with: .opacity)
                    ))
                }
            }
            .animation(showAnimations ? .spring(response: 0.38, dampingFraction: 0.85) : .linear(duration: 0), value: selectedCollection?.id)
            .task {
                await store.load()
                applyLocalizedTitles()
                await store.hydrateRootThumbnails()
                await refreshAdminState()
            }
            .onChange(of: store.collections) { _, _ in applyLocalizedTitles() }
        }
        .tikoPopup(isPresented: $showingAdd) {
            if let collection = selectedCollection {
                AddCardSheet(collection: collection, store: store, isPresented: $showingAdd)
                    .environmentObject(i18n)
            } else {
                AddCategorySheet(store: store, isPresented: $showingAdd)
                    .environmentObject(i18n)
            }
        }
        .tikoPopup(isPresented: Binding(
            get: { editingCollection != nil },
            set: { if !$0 { editingCollection = nil } }
        )) {
            if let c = editingCollection {
                EditCollectionSheet(collection: c, store: store, isAdmin: isAdmin, onClose: { editingCollection = nil })
                    .environmentObject(i18n)
            }
        }
        .tikoPopup(isPresented: Binding(
            get: { editingCard != nil },
            set: { if !$0 { editingCard = nil; editingCardCollectionID = nil } }
        )) {
            if let card = editingCard, let cid = editingCardCollectionID {
                EditCardSheet(card: card, collectionID: cid, store: store, isAdmin: isAdmin, onClose: {
                    editingCard = nil
                    editingCardCollectionID = nil
                })
                .environmentObject(i18n)
            }
        }
        .environmentObject(i18n)
        .onAppear { i18n.setLanguage(languageCode) }
        .onChange(of: languageCode) { _, code in i18n.setLanguage(code); applyLocalizedTitles() }
        .onChange(of: selectedCollection) { _, _ in
            if isEditing { withAnimation(.spring(response: 0.25)) { isEditing = false } }
        }
    }

    private func refreshAdminState() async {
        let sessionStore = TikoDeviceSessionStore()
        guard let bundle = try? sessionStore.load() else {
            isAdmin = false
            return
        }
        guard let token = bundle.accessToken else {
            isAdmin = bundle.capabilities?.canEditContent == true || bundle.roles?.contains("admin") == true || bundle.roles?.contains("content_editor") == true
            return
        }
        do {
            let refreshed = try await TikoIdentityClient().getSession(accessToken: token)
            let merged = refreshed.preservingSession(from: bundle)
            try sessionStore.save(merged)
            isAdmin = merged.capabilities?.canEditContent == true || merged.roles?.contains("admin") == true || merged.roles?.contains("content_editor") == true
        } catch {
            isAdmin = bundle.capabilities?.canEditContent == true || bundle.roles?.contains("admin") == true || bundle.roles?.contains("content_editor") == true
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
        speechService.speak(card.speech)

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 450_000_000)
            if speakingCardID == card.id {
                speakingCardID = nil
            }
        }
    }
}

// MARK: - Edit badge

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
            background: Color(hex: collection.colorHex),
            labelFont: labelFont
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
    let isAdmin: Bool
    @Binding var isEditing: Bool
    @Binding var draggingCardID: String?
    let store: CardsStore
    let onSpeak: (CommunicationCard) -> Void
    let onEdit: (CommunicationCard) -> Void

    @State private var currentPage = 0
    @AppStorage("cards.cardSizeIndex") private var cardSizeIndex = 1
    @AppStorage("cards.labelSizeIndex") private var labelSizeIndex = 1

    private var labelFont: Font {
        switch labelSizeIndex {
        case 0: return Font.system(.caption2, design: .rounded).weight(.heavy)
        case 2: return Font.system(.subheadline, design: .rounded).weight(.heavy)
        default: return Font.system(.caption, design: .rounded).weight(.heavy)
        }
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
            let pages = collection.cards.chunked(into: perPage)

            ZStack(alignment: .bottom) {
                TabView(selection: $currentPage) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, pageCards in
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: cols),
                            spacing: 12
                        ) {
                            ForEach(pageCards) { card in
                                ZStack(alignment: .topTrailing) {
                                    CommunicationCardTile(
                                        card: card,
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
                                            .offset(x: 4, y: -4)
                                            .onTapGesture { onEdit(card) }
                                            .transition(.scale(scale: 0.3).combined(with: .opacity))
                                    }
                                }
                                .contentShape(Rectangle())
                                .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in
                                    let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                    guard !isChild else { return }
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
        let base: Int
        if width > height * 1.4 { base = width >= 800 ? 7 : 6 }
        else { base = width >= 640 ? 5 : (width >= 480 ? 4 : 3) }
        return max(2, base + (1 - cardSizeIndex))
    }
}

private struct CommunicationCardTile: View {
    let card: CommunicationCard
    let isSpeaking: Bool
    let isEditing: Bool
    let labelFont: Font
    let onSpeak: () -> Void

    init(
        card: CommunicationCard,
        isSpeaking: Bool,
        isEditing: Bool,
        labelFont: Font = Font.system(.caption, design: .rounded).weight(.heavy),
        onSpeak: @escaping () -> Void
    ) {
        self.card = card
        self.isSpeaking = isSpeaking
        self.isEditing = isEditing
        self.labelFont = labelFont
        self.onSpeak = onSpeak
    }

    var body: some View {
        Button(action: { if !isEditing { onSpeak() } }) {
            TikoSquareTile(
                title: card.title,
                background: Color(hex: card.colorHex),
                isActive: isSpeaking,
                labelFont: labelFont
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

// MARK: - Add sheets

private struct AddCategorySheet: View {
    let store: CardsStore
    @Binding var isPresented: Bool
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title = ""
    @State private var selectedColor: UInt32 = CardColorPicker.colors[0]
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    var body: some View {
        TikoPopupCard(
            title: i18n.t("cards.add.newCategory"),
            icon: "square.grid.2x2.fill",
            appColor: .cards,
            onClose: { isPresented = false }
        ) {
            VStack(spacing: 14) {
                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCategory"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.color"))
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                        selectedImageURL = url
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: i18n.t("cards.add.addCategory"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    store.addCollection(title: title, colorHex: selectedColor, imageURL: selectedImageURL)
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
    @State private var selectedColor: UInt32
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    init(collection: CardCollection, store: CardsStore, isPresented: Binding<Bool>) {
        self.collection = collection
        self.store = store
        self._isPresented = isPresented
        self._selectedColor = State(initialValue: collection.colorHex)
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("cards.add.newCard"),
            icon: "rectangle.badge.plus",
            appColor: .cards,
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

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.color"))
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                        selectedImageURL = url
                    }
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: i18n.t("cards.add.addCard"), disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    store.addCard(
                        title: title,
                        speech: speech,
                        colorHex: selectedColor,
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
    let store: CardsStore
    let isAdmin: Bool
    let onClose: () -> Void
    @EnvironmentObject private var i18n: TikoI18n

    @State private var title: String
    @State private var selectedColor: UInt32
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false
    @State private var showingDefaultConfirmation = false
    @State private var showingDeleteConfirmation = false
    @State private var showingPromoteConfirmation = false

    private var isDefault: Bool { !collection.id.hasPrefix("user_") }

    init(collection: CardCollection, store: CardsStore, isAdmin: Bool, onClose: @escaping () -> Void) {
        self.collection = collection
        self.store = store
        self.isAdmin = isAdmin
        self.onClose = onClose
        self._title = State(initialValue: collection.title)
        self._selectedColor = State(initialValue: collection.colorHex)
        self._selectedImageURL = State(initialValue: collection.imageURL)
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("cards.add.editCategory"),
            icon: "square.grid.2x2.fill",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCategory"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.color"))
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                        selectedImageURL = url
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

                Button(role: .destructive) {
                    showingDeleteConfirmation = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                            .font(.system(size: 16, weight: .bold))
                        Text("Delete collection")
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
        .alert("Update default collection?", isPresented: $showingDefaultConfirmation) {
            Button("Update for everyone", role: .destructive) { saveChanges() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This changes the default \"\(collection.title)\" collection for all users.")
        }
        .alert("Delete \"\(collection.title)\"?", isPresented: $showingDeleteConfirmation) {
            Button(isDefault ? "Delete for everyone" : "Delete", role: .destructive) { deleteCollection() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(isDefault
                ? "This permanently deletes the default collection \"\(collection.title)\" for all users."
                : "Are you sure you want to delete \"\(collection.title)\"?")
        }
        .alert("Make \"\(collection.title)\" a default?", isPresented: $showingPromoteConfirmation) {
            Button("Make default", role: .destructive) { promoteCollection() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will make \"\(collection.title)\" a default collection visible to all users.")
        }
    }

    private func saveChanges() {
        store.updateCollection(
            id: collection.id,
            title: title.trimmingCharacters(in: .whitespaces),
            colorHex: selectedColor,
            imageURL: selectedImageURL
        )
        onClose()
    }

    private func deleteCollection() {
        store.deleteCollection(id: collection.id)
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
    @State private var selectedColor: UInt32
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
        self._selectedColor = State(initialValue: card.colorHex)
        self._selectedImageURL = State(initialValue: card.imageURL)
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("cards.add.editCard"),
            icon: "rectangle.badge.plus",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                cardField(label: i18n.t("cards.add.name")) {
                    TextField(i18n.t("cards.add.namePlaceholderCard"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                cardField(label: i18n.t("cards.add.spokenText")) {
                    TextField(i18n.t("cards.add.whatShouldBeSpoken"), text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.color"))
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel(i18n.t("cards.add.image"))
                    MediaSuggestionRow(query: title, selectedURL: selectedImageURL) { url in
                        selectedImageURL = url
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
            colorHex: selectedColor,
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

private struct CardColorPicker: View {
    static let colors: [UInt32] = [
        0xFF6B6B, 0xFF922B, 0xFFD43B, 0x69DB7C,
        0x4DABF7, 0x748FFC, 0xCC5DE8, 0xF783AC,
        0x63E6BE, 0xA9E34B, 0x868E96, 0x2C2C2E,
    ]

    @Binding var selectedColor: UInt32

    var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6),
            spacing: 10
        ) {
            ForEach(Self.colors, id: \.self) { color in
                ZStack {
                    Circle()
                        .fill(Color(hex: color))
                    if selectedColor == color {
                        Circle().strokeBorder(Color.white, lineWidth: 2.5)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                    }
                }
                .frame(height: 38)
                .onTapGesture {
                    withAnimation(.spring(response: 0.2)) { selectedColor = color }
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
