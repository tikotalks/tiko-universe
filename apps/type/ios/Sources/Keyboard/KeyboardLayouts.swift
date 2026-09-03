import Foundation

// MARK: - How big a key is

/// How large the keys are drawn.
///
/// A preset rather than a slider: the thing being chosen is "can this person hit it",
/// and four named answers are easier to pick from than a continuum. Every size stays
/// well above the 44pt platform touch floor.
enum TypeKeySize: String, CaseIterable, Identifiable, Sendable {
    case small, standard, large, extraLarge

    var id: String { rawValue }

    var label: String {
        switch self {
        case .small: "Small"
        case .standard: "Standard"
        case .large: "Large"
        case .extraLarge: "Extra large"
        }
    }
}

// MARK: - The arrangements

/// A keyboard arrangement.
///
/// The five Type already offered, plus the two the arrangement engine makes possible:
/// `familiar`, which follows the language, and `large`, which is fewer and bigger keys.
enum TypeKeyboardLayout: String, CaseIterable, Identifiable, Sendable {
    /// Whichever named arrangement this language's typists actually use.
    case familiar
    case qwerty
    case azerty
    case qwertz
    /// ЙЦУКЕН, the Russian arrangement.
    case jcuken
    case dvorak
    /// The alphabet in its own order, eight to a row.
    case abc
    /// Fewer, larger keys: five to a row, and only the marks a spoken sentence needs.
    case large

    var id: String { rawValue }

    var label: String {
        switch self {
        case .familiar: "Familiar"
        case .qwerty: "QWERTY"
        case .azerty: "AZERTY"
        case .qwertz: "QWERTZ"
        case .jcuken: "ЙЦУКЕН"
        case .dvorak: "Dvorak"
        case .abc: "ABC"
        case .large: "Large keys"
        }
    }

    /// The named arrangement the typists of a language actually use.
    ///
    /// Armenian answers `abc`, and that is not a shrug: Tiko ships no Armenian
    /// arrangement, and the alphabet in its own order is a complete Armenian keyboard.
    static func familiarArrangement(forLanguageCode code: String) -> TypeKeyboardLayout {
        switch String(code.split(separator: "-").first ?? "").lowercased() {
        case "de": .qwertz
        case "fr": .azerty
        // Only Russian: ЙЦУКЕН is a Cyrillic arrangement, and offering it to a language
        // whose alphabet this app does not yet ship would hand that person a keyboard
        // with none of their letters on it.
        case "ru": .jcuken
        case "hy": .abc
        default: .qwerty
        }
    }

    /// What this arrangement actually is, for a given language.
    func resolved(forLanguageCode code: String) -> TypeKeyboardLayout {
        self == .familiar ? Self.familiarArrangement(forLanguageCode: code) : self
    }
}

/// The catalogue the settings picker reads.
enum KeyboardLayouts {
    static let all: [TypeKeyboardLayout] = TypeKeyboardLayout.allCases

    /// An unknown stored id falls back to `familiar`, so the keyboard is always
    /// renderable and always one this language's typists recognise.
    static func layout(for id: String) -> TypeKeyboardLayout {
        TypeKeyboardLayout(rawValue: id) ?? .familiar
    }
}

// MARK: - A whole keyboard, as data

/// A whole on-screen keyboard, as data.
///
/// Every arrangement below is rows of ``Key`` drawn by the one ``KeyGrid``, so a new
/// arrangement is an entry here and nothing else. Key size comes from the person's
/// ``TypeKeySize`` preset, exactly as every other target does.
///
/// A keyboard only. The letterboard is not one of these arrangements — it is a copy of a
/// paper object with its own shape and its own sizes, and it lives in
/// ``LetterboardBoard``.
struct KeyboardLayoutDefinition: Hashable {
    var rows: [KeyRow]
    /// Width of the panel in key columns. Every row is exactly this wide, so the keyboard
    /// reaches both edges on every row and no row trails off.
    var totalUnits: Double
    /// Height of one key row.
    var keyHeight: Double
    var titlePointSize: Double

