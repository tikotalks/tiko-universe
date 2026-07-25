import Foundation
import TikoKit

/// The single content source for routines. Bundled defaults merged with
/// per-language `RoutineOverride`s and custom routines, scoped to the active
/// account subject — the family override pattern, same as Say and Sum.
@MainActor
final class FirstStore: ObservableObject {
    @Published private(set) var revision = 0
    /// Tiko media-library images for routine tiles and steps, keyed by routine
    /// or step ID. The emoji is always the fallback.
    @Published private(set) var images: [String: URL] = [:]

    private let defaults: UserDefaults
    private let subjectIDProvider: () -> String
    /// language → routineID → override
    private var overrides: [String: [String: RoutineOverride]] = [:]
    /// language → custom routines
    private var customRoutines: [String: [Routine]] = [:]

    private let mediaClient: TikoMediaClient
    private var hydratedMedia = false

    init(
        defaults: UserDefaults = .standard,
        mediaClient: TikoMediaClient = TikoMediaClient(),
        subjectIDProvider: @escaping () -> String = {
            (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        }
    ) {
        self.defaults = defaults
        self.mediaClient = mediaClient
        self.subjectIDProvider = subjectIDProvider
        load()
        loadResolvedMedia()
    }

    // MARK: - Reading

    func visibleRoutines(language: String) -> [Routine] {
        allRoutines(language: language).filter { !$0.isHidden }
    }

    func allRoutines(language: String) -> [Routine] {
        let lang = TikoLanguageCode.normalized(language)
        let langOverrides = overrides[lang] ?? [:]
        var merged = FirstCatalog.defaultRoutines.map { definition -> Routine in
            var routine = FirstCatalog.routine(definition, language: lang)
            guard let override = langOverrides[routine.id] else { return routine }
            if let title = override.title { routine.title = title }
            if let emoji = override.emoji { routine.emoji = emoji }
            if let steps = override.steps { routine.steps = steps }
            if let dailyReset = override.dailyReset { routine.dailyReset = dailyReset }
            if let allowSkip = override.allowSkip { routine.allowSkip = allowSkip }
            if let isPinned = override.isPinned { routine.isPinned = isPinned }
            if let order = override.sortOrder { routine.sortOrder = order }
            routine.isHidden = override.isHidden
            return routine
        }
        merged.append(contentsOf: customRoutines[lang] ?? [])
        return merged.sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
    }

    func routine(id: String, language: String) -> Routine? {
        allRoutines(language: language).first { $0.id == id }
    }

    /// The routine a parent pinned as "current", if it is still visible.
    func pinnedRoutine(language: String) -> Routine? {
        visibleRoutines(language: language).first { $0.isPinned }
    }

    func isEdited(routineID: String, language: String) -> Bool {
        overrides[TikoLanguageCode.normalized(language)]?[routineID] != nil
    }

    // MARK: - Editing routines

    func updateRoutine(
        id: String,
        language: String,
        title: String,
        emoji: String,
        steps: [RoutineStep]
    ) {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedSteps = Self.cleaned(steps)
        guard !trimmedTitle.isEmpty, !cleanedSteps.isEmpty else { return }

        if let index = customIndex(id: id, language: lang) {
            customRoutines[lang]![index].title = trimmedTitle
            customRoutines[lang]![index].emoji = emoji
            customRoutines[lang]![index].steps = cleanedSteps
            persist()
            return
        }

        guard let definition = FirstCatalog.defaultRoutines.first(where: { $0.id == id }) else { return }
        let bundled = FirstCatalog.routine(definition, language: lang)
        var override = overrides[lang]?[id] ?? RoutineOverride(routineID: id, languageCode: lang)
        override.title = trimmedTitle == bundled.title ? nil : trimmedTitle
        override.emoji = emoji == bundled.emoji ? nil : emoji
        override.steps = cleanedSteps == bundled.orderedSteps ? nil : cleanedSteps
        setOverride(override, language: lang)
    }

    func setRoutineSettings(
        id: String,
        language: String,
        dailyReset: Bool? = nil,
        allowSkip: Bool? = nil,
        isPinned: Bool? = nil
    ) {
        let lang = TikoLanguageCode.normalized(language)

        // Pinning is exclusive: only one routine opens first.
        if isPinned == true {
            for routine in allRoutines(language: lang) where routine.id != id && routine.isPinned {
                clearPin(routineID: routine.id, language: lang)
            }
        }

        if let index = customIndex(id: id, language: lang) {
            if let dailyReset { customRoutines[lang]![index].dailyReset = dailyReset }
            if let allowSkip { customRoutines[lang]![index].allowSkip = allowSkip }
            if let isPinned { customRoutines[lang]![index].isPinned = isPinned }
            persist()
            return
        }

        guard let definition = FirstCatalog.defaultRoutines.first(where: { $0.id == id }) else { return }
        let bundled = FirstCatalog.routine(definition, language: lang)
        var override = overrides[lang]?[id] ?? RoutineOverride(routineID: id, languageCode: lang)
        if let dailyReset { override.dailyReset = dailyReset == bundled.dailyReset ? nil : dailyReset }
        if let allowSkip { override.allowSkip = allowSkip == bundled.allowSkip ? nil : allowSkip }
        if let isPinned { override.isPinned = isPinned == bundled.isPinned ? nil : isPinned }
        setOverride(override, language: lang)
    }

    private func clearPin(routineID: String, language: String) {
        if let index = customIndex(id: routineID, language: language) {
            customRoutines[language]![index].isPinned = false
            return
        }
        guard var override = overrides[language]?[routineID] else { return }
        override.isPinned = nil
        if override.isEmpty {
            overrides[language]?.removeValue(forKey: routineID)
        } else {
            overrides[language]?[routineID] = override
        }
    }

    func setHidden(_ hidden: Bool, routineID: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        if let index = customIndex(id: routineID, language: lang) {
            customRoutines[lang]![index].isHidden = hidden
            persist()
            return
        }
        var override = overrides[lang]?[routineID] ?? RoutineOverride(routineID: routineID, languageCode: lang)
        override.isHidden = hidden
        setOverride(override, language: lang)
    }

    func resetToDefault(routineID: String, language: String) {
        overrides[TikoLanguageCode.normalized(language)]?.removeValue(forKey: routineID)
        persist()
    }

    @discardableResult
    func addCustomRoutine(
        language: String,
        title: String,
        emoji: String,
        steps: [RoutineStep]
    ) -> Routine? {
        let lang = TikoLanguageCode.normalized(language)
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedSteps = Self.cleaned(steps)
        guard !trimmedTitle.isEmpty, !cleanedSteps.isEmpty else { return nil }
        let order = (allRoutines(language: lang).map(\.sortOrder).max() ?? -1) + 1
        let routine = Routine(
            id: "user_\(UUID().uuidString.lowercased())",
            title: trimmedTitle,
            emoji: emoji.isEmpty ? "⭐️" : emoji,
            imageURL: nil,
            steps: cleanedSteps,
            dailyReset: false,
            allowSkip: false,
            isPinned: false,
            isCustom: true,
            isHidden: false,
            sortOrder: order
        )
        customRoutines[lang, default: []].append(routine)
        persist()
        return routine
    }

    /// One-tap duplicate — the point of the bundled first/then template.
    @discardableResult
    func duplicateRoutine(id: String, language: String) -> Routine? {
        let lang = TikoLanguageCode.normalized(language)
        guard let source = routine(id: id, language: lang) else { return nil }
        let steps = source.orderedSteps.enumerated().map { index, step in
            RoutineStep(
                id: "step_\(UUID().uuidString.lowercased())",
                title: step.title,
                speakText: step.speakText,
                emoji: step.emoji,
                imageURL: step.imageURL,
                sortOrder: index
            )
        }
        return addCustomRoutine(language: lang, title: source.title, emoji: source.emoji, steps: steps)
    }

    func deleteCustomRoutine(id: String, language: String) {
        let lang = TikoLanguageCode.normalized(language)
        guard customIndex(id: id, language: lang) != nil else { return }
        customRoutines[lang]?.removeAll { $0.id == id }
        persist()
    }

    func moveRoutine(language: String, fromOffsets: IndexSet, toOffset: Int) {
        let lang = TikoLanguageCode.normalized(language)
        var routines = allRoutines(language: lang)
        routines.move(fromOffsets: fromOffsets, toOffset: toOffset)
        for (index, routine) in routines.enumerated() where routine.sortOrder != index {
            if let customIdx = customIndex(id: routine.id, language: lang) {
                customRoutines[lang]![customIdx].sortOrder = index
            } else {
                var override = overrides[lang]?[routine.id] ?? RoutineOverride(routineID: routine.id, languageCode: lang)
                override.sortOrder = index
                overrides[lang, default: [:]][routine.id] = override.isEmpty ? nil : override
            }
        }
        persist()
    }

    // MARK: - Media

    /// Resolves Tiko media images for routine tiles and steps and remembers the
    /// URLs so later launches render instantly and offline. Routine content is
    /// spread across media folders, so each key is resolved by search.
    func hydrateMedia(language: String) async {
        guard !hydratedMedia else { return }
        hydratedMedia = true

        var resolved: [String: URL] = [:]
        // One request per distinct key, not per usage — "toothbrush" appears in
        // both the morning and bedtime routines.
        var byKey: [String: [String]] = [:]
        for entry in FirstCatalog.mediaMatchKeys where images[entry.id] == nil {
            byKey[entry.matchKey, default: []].append(entry.id)
        }
        for (key, ids) in byKey {
            guard let items = try? await mediaClient.searchMedia(query: key), !items.isEmpty else { continue }
            let match = TikoMediaMatcher.match(cards: [(cardID: key, matchKey: key)], mediaItems: items)
            guard let url = match[key] ?? items.first.map({ TikoMediaMatcher.resizedCDNURL($0.originalURL) }) else { continue }
            for id in ids {
                resolved[id] = url
            }
        }

        guard !resolved.isEmpty else {
            hydratedMedia = false
            return
        }
        images.merge(resolved) { _, new in new }
        persistResolvedMedia()
        for url in resolved.values {
            _ = await TikoRemoteImageCache.shared.image(for: url)
        }
    }

    func image(for id: String) -> URL? { images[id] }

    private var mediaKey: String { "tiko.first.ios.resolvedMedia" }

    private func loadResolvedMedia() {
        guard let data = defaults.data(forKey: mediaKey),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return }
        images = decoded.compactMapValues(URL.init(string:))
    }

