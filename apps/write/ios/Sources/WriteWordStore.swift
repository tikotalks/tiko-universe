import Foundation
import TikoCore
import TikoKit

/// The words a child can write.
///
/// Three sources, in the order a child meets them: the bundled starter list so
/// there is something to trace before any adult sets anything up, words that
/// match a picture already in the app so the writing attaches to something known,
/// and whatever a parent types — which is what "write your own name" actually is.
@MainActor
final class WriteWordStore: ObservableObject {

    struct Word: Identifiable, Equatable {
        let id: String
        let text: String
        /// A shape in the shapes pack that pictures this word, if there is one.
        let shapeId: String?
        let glyphIDs: [String]
        let isCustom: Bool
    }

    @Published private(set) var words: [Word] = []

    private var bundled: [String: [Word]] = [:]
    private let defaults: UserDefaults
    private let subjectID: () -> String

    init(
        bundle: Bundle = .main,
        defaults: UserDefaults = .standard,
        subjectID: @escaping () -> String = {
            (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        }
    ) {
        self.defaults = defaults
        self.subjectID = subjectID
        loadBundled(from: bundle)
    }

    /// Bundled words for [language] plus the family's own, custom first — a
    /// child's own name should not be at the bottom of a list.
    func refresh(language: String) {
        let own = customWords()
        let base = bundled[language] ?? bundled["en"] ?? []
        words = own + base.filter { w in !own.contains { $0.text.lowercased() == w.text.lowercased() } }
    }

    // MARK: - Custom words

    /// Adds a word a parent typed. Returns nil when it cannot be written with
    /// the letters the app has, rather than silently dropping characters.
    @discardableResult
    func addCustom(_ raw: String) -> Word? {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, text.count <= 16 else { return nil }
        guard let ids = Self.glyphIDs(for: text) else { return nil }

        var stored = storedCustom()
        let key = text.lowercased()
        guard !stored.contains(where: { $0.lowercased() == key }) else { return nil }
        stored.insert(text, at: 0)
        defaults.set(stored, forKey: customKey)
        return Word(id: "custom-\(key)", text: text, shapeId: nil, glyphIDs: ids, isCustom: true)
    }

    func removeCustom(_ word: Word) {
        defaults.set(
            storedCustom().filter { $0.lowercased() != word.text.lowercased() },
            forKey: customKey
        )
    }

    /// Letter glyph ids for a word, or nil if any character has no glyph.
    /// Accents and punctuation are rejected rather than approximated: a child
    /// tracing "José" should not be handed "Jose".
    static func glyphIDs(for text: String) -> [String]? {
        var ids: [String] = []
        for character in text.lowercased() {
            if character == " " { continue }
            guard let ascii = character.asciiValue,
                  ascii >= UInt8(ascii: "a"), ascii <= UInt8(ascii: "z") else { return nil }
            ids.append("lower-\(character)")
        }
        return ids.isEmpty ? nil : ids
    }

    private var customKey: String { "tiko.write.words.\(subjectID())" }

    private func storedCustom() -> [String] {
        defaults.stringArray(forKey: customKey) ?? []
    }

    private func customWords() -> [Word] {
        storedCustom().compactMap { text in
            guard let ids = Self.glyphIDs(for: text) else { return nil }
            return Word(
                id: "custom-\(text.lowercased())", text: text,
                shapeId: nil, glyphIDs: ids, isCustom: true
            )
        }
    }

    // MARK: - Bundled

    private func loadBundled(from bundle: Bundle) {
        struct Entry: Decodable {
            let id: String
            let text: String
            let shapeId: String?
            let glyphIds: [String]
        }
        struct Doc: Decodable { let locale: String; let words: [Entry] }

        for locale in ["en", "nl", "de", "fr", "es", "mt"] {
            guard let url = bundle.url(forResource: locale, withExtension: "json", subdirectory: "source/words")
                ?? bundle.url(forResource: locale, withExtension: "json", subdirectory: "words"),
                  let data = try? Data(contentsOf: url),
                  let doc = try? JSONDecoder().decode(Doc.self, from: data) else { continue }
            bundled[doc.locale] = doc.words.map {
                Word(id: $0.id, text: $0.text, shapeId: $0.shapeId, glyphIDs: $0.glyphIds, isCustom: false)
            }
        }
    }
}
