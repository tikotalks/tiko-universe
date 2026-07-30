import Foundation
import TikoCore

/// The glyph packs, loaded from the app bundle.
///
/// Bundled rather than fetched, so Write opens and works with no network at all
/// — the design principles require the app to be usable offline after first use,
/// and for a tracing app "first use" should not need a connection either. Remote
/// packs layer on top later (TIKO-035 serves them); the bundle is the floor.
@MainActor
final class WriteGlyphStore: ObservableObject {

    struct Group: Identifiable, Hashable {
        let id: String
        let packId: String
        let sortOrder: Int
        let glyphIDs: [String]
    }

    @Published private(set) var groups: [Group] = []
    @Published private(set) var loadError: String?

    private var packs: [String: GlyphPack] = [:]
    private var glyphIndex: [String: Glyph] = [:]

    /// Presentation order across packs: shapes first, then numbers, then letters.
    private static let packOrder = ["shapes", "numbers-latin", "print-latin"]

    init(bundle: Bundle = .main) {
        load(from: bundle)
    }

    private func load(from bundle: Bundle) {
        var loadedGroups: [Group] = []
        var failures: [String] = []

        for packId in Self.packOrder {
            guard let url = Self.packURL(named: packId, in: bundle) else {
                failures.append("\(packId): not in bundle")
                continue
            }
            do {
                let json = try String(contentsOf: url, encoding: .utf8)
                let pack = try engineLoad(json)
                packs[packId] = pack

                var byGroup: [String: [(Int, String)]] = [:]
                for i in 0..<Int(pack.glyphCount) {
                    let glyph = pack.glyphAt(index: Int32(i))
                    glyphIndex[Self.key(packId, glyph.id)] = glyph
                    byGroup[glyph.groupId, default: []].append((Int(glyph.sortOrder), glyph.id))
                }
                for (groupId, entries) in byGroup {
                    loadedGroups.append(
                        Group(
                            id: Self.key(packId, groupId),
                            packId: packId,
                            sortOrder: (Self.packOrder.firstIndex(of: packId) ?? 0) * 100
                                + (entries.map(\.0).min() ?? 0),
                            glyphIDs: entries.sorted { $0.0 < $1.0 }.map(\.1)
                        )
                    )
                }
            } catch {
                failures.append("\(packId): \(error.localizedDescription)")
            }
        }

        groups = loadedGroups.sorted { $0.sortOrder < $1.sortOrder }
        // A pack that fails to decode is surfaced rather than swallowed: an empty
        // grid with no explanation is the worst possible failure here.
        loadError = failures.isEmpty ? nil : failures.joined(separator: "; ")
    }

    /// Wraps the engine's throwing decode, which arrives as an NSException-backed
    /// error across the Kotlin/Native bridge.
    private func engineLoad(_ json: String) throws -> GlyphPack {
        StrokeCore.shared.loadPack(json: json)
    }

    func glyph(packId: String, glyphID: String) -> Glyph? {
        glyphIndex[Self.key(packId, glyphID)]
    }

    func pack(_ packId: String) -> GlyphPack? { packs[packId] }

    /// Localized group title key, e.g. `write.group.uppercase`.
    static func groupTitleKey(_ groupId: String) -> String {
        "write.group." + (groupId.split(separator: "/").last.map(String.init) ?? groupId)
    }

    private static func key(_ packId: String, _ id: String) -> String { "\(packId)/\(id)" }

    private static func packURL(named packId: String, in bundle: Bundle) -> URL? {
        // XcodeGen bundles the pack folder, so the files sit in a subdirectory.
        bundle.url(forResource: packId, withExtension: "json", subdirectory: "source")
            ?? bundle.url(forResource: packId, withExtension: "json")
    }
}
