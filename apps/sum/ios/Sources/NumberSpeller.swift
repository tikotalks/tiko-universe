import Foundation
import TikoKit

/// Spells 0–100 as correct number words per supported language. This is real
/// per-language grammar — inversion (nl/de), diaeresis (nl), "ein" vs "eins"
/// (de), the French vigesimal system, Spanish fused twenties, and the Maltese
/// unit-u-tens conjunction — implemented as data-driven rules and covered by
/// golden-list unit tests.
enum NumberSpeller {
    static func spell(_ n: Int, language: String) -> String {
        let value = max(0, min(100, n))
        switch TikoLanguageCode.normalized(language) {
        case "nl": return dutch(value)
        case "fr": return french(value)
        case "es": return spanish(value)
        case "de": return german(value)
        case "mt": return maltese(value)
        default: return english(value)
        }
    }

    // MARK: - English

    private static let enUnits = [
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
        "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
        "seventeen", "eighteen", "nineteen",
    ]
    private static let enTens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

    private static func english(_ n: Int) -> String {
        if n == 100 { return "one hundred" }
        if n < 20 { return enUnits[n] }
        let tens = enTens[n / 10]
        let unit = n % 10
        return unit == 0 ? tens : "\(tens)-\(enUnits[unit])"
    }

    // MARK: - Dutch (inverted: unit + en/ën + tens)

    private static let nlUnits = [
        "nul", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen",
        "tien", "elf", "twaalf", "dertien", "veertien", "vijftien", "zestien",
        "zeventien", "achttien", "negentien",
    ]
    private static let nlTens = ["", "", "twintig", "dertig", "veertig", "vijftig", "zestig", "zeventig", "tachtig", "negentig"]

    private static func dutch(_ n: Int) -> String {
        if n == 100 { return "honderd" }
        if n < 20 { return nlUnits[n] }
        let tens = nlTens[n / 10]
        let unit = n % 10
        guard unit != 0 else { return tens }
        // "twee" and "drie" end in a vowel that collides with "en" → "ën".
        let joiner = nlUnits[unit].hasSuffix("e") ? "ën" : "en"
        return "\(nlUnits[unit])\(joiner)\(tens)"
    }

    // MARK: - German (inverted: unit + und + tens, "ein" in compounds)

    private static let deUnits = [
        "null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
        "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn",
        "siebzehn", "achtzehn", "neunzehn",
    ]
    private static let deTens = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"]

    private static func german(_ n: Int) -> String {
        if n == 100 { return "hundert" }
        if n < 20 { return deUnits[n] }
        let tens = deTens[n / 10]
        let unit = n % 10
        guard unit != 0 else { return tens }
        let unitWord = unit == 1 ? "ein" : deUnits[unit]
        return "\(unitWord)und\(tens)"
    }

    // MARK: - French (vigesimal 70/80/90)

    private static let frUnits = [
        "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
        "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
        "dix-sept", "dix-huit", "dix-neuf",
    ]
    private static let frTens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"]

    private static func french(_ n: Int) -> String {
        if n == 100 { return "cent" }
        if n < 20 { return frUnits[n] }
        switch n {
        case 20...69:
            let tens = frTens[n / 10]
            let unit = n % 10
            if unit == 0 { return tens }
            if unit == 1 { return "\(tens) et un" }
            return "\(tens)-\(frUnits[unit])"
        case 70...79:
            // soixante-dix … soixante-dix-neuf (60 + 10…19), 71 = soixante et onze
            if n == 71 { return "soixante et onze" }
            return "soixante-\(frUnits[n - 60])"
        case 80:
            return "quatre-vingts"
        case 81...99:
            // quatre-vingt-un … quatre-vingt-dix-neuf (no "et", no trailing s)
            return "quatre-vingt-\(frUnits[n - 80])"
        default:
            return frUnits[0]
        }
    }

    // MARK: - Spanish (fused twenties, "y" from thirty)

    private static let esUnits = [
        "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
        "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
        "diecisiete", "dieciocho", "diecinueve",
    ]
    private static let esTwenties = [
        "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
        "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
    ]
    private static let esTens = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]

    private static func spanish(_ n: Int) -> String {
        if n == 100 { return "cien" }
        if n < 20 { return esUnits[n] }
        if n < 30 { return esTwenties[n - 20] }
        let tens = esTens[n / 10]
        let unit = n % 10
        return unit == 0 ? tens : "\(tens) y \(esUnits[unit])"
    }

    // MARK: - Maltese (unit u tens)

    private static let mtUnits = [
        "żero", "wieħed", "tnejn", "tlieta", "erbgħa", "ħamsa", "sitta", "sebgħa", "tmienja", "disgħa",
        "għaxra", "ħdax", "tnax", "tlettax", "erbatax", "ħmistax", "sittax",
        "sbatax", "tmintax", "dsatax",
    ]
    private static let mtTens = ["", "", "għoxrin", "tletin", "erbgħin", "ħamsin", "sittin", "sebgħin", "tmenin", "disgħin"]

    private static func maltese(_ n: Int) -> String {
        if n == 100 { return "mija" }
        if n < 20 { return mtUnits[n] }
        let tens = mtTens[n / 10]
        let unit = n % 10
        return unit == 0 ? tens : "\(mtUnits[unit]) u \(tens)"
    }
}
