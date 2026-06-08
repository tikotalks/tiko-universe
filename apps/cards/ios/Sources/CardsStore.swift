import Foundation
import TikoKit

@MainActor
final class CardsStore: ObservableObject {
    @Published private(set) var collections: [CardCollection] = []
    @Published private(set) var collectionThumbnails: [String: URL] = [:]
    @Published private(set) var loadingCollectionIDs: Set<String> = []
    @Published private(set) var isLoading = false

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

    func load() async {
        isLoading = true
        defer { isLoading = false }

        let token = try? TikoDeviceSessionStore().load()?.accessToken
        do {
            let fetched = try await contentClient.fetchCollections(sessionToken: token)
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
            collections[index].cards = match.cards
            if let thumbnailURL = match.thumbnailURL {
                collectionThumbnails[collectionID] = thumbnailURL
            }

            var urls = Array(match.cards.compactMap(\.imageURL).prefix(prefetchCards ? match.cards.count : 6))
            if let thumbnailURL = match.thumbnailURL { urls.append(thumbnailURL) }
            await imageCache.prefetch(urls)
        } catch {
            // Defaults remain fully usable offline as text/color cards if media is unreachable.
        }
    }

    func addCollection(title: String, colorHex: UInt32, imageURL: URL? = nil) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let id = "user_\(UUID().uuidString.lowercased())"
        let persistedURL = imageURL.flatMap { Self.persistLocalImageIfNeeded($0) }
        let order = collections.count
        let collection = CardCollection(id: id, title: trimmed, colorHex: colorHex, order: order, imageURL: persistedURL, cards: [])
        collections.append(collection)
        Task { await persistCollection(id: id, title: trimmed, colorHex: colorHex, order: order, imageURL: persistedURL) }
    }

    func addCard(title: String, speech: String, colorHex: UInt32? = nil, imageURL: URL? = nil, to collectionID: String) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty,
              let index = collections.firstIndex(where: { $0.id == collectionID }) else { return }
        let id = "user_\(UUID().uuidString.lowercased())"
        let spokenText = speech.trimmingCharacters(in: .whitespaces).isEmpty ? trimmed : speech.trimmingCharacters(in: .whitespaces)
        let resolvedColor = colorHex ?? collections[index].colorHex
        let persistedURL = imageURL.flatMap { Self.persistLocalImageIfNeeded($0) }
        let order = collections[index].cards.count
        let card = CommunicationCard(id: id, title: trimmed, speech: spokenText, imageURL: persistedURL, colorHex: resolvedColor)
        collections[index].cards.append(card)
        Task { await persistCard(id: id, title: trimmed, speech: spokenText, colorHex: resolvedColor, order: order, imageURL: persistedURL, collectionID: collectionID) }
    }

    static func persistLocalImageIfNeeded(_ url: URL) -> URL {
        guard url.isFileURL else { return url }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let dir = docs.appendingPathComponent("card_images", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let dest = dir.appendingPathComponent(UUID().uuidString + ".jpg")
        try? FileManager.default.copyItem(at: url, to: dest)
        return dest
    }

    func reorderCollection(draggingID: String, targetID: String) {
        guard draggingID != targetID,
              let from = collections.firstIndex(where: { $0.id == draggingID }),
              let to = collections.firstIndex(where: { $0.id == targetID }) else { return }
        collections.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
    }

    func updateCollection(id: String, title: String, colorHex: UInt32, imageURL: URL?) {
        guard let i = collections.firstIndex(where: { $0.id == id }) else { return }
        collections[i].title = title
        collections[i].colorHex = colorHex
        collections[i].imageURL = imageURL.flatMap { Self.persistLocalImageIfNeeded($0) }
    }

    func updateCard(id: String, title: String, speech: String, colorHex: UInt32, imageURL: URL?, inCollectionID: String) {
        guard let ci = collections.firstIndex(where: { $0.id == inCollectionID }),
              let ji = collections[ci].cards.firstIndex(where: { $0.id == id }) else { return }
        collections[ci].cards[ji].title = title
        collections[ci].cards[ji].speech = speech
        collections[ci].cards[ji].colorHex = colorHex
        collections[ci].cards[ji].imageURL = imageURL.flatMap { Self.persistLocalImageIfNeeded($0) }
    }

    func reorderCard(draggingID: String, targetID: String, inCollectionID: String) {
        guard draggingID != targetID,
              let ci = collections.firstIndex(where: { $0.id == inCollectionID }),
              let from = collections[ci].cards.firstIndex(where: { $0.id == draggingID }),
              let to = collections[ci].cards.firstIndex(where: { $0.id == targetID }) else { return }
        collections[ci].cards.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
    }

    private func persistCollection(id: String, title: String, colorHex: UInt32, order: Int, imageURL: URL?) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else { return }
        _ = try? await contentClient.createCollection(id: id, title: title, colorHex: colorHex, order: order, imageURL: imageURL, sessionToken: token)
    }

    private func persistCard(id: String, title: String, speech: String, colorHex: UInt32, order: Int, imageURL: URL?, collectionID: String) async {
        guard let token = try? TikoDeviceSessionStore().load()?.accessToken else { return }
        _ = try? await contentClient.createCard(id: id, title: title, speech: speech, colorHex: colorHex, order: order, imageURL: imageURL, collectionID: collectionID, sessionToken: token)
    }
}