    private func persistResolvedMedia() {
        if let data = try? JSONEncoder().encode(images.mapValues(\.absoluteString)) {
            defaults.set(data, forKey: mediaKey)
        }
    }

    // MARK: - Persistence

    /// Drops blank steps and renumbers, so a half-filled parent form can never
    /// produce a routine with an empty step in it.
    private static func cleaned(_ steps: [RoutineStep]) -> [RoutineStep] {
        steps
            .filter { !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .enumerated()
            .map { index, step in
                var step = step
                step.sortOrder = index
                return step
            }
    }

    private func customIndex(id: String, language: String) -> Int? {
        customRoutines[language]?.firstIndex { $0.id == id }
    }

    private func setOverride(_ override: RoutineOverride, language: String) {
        if override.isEmpty {
            overrides[language]?.removeValue(forKey: override.routineID)
        } else {
            overrides[language, default: [:]][override.routineID] = override
        }
        persist()
    }

    private var overridesKey: String { "tiko.first.ios.routineOverrides.\(subjectIDProvider())" }
    private var customKey: String { "tiko.first.ios.customRoutines.\(subjectIDProvider())" }

    private func load() {
        if let data = defaults.data(forKey: overridesKey),
           let decoded = try? JSONDecoder().decode([String: [String: RoutineOverride]].self, from: data) {
            overrides = decoded
        }
        if let data = defaults.data(forKey: customKey),
           let decoded = try? JSONDecoder().decode([String: [Routine]].self, from: data) {
            customRoutines = decoded
        }
    }

    private func persist() {
        overrides = overrides.compactMapValues { $0.isEmpty ? nil : $0 }
        write(overrides, to: overridesKey)
        write(customRoutines.compactMapValues { $0.isEmpty ? nil : $0 }, to: customKey)
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
