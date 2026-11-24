import Foundation

/// The default vocabulary, as bundled in the app.
///
/// `CardsDefaultVocabulary.json` is generated from `packages/cards-vocabulary`
/// by `tools/generate-cards-vocabulary.mjs`, the same run that writes what the
/// content API serves — so the copy shown without a connection is the one shown
/// with it, not a second list that someone has to remember to keep in step.
enum CardsDefaults {
    private struct Vocabulary: Decodable {
        let collections: [CardCollection]
        /// Media id → the address of the picture a card is pinned to.
        let images: [String: String]
        /// Locale → item id → its words in that language.
        let translations: [String: [String: Words]]
    }

    private struct Words: Decodable {
        let title: String
        let speech: String?
    }

    private static let vocabulary: Vocabulary = {
        guard let url = Bundle.main.url(forResource: "CardsDefaultVocabulary", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(Vocabulary.self, from: data) else {
            // The file is generated and bundled at build time; without it the app
            // would open on an empty grid, which is worth failing loudly for in
            // development and impossible to reach in a shipped build.
            assertionFailure("CardsDefaultVocabulary.json is missing from the app bundle or does not decode")
            return Vocabulary(collections: [], images: [:], translations: [:])
        }
        return decoded
    }()

    /// The default collections in `languageCode`. A word with no translation
    /// stays English rather than being guessed at.
    static func collections(languageCode: String = "en") -> [CardCollection] {
        let language = languageCode.split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map { $0.lowercased() } ?? "en"
        guard let words = vocabulary.translations[language] else { return vocabulary.collections }
        return vocabulary.collections.map { collection in
            var localized = collection
            if let title = words[collection.id]?.title { localized.title = title }
            localized.cards = collection.cards.map { card in
                guard let entry = words[card.id] else { return card }
                var translated = card
                translated.title = entry.title
                translated.speech = entry.speech ?? entry.title
                return translated
            }
            return localized
        }
    }

    /// Where the picture behind a pinned media id lives, when the vocabulary
    /// knows it. Lets a default card show its picture without first asking a
    /// server to resolve the id.
    static func pictureURL(forImageRef imageRef: String) -> URL? {
        vocabulary.images[imageRef].flatMap(URL.init(string:))
    }

    /// The locales the bundled vocabulary is translated into, besides English.
    static var translatedLanguages: [String] { vocabulary.translations.keys.sorted() }
}

/// The default collections in English.
var defaultCardCollections: [CardCollection] { CardsDefaults.collections() }
