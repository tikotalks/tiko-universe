import Foundation

// Local translation bundles for Tiko Write. Remote translations from the
// translations worker override these at runtime, exactly like the other apps.
/// Six languages minimum, as localized data rather than
/// code branches — the glyph names and phonics live in the packs, not here.
extension TikoLocalTranslations {
    private static let writeEN: [String: String] = [
        "write.appName": "Write",
        "write.group.lines": "Lines",
        "write.group.shapes": "Shapes",
        "write.group.numbers": "Numbers",
        "write.group.uppercase": "Big letters",
        "write.group.lowercase": "Small letters",
        "write.action.again": "Again",
        "write.action.next": "Next",
    ]
    private static let writeNL: [String: String] = [
        "write.appName": "Schrijf",
        "write.group.lines": "Lijnen",
        "write.group.shapes": "Vormen",
        "write.group.numbers": "Cijfers",
        "write.group.uppercase": "Grote letters",
        "write.group.lowercase": "Kleine letters",
        "write.action.again": "Nog een keer",
        "write.action.next": "Verder",
    ]
    private static let writeFR: [String: String] = [
        "write.appName": "Écris",
        "write.group.lines": "Lignes",
        "write.group.shapes": "Formes",
        "write.group.numbers": "Chiffres",
        "write.group.uppercase": "Grandes lettres",
        "write.group.lowercase": "Petites lettres",
        "write.action.again": "Encore",
        "write.action.next": "Suivant",
    ]
    private static let writeES: [String: String] = [
        "write.appName": "Escribe",
        "write.group.lines": "Líneas",
        "write.group.shapes": "Formas",
        "write.group.numbers": "Números",
        "write.group.uppercase": "Letras grandes",
        "write.group.lowercase": "Letras pequeñas",
        "write.action.again": "Otra vez",
        "write.action.next": "Siguiente",
    ]
    private static let writeDE: [String: String] = [
        "write.appName": "Schreib",
        "write.group.lines": "Linien",
        "write.group.shapes": "Formen",
        "write.group.numbers": "Zahlen",
        "write.group.uppercase": "Große Buchstaben",
        "write.group.lowercase": "Kleine Buchstaben",
        "write.action.again": "Nochmal",
        "write.action.next": "Weiter",
    ]
    private static let writeMT: [String: String] = [
        "write.appName": "Ikteb",
        "write.group.lines": "Linji",
        "write.group.shapes": "Forom",
        "write.group.numbers": "Numri",
        "write.group.uppercase": "Ittri kbar",
        "write.group.lowercase": "Ittri żgħar",
        "write.action.again": "Erġa'",
        "write.action.next": "Li jmiss",
    ]

    static var writeBundles: [(String, [String: String])] {
        [("en", writeEN), ("nl", writeNL), ("fr", writeFR), ("es", writeES), ("de", writeDE), ("mt", writeMT)]
    }
}
