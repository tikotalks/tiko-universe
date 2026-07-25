import Foundation
import TikoKit

/// The single content source for paths and operator pronunciation. Bundled
/// defaults merged with per-language `SumPathOverride`s and custom paths,
/// scoped to the active account subject — the family override pattern.
@MainActor
final class SumPathStore: ObservableObject {
    @Published private(set) var revision = 0
    /// Tiko media-library images for the path tiles, emoji as fallback.
    @Published private(set) var pathImages: [String: URL] = [:]

    private let defaults: UserDefaults
    private let subjectIDProvider: () -> String
    /// language → pathID → override
    private var overrides: [String: [String: SumPathOverride]] = [:]
    /// language → custom paths
    private var customPaths: [String: [SumPath]] = [:]
    /// language → operator word overrides
    private var operatorWords: [String: SumCatalog.OperatorWords] = [:]

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

    private let mediaClient = TikoMediaClient()
    private var hydratedMedia = false

    /// Resolves Tiko media images for the path tiles and remembers the URLs
    /// so later launches render instantly and offline.
    func hydrateMedia(language: String) async {
        guard !hydratedMedia else { return }
        hydratedMedia = true
        guard let items = try? await mediaClient.fetchMedia(for: SumCatalog.mediaCategories), !items.isEmpty else {
            hydratedMedia = false
            return
        }
        var keys = SumCatalog.defaultPaths.map { (cardID: $0.id, matchKey: $0.mediaMatchKey) }
        let lang = TikoLanguageCode.normalized(language)
        for custom in (customPaths[lang] ?? []) {
            keys.append((cardID: custom.id, matchKey: custom.title))
        }
        let matches = TikoMediaMatcher.match(cards: keys, mediaItems: items)
        pathImages.merge(matches) { _, new in new }
        persistResolvedMedia()
        for url in matches.values {
            _ = await TikoRemoteImageCache.shared.image(for: url)
        }
    }

    private var mediaKey: String { "tiko.sum.ios.resolvedMedia" }