    /// Columns in the alphabetical grid. Ten would be a QWERTY-sized key with none of
    /// QWERTY's familiarity; eight is a key a finger finds.
    static let alphabeticalColumns = 8
    /// Fewer, larger keys.
    static let largeKeyColumns = 5

    static func definition(
        for layout: TypeKeyboardLayout,
        languageCode: String,
        keySize: TypeKeySize,
        enlargedForAccessibilityText: Bool = false,
        isShifted: Bool = false,
        isCompactWidth: Bool = false,
        showingNumbers: Bool = false
    ) -> KeyboardLayoutDefinition {
        // A phone gets the proportions the system keyboard uses, because those are the
        // ones that fit: ten columns of letters, with the marks beside the space bar and
        // the digits behind `123`. Adding a numeral row and three marks to the letter rows
        // takes the width past fourteen columns, and a 25pt key on a 393pt screen is not a
        // key.
        //
        // An iPad has the room, so it keeps both.
        let showsNumerals = !isCompactWidth
        let inlinesPunctuation = !isCompactWidth

        let metrics = metrics(for: layout, keySize: keySize)
        let enlargement = enlargedForAccessibilityText ? 1.25 : 1.0

        let alphabet = KeyboardAlphabet.alphabet(forLanguageCode: languageCode)
        let resolved = layout.resolved(forLanguageCode: languageCode)

        // Whether this arrangement can actually be staggered — not merely whether it asked
        // to be. Armenian asked for QWERTY falls back to the grid, because ten Latin keys
        // are not an Armenian keyboard.
        let letterRows: [String]? = switch resolved {
        case .qwerty, .azerty, .qwertz, .jcuken, .dvorak:
            KeyboardAlphabet.rows(for: resolved, languageCode: languageCode, alphabet: alphabet)
        case .abc, .large, .familiar:
            nil
        }

        var rows: [KeyRow]

        if let letterRows {
            // Behind the `123` key: digits, and the marks that no longer fit beside the
            // space bar. Only reachable where that key exists, which is a phone.
            if showingNumbers, isCompactWidth {
                return KeyboardLayoutDefinition(
                    rows: numbersPageRows(),
                    totalUnits: 10,
                    keyHeight: metrics.height * enlargement,
                    titlePointSize: metrics.title * enlargement
                )
            }
            rows = staggeredRows(
                letterRows: letterRows,
                punctuation: fullPunctuation,
                isShifted: isShifted,
                inlinesPunctuation: inlinesPunctuation,
                usesNumbersKey: isCompactWidth
            )
            // Numerals sit above the letters, as they do on a physical keyboard. Only here:
            // a grid keyboard is narrower than ten columns, and a ten-digit row bolted on
            // top would be wider than every row under it — which breaks the one rule this
            // file has, that a keyboard is a rectangle.
            if showsNumerals, let columns = rows.first?.totalUnits {
                rows = [numeralRow(columns: columns)] + rows.map { row in
                    var shifted = row
                    shifted.id += 1
                    return shifted
                }
            }
        } else {
            // The grids: the alphabet in its own order, and large keys. They carry the
            // `123` key in the flow with the letters rather than on the bottom row, which
            // keeps the space bar the widest thing on that row even at five columns — and
            // means these arrangements reach their digits on every screen size, where a
            // numeral row would only ever fit on an iPad.
            let maxPerRow = resolved == .large ? largeKeyColumns : alphabeticalColumns
            var keys: [Key]
            if showingNumbers {
                keys = numbersPageKeys()
            } else {
                keys = alphabet.letters.map { Key.letter(String($0)) }
                keys += (resolved == .large ? reducedPunctuation : fullPunctuation)
                keys.append(.numbers(showingNumbers: false))
            }
            rows = gridRows(keys: keys, maxPerRow: maxPerRow)
        }

        return KeyboardLayoutDefinition(
            rows: rows,
            totalUnits: rows.first?.totalUnits ?? 0,
            keyHeight: metrics.height * enlargement,
            titlePointSize: metrics.title * enlargement
        )
    }

