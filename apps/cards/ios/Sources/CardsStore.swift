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
    private let contentClient = CardsContentClient()
    private var fetchedCollectionIDs = Set<String>()

    init(
        mediaClient: CardsMediaClient = CardsMediaClient(),
        imageCache: CardsImageCache = .shared
    ) {
        self.mediaClient = mediaClient
        self.imageCache = imageCache
    }

    func load(languageCode: String = "en") async {
        isLoading = true
        defer { isLoading = false }

        let token = try? TikoDeviceSessionStore().load()?.accessToken
        do {
            let fetched = try await contentClient.fetchCollections(sessionToken: token, languageCode: languageCode)
            collections = fetched.sorted { $0.order < $1.order }
        } catch {
            if collections.isEmpty {
                collections = defaultCardCollections.sorted { $0.order < $1.order }
            }
        }
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
        guard !categories.isEmpty else { return }
        guard !fetchedCollectionIDs.contains(collectionID) else { return }

        fetchedCollectionIDs.insert(collectionID)
        loadingCollectionIDs.insert(collectionID)
        defer { loadingCollectionIDs.remove(collectionID) }

        do {
            let mediaItems = try await mediaClient.fetchMedia(for: categories)
            guard let index = collections.firstIndex(where: { $0.id == collectionID }) else { return }
            let match = CardsMediaMatcher.match(collection: collections[index], mediaItems: mediaItems)
            cardImages.merge(match.cardImages) { _, new in new }
            if let thumbnailURL = match.thumbnailURL {
                collectionThumbnails[collectionID] = thumbnailURL
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
        if let imageURL { collectionThumbnails[id] = imageURL }
        Task { await persistCollection(id: id, title: trimmed, color: color, order: order, parentID: parentID, imageURL: imageURL) }
    }

    func addCard(title: String, speech: String, color: String? = nil, imageURL: URL? = nil, to collectionID: String) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty,
              let index = collections.firstIndex(where: { $0.id == collectionID }) else { return }
        let id = "user_\(UUID().uuidString.lowercased())"
        let spokenText = speech.trimmingCharacters(in: .whitespaces).isEmpty ? trimmed : speech.trimmingCharacters(in: .whitespaces)
        let resolvedColor = color ?? collections[index].color
        let order = collections[index].cards.count
        let card = CommunicationCard(id: id, title: trimmed, speech: spokenText, color: resolvedColor, order: order)
        collections[index].cards.append(card)
        if let imageURL { cardImages[id] = imageURL }
        Task { await persistCard(id: id, title: trimmed, speech: spokenText, color: resolvedColor, order: order, imageURL: imageURL, collectionID: collectionID) }
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
        Task { await persistUpdateCollection(id: id, title: title, color: color, order: collections[i].order, parentID: effectiveParent, imageURL: imageURL, saveAsDefault: saveAsDefault) }
    }

    func reparentCollections(ids: Set<String>, toParentID: String?) {
        for i in collections.indices where ids.contains(collections[i].id) {
            collections[i].parentID = toParentID
            let col = collections[i]
            Task { await persistUpdateCollection(id: col.id, title: col.title, color: col.color, order: col.order, parentID: toParentID, imageURL: imageURL(for: col)) }
        }
    }

    func updateCard(id: String, title: String, speech: String, color: String, imageURL: URL?, inCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }),
              let ji = collections[ci].cards.firstIndex(where: { $0.id == id }) else { return }
        collections[ci].cards[ji].title = title
        collections[ci].cards[ji].speech = speech
        collections[ci].cards[ji].color = color
        if let imageURL {
            cardImages[id] = imageURL
        } else {
            cardImages.removeValue(forKey: id)
            collections[ci].cards[ji].imageRef = nil
        }
        Task { await persistUpdateCard(id: id, title: title, speech: speech, color: color, order: collections[ci].cards[ji].order, imageURL: imageURL, collectionID: inCollectionID) }
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
                    order: card.order,
                    imageURL: imageURL(for: card),
                    collectionID: inCollectionID
                )
            }
        }
    }

    private func persistCollection(id: String, title: String, color: String, order: Int, parentID: String? = nil, imageURL: URL?) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else { return }
        guard let saved = try? await contentClient.createCollection(id: id, title: title, color: color, order: order, parentID: parentID, imageURL: imageURL, sessionToken: token) else { return }
        applySavedCollection(saved)
    }

    private func persistCard(id: String, title: String, speech: String, color: String, order: Int, imageURL: URL?, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else { return }
        guard let saved = try? await contentClient.createCard(id: id, title: title, speech: speech, color: color, order: order, imageURL: imageURL, collectionID: collectionID, sessionToken: token) else { return }
        applySavedCard(saved, collectionID: collectionID)
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

    private func persistUpdateCard(id: String, title: String, speech: String, color: String, order: Int, imageURL: URL?, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else {
            lastPersistError = "No session token"
            return
        }
        do {
            let saved = try await contentClient.updateCard(id: id, title: title, speech: speech, color: color, order: order, imageURL: imageURL, collectionID: collectionID, sessionToken: token)
            applySavedCard(saved, collectionID: collectionID)
        } catch {
            lastPersistError = "Failed to save card: \(error.localizedDescription)"
            print("[CardsStore] persistUpdateCard error: \(error)")
        }
    }

    func deleteCollection(id: String) {
        collections.removeAll { $0.id == id }
        collectionThumbnails.removeValue(forKey: id)
        Task { await persistDeleteCollection(id: id) }
    }

    func deleteCard(id: String, inCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }) else { return }
        collections[ci].cards.removeAll { $0.id == id }
        Task { await persistDeleteCard(id: id, collectionID: inCollectionID) }
    }

    func deleteCards(ids: Set<String>, fromCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == fromCollectionID }) else { return }
        let toDelete = collections[ci].cards.filter { ids.contains($0.id) }.map(\.id)
        collections[ci].cards.removeAll { ids.contains($0.id) }
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
        Task {
            for (i, card) in toMove.enumerated() {
                await persistDeleteCard(id: card.id, collectionID: fromCollectionID)
                await persistCard(id: card.id, title: card.title, speech: card.speech, color: card.color, order: startOrder + i, imageURL: imageURL(for: card), collectionID: toCollectionID)
            }
        }
    }

    func recolorCards(ids: Set<String>, inCollectionID: String, color: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }) else { return }
        for ji in collections[ci].cards.indices where ids.contains(collections[ci].cards[ji].id) {
            let card = collections[ci].cards[ji]
            collections[ci].cards[ji].color = color
            Task { await persistUpdateCard(id: card.id, title: card.title, speech: card.speech, color: color, order: card.order, imageURL: imageURL(for: card), collectionID: inCollectionID) }
        }
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

    private func contentImageURL(for imageRef: String) -> URL {
        URL(string: "\(CardsContentClient.baseURL)/content/images/\(imageRef)")!
    }
}
