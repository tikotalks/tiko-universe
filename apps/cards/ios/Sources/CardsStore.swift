import Foundation
import TikoKit

@MainActor
final class CardsStore: ObservableObject {
    @Published private(set) var collections: [CardCollection] = []
    @Published private(set) var collectionThumbnails: [String: URL] = [:]
    @Published private(set) var cardImages: [String: URL] = [:]
    @Published private(set) var loadingCollectionIDs: Set<String> = []
    @Published private(set) var isLoading = false
    @Published var lastPersistError: String?

    private let mediaClient: CardsMediaClient
    private let imageCache: CardsImageCache
    private let defaults: UserDefaults
    private let contentClient = CardsContentClient()
    private var fetchedCollectionIDs = Set<String>()
    private var loadedLanguageCode: String?
    /// What was changed on this device; laid over every vocabulary that loads.
    private(set) var localEdits = CardsLocalEdits()

    init(
        mediaClient: CardsMediaClient = CardsMediaClient(),
        imageCache: CardsImageCache = .shared,
        defaults: UserDefaults = .standard
    ) {
        self.mediaClient = mediaClient
        self.imageCache = imageCache
        self.defaults = defaults
    }

    func load(languageCode: String = "en") async {
        isLoading = true
        defer { isLoading = false }

        let token = try? TikoDeviceSessionStore().load()?.accessToken
        let localCollections = loadLocalUserCollections()
        // The bundled vocabulary goes on screen at once, in the right language;
        // the network only ever improves on it. Waiting for the content API
        // first meant a blank grid for as long as the request took to fail.
        if collections.isEmpty || loadedLanguageCode != languageCode {
            showBundledDefaults(languageCode: languageCode, localCollections: localCollections)
        }
        do {
            let fetched = try await contentClient.fetchCollections(sessionToken: token, languageCode: languageCode)
            show(mergeRemoteCollections(fetched, withLocalUserCollections: localCollections))
        } catch {
            // The bundled vocabulary is already showing.
        }
    }

    /// Puts a vocabulary on screen with this device's edits laid over it.
    private func show(_ vocabulary: [CardCollection]) {
        localEdits = loadLocalEdits()
        collections = localEdits.applied(to: vocabulary).sorted { $0.order < $1.order }
        for (id, url) in localEdits.pictureURLs {
            if collections.contains(where: { $0.id == id }) {
                collectionThumbnails[id] = url
            } else {
                cardImages[id] = url
            }
        }
    }

    private func showBundledDefaults(languageCode: String, localCollections: [CardCollection]) {
        show(mergeRemoteCollections(
            CardsDefaults.collections(languageCode: languageCode),
            withLocalUserCollections: localCollections
        ))
        loadedLanguageCode = languageCode
    }

    /// Loads the built-in offline default collections synchronously, without any
    /// network or session dependency. Used for deterministic UI-test / screenshot
    /// launches so the card grid is populated even with no connectivity.
    func loadOfflineDefaults(languageCode: String = "en") {
        showBundledDefaults(languageCode: languageCode, localCollections: loadLocalUserCollections())
    }

    func hydrateRootThumbnails() async {
        for collection in collections {
            guard collectionThumbnails[collection.id] == nil else { continue }
            await hydrateMedia(for: collection.id, prefetchCards: false)
        }
    }

