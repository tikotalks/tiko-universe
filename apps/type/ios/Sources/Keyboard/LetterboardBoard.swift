import Foundation

/// The paper letterboard, as data.
///
/// Not a keyboard arrangement, and this file exists so that it cannot quietly become one.
/// A keyboard is a panel at the foot of a screen that reproduces an arrangement typists
/// know; this is a copy of a physical object — the S2C/RPM board a speller points at —
/// and the copy is the whole value of it. Somebody who spells on the paper one already
/// knows where their letters are, so five across, A–E on the first row and the marks down
/// a rail on the right are not layout choices. They are the thing being reproduced, and a
/// row of six or an alphabet that started somewhere else would cost that person their
/// motor memory.
///
/// It shares ``Key``, ``KeyRow`` and ``KeyGrid`` with the keyboard, the way two screens
/// share a button. It shares no shape and no sizes.
struct LetterboardBoard: Hashable {
    var rows: [KeyRow]
    /// Width of the board in columns. Every row is exactly this wide.
    var columns: Double
    /// The height a row is tuned to. On this board it is a floor rather than the answer:
    /// the board has the screen to itself, so what it is actually given decides
    /// (``KeyGridSizing/board(budget:)``).
    var keyHeight: Double
    /// The largest a letter is ever drawn.
    ///
    /// Deliberately large. On a board the tuned size must never be the thing that caps a
    /// letter — the key's own width and height should be — because this is meant to be
    /// read from the other side of a bed.
    var titlePointSize: Double

    /// Five across is a letter big enough to point at from the other side of a bed. The
    /// sixth column is the rail.
    static let letterColumns = 5

    static func board(
        letters: String,
        showingNumbers: Bool = false,
        keySize: TypeKeySize,
        enlargedForAccessibilityText: Bool = false
    ) -> LetterboardBoard {
        let rows = rows(letters: letters, showingNumbers: showingNumbers)
        let metrics = metrics(for: keySize)
        let enlargement = enlargedForAccessibilityText ? 1.25 : 1.0
        return LetterboardBoard(
            rows: rows,
            columns: rows.first?.totalUnits ?? Double(letterColumns + 1),
            keyHeight: metrics.height * enlargement,
            titlePointSize: metrics.title * enlargement
        )
    }

    /// Explicit numbers rather than a factor applied to one base, so a size can be tuned
    /// without moving the other two.
    private static func metrics(for keySize: TypeKeySize) -> (height: Double, title: Double) {
        switch keySize {
        case .small: (66, 60)
        case .standard: (78, 72)
        case .large: (94, 88)
        case .extraLarge: (112, 104)
        }
    }

    /// The marks down the right-hand rail, under the backspace at the top.
    ///
    /// Three, and only these three. A letterboard is not a keyboard and does not want a
    /// keyboard's punctuation: every mark on the rail is a cell somebody has to look past
    /// to find a letter, and the apostrophe — the one mark that appears *inside* a word —
    /// is the one a listener can supply for themselves.
    private static var railMarks: [Key] {
        [
            .punctuation("!", named: "Exclamation mark"),
            .punctuation("?", named: "Question mark"),
            .punctuation(".", named: "Full stop"),
        ]
    }

    /// Digits and marks, five across, behind the Numbers control.
    private static let numbers = [
        "1", "2", "3", "4", "5",
        "6", "7", "8", "9", "0",
        "€", "$", "%", "&", "@",
        "+", "-", "=", "/", ":",
    ]

    /// The board, laid out the way the physical board is laid out.
    ///
    /// ```
    /// A B C D E ⌫
    /// F G H I J !
    /// K L M N O ?
    /// P Q R S T .
    /// U V W X Y Z
    /// ```
    ///
    /// Five letters a row, a rail of marks down the right, and the last row taking the
    /// sixth column for the letter that would otherwise be stranded alone underneath.
    ///
    /// Nothing else is on it. No space bar, no `#` — the paper board has neither, and what
    /// the app needs instead lives in the strip above the board (`LetterboardView`), where
    /// it is not in the way of a letter.
    ///
    /// Longer alphabets take more rows; the rail runs out and the rest of the column stays
    /// empty, which is the right way round — a letterboard grows letters, not punctuation.
    static func rows(letters: String, showingNumbers: Bool = false) -> [KeyRow] {
        let columns = Double(letterColumns + 1)
        var remaining = showingNumbers ? numbers : letters.map(String.init)
        let marks = showingNumbers ? [] : railMarks

        // Rows of five, until the last row can hold what is left — six, because the last
        // row takes the rail's column for itself rather than stranding one letter.
        var chunks: [[String]] = []
        while remaining.count > letterColumns + 1 {
            chunks.append(Array(remaining.prefix(letterColumns)))
            remaining.removeFirst(letterColumns)
        }
        chunks.append(remaining)

        var rows: [KeyRow] = chunks.enumerated().map { index, letters in
            var keys = letters.map { Key.letter($0) }
            if letters.count <= letterColumns {
                // Pad a short row so its letters stay under the ones above them, then give
                // the last column to the rail.
                while keys.count < letterColumns {
                    keys.append(.gap("row\(index)-\(keys.count)"))
                }
                if index == 0 {
                    keys.append(.backspace(widthUnits: 1))
                } else if index - 1 < marks.count {
                    keys.append(marks[index - 1])
                } else {
                    keys.append(.gap("rail\(index)"))
                }
            }
            return KeyRow(id: index, keys: keys, trailingUnits: columns - Double(keys.count))
        }
        // DONE, across the foot of the board.
        //
        // The paper board puts it in the bottom-right corner, but the corner here is a
        // letter — Z, which would otherwise be stranded alone on a row of its own. A bar
        // is the better trade: it is the one key on the board that is not a letter, it is
        // the one somebody reaches for while looking away at the person they are talking
        // to, and it cannot be missed.
        rows.append(KeyRow(id: rows.count, keys: [.finish(widthUnits: columns)]))
        return rows
    }
}
