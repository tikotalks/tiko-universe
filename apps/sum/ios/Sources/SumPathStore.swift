import Foundation
import TikoKit

/// The single content source for parent-authored paths and operator
/// pronunciation, scoped to the active account subject — the family override
/// pattern. Presets need no store: they are generated, not authored.
@MainActor
final class SumPathStore: ObservableObject {
    @Published private(set) var revision = 0
    /// Tiko media-library images for the tiles, emoji as fallback.
    @Published private(set) var tileImages: [String: URL] = [:]

    private let defaults: UserDefaults
    private let subjectIDProvider: () -> String
    /// language → paths
    private var paths: [String: [SumPath]] = [:]
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

    /// Resolves Tiko media images for the preset and path tiles and remembers
    /// the URLs so later launches render instantly and offline.
    func hydrateMedia(language: String) async {
        guard !hydratedMedia else { return }
        hydratedMedia = true
        guard let items = try? await mediaClient.fetchMedia(for: SumCatalog.mediaCategories), !items.isEmpty else {
            hydratedMedia = false
            return
        }
        var keys = SumCatalog.presets.map { (cardID: $0.id, matchKey: $0.mediaMatchKey) }
        let lang = TikoLanguageCode.normalized(language)
        for path in (paths[lang] ?? []) {
            keys.append((cardID: path.id, matchKey: path.title))
        }
        let matches = TikoMediaMatcher.match(cards: keys, mediaItems: items)
        tileImages.merge(matches) { _, new in new }
        persistResolvedMedia()
        for url in matches.values {
            _ = await TikoRemoteImageCache.shared.image(for: url)
        }
    }

    private var mediaKey: String { "tiko.sum.ios.resolvedMedia" }

    private func loadResolvedMedia() {
        guard let data = defaults.data(forKey: mediaKey),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return }
        tileImages = decoded.compactMapValues(URL.init(string:))
    }

    private func persistResolvedMedia() {
        if let data = try? JSONEncoder().encode(tileImages.mapValues(\.absoluteString)) {
            defaults.set(data, forKey: mediaKey)
        }
    }

    // MARK: - Reading

    func visiblePaths(language: String) -> [SumPath] {
        allPaths(language: language).filter { !$0.isHidden }
    }

    func allPaths(language: String) -> [SumPath] {
        (paths[TikoLanguageCode.normalized(language)] ?? [])
            .sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
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
        title: String,
        emoji: String,
        formulas: [Formula]
    ) {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let validFormulas = formulas.filter(\.isValid)
        guard !trimmedTitle.isEmpty, !validFormulas.isEmpty,
              let index = pathIndex(id: id, language: lang) else { return }
        paths[lang]![index].title = trimmedTitle
        paths[lang]![index].emoji = emoji
        paths[lang]![index].formulas = validFormulas
        persist()
    }

    func setHidden(_ hidden: Bool, pathID: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        guard let index = pathIndex(id: pathID, language: lang) else { return }
        paths[lang]![index].isHidden = hidden
        persist()
    }

    @discardableResult
    func addPath(language: String, title: String, emoji: String, formulas: [Formula]) -> SumPath? {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let validFormulas = formulas.filter(\.isValid)
        guard !trimmedTitle.isEmpty, !validFormulas.isEmpty else { return nil }
        let order = (allPaths(language: lang).map(\.sortOrder).max() ?? -1) + 1
        let path = SumPath(
            id: "user_\(UUID().uuidString.lowercased())",
            title: trimmedTitle,
            emoji: emoji.isEmpty ? "⭐️" : emoji,
            formulas: validFormulas,
            isHidden: false,
            sortOrder: order
        )
        paths[lang, default: []].append(path)
        persist()
        return path
    }

    func deletePath(id: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        guard pathIndex(id: id, language: lang) != nil else { return }
        paths[lang]?.removeAll { $0.id == id }
        persist()
    }

    func movePath(language: String, fromOffsets: IndexSet, toOffset: Int) {
        let lang = TikoLanguageCode.normalized(language)
        var ordered = allPaths(language: lang)
        ordered.move(fromOffsets: fromOffsets, toOffset: toOffset)
        for (index, path) in ordered.enumerated() {
            if let pathIndex = pathIndex(id: path.id, language: lang) {
                paths[lang]![pathIndex].sortOrder = index
            }
        }
        persist()
    }

    // MARK: - Persistence

    private func pathIndex(id: String, language: String) -> Int? {
        paths[language]?.firstIndex { $0.id == id }
    }

    private var pathsKey: String { "tiko.sum.ios.customPaths.\(subjectIDProvider())" }
    private var wordsKey: String { "tiko.sum.ios.operatorWords.\(subjectIDProvider())" }

    private func load() {
        if let data = defaults.data(forKey: pathsKey),
           let decoded = try? JSONDecoder().decode([String: [SumPath]].self, from: data) {
            paths = decoded
        }
        if let data = defaults.data(forKey: wordsKey),
           let decoded = try? JSONDecoder().decode([String: SumCatalog.OperatorWords].self, from: data) {
            operatorWords = decoded
        }
    }

    private func persist() {
        write(paths.compactMapValues { $0.isEmpty ? nil : $0 }, to: pathsKey)
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
