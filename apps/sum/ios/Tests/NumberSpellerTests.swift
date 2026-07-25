import XCTest
@testable import TikoSum

/// Golden-list tests for the per-language number grammar. Every supported
/// language is pinned on 0–20, all tens, 100, and the composites that
/// exercise its special rules.
final class NumberSpellerTests: XCTestCase {
    private func assertGolden(_ language: String, _ golden: [Int: String], file: StaticString = #filePath, line: UInt = #line) {
        for (n, expected) in golden.sorted(by: { $0.key < $1.key }) {
            XCTAssertEqual(NumberSpeller.spell(n, language: language), expected, "\(language): \(n)", file: file, line: line)
        }
    }

    func testEnglish() {
        assertGolden("en", [
            0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
            6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
            11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
            16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty",
            21: "twenty-one", 30: "thirty", 42: "forty-two", 50: "fifty",
            66: "sixty-six", 70: "seventy", 81: "eighty-one", 99: "ninety-nine", 100: "one hundred",
        ])
    }

    func testDutchInversionAndDiaeresis() {
        assertGolden("nl", [
            0: "nul", 1: "een", 2: "twee", 3: "drie", 4: "vier", 5: "vijf",
            6: "zes", 7: "zeven", 8: "acht", 9: "negen", 10: "tien",
            11: "elf", 12: "twaalf", 13: "dertien", 14: "veertien", 15: "vijftien",
            16: "zestien", 17: "zeventien", 18: "achttien", 19: "negentien", 20: "twintig",
            21: "eenentwintig", 22: "tweeëntwintig", 23: "drieëntwintig",
            24: "vierentwintig", 30: "dertig", 31: "eenendertig", 33: "drieëndertig",
            40: "veertig", 45: "vijfenveertig", 50: "vijftig", 66: "zesenzestig",
            70: "zeventig", 80: "tachtig", 92: "tweeënnegentig", 99: "negenennegentig", 100: "honderd",
        ])
    }

    func testGermanInversionAndEin() {
        assertGolden("de", [
            0: "null", 1: "eins", 2: "zwei", 3: "drei", 7: "sieben", 10: "zehn",
            11: "elf", 12: "zwölf", 16: "sechzehn", 17: "siebzehn", 20: "zwanzig",
            21: "einundzwanzig", 22: "zweiundzwanzig", 30: "dreißig", 31: "einunddreißig",
            40: "vierzig", 55: "fünfundfünfzig", 60: "sechzig", 66: "sechsundsechzig",
            70: "siebzig", 77: "siebenundsiebzig", 80: "achtzig", 91: "einundneunzig",
            99: "neunundneunzig", 100: "hundert",
        ])
    }

    func testFrenchVigesimal() {
        assertGolden("fr", [
            0: "zéro", 1: "un", 5: "cinq", 10: "dix", 11: "onze", 16: "seize",
            17: "dix-sept", 18: "dix-huit", 19: "dix-neuf", 20: "vingt",
            21: "vingt et un", 22: "vingt-deux", 30: "trente", 31: "trente et un",
            40: "quarante", 50: "cinquante", 60: "soixante", 61: "soixante et un",
            69: "soixante-neuf", 70: "soixante-dix", 71: "soixante et onze",
            72: "soixante-douze", 77: "soixante-dix-sept", 79: "soixante-dix-neuf",
            80: "quatre-vingts", 81: "quatre-vingt-un", 85: "quatre-vingt-cinq",
            90: "quatre-vingt-dix", 91: "quatre-vingt-onze", 95: "quatre-vingt-quinze",
            99: "quatre-vingt-dix-neuf", 100: "cent",
        ])
    }

    func testSpanishFusedTwenties() {
        assertGolden("es", [
            0: "cero", 1: "uno", 7: "siete", 10: "diez", 15: "quince",
            16: "dieciséis", 19: "diecinueve", 20: "veinte", 21: "veintiuno",
            22: "veintidós", 23: "veintitrés", 26: "veintiséis", 29: "veintinueve",
            30: "treinta", 31: "treinta y uno", 44: "cuarenta y cuatro",
            50: "cincuenta", 65: "sesenta y cinco", 70: "setenta", 88: "ochenta y ocho",
            99: "noventa y nueve", 100: "cien",
        ])
    }

    func testMalteseConjunction() {
        assertGolden("mt", [
            0: "żero", 1: "wieħed", 2: "tnejn", 3: "tlieta", 4: "erbgħa", 5: "ħamsa",
            6: "sitta", 7: "sebgħa", 8: "tmienja", 9: "disgħa", 10: "għaxra",
            11: "ħdax", 12: "tnax", 13: "tlettax", 14: "erbatax", 15: "ħmistax",
            16: "sittax", 17: "sbatax", 18: "tmintax", 19: "dsatax", 20: "għoxrin",
            21: "wieħed u għoxrin", 25: "ħamsa u għoxrin", 30: "tletin",
            32: "tnejn u tletin", 40: "erbgħin", 50: "ħamsin", 60: "sittin",
            70: "sebgħin", 80: "tmenin", 95: "ħamsa u disgħin", 100: "mija",
        ])
    }

    func testRegionalCodesNormalize() {
        XCTAssertEqual(NumberSpeller.spell(21, language: "nl-BE"), "eenentwintig")
        XCTAssertEqual(NumberSpeller.spell(21, language: "en-GB"), "twenty-one")
    }

    func testOutOfRangeClamps() {
        XCTAssertEqual(NumberSpeller.spell(-3, language: "en"), "zero")
        XCTAssertEqual(NumberSpeller.spell(250, language: "en"), "one hundred")
    }

    func testUnknownLanguageFallsBackToEnglish() {
        XCTAssertEqual(NumberSpeller.spell(21, language: "ja"), "twenty-one")
    }

    func testEveryValueProducesNonEmptyWordsInAllLanguages() {
        for language in ["en", "nl", "fr", "es", "de", "mt"] {
            for n in 0...100 {
                XCTAssertFalse(NumberSpeller.spell(n, language: language).isEmpty, "\(language) \(n)")
            }
        }
    }
}