    // MARK: Sizes

    /// Explicit numbers rather than a factor applied to one base, so a size can be tuned
    /// without moving the other two.
    private static func metrics(
        for layout: TypeKeyboardLayout,
        keySize: TypeKeySize
    ) -> (height: Double, title: Double) {
        switch (layout, keySize) {
        // Small fits more keys on screen, but a key still has to be hittable — this stays
        // well above the 44pt platform floor.
        case (.large, .small): (66, 30)
        case (.large, .standard): (78, 35)
        case (.large, .large): (94, 42)
        case (.large, .extraLarge): (112, 50)
        case (_, .small): (48, 24)
        case (_, .standard): (58, 29)
        case (_, .large): (70, 34)
        case (_, .extraLarge): (84, 40)
        }
    }

    // MARK: Keys

    /// Only the marks a spoken sentence needs. `.`, `?` and `!` also end a sentence.
    static var fullPunctuation: [Key] {
        [
            .punctuation(".", named: "Full stop"),
            .punctuation(",", named: "Comma"),
            .punctuation("?", named: "Question mark"),
            .punctuation("!", named: "Exclamation mark"),
            .punctuation("'", named: "Apostrophe"),
        ]
    }

    static var reducedPunctuation: [Key] {
        [
            .punctuation(".", named: "Full stop"),
            .punctuation("?", named: "Question mark"),
            .punctuation("!", named: "Exclamation mark"),
        ]
    }

    // MARK: The familiar arrangement

