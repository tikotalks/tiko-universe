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

    private var visibleCollections: [CardCollection] {
        hideDefaultCollections
            ? store.collections.filter { $0.id.hasPrefix("user_") }
            : store.collections
    }

    private var liveSelectedCollection: CardCollection? {
        guard let id = selectedCollection?.id else { return nil }
        return store.collections.first { $0.id == id }
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
                TikoSettingsSection(title: "Collections") {
                    TikoSettingsToggleRow(
                        title: "Hide default sets",
                        icon: "eye.slash.fill",
                        appColor: .cards,
                        isOn: $hideDefaultCollections
                    )
                }
                TikoSettingsSection(title: "Display") {
                    TikoSettingsToggleRow(
                        title: "Show animations",
                        icon: "sparkles",
                        appColor: .cards,
                        isOn: $showAnimations
                    )
                }
                TikoSettingsSection(title: "Accessibility") {
                    TikoSettingsSegmentedRow(
                        title: "Card size",
                        icon: "rectangle.grid.2x2.fill",
                        appColor: .cards,
                        options: ["Small", "Medium", "Large"],
                        selectedIndex: $cardSizeIndex
                    )
                    TikoSettingsSegmentedRow(
                        title: "Label size",
                        icon: "textformat.size",
                        appColor: .cards,
                        options: ["Small", "Medium", "Large"],
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
                                                .onLongPressGesture(minimumDuration: 0.5) {
                                                    let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                                    guard !isChild else { return }
                                                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                                    withAnimation(.spring(response: 0.25)) { isEditing = true }
                                                }

                                                if isEditing && (isAdmin || collection.id.hasPrefix("user_")) {
                                                    editBadge(isUserOwned: collection.id.hasPrefix("user_"))
                                                        .offset(x: 4, y: -4)
                                                        .onTapGesture { editingCollection = collection }
                                                        .transition(.scale(scale: 0.3).combined(with: .opacity))
                                                }
                                            }
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
                await store.hydrateRootThumbnails()
                let bundle = try? TikoDeviceSessionStore().load()
                isAdmin = bundle?.capabilities?.canManageChildAccounts == true
            }
        }
        .tikoPopup(isPresented: $showingAdd) {
            if let collection = selectedCollection {
                AddCardSheet(collection: collection, store: store, isPresented: $showingAdd)
            } else {
                AddCategorySheet(store: store, isPresented: $showingAdd)
            }
        }
        .tikoPopup(isPresented: Binding(
            get: { editingCollection != nil },
            set: { if !$0 { editingCollection = nil } }
        )) {
            if let c = editingCollection {
                EditCollectionSheet(collection: c, store: store, onClose: { editingCollection = nil })
            }
        }
        .tikoPopup(isPresented: Binding(
            get: { editingCard != nil },
            set: { if !$0 { editingCard = nil; editingCardCollectionID = nil } }
        )) {
            if let card = editingCard, let cid = editingCardCollectionID {
                EditCardSheet(card: card, collectionID: cid, store: store, onClose: {
                    editingCard = nil
                    editingCardCollectionID = nil
                })
            }
        }
        .environmentObject(i18n)
        .onAppear { i18n.setLanguage(languageCode) }
        .onChange(of: languageCode) { _, code in i18n.setLanguage(code) }
        .onChange(of: selectedCollection) { _, _ in
            if isEditing { withAnimation(.spring(response: 0.25)) { isEditing = false } }
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
                                    .onLongPressGesture(minimumDuration: 0.5) {
                                        let isChild = (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
                                        guard !isChild else { return }
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        withAnimation(.spring(response: 0.25)) { isEditing = true }
                                    }

                                    if isEditing && (isAdmin || card.id.hasPrefix("user_")) {
                                        editBadge(isUserOwned: card.id.hasPrefix("user_"))
                                            .offset(x: 4, y: -4)
                                            .onTapGesture { onEdit(card) }
                                            .transition(.scale(scale: 0.3).combined(with: .opacity))
                                    }
                                }
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
            if url.isFileURL {
                image = UIImage(contentsOfFile: url.path)
            } else {
                image = await CardsImageCache.shared.image(for: url)
            }
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

// MARK: - Add sheets

private struct AddCategorySheet: View {
    let store: CardsStore
    @Binding var isPresented: Bool

    @State private var title = ""
    @State private var selectedColor: UInt32 = CardColorPicker.colors[0]
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    var body: some View {
        TikoPopupCard(
            title: "New category",
            icon: "square.grid.2x2.fill",
            appColor: .cards,
            onClose: { isPresented = false }
        ) {
            VStack(spacing: 14) {
                cardField(label: "Name") {
                    TextField("e.g. Food", text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Color")
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Image")
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: "Add category", disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
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
            title: "New card",
            icon: "rectangle.badge.plus",
            appColor: .cards,
            onClose: { isPresented = false }
        ) {
            VStack(spacing: 14) {
                cardField(label: "Name") {
                    TextField("e.g. Apple", text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .onChange(of: title) { _, v in if speech.isEmpty || speech == title { speech = v } }
                }

                cardField(label: "Spoken text") {
                    TextField("What should be spoken", text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Color")
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Image")
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: "Add card", disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
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
    let onClose: () -> Void

    @State private var title: String
    @State private var selectedColor: UInt32
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    init(collection: CardCollection, store: CardsStore, onClose: @escaping () -> Void) {
        self.collection = collection
        self.store = store
        self.onClose = onClose
        self._title = State(initialValue: collection.title)
        self._selectedColor = State(initialValue: collection.colorHex)
        self._selectedImageURL = State(initialValue: collection.imageURL)
    }

    var body: some View {
        TikoPopupCard(
            title: "Edit category",
            icon: "square.grid.2x2.fill",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                cardField(label: "Name") {
                    TextField("e.g. Food", text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Color")
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Image")
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: "Save changes", disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    store.updateCollection(
                        id: collection.id,
                        title: title.trimmingCharacters(in: .whitespaces),
                        colorHex: selectedColor,
                        imageURL: selectedImageURL
                    )
                    onClose()
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
    }
}

private struct EditCardSheet: View {
    let card: CommunicationCard
    let collectionID: String
    let store: CardsStore
    let onClose: () -> Void

    @State private var title: String
    @State private var speech: String
    @State private var selectedColor: UInt32
    @State private var selectedImageURL: URL?
    @State private var showingImagePicker = false

    init(card: CommunicationCard, collectionID: String, store: CardsStore, onClose: @escaping () -> Void) {
        self.card = card
        self.collectionID = collectionID
        self.store = store
        self.onClose = onClose
        self._title = State(initialValue: card.title)
        self._speech = State(initialValue: card.speech)
        self._selectedColor = State(initialValue: card.colorHex)
        self._selectedImageURL = State(initialValue: card.imageURL)
    }

    var body: some View {
        TikoPopupCard(
            title: "Edit card",
            icon: "rectangle.badge.plus",
            appColor: .cards,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                cardField(label: "Name") {
                    TextField("e.g. Apple", text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                cardField(label: "Spoken text") {
                    TextField("What should be spoken", text: $speech)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Color")
                    CardColorPicker(selectedColor: $selectedColor)
                }

                VStack(alignment: .leading, spacing: 7) {
                    fieldLabel("Image")
                    ImagePickerButton(selectedURL: selectedImageURL, appColor: .cards) {
                        showingImagePicker = true
                    }
                }

                addButton(label: "Save changes", disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
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
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .cards) { url in
            selectedImageURL = url
        }
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

// MARK: - Image picker button

private struct ImagePickerButton: View {
    let selectedURL: URL?
    let appColor: TikoAppColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                imagePreview
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedURL != nil ? "Change image" : "Add image")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    if selectedURL != nil {
                        Text("Tap to choose a different one")
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