    func hydrateMedia(for collectionID: String, prefetchCards: Bool = true) async {
        guard let collection = collections.first(where: { $0.id == collectionID }) else { return }
        let categories = collection.mediaCategories
        guard !categories.isEmpty else {
            // A curated collection names no media categories: every card is
            // pinned to its picture, so there is nothing to search for. Opening
            // it only warms the image cache.
            if prefetchCards {
                await imageCache.prefetch(collection.cards.compactMap { imageURL(for: $0) })
            }
            return
        }
        guard !fetchedCollectionIDs.contains(collectionID) else { return }

        fetchedCollectionIDs.insert(collectionID)
        loadingCollectionIDs.insert(collectionID)
        defer { loadingCollectionIDs.remove(collectionID) }

        do {
            // Passing the card titles lets the client stop paging as soon as every
            // card has a candidate image, instead of walking the whole category.
            let wantedTitles = Set(collection.cards.map(\.title))
            let mediaItems = try await mediaClient.fetchMedia(
                for: categories,
                wantedTitles: wantedTitles
            )
            guard let index = collections.firstIndex(where: { $0.id == collectionID }) else { return }
            let match = CardsMediaMatcher.match(collection: collections[index], mediaItems: mediaItems)
            cardImages.merge(match.cardImages) { _, new in new }

            // The category page is capped and sorted by title, so most cards get
            // no candidate from it. Resolve whatever is still bare by searching
            // the library for the card's own word. On the thumbnail pass only the
            // first few are resolved, so opening the app stays cheap; the rest
            // follow when the collection is actually opened.
            var unresolved = collections[index].cards
                .filter { cardImages[$0.id] == nil && $0.imageRef == nil }
                .map { (id: $0.id, title: $0.title) }
            // On the thumbnail pass, try the first few cards rather than all of
            // them, so a cold launch stays cheap but a collection whose first
            // card has no artwork still gets a tile picture.
            if !prefetchCards { unresolved = Array(unresolved.prefix(4)) }
            if !unresolved.isEmpty {
                let searched = await mediaClient.resolveImages(for: unresolved)
                cardImages.merge(searched) { _, new in new }
            }

            // The tile picture is the first card that actually resolved. Falling
            // back to `match.thumbnailURL` would show whatever sorts first in the
            // category — which is how "Animals" ended up as an aardvark and
            // "Food" as a roll of kitchen towel.
            let thumbnail = collections[index].cards.lazy
                .compactMap { self.cardImages[$0.id] }
                .first ?? match.thumbnailURL
            if let thumbnail {
                collectionThumbnails[collectionID] = thumbnail
            }

            var urls = Array(collections[index].cards.compactMap { match.cardImages[$0.id] ?? imageURL(for: $0) }.prefix(prefetchCards ? collections[index].cards.count : 6))
            if let thumbnailURL = match.thumbnailURL { urls.append(thumbnailURL) }
            await imageCache.prefetch(urls)
        } catch {
            // Defaults remain fully usable offline as text/color cards if media is unreachable.
        }
    }