    /// QWERTY, QWERTZ, AZERTY, ЙЦУКЕН or Dvorak, laid out the way that keyboard is laid
    /// out.
    ///
    /// The top row sets the width. Every row after it is short by some number of columns,
    /// and *where those columns go* is the whole difference between a keyboard and a table
    /// of letters:
    ///
    /// - the home row splits them, which is the half-key offset a typist reads as "this is
    ///   QWERTY";
    /// - the bottom letter row ends in backspace, so its keys are pushed right and the gap
    ///   that used to trail off the end is now the stagger in front of them;
    /// - the bottom row is punctuation around a space bar wide enough to hit blind.
    static func staggeredRows(
        letterRows: [String],
        punctuation: [Key],
        isShifted: Bool = false,
        inlinesPunctuation: Bool = true,
        /// Whether the marks live behind a `123` key rather than beside the space bar.
        usesNumbersKey: Bool = false
    ) -> [KeyRow] {
        let letterKeys = letterRows.map { $0.map { Key.letter(String($0)) } }
        guard let lastIndex = letterKeys.indices.last else { return [] }

        // The bottom letter row carries shift on the left and the three marks a sentence
        // needs on the right, which is where a physical keyboard keeps them — and it means
        // a full stop does not need a trip to another row.
        let inlinePunctuation = inlinesPunctuation
            ? punctuation.filter { [",", ".", "?"].contains($0.title) }
            : []
        // On a phone the leftover marks do not flank the space bar. Five of them at
        // shift-width is 7.5 columns, and with a 5-column minimum for the space bar that
        // makes the panel 12.5 columns wide — so every letter above is drawn at 80% of the
        // width it had. They go behind `123` instead, which is what the system keyboard
        // does with the same problem and the same amount of room.
        let spacePunctuation = usesNumbersKey ? [] : punctuation.filter { !inlinePunctuation.contains($0) }

        let widestLetterRow = Double(letterKeys.map(\.count).max() ?? 0)
        let bottomLetters = Double(letterKeys[lastIndex].count)
        let bottomExtras = KeyGeometry.shiftUnits + Double(inlinePunctuation.count)
        // The marks either side of the space bar are shift-width, like the other keys on a
        // bottom row that is not letters. At one column each they read as two slivers
        // marooned in the corners rather than as keys somebody meant to put there — and
        // they are the widest, least precise reach on the keyboard.
        let spaceMarkUnits = KeyGeometry.shiftUnits
        let punctuationUnits = Double(spacePunctuation.count) * spaceMarkUnits

        let columns = max(
            widestLetterRow,
            bottomLetters + bottomExtras + KeyGeometry.backspaceMinimumUnits,
            punctuationUnits + KeyGeometry.spaceMinimumUnits
        )

        // A short bottom row leaves more spare width than a stagger should swallow —
        // ЙЦУКЕН's nine keys under a thirteen-key top row, for one. Past the stagger limit
        // the rest widens backspace instead, which is what a physical keyboard does with
        // the same space.
        let bottomSlack = columns - bottomLetters - bottomExtras - KeyGeometry.backspaceMinimumUnits
        let backspaceUnits = min(
            KeyGeometry.backspaceMaximumUnits,
            KeyGeometry.backspaceMinimumUnits + max(0, bottomSlack - KeyGeometry.staggerMaximumUnits)
        )

        var rows = letterKeys.enumerated().map { index, keys -> KeyRow in
            if index == lastIndex {
                return KeyGeometry.row(
                    id: index,
                    keys: [.shift(isOn: isShifted, widthUnits: KeyGeometry.shiftUnits)]
                        + keys
                        + inlinePunctuation
                        + [.backspace(widthUnits: backspaceUnits)],
                    columns: columns,
                    alignment: .centred
                )
            }
            return KeyGeometry.row(id: index, keys: keys, columns: columns, alignment: .centred)
        }

        // `123`, the space bar and a full stop — the system keyboard's own bottom row, and
        // the only shape that leaves the letters their full width on a phone.
        if usesNumbersKey {
            let side = KeyGeometry.shiftUnits
            rows.append(
                KeyRow(
                    id: rows.count,
                    keys: [
                        .numbers(showingNumbers: false, widthUnits: side),
                        .spaceBar(widthUnits: columns - side * 2),
                        .punctuation(".", named: "Full stop", widthUnits: side),
                    ]
                )
            )
            return rows
        }

        // Punctuation flanks the space bar rather than sitting on a short row of its own —
        // which is also where a physical keyboard keeps most of it.
        let leftCount = min(1, spacePunctuation.count)
        let space = Key.spaceBar(widthUnits: columns - punctuationUnits)
        let flanking = spacePunctuation.map { mark -> Key in
            var wider = mark
            wider.widthUnits = spaceMarkUnits
            return wider
        }
        rows.append(
            KeyGeometry.row(
                id: rows.count,
                keys: Array(flanking.prefix(leftCount)) + [space] + Array(flanking.dropFirst(leftCount)),
                columns: columns,
                alignment: .centred
            )
        )
        return rows
    }

    // MARK: The grid arrangements

    /// The row of digits above the letters.
    ///
    /// Exactly as wide as the letter rows below it, so the keyboard stays one block.
    static func numeralRow(columns: Double) -> KeyRow {
        // Ten digits spread across the whole width rather than ten unit-wide keys huddled
        // in the middle. A row that does not reach both edges reads as something left
        // over, not as part of the keyboard.
        let width = columns / 10
        let digits = "1234567890".map { Key.numeral(String($0), widthUnits: width) }
        return KeyGeometry.row(id: 0, keys: digits, columns: columns, alignment: .centred)
    }

