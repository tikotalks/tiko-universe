import Foundation
import TikoKit

/// The single content source for practice and Parent Mode. Merges the bundled
/// default catalogue with per-language `SayCardOverride`s and custom cards,
/// scoped to the active account subject. Persistence is local-first in
/// UserDefaults (per subject, like the other Tiko iOS apps); the standard Tiko
/// data-layer sync can attach to the same shapes later.
@MainActor
final class SayCardStore: ObservableObject {
    @Published private(set) var revision = 0
    /// Automatically resolved Tiko media-library images per card. Explicit
    /// parent-picked images (`SayCard.imageURL`) always win over these.
    @Published private(set) var cardImages: [String: URL] = [:]
    /// Media-library thumbnails for the category tiles.
    @Published private(set) var categoryThumbnails: [String: URL] = [:]

    private let defaults: UserDefaults
    private let subjectIDProvider: () -> String
    private let mediaClient = SayMediaClient()
    private var hydratedCategoryIDs = Set<String>()
    /// language → cardID → override
    private var overrides: [String: [String: SayCardOverride]] = [:]
    /// language → custom cards
    private var customCards: [String: [SayCard]] = [:]

    init(
        defaults: UserDefaults = .standard,
        subjectIDProvider: @escaping () -> String = {
            (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        }
    ) {
        self.defaults = defaults
        self.subjectIDProvider = subjectIDProvider
        load()
        loadResolvedMedia()
    }

    // MARK: - Reading

    /// Cards shown in the practice flow: merged, hidden excluded, sorted.
    func visibleCards(categoryID: String, language: String) -> [SayCard] {
        allCards(categoryID: categoryID, language: language).filter { !$0.isHidden }
    }

    /// All cards for the Parent Mode editor: merged, hidden included, sorted.
    func allCards(categoryID: String, language: String) -> [SayCard] {
        let lang = SayCatalog.normalizedLanguage(language)
        let langOverrides = overrides[lang] ?? [:]
        var merged = SayCatalog.defaultCards(categoryID: categoryID, language: lang).map { card -> SayCard in
            guard let override = langOverrides[card.id] else { return card }
            var card = card
            if let title = override.title { card.title = title }
            if let speak = override.speakText { card.speakText = speak }
            if let listen = override.listenFor { card.listenFor = listen }
            if let emoji = override.emoji { card.emoji = emoji }
            if let imageURL = override.imageURL { card.imageURL = imageURL }
            if let order = override.sortOrder { card.sortOrder = order }
            card.isHidden = override.isHidden
            return card
        }
        merged.append(contentsOf: (customCards[lang] ?? []).filter { $0.categoryID == categoryID })
        return merged.sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
    }

    /// A category with every card hidden is unplayable and shown disabled.
    func isCategoryPlayable(categoryID: String, language: String) -> Bool {
        !visibleCards(categoryID: categoryID, language: language).isEmpty
    }

    func isEdited(cardID: String, language: String) -> Bool {
        let lang = SayCatalog.normalizedLanguage(language)
        return overrides[lang]?[cardID] != nil
    }

    /// Display image: parent-picked first, then the auto-resolved library image.
    func imageURL(for card: SayCard) -> URL? {
        card.imageURL ?? cardImages[card.id]
    }

    // MARK: - Media resolution

    /// Resolves Tiko media-library images for a category's cards and warms the
    /// shared image cache so previously seen images keep working offline.
    func hydrateMedia(categoryID: String, language: String) async {
        guard !hydratedCategoryIDs.contains(categoryID),
              let category = SayCatalog.category(id: categoryID),
              !category.mediaCategories.isEmpty else { return }
        hydratedCategoryIDs.insert(categoryID)

        guard let mediaItems = try? await mediaClient.fetchMedia(for: category.mediaCategories),
              !mediaItems.isEmpty else {
            // Allow a retry on a later visit — the network may be back.
            hydratedCategoryIDs.remove(categoryID)
            return
        }

        var matchKeys = SayCatalog.defaultCards
            .filter { $0.categoryID == categoryID }
            .map { (cardID: $0.id, matchKey: $0.mediaMatchKey) }
        let lang = SayCatalog.normalizedLanguage(language)
        for custom in (customCards[lang] ?? []) where custom.categoryID == categoryID && custom.imageURL == nil {
            matchKeys.append((cardID: custom.id, matchKey: custom.title))
        }

        let matches = SayMediaMatcher.match(cards: matchKeys, mediaItems: mediaItems)
        cardImages.merge(matches) { _, new in new }

        // Category tile thumbnail: the first default card's image.
        let orderedDefaults = SayCatalog.defaultCards
            .filter { $0.categoryID == categoryID }
            .sorted { $0.sortOrder < $1.sortOrder }
        if let thumbnail = orderedDefaults.compactMap({ matches[$0.id] }).first ?? matches.values.first {
            categoryThumbnails[categoryID] = thumbnail
        }

        // Remember the resolved URLs so tiles and cards render instantly on
        // the next launch (even offline), and warm the shared disk cache so
        // the image bytes survive offline sessions too.
        persistResolvedMedia()
        for url in matches.values {
            _ = await TikoRemoteImageCache.shared.image(for: url)
        }
    }

    private var resolvedMediaKey: String { "tiko.say.ios.resolvedMedia" }

    private func loadResolvedMedia() {
        guard let data = defaults.data(forKey: resolvedMediaKey),
              let decoded = try? JSONDecoder().decode(ResolvedMedia.self, from: data) else { return }
        cardImages = decoded.cardImages.compactMapValues(URL.init(string:))
        categoryThumbnails = decoded.categoryThumbnails.compactMapValues(URL.init(string:))
    }

    private func persistResolvedMedia() {
        let snapshot = ResolvedMedia(
            cardImages: cardImages.mapValues(\.absoluteString),
            categoryThumbnails: categoryThumbnails.mapValues(\.absoluteString)
        )
        if let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: resolvedMediaKey)
        }
    }

    private struct ResolvedMedia: Codable {
        let cardImages: [String: String]
        let categoryThumbnails: [String: String]
    }

    /// Resolves media for every category — used by the home grid so the
    /// category tiles show real Tiko media images.
    func hydrateAllCategories(language: String) async {
        for category in SayCatalog.categories {
            await hydrateMedia(categoryID: category.id, language: language)
        }
    }

    // MARK: - Editing defaults (stored as overrides)

    func updateCard(
        id: String,
        language: String,
        title: String,
        speakText: String,
        listenFor: [String],
        emoji: String,
        imageURL: URL? = nil
    ) {
        let lang = SayCatalog.normalizedLanguage(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else { return }
        // Prefill: empty speak text and listen-for fall back to the title.
        let speak = speakText.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedSpeak = speak.isEmpty ? trimmedTitle : speak
        let cleanedListen = listenFor
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let resolvedListen = cleanedListen.isEmpty ? [trimmedTitle.lowercased()] : cleanedListen

        if let customIndex = customCardIndex(id: id, language: lang) {
            customCards[lang]![customIndex].title = trimmedTitle
            customCards[lang]![customIndex].speakText = resolvedSpeak
            customCards[lang]![customIndex].listenFor = resolvedListen
            customCards[lang]![customIndex].emoji = emoji
            customCards[lang]![customIndex].imageURL = imageURL
            persist()
            return
        }

        guard let defaultCard = SayCatalog.defaultCards.first(where: { $0.id == id }) else { return }
        let bundled = SayCatalog.card(defaultCard, language: lang)
        var override = overrides[lang]?[id] ?? SayCardOverride(cardID: id, languageCode: lang)
        override.title = trimmedTitle == bundled.title ? nil : trimmedTitle
        override.speakText = resolvedSpeak == bundled.speakText ? nil : resolvedSpeak
        override.listenFor = resolvedListen == bundled.listenFor ? nil : resolvedListen
        override.emoji = emoji == bundled.emoji ? nil : emoji
        // Only store an explicit image when it differs from the auto-resolved
        // library image, so "no change" stays reset-clean.
        override.imageURL = imageURL == cardImages[id] ? nil : imageURL
        setOverride(override, language: lang)
    }

    func setHidden(_ hidden: Bool, cardID: String, language: String) {
        let lang = SayCatalog.normalizedLanguage(language)
        if let customIndex = customCardIndex(id: cardID, language: lang) {
            customCards[lang]![customIndex].isHidden = hidden
            persist()
            return
        }
        var override = overrides[lang]?[cardID] ?? SayCardOverride(cardID: cardID, languageCode: lang)
        override.isHidden = hidden
        setOverride(override, language: lang)
    }

    /// Removes the override so the bundled default (for this language) shows again.
    func resetToDefault(cardID: String, language: String) {
        let lang = SayCatalog.normalizedLanguage(language)
        overrides[lang]?.removeValue(forKey: cardID)
        persist()
    }

    // MARK: - Custom cards

    @discardableResult
    func addCustomCard(
        categoryID: String,
        language: String,
        title: String,
        speakText: String = "",
        listenFor: [String] = [],
        emoji: String = "⭐️",
        imageURL: URL? = nil
    ) -> SayCard? {
        let lang = SayCatalog.normalizedLanguage(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else { return nil }
        let speak = speakText.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedListen = listenFor
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let order = (allCards(categoryID: categoryID, language: lang).map(\.sortOrder).max() ?? -1) + 1
        let card = SayCard(
            id: "user_\(UUID().uuidString.lowercased())",
            categoryID: categoryID,
            title: trimmedTitle,
            speakText: speak.isEmpty ? trimmedTitle : speak,
            listenFor: cleanedListen.isEmpty ? [trimmedTitle.lowercased()] : cleanedListen,
            emoji: emoji.isEmpty ? "⭐️" : emoji,
            imageURL: imageURL,
            difficulty: 2,
            isCustom: true,
            isHidden: false,
            sortOrder: order
        )
        customCards[lang, default: []].append(card)
        persist()
        return card
    }

    /// Custom cards can be deleted; default cards can only be hidden.
    func deleteCustomCard(id: String, language: String) {
        let lang = SayCatalog.normalizedLanguage(language)
        guard customCardIndex(id: id, language: lang) != nil else { return }
        customCards[lang]?.removeAll { $0.id == id }
        persist()
    }

    // MARK: - Reorder

    func moveCard(categoryID: String, language: String, fromOffsets: IndexSet, toOffset: Int) {
        let lang = SayCatalog.normalizedLanguage(language)
        var cards = allCards(categoryID: categoryID, language: lang)
        cards.move(fromOffsets: fromOffsets, toOffset: toOffset)
        for (index, card) in cards.enumerated() where card.sortOrder != index {
            if let customIndex = customCardIndex(id: card.id, language: lang) {
                customCards[lang]![customIndex].sortOrder = index
            } else {
                var override = overrides[lang]?[card.id] ?? SayCardOverride(cardID: card.id, languageCode: lang)
                override.sortOrder = index
                overrides[lang, default: [:]][card.id] = override.isEmpty ? nil : override
            }
        }
        persist()
    }

    // MARK: - Persistence

    private func customCardIndex(id: String, language: String) -> Int? {
        customCards[language]?.firstIndex { $0.id == id }
    }

    private func setOverride(_ override: SayCardOverride, language: String) {
        if override.isEmpty {
            overrides[language]?.removeValue(forKey: override.cardID)
        } else {
            overrides[language, default: [:]][override.cardID] = override
        }
        persist()
    }

    private var overridesKey: String { "tiko.say.ios.cardOverrides.\(subjectIDProvider())" }
    private var customCardsKey: String { "tiko.say.ios.customCards.\(subjectIDProvider())" }

    private func load() {
        if let data = defaults.data(forKey: overridesKey),
           let decoded = try? JSONDecoder().decode([String: [String: SayCardOverride]].self, from: data) {
            overrides = decoded
        }
        if let data = defaults.data(forKey: customCardsKey),
           let decoded = try? JSONDecoder().decode([String: [SayCard]].self, from: data) {
            customCards = decoded
        }
    }

    private func persist() {
        overrides = overrides.compactMapValues { $0.isEmpty ? nil : $0 }
        if overrides.isEmpty {
            defaults.removeObject(forKey: overridesKey)
        } else if let data = try? JSONEncoder().encode(overrides) {
            defaults.set(data, forKey: overridesKey)
        }
        let prunedCustom = customCards.compactMapValues { $0.isEmpty ? nil : $0 }
        if prunedCustom.isEmpty {
            defaults.removeObject(forKey: customCardsKey)
        } else if let data = try? JSONEncoder().encode(prunedCustom) {
            defaults.set(data, forKey: customCardsKey)
        }
        revision += 1
    }
}