    func addCollection(title: String, color: String, imageURL: URL? = nil, parentID: String? = nil) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let id = "user_\(UUID().uuidString.lowercased())"
        let order = collections.filter { $0.parentID == parentID }.count
        let collection = CardCollection(id: id, title: trimmed, color: color, order: order, parentID: parentID, cards: [])
        collections.append(collection)
        if let imageURL {
            collectionThumbnails[id] = imageURL
            localEdits.setPicture(imageURL, for: id)
            persistLocalEdits()
        }
        persistLocalUserCollections()
        Task { await persistCollection(id: id, title: trimmed, color: color, order: order, parentID: parentID, imageURL: imageURL) }
    }

    func addCard(title: String, speech: String, color: String? = nil, fitzgeraldCategory: String? = nil, imageURL: URL? = nil, to collectionID: String) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty,
              let index = collections.firstIndex(where: { $0.id == collectionID }) else { return }
        let id = "user_\(UUID().uuidString.lowercased())"
        let spokenText = speech.trimmingCharacters(in: .whitespaces).isEmpty ? trimmed : speech.trimmingCharacters(in: .whitespaces)
        let resolvedColor = color ?? collections[index].color
        let order = collections[index].cards.count
        let card = CommunicationCard(id: id, title: trimmed, speech: spokenText, color: resolvedColor, order: order, fitzgeraldCategory: fitzgeraldCategory)
        collections[index].cards.append(card)
        if let imageURL {
            cardImages[id] = imageURL
            localEdits.setPicture(imageURL, for: id)
            persistLocalEdits()
        }
        persistLocalUserCollections()
        Task { await persistCard(id: id, title: trimmed, speech: spokenText, color: resolvedColor, fitzgeraldCategory: fitzgeraldCategory, order: order, imageURL: imageURL, collectionID: collectionID) }
    }

    func reorderCollection(draggingID: String, targetID: String) {
        guard draggingID != targetID,
              let from = collections.firstIndex(where: { $0.id == draggingID }),
              let to = collections.firstIndex(where: { $0.id == targetID }) else { return }
        collections.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
        for index in collections.indices {
            collections[index].order = index
        }
        for collection in collections {
            Task {
                await persistUpdateCollection(
                    id: collection.id,
                    title: collection.title,
                    color: collection.color,
                    order: collection.order,
                    parentID: collection.parentID,
                    imageURL: imageURL(for: collection)
                )
            }
        }
    }

    func updateCollection(id: String, title: String, color: String, parentID: String?? = nil, imageURL: URL?, saveAsDefault: Bool = false) {
        guard let i = collections.firstIndex(where: { $0.id == id }) else { return }
        collections[i].title = title
        collections[i].color = color
        if let parentID { collections[i].parentID = parentID }
        if let imageURL {
            collectionThumbnails[id] = imageURL
        } else {
            collectionThumbnails.removeValue(forKey: id)
            collections[i].imageRef = nil
        }
        let effectiveParent = collections[i].parentID
        if !id.hasPrefix("user_") {
            localEdits.collections[id] = .init(title: title, color: color)
        }
        localEdits.setPicture(imageURL, for: id)
        persistLocalEdits()
        persistLocalUserCollections()
        Task { await persistUpdateCollection(id: id, title: title, color: color, order: collections[i].order, parentID: effectiveParent, imageURL: imageURL, saveAsDefault: saveAsDefault) }
    }

    func reparentCollections(ids: Set<String>, toParentID: String?) {
        for i in collections.indices where ids.contains(collections[i].id) {
            collections[i].parentID = toParentID
            let col = collections[i]
            Task { await persistUpdateCollection(id: col.id, title: col.title, color: col.color, order: col.order, parentID: toParentID, imageURL: imageURL(for: col)) }
        }
    }

    func updateCard(id: String, title: String, speech: String, color: String, fitzgeraldCategory: String? = nil, imageURL: URL?, inCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }),
              let ji = collections[ci].cards.firstIndex(where: { $0.id == id }) else { return }
        collections[ci].cards[ji].title = title
        collections[ci].cards[ji].speech = speech
        collections[ci].cards[ji].color = color
        collections[ci].cards[ji].fitzgeraldCategory = fitzgeraldCategory
        if let imageURL {
            cardImages[id] = imageURL
        } else {
            cardImages.removeValue(forKey: id)
            collections[ci].cards[ji].imageRef = nil
        }
        if !id.hasPrefix("user_") {
            localEdits.cards[id] = collections[ci].cards[ji]
        }
        localEdits.setPicture(imageURL, for: id)
        persistLocalEdits()
        persistLocalUserCollections()
        Task { await persistUpdateCard(id: id, title: title, speech: speech, color: color, fitzgeraldCategory: fitzgeraldCategory, order: collections[ci].cards[ji].order, imageURL: imageURL, collectionID: inCollectionID) }
    }

    func reorderCard(draggingID: String, targetID: String, inCollectionID: String) {
        guard draggingID != targetID,
              let ci = collections.firstIndex(where: { $0.id == inCollectionID }),
              let from = collections[ci].cards.firstIndex(where: { $0.id == draggingID }),
              let to = collections[ci].cards.firstIndex(where: { $0.id == targetID }) else { return }
        collections[ci].cards.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
        for index in collections[ci].cards.indices {
            collections[ci].cards[index].order = index
        }
        for card in collections[ci].cards {
            Task {
                await persistUpdateCard(
                    id: card.id,
                    title: card.title,
                    speech: card.speech,
                    color: card.color,
                    fitzgeraldCategory: card.fitzgeraldCategory,
                    order: card.order,
                    imageURL: imageURL(for: card),
                    collectionID: inCollectionID
                )
            }
        }
    }

    private func persistCollection(id: String, title: String, color: String, order: Int, parentID: String? = nil, imageURL: URL?) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            let saved = try await contentClient.createCollection(id: id, title: title, color: color, order: order, parentID: parentID, imageURL: imageURL, sessionToken: token)
            applySavedCollection(saved)
            persistLocalUserCollections()
        } catch {
            lastPersistError = "Failed to save collection: \(error.localizedDescription)"
            print("[CardsStore] persistCollection error: \(error)")
        }
    }

    private func persistCard(id: String, title: String, speech: String, color: String, fitzgeraldCategory: String? = nil, order: Int, imageURL: URL?, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            let saved = try await contentClient.createCard(id: id, title: title, speech: speech, color: color, fitzgeraldCategory: fitzgeraldCategory, order: order, imageURL: imageURL, collectionID: collectionID, sessionToken: token)
            applySavedCard(saved, collectionID: collectionID)
            persistLocalUserCollections()
        } catch {
            lastPersistError = "Failed to save card: \(error.localizedDescription)"
            print("[CardsStore] persistCard error: \(error)")
        }
    }

    private func persistUpdateCollection(id: String, title: String, color: String, order: Int, parentID: String?? = nil, imageURL: URL?, saveAsDefault: Bool = false) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            let saved = try await contentClient.updateCollection(id: id, title: title, color: color, order: order, parentID: parentID ?? nil, imageURL: imageURL, saveAsDefault: saveAsDefault, sessionToken: token)
            applySavedCollection(saved)
        } catch {
            lastPersistError = "Failed to save collection: \(error.localizedDescription)"
            print("[CardsStore] persistUpdateCollection error: \(error)")
        }
    }

    private func persistUpdateCard(id: String, title: String, speech: String, color: String, fitzgeraldCategory: String? = nil, order: Int, imageURL: URL?, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            let saved = try await contentClient.updateCard(id: id, title: title, speech: speech, color: color, fitzgeraldCategory: fitzgeraldCategory, order: order, imageURL: imageURL, collectionID: collectionID, sessionToken: token)
            applySavedCard(saved, collectionID: collectionID)
        } catch {
            lastPersistError = "Failed to save card: \(error.localizedDescription)"
            print("[CardsStore] persistUpdateCard error: \(error)")
        }
    }

    func deleteCollection(id: String) {
        collections.removeAll { $0.id == id || $0.parentID == id }
        collectionThumbnails.removeValue(forKey: id)
        if !id.hasPrefix("user_") {
            localEdits.removedCollections.insert(id)
            persistLocalEdits()
        }
        persistLocalUserCollections()
        Task { await persistDeleteCollection(id: id) }
    }

    func deleteCard(id: String, inCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }) else { return }
        collections[ci].cards.removeAll { $0.id == id }
        rememberRemovedCards([id])
        persistLocalUserCollections()
        Task { await persistDeleteCard(id: id, collectionID: inCollectionID) }
    }

    func deleteCards(ids: Set<String>, fromCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == fromCollectionID }) else { return }
        let toDelete = collections[ci].cards.filter { ids.contains($0.id) }.map(\.id)
        collections[ci].cards.removeAll { ids.contains($0.id) }
        rememberRemovedCards(toDelete)
        persistLocalUserCollections()
        Task { for id in toDelete { await persistDeleteCard(id: id, collectionID: fromCollectionID) } }
    }

    func moveCards(ids: Set<String>, fromCollectionID: String, toCollectionID: String) {
        guard fromCollectionID != toCollectionID,
              let fromIdx = collections.firstIndex(where: { $0.id == fromCollectionID }),
              let toIdx   = collections.firstIndex(where: { $0.id == toCollectionID }) else { return }
        let toMove = collections[fromIdx].cards.filter { ids.contains($0.id) }
        collections[fromIdx].cards.removeAll { ids.contains($0.id) }
        let startOrder = collections[toIdx].cards.count
        collections[toIdx].cards.append(contentsOf: toMove)
        persistLocalUserCollections()
        Task {
            for (i, card) in toMove.enumerated() {
                await persistDeleteCard(id: card.id, collectionID: fromCollectionID)
                await persistCard(id: card.id, title: card.title, speech: card.speech, color: card.color, fitzgeraldCategory: card.fitzgeraldCategory, order: startOrder + i, imageURL: imageURL(for: card), collectionID: toCollectionID)
            }
        }
    }

    func recolorCards(ids: Set<String>, inCollectionID: String, color: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }) else { return }
        for ji in collections[ci].cards.indices where ids.contains(collections[ci].cards[ji].id) {
            let card = collections[ci].cards[ji]
            collections[ci].cards[ji].color = color
            if !card.id.hasPrefix("user_") { localEdits.cards[card.id] = collections[ci].cards[ji] }
            Task { await persistUpdateCard(id: card.id, title: card.title, speech: card.speech, color: color, fitzgeraldCategory: card.fitzgeraldCategory, order: card.order, imageURL: imageURL(for: card), collectionID: inCollectionID) }
        }
        persistLocalEdits()
        persistLocalUserCollections()
    }

    func promoteCollectionToDefault(_ collection: CardCollection) {
        guard let ci = collections.firstIndex(where: { $0.id == collection.id }) else { return }
        let newId = collection.id.hasPrefix("user_") ? String(collection.id.dropFirst(5)) : collection.id
        let promoted = CardCollection(
            id: newId,
            title: collection.title,
            color: collection.color,
            order: collection.order,
            mediaCategories: collection.mediaCategories,
            imageRef: collection.imageRef,
            cards: collection.cards
        )
        collections[ci] = promoted
        if let url = collectionThumbnails.removeValue(forKey: collection.id) {
            collectionThumbnails[newId] = url
        }
        persistLocalUserCollections()
        Task { await persistPromoteCollection(promoted) }
    }

    private func persistDeleteCollection(id: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            try await contentClient.deleteCollection(id: id, sessionToken: token)
        } catch {
            lastPersistError = "Failed to delete collection: \(error.localizedDescription)"
            print("[CardsStore] persistDeleteCollection error: \(error)")
        }
    }

    private func persistDeleteCard(id: String, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            try await contentClient.deleteCard(id: id, collectionID: collectionID, sessionToken: token)
        } catch {
            lastPersistError = "Failed to delete card: \(error.localizedDescription)"
            print("[CardsStore] persistDeleteCard error: \(error)")
        }
    }

    private func persistPromoteCollection(_ collection: CardCollection) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            try await contentClient.promoteCollection(collection, sessionToken: token)
        } catch {
            lastPersistError = "Failed to promote collection: \(error.localizedDescription)"
            print("[CardsStore] persistPromoteCollection error: \(error)")
        }
    }

    func imageURL(for collection: CardCollection) -> URL? {
        if let cached = collectionThumbnails[collection.id] { return cached }
        if let imageRef = collection.imageRef { return contentImageURL(for: imageRef) }
        return nil
    }

    func imageURL(for card: CommunicationCard) -> URL? {
        if let cached = cardImages[card.id] { return cached }
        if let imageRef = card.imageRef { return contentImageURL(for: imageRef) }
        return nil
    }

    private func applySavedCollection(_ saved: CardCollection) {
        guard let index = collections.firstIndex(where: { $0.id == saved.id }) else { return }
        collections[index].imageRef = saved.imageRef
        if let imageRef = saved.imageRef {
            collectionThumbnails[saved.id] = contentImageURL(for: imageRef)
        }
    }

    private func applySavedCard(_ saved: CommunicationCard, collectionID: String) {
        guard let collectionIndex = collections.firstIndex(where: { $0.id == collectionID }),
              let cardIndex = collections[collectionIndex].cards.firstIndex(where: { $0.id == saved.id }) else { return }
        collections[collectionIndex].cards[cardIndex].imageRef = saved.imageRef
        if let imageRef = saved.imageRef {
            cardImages[saved.id] = contentImageURL(for: imageRef)
        }
    }

    /// Where an image reference is loaded from. A picture the vocabulary pins
    /// is fetched straight from the media CDN; anything else (a family's own
    /// upload) goes through the content API, which knows where it is stored.
    private func contentImageURL(for imageRef: String) -> URL {
        if let pinned = CardsDefaults.pictureURL(forImageRef: imageRef) {
            return CardsMediaMatcher.resizedCDNURL(pinned)
        }
        return URL(string: "\(CardsContentClient.baseURL)/content/images/\(imageRef)")!
    }

    private func mergeRemoteCollections(_ remote: [CardCollection], withLocalUserCollections local: [CardCollection]) -> [CardCollection] {
        let remoteIDs = Set(remote.map(\.id))
        return remote + local.filter { !remoteIDs.contains($0.id) }
    }

    private func loadLocalUserCollections() -> [CardCollection] {
        guard let data = defaults.data(forKey: localCollectionsStorageKey()) else { return [] }
        return (try? JSONDecoder().decode([CardCollection].self, from: data)) ?? []
    }

    private func persistLocalUserCollections() {
        let userCollectionIDs = Set(collections.filter { $0.id.hasPrefix("user_") }.map(\.id))
        let userCollections = collections.filter { collection in
            collection.id.hasPrefix("user_") || collection.cards.contains { $0.id.hasPrefix("user_") && userCollectionIDs.contains(collection.id) }
        }
        if userCollections.isEmpty {
            defaults.removeObject(forKey: localCollectionsStorageKey())
            return
        }
        if let data = try? JSONEncoder().encode(userCollections) {
            defaults.set(data, forKey: localCollectionsStorageKey())
        }
    }

    private func rememberRemovedCards(_ ids: [String]) {
        let defaults = ids.filter { !$0.hasPrefix("user_") }
        guard !defaults.isEmpty else { return }
        localEdits.removedCards.formUnion(defaults)
        persistLocalEdits()
    }

    /// Whether anything about the default cards was changed on this device.
    var hasLocalEditsToDefaults: Bool {
        !localEdits.cards.isEmpty || !localEdits.collections.isEmpty
            || !localEdits.removedCards.isEmpty || !localEdits.removedCollections.isEmpty
            || localEdits.pictures.keys.contains { !$0.hasPrefix("user_") }
            || localEdits.clearedPictures.contains { !$0.hasPrefix("user_") }
    }

    /// Puts every default card back as the vocabulary has it. A family's own
    /// cards and their pictures are left alone.
    func restoreDefaults(languageCode: String) {
        var kept = CardsLocalEdits()
        kept.pictures = localEdits.pictures.filter { $0.key.hasPrefix("user_") }
        kept.clearedPictures = localEdits.clearedPictures.filter { $0.hasPrefix("user_") }
        localEdits = kept
        persistLocalEdits()
        cardImages = cardImages.filter { $0.key.hasPrefix("user_") }
        collectionThumbnails = collectionThumbnails.filter { $0.key.hasPrefix("user_") }
        fetchedCollectionIDs.removeAll()
        showBundledDefaults(languageCode: languageCode, localCollections: loadLocalUserCollections())
    }

    private func loadLocalEdits() -> CardsLocalEdits {
        guard let data = defaults.data(forKey: localEditsStorageKey()) else { return CardsLocalEdits() }
        return (try? JSONDecoder().decode(CardsLocalEdits.self, from: data)) ?? CardsLocalEdits()
    }

    private func persistLocalEdits() {
        if localEdits.isEmpty {
            defaults.removeObject(forKey: localEditsStorageKey())
        } else if let data = try? JSONEncoder().encode(localEdits) {
            defaults.set(data, forKey: localEditsStorageKey())
        }
    }

    private func localEditsStorageKey() -> String {
        let subjectID = (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        return "tiko.cards.ios.localEdits.\(subjectID)"
    }

    private func localCollectionsStorageKey() -> String {
        let subjectID = (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        return "tiko.cards.ios.userCollections.\(subjectID)"
    }
}