    private func loadResolvedMedia() {
        guard let data = defaults.data(forKey: mediaKey),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return }
        pathImages = decoded.compactMapValues(URL.init(string:))
    }

    private func persistResolvedMedia() {
        if let data = try? JSONEncoder().encode(pathImages.mapValues(\.absoluteString)) {
            defaults.set(data, forKey: mediaKey)
        }
    }

    // MARK: - Reading

    func visiblePaths(language: String, i18n: TikoI18n) -> [SumPath] {
        allPaths(language: language, i18n: i18n).filter { !$0.isHidden }
    }

    func allPaths(language: String, i18n: TikoI18n) -> [SumPath] {
        let lang = TikoLanguageCode.normalized(language)
        let langOverrides = overrides[lang] ?? [:]
        var merged = SumCatalog.defaultPaths.map { defaultPath -> SumPath in
            var path = SumCatalog.path(defaultPath, i18n: i18n)
            guard let override = langOverrides[path.id] else { return path }
            if let title = override.title { path.title = title }
            if let emoji = override.emoji { path.emoji = emoji }
            if let formulas = override.formulas { path.formulas = formulas }
            if let order = override.sortOrder { path.sortOrder = order }
            path.isHidden = override.isHidden
            return path
        }
        merged.append(contentsOf: customPaths[lang] ?? [])
        return merged.sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
    }

    func isEdited(pathID: String, language: String) -> Bool {
        overrides[TikoLanguageCode.normalized(language)]?[pathID] != nil
    }

    // MARK: - Operator words

    func operatorWords(language: String) -> SumCatalog.OperatorWords {
        operatorWords[TikoLanguageCode.normalized(language)]
            ?? SumCatalog.defaultOperatorWords(language: language)
    }

    func setOperatorWords(_ words: SumCatalog.OperatorWords, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        if words == SumCatalog.defaultOperatorWords(language: lang) {
            operatorWords.removeValue(forKey: lang)
        } else {
            operatorWords[lang] = words
        }
        persist()
    }

    // MARK: - Editing paths

    func updatePath(
        id: String,
        language: String,
        i18n: TikoI18n,
        title: String,
        emoji: String,
        formulas: [Formula]
    ) {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let validFormulas = formulas.filter(\.isValid)
        guard !trimmedTitle.isEmpty, !validFormulas.isEmpty else { return }

        if let index = customPathIndex(id: id, language: lang) {
            customPaths[lang]![index].title = trimmedTitle
            customPaths[lang]![index].emoji = emoji
            customPaths[lang]![index].formulas = validFormulas
            persist()
            return
        }

        guard let defaultPath = SumCatalog.defaultPaths.first(where: { $0.id == id }) else { return }
        let bundled = SumCatalog.path(defaultPath, i18n: i18n)
        var override = overrides[lang]?[id] ?? SumPathOverride(pathID: id, languageCode: lang)
        override.title = trimmedTitle == bundled.title ? nil : trimmedTitle
        override.emoji = emoji == bundled.emoji ? nil : emoji
        override.formulas = validFormulas == bundled.formulas ? nil : validFormulas
        setOverride(override, language: lang)
    }

    func setHidden(_ hidden: Bool, pathID: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        if let index = customPathIndex(id: pathID, language: lang) {
            customPaths[lang]![index].isHidden = hidden
            persist()
            return
        }
        var override = overrides[lang]?[pathID] ?? SumPathOverride(pathID: pathID, languageCode: lang)
        override.isHidden = hidden
        setOverride(override, language: lang)
    }

    func resetToDefault(pathID: String, language: String) {
        overrides[TikoLanguageCode.normalized(language)]?.removeValue(forKey: pathID)
        persist()
    }

    @discardableResult
    func addCustomPath(language: String, title: String, emoji: String, formulas: [Formula], i18n: TikoI18n) -> SumPath? {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let validFormulas = formulas.filter(\.isValid)
        guard !trimmedTitle.isEmpty, !validFormulas.isEmpty else { return nil }
        let order = (allPaths(language: lang, i18n: i18n).map(\.sortOrder).max() ?? -1) + 1
        let path = SumPath(
            id: "user_\(UUID().uuidString.lowercased())",
            title: trimmedTitle,
            emoji: emoji.isEmpty ? "⭐️" : emoji,
            formulas: validFormulas,
            isCustom: true,
            isHidden: false,
            sortOrder: order
        )
        customPaths[lang, default: []].append(path)
        persist()
        return path
    }

    func deleteCustomPath(id: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        guard customPathIndex(id: id, language: lang) != nil else { return }
        customPaths[lang]?.removeAll { $0.id == id }
        persist()
    }

    func movePath(language: String, i18n: TikoI18n, fromOffsets: IndexSet, toOffset: Int) {
        let lang = TikoLanguageCode.normalized(language)
        var paths = allPaths(language: lang, i18n: i18n)
        paths.move(fromOffsets: fromOffsets, toOffset: toOffset)
        for (index, path) in paths.enumerated() where path.sortOrder != index {
            if let customIndex = customPathIndex(id: path.id, language: lang) {
                customPaths[lang]![customIndex].sortOrder = index
            } else {
                var override = overrides[lang]?[path.id] ?? SumPathOverride(pathID: path.id, languageCode: lang)
                override.sortOrder = index
                overrides[lang, default: [:]][path.id] = override.isEmpty ? nil : override
            }
        }
        persist()
    }

    // MARK: - Persistence

    private func customPathIndex(id: String, language: String) -> Int? {
        customPaths[language]?.firstIndex { $0.id == id }
    }

    private func setOverride(_ override: SumPathOverride, language: String) {
        if override.isEmpty {
            overrides[language]?.removeValue(forKey: override.pathID)
        } else {
            overrides[language, default: [:]][override.pathID] = override
        }
        persist()
    }

    private var overridesKey: String { "tiko.sum.ios.pathOverrides.\(subjectIDProvider())" }
    private var customKey: String { "tiko.sum.ios.customPaths.\(subjectIDProvider())" }
    private var wordsKey: String { "tiko.sum.ios.operatorWords.\(subjectIDProvider())" }

    private func load() {
        if let data = defaults.data(forKey: overridesKey),
           let decoded = try? JSONDecoder().decode([String: [String: SumPathOverride]].self, from: data) {
            overrides = decoded
        }
        if let data = defaults.data(forKey: customKey),
           let decoded = try? JSONDecoder().decode([String: [SumPath]].self, from: data) {
            customPaths = decoded
        }
        if let data = defaults.data(forKey: wordsKey),
           let decoded = try? JSONDecoder().decode([String: SumCatalog.OperatorWords].self, from: data) {
            operatorWords = decoded
        }
    }

    private func persist() {
        overrides = overrides.compactMapValues { $0.isEmpty ? nil : $0 }
        write(overrides, to: overridesKey)
        write(customPaths.compactMapValues { $0.isEmpty ? nil : $0 }, to: customKey)
        write(operatorWords, to: wordsKey)
        revision += 1
    }

    private func write<T: Encodable>(_ value: T, to key: String) {
        if let data = try? JSONEncoder().encode(value), data.count > 2 {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}
