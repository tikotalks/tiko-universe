import Foundation

/// What a family changed about the cards on this device.
///
/// A default card belongs to the vocabulary, which is replaced whenever the
/// app or the server brings a newer one. So a change to it is not written into
/// the vocabulary: it is kept here, by id, and laid over whatever vocabulary is
/// current. That is what lets a parent rename "Mom" or give "Dog" a photo of
/// their own dog and still receive new cards later — and what keeps the change
/// when there is no connection, or no account, to save it to.
struct CardsLocalEdits: Codable, Equatable {
    struct CollectionEdit: Codable, Equatable {
        var title: String
        var color: String
    }

    /// Default cards as edited, by card id.
    var cards: [String: CommunicationCard] = [:]
    /// Default collections as edited, by collection id.
    var collections: [String: CollectionEdit] = [:]
    /// The picture chosen for a card or collection, by id. Covers a family's
    /// own cards too: their picture is otherwise only known to the server.
    var pictures: [String: String] = [:]
    /// Cards and collections whose picture was taken away.
    var clearedPictures: Set<String> = []
    var removedCards: Set<String> = []
    var removedCollections: Set<String> = []

    var isEmpty: Bool { self == CardsLocalEdits() }

    mutating func setPicture(_ url: URL?, for id: String) {
        if let url {
            pictures[id] = url.absoluteString
            clearedPictures.remove(id)
        } else {
            pictures.removeValue(forKey: id)
            clearedPictures.insert(id)
        }
    }

    /// Lays the edits over `collections`. Order and membership come from the
    /// vocabulary; words, colours and removals come from here.
    func applied(to collections: [CardCollection]) -> [CardCollection] {
        guard !isEmpty else { return collections }
        return collections.compactMap { collection in
            guard !removedCollections.contains(collection.id) else { return nil }
            // A collection removed along with its parent stays removed.
            if let parentID = collection.parentID, removedCollections.contains(parentID) { return nil }
            var result = collection
            if let edit = self.collections[collection.id] {
                result.title = edit.title
                result.color = edit.color
            }
            if clearedPictures.contains(collection.id) { result.imageRef = nil }
            result.cards = collection.cards.compactMap { card in
                guard !removedCards.contains(card.id) else { return nil }
                var edited = cards[card.id] ?? card
                edited.order = card.order
                if clearedPictures.contains(card.id) { edited.imageRef = nil }
                return edited
            }
            return result
        }
    }

    /// The chosen pictures, as addresses a tile can load.
    var pictureURLs: [String: URL] {
        pictures.compactMapValues(URL.init(string:))
    }
}