    /// Digits and marks, in the system keyboard's own arrangement.
    ///
    /// Ten columns, so it is exactly as wide as the letters it replaces and no key moves
    /// under a thumb that was already reaching for it. `ABC` sits where `123` did.
    static func numbersPageRows() -> [KeyRow] {
        let digits = "1234567890".map { Key.numeral(String($0)) }
        let symbols = ["-", "/", ":", ";", "(", ")", "€", "&", "@", "\""]
            .map { Key.punctuation($0, named: markName($0)) }
        let marks = [".", ",", "?", "!", "'"].map { Key.punctuation($0, named: markName($0)) }
        let side = KeyGeometry.shiftUnits

        return [
            KeyRow(id: 0, keys: digits),
            KeyRow(id: 1, keys: symbols),
            // Backspace reaches the right edge, exactly as it does on the letters.
            KeyRow(
                id: 2,
                leadingUnits: 10 - Double(marks.count) - KeyGeometry.backspaceMinimumUnits,
                keys: marks + [.backspace(widthUnits: KeyGeometry.backspaceMinimumUnits)]
            ),
            KeyRow(
                id: 3,
                keys: [
                    .numbers(showingNumbers: true, widthUnits: side),
                    .spaceBar(widthUnits: 10 - side * 2),
                    .punctuation(".", named: "Full stop", widthUnits: side),
                ]
            ),
        ]
    }

    /// What VoiceOver calls a mark. Named here rather than at each call site, so the same
    /// character is never described two different ways.
    static func markName(_ character: String) -> String {
        switch character {
        case ".": "Full stop"
        case ",": "Comma"
        case "?": "Question mark"
        case "!": "Exclamation mark"
        case "'": "Apostrophe"
        case "-": "Hyphen"
        case "/": "Slash"
        case ":": "Colon"
        case ";": "Semicolon"
        case "(": "Open bracket"
        case ")": "Close bracket"
        case "€": "Euro sign"
        case "&": "Ampersand"
        case "@": "At sign"
        case "\"": "Quotation mark"
        default: character
        }
    }

    /// The keys behind `123` on a grid arrangement.
    ///
    /// The same digits and marks the staggered numbers page has, so a person who switches
    /// arrangement finds the same characters — laid out in whatever shape their
    /// arrangement uses rather than in a shape borrowed from a keyboard they did not pick.
    static func numbersPageKeys() -> [Key] {
        var keys: [Key] = "1234567890".map { Key.numeral(String($0)) }
        keys += ["-", "/", ":", ";", "(", ")", "€", "&", "@", "\"", ".", ",", "?", "!", "'"]
            .map { Key.punctuation($0, named: markName($0)) }
        // `ABC`, so there is always a way back to the letters.
        keys.append(.numbers(showingNumbers: true))
        return keys
    }

    /// Alphabetical and large-keys.
    ///
    /// A uniform grid is the *right* answer here: these arrangements are chosen for
    /// predictability, not for familiarity, and a stagger would only make the next letter
    /// harder to find. What it still has to do is fill the width and balance its rows, so
    /// nobody is left hunting for three letters stranded on a last row.
    ///
    /// Punctuation and the `123` key join the letters in the flow rather than taking a row
    /// of their own, and the last row is the space bar with backspace beside it.
    static func gridRows(keys items: [Key], maxPerRow: Int) -> [KeyRow] {
        let chunks = KeyGeometry.balanced(items, maxPerRow: maxPerRow)
        let columns = Double(chunks.map(\.count).max() ?? maxPerRow)

        var rows = chunks.enumerated().map { index, keys in
            KeyGeometry.row(id: index, keys: keys, columns: columns, alignment: .centred)
        }

        let backspaceUnits = min(
            KeyGeometry.backspaceMaximumUnits,
            max(KeyGeometry.backspaceMinimumUnits, columns / 4)
        )
        rows.append(
            KeyGeometry.row(
                id: rows.count,
                keys: [
                    .spaceBar(widthUnits: columns - backspaceUnits),
                    .backspace(widthUnits: backspaceUnits),
                ],
                columns: columns,
                alignment: .centred
            )
        )
        return rows
    }
}
