import Foundation
import TikoKit

/// What to call a geographic entity, and what to say out loud.
///
/// Identity is the entity's id; the English name in the geography data is a
/// fallback for when a translation is missing, never the identity itself. The
/// spoken form is asked for separately, because an entity may later carry a
/// pronunciation that differs from what is written — "Ħaġar Qim" is the obvious
/// case.
@MainActor
enum GlobeNaming {
    static func displayName(for entity: GlobeEntity, i18n: TikoI18n) -> String {
        let translated = i18n.t(entity.translationKey)
        // TikoI18n hands back the key itself when it has no translation.
        return translated == entity.translationKey ? entity.fallbackName : translated
    }

    /// What the voice says. Falls back to the written name, and takes a
    /// pronunciation override the moment the data starts carrying one.
    static func spokenName(for entity: GlobeEntity, i18n: TikoI18n) -> String {
        let spokenKey = "\(entity.translationKey).spoken"
        let spoken = i18n.t(spokenKey)
        return spoken == spokenKey ? displayName(for: entity, i18n: i18n) : spoken
    }
}
