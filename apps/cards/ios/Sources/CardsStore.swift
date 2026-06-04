import Foundation

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
}
