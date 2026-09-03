import SwiftUI

// MARK: - Keys

/// A grid of keys, and the arithmetic that arranges them.
///
/// Two things in Tiko Type are built out of keys, and they are not the same thing.
/// Type has a *keyboard*: a panel at the foot of a screen, laid out the way the
/// arrangement a typist knows is laid out (`KeyboardLayouts.swift`). Letterboard has a
/// *board*: a copy of the paper object a speech therapist tapes to a bed rail, which
/// takes the whole screen and holds the alphabet and nothing else
/// (`LetterboardBoard.swift`).
///
/// What they share is what is in this file and no more: a key, a row of keys, how spare
/// columns are spent, and a view that turns columns into points. Each of them owns its
/// own shape, its own sizes and its own idea of what a key means.

/// What pressing a key does.
enum KeyAction: Hashable {
    /// Adds to the word being written.
    case insert(String)
    /// Finishes the current word. The space between two words is not a character in the
    /// message; it is the boundary between two of its words, and Type keeps the message
    /// as word chips rather than as a string.
    case word
    case backspace
    /// The letterboard's DONE: the message is finished, say it.
    ///
    /// On a physical board this is the key that tells whoever is holding it that the
    /// speller has stopped; here it does what that person would then do, and reads the
    /// message out. It is a message-level action, not a character.
    case finish
    /// Swaps the letters for digits and marks, and back again.
    case numbers
    /// Switches the letters between capitals and small letters.
    ///
    /// A view concern rather than a message one: it changes what the *keys* say, and
    /// what the next letter inserts, but it puts nothing into the message itself.
    case shift
    /// An empty cell in the middle of a row. Nothing happens because nothing is there —
    /// it is the gutter the letterboard keeps between its letters and its marks, which a
    /// leading or trailing inset cannot express.
    case gap
}

/// How a key is painted, in terms the key theme can answer.
///
/// Deliberately three roles rather than one colour per key: the theme
/// (``KeyTheme``) is the user's choice and stays the only place colours are decided, so
/// a new arrangement never has to know what "Colorful" means.
enum KeyStyle: Hashable {
    /// A letter, a digit, a mark — the keys the palette colours.
    case letter
    /// Shift, backspace, `123`/`ABC`: the theme's quieter "special" tone.
    case control
    /// The one key that finishes something: the letterboard's DONE. Painted in the
    /// app's own colour, because it is the key somebody reaches for while looking away
    /// at the person they are talking to.
    case primary
}

/// One key.
///
/// Every key carries its own accessibility label, because an unlabelled key is silent
/// under VoiceOver and a keyboard is traversed key by key.
struct Key: Identifiable, Hashable {
    var id: String
    var title: String
    var symbolName: String?
    var accessibilityLabel: String
    var action: KeyAction
    /// Width in key columns. Only the space bar, backspace and shift are not 1.
    var widthUnits: Double = 1
    var style: KeyStyle = .letter

    /// A letter key. The label is the letter itself, which is right in every script —
    /// there is no table of English letter names to translate.
    static func letter(_ character: String) -> Key {
        Key(
            // `key-a`, matching the identifiers the UI tests tap and independent of
            // capitalisation.
            id: "key-\(character.lowercased())",
            title: character.uppercased(),
            accessibilityLabel: character.uppercased(),
            action: .insert(character.lowercased())
        )
    }

    /// Shift. Left of the bottom letter row, where every keyboard keeps it.
    static func shift(isOn: Bool, widthUnits: Double) -> Key {
        Key(
            id: "key-shift",
            title: "",
            symbolName: isOn ? "shift.fill" : "shift",
            accessibilityLabel: isOn ? "Shift, on. Letters are capitals." : "Shift, off. Letters are small.",
            action: .shift,
            widthUnits: widthUnits,
            style: .control
        )
    }

    /// A digit. Its own factory rather than punctuation, so it reads as a number to
    /// VoiceOver and can be told apart when colouring.
    static func numeral(_ character: String, widthUnits: Double = 1) -> Key {
        Key(
            id: "key-\(character)",
            title: character,
            accessibilityLabel: character,
            action: .insert(character),
            widthUnits: widthUnits
        )
    }

    /// An empty cell. Drawn as nothing, pressed by nobody.
    static func gap(_ id: String) -> Key {
        Key(id: "gap-\(id)", title: "", accessibilityLabel: "", action: .gap)
    }

    /// DONE — the board's bird, as a check.
    ///
    /// A mark rather than the word: "Done" is a word somebody has to read, in a place
    /// where every other cell is a letter to be pointed at, and at key size it truncates.
    /// A check is read at a glance and needs no translating.
    static func finish(widthUnits: Double) -> Key {
        Key(
            id: "key-done",
            title: "",
            symbolName: "checkmark",
            accessibilityLabel: "Done. Say what you spelled.",
            action: .finish,
            widthUnits: widthUnits,
            style: .primary
        )
    }

    /// The `#` in the corner of the physical board: digits live behind it.
    static func numbers(showingNumbers: Bool, widthUnits: Double = 1) -> Key {
        Key(
            id: "key-symbols-toggle",
            title: showingNumbers ? "ABC" : "123",
            accessibilityLabel: showingNumbers ? "Back to letters" : "Numbers and marks",
            action: .numbers,
            widthUnits: widthUnits,
            style: .control
        )
    }

    static func punctuation(_ character: String, named name: String, widthUnits: Double = 1) -> Key {
        Key(
            id: "key-\(character)",
            title: character,
            accessibilityLabel: name,
            action: .insert(character),
            widthUnits: widthUnits
        )
    }

    /// The space bar.
    ///
    /// It is the word key: in Type a space is not a character in the message, it is the
    /// boundary between two of its words (``KeyAction/word``). It is still the widest key
    /// on the keyboard and still sits along the bottom, because that is the key every
    /// typist reaches for without looking.
    static func spaceBar(widthUnits: Double) -> Key {
        Key(
            id: "key-space",
            title: "space",
            accessibilityLabel: "Space",
            action: .word,
            widthUnits: widthUnits
        )
    }

    /// Backspace, which lives at the right end of the bottom letter row — the place a
    /// typist already knows, and the place that leaves no dead space beside the short row
    /// it ends.
    static func backspace(widthUnits: Double) -> Key {
        Key(
            id: "key-backspace",
            title: "",
            symbolName: "delete.left",
            accessibilityLabel: "Backspace",
            action: .backspace,
            widthUnits: widthUnits,
            style: .control
        )
    }
}

/// One row of keys, and the empty columns on either side of them.
///
/// The insets are the whole point. A keyboard is recognisable because its rows are
/// *offset* from each other — the home row half a key in, the bottom letter row further
/// still — and because every row reaches both edges. Modelling that as empty columns,
/// rather than as an alignment, is what lets one arithmetic check ("does this row add up
/// to the panel width?") stand for "does this look like a keyboard?".
struct KeyRow: Identifiable, Hashable {
    var id: Int
    /// Empty columns before the first key: the row's stagger.
    var leadingUnits: Double = 0
    var keys: [Key]
    /// Empty columns after the last key.
    var trailingUnits: Double = 0

    /// Columns the keys themselves take.
    var keyUnits: Double { keys.reduce(0) { $0 + $1.widthUnits } }

    /// Columns the whole row takes, insets included.
    ///
    /// Equal for every row of one keyboard — that is the invariant ``KeyGeometry`` builds
    /// and the unit tests assert across every arrangement and every alphabet. A row that
    /// does not add up is a row that trails off.
    var totalUnits: Double { leadingUnits + keyUnits + trailingUnits }
}

// MARK: - Geometry

/// Where a row's spare columns go.
enum KeyRowAlignment {
    /// Half in front, half behind — how a shorter row sits between the edges of a wider
    /// one. This is the half-key offset of a home row.
    case centred
    /// All of it in front, so the last key finishes on the right edge.
    case leading
}

/// The arithmetic of a keyboard, with no view in it.
///
/// One pure place where "how wide is this row?" is decided, so the answer can be checked
/// by a test instead of by looking at a screenshot. Everything is in *columns* — the
/// width of one letter key — and never in points, so the same keyboard is right on a
/// phone and on a 13-inch iPad.
enum KeyGeometry {
    /// Backspace is wider than a letter, the way it is on every keyboard.
    static let backspaceMinimumUnits: Double = 1.5
    /// …but not so wide that it stops reading as one key.
    static let backspaceMaximumUnits: Double = 2.5
    /// How far the bottom letter row is allowed to be pushed in before the rest of the
    /// spare width goes to backspace instead.
    static let staggerMaximumUnits: Double = 1.5
    /// The space bar dominates the bottom row or it is not a space bar.
    static let spaceMinimumUnits: Double = 5
    /// Shift is wider than a letter, like backspace opposite it, so the row reads as
    /// letters with a control at each end.
    static let shiftUnits: Double = 1.5
    /// No key is ever drawn smaller than the platform's touch target floor.
    static let minimumHittableSide: CGFloat = 44
    /// The largest corner a key is given, before its own size caps it.
    static let maximumCornerRadius: CGFloat = 18

    /// Places `keys` in a row `columns` wide, spending the spare columns where
    /// `alignment` says. The row always comes back exactly `columns` wide.
    static func row(
        id: Int,
        keys: [Key],
        columns: Double,
        alignment: KeyRowAlignment
    ) -> KeyRow {
        let used = keys.reduce(0) { $0 + $1.widthUnits }
        let slack = max(0, columns - used)
        switch alignment {
        case .centred:
            return KeyRow(id: id, leadingUnits: slack / 2, keys: keys, trailingUnits: slack / 2)
        case .leading:
            return KeyRow(id: id, leadingUnits: slack, keys: keys, trailingUnits: 0)
        }
    }

    /// Splits `items` into rows of at most `maxPerRow`, as evenly as they divide.
    ///
    /// The naive split — fill a row, start another — leaves the tail row nearly empty
    /// (26 letters eight at a time ends on a row of two). Taking the row *count* first
    /// and dividing the items back over it means the shortest row is never more than one
    /// key shorter than the longest.
    static func balanced<Item>(_ items: [Item], maxPerRow: Int) -> [[Item]] {
        guard maxPerRow > 0, !items.isEmpty else { return items.isEmpty ? [] : [items] }
        let rowCount = (items.count + maxPerRow - 1) / maxPerRow
        let base = items.count / rowCount
        // The first `remainder` rows carry one more than the rest.
        let remainder = items.count % rowCount
        var rows: [[Item]] = []
        var start = 0
        for index in 0..<rowCount {
            let length = base + (index < remainder ? 1 : 0)
            rows.append(Array(items[start..<(start + length)]))
            start += length
        }
        return rows
    }
}

// MARK: - Rendering

/// How a grid decides how tall its keys are.
///
/// The one thing the keyboard and the letterboard genuinely disagree about, so it is
/// stated rather than inferred. A key's height comes from its width either way — a grid
/// that read its own height to size its keys would be answering a question with itself —
/// and this says what bounds it.
enum KeyGridSizing: Hashable {
    /// A panel at the foot of a screen, whose height belongs to it.
    ///
    /// Square wherever the width allows, and never much taller than the height the key
    /// size preset tuned it to: what is above the panel is the sentence somebody is
    /// writing, and a keyboard that grows takes the page away from them.
    case panel(tunedHeight: Double)

    /// A board with the screen to itself, given a height to fill.
    ///
    /// Here the tuned height stops applying. The whole alphabet has to be on screen at
    /// once — a letterboard somebody scrolls is not a letterboard, because the letter
    /// they are reaching for has to be where it was the last time they looked — so the
    /// keys take the budget, whatever it is.
    case board(budget: Double)

    /// How tall a key is, given how wide one column turned out to be.
    func height(forUnit unit: CGFloat) -> CGFloat {
        switch self {
        case .panel(let tuned):
            // Square, then clamped: never under the touch floor, never more than a
            // little taller than the tuned height.
            return min(max(unit, KeyGeometry.minimumHittableSide), CGFloat(tuned) * 1.25)
        case .board(let budget):
            // Bounded by the key's own width — square, never much taller — and by the
            // budget, so the whole alphabet is on screen whichever runs out first. A
            // little taller than wide is allowed: five columns across a screen leaves
            // more height than width per row, and holding the keys square leaves a band
            // of empty page under the board that the letters could have had.
            return max(min(unit * 1.3, CGFloat(budget)), KeyGeometry.minimumHittableSide)
        }
    }

    /// The height to use when the width is not known yet — which is one frame, or, if
    /// something goes wrong upstream, forever. Neither case may produce a grid nobody
    /// can press.
    var fallbackHeight: Double {
        switch self {
        case .panel(let tuned): tuned
        case .board(let budget): budget
        }
    }
}

/// How many columns a key spans, carried to the layout.
private struct KeyUnitsKey: LayoutValueKey {
    static let defaultValue: Double = 1
}

extension View {
    fileprivate func keyUnits(_ units: Double) -> some View {
        layoutValue(key: KeyUnitsKey.self, value: units)
    }
}

/// One row of keys, placed by dividing the width it is given.
///
/// A `Layout` is handed the width it has to divide, in the same pass it places the keys
/// in. There is no state, nothing to settle, and no frame in which the answer is not yet
/// known — which is what keeps a keyboard from ever drawing as a row of hairlines while a
/// measurement catches up. A row is `columns` cells with `columns - 1` gaps between them;
/// a key spanning `k` cells takes those cells and the `k - 1` gaps inside it, which is
/// what makes a space bar line up exactly with the letters above it.
struct KeyRowLayout: Layout {
    var columns: Double
    var spacing: CGFloat
    var sizing: KeyGridSizing

    /// The width of one cell inside `available`.
    ///
    /// Zero when there is nothing to divide. Not one: a 1pt column is a keyboard that
    /// looks broken rather than one that is not there yet.
    static func unitWidth(available: CGFloat, columns: Double, spacing: CGFloat) -> CGFloat {
        guard columns > 0, available > 0 else { return 0 }
        return max((available - CGFloat(columns - 1) * spacing) / CGFloat(columns), 0)
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        let unit = Self.unitWidth(available: width, columns: columns, spacing: spacing)
        return CGSize(
            width: width,
            // Height comes from the width, so a row asked how tall it is before anything
            // has been offered says the tuned height rather than nothing.
            height: unit > 0 ? sizing.height(forUnit: unit) : CGFloat(sizing.fallbackHeight)
        )
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let unit = Self.unitWidth(available: bounds.width, columns: columns, spacing: spacing)
        guard unit > 0 else { return }
        var x = bounds.minX
        for subview in subviews {
            let units = subview[KeyUnitsKey.self]
            let width = unit * CGFloat(units) + spacing * CGFloat(units - 1)
            subview.place(
                at: CGPoint(x: x, y: bounds.minY),
                proposal: ProposedViewSize(width: width, height: bounds.height)
            )
            x += width + spacing
        }
    }
}

/// Draws rows of keys, and owns no shape of its own.
///
/// Its only geometry is turning columns into points: the grid is as wide as it is given,
/// and one column is that width divided by ``columns``. There is no magic panel width
/// anywhere in this file. Every colour comes from the ``KeyTheme`` the person chose —
/// this view decides where a key goes, never what colour it is.
struct KeyGrid: View {
    var rows: [KeyRow]
    /// Width of the grid in key columns. Every row is exactly this wide, so the grid
    /// reaches both edges on every row and no row trails off.
    var columns: Double
    var sizing: KeyGridSizing
    /// The largest a letter is ever drawn. What actually decides the size is usually the
    /// key — this is the ceiling its owner tuned.
    var titlePointSize: Double
    /// Whether the letters are drawn as capitals whatever shift is doing. The letterboard
    /// sets this: the paper board is printed in capitals.
    var showsCapitals: Bool = false
    /// Whether the letters are shown as capitals. A key that says A and types "a" is a
    /// small lie the person has to learn to ignore.
    var isShifted: Bool = false
    var theme: KeyTheme
    /// Which half of the theme to paint with.
    ///
    /// Passed in rather than read from the environment, because this view is wrapped in
    /// `.equatable()`: a colour scheme it did not compare is a colour scheme it would not
    /// notice changing, and the keyboard would stay painted for the old one.
    var scheme: ColorScheme
    var spacing: CGFloat
    /// Whether a press bounces the key. Off follows the app's "Show animations" setting.
    var animates: Bool = true
    /// What VoiceOver calls the whole grid — "Keyboard" or "Letterboard", never both.
    var accessibilityLabel: String
    /// The coordinate space the key frames are reported in, so the letter that was
    /// pressed can fly from it to the sentence bar.
    var coordinateSpace: String
    var onKey: (KeyAction, CGRect) -> Void

    /// Width of one column, as last measured.
    ///
    /// Used for the *type size and the corner radius only*, never for where a key goes.
    /// Geometry is settled by ``KeyRowLayout``, which is handed the width it has to
    /// divide and needs no state at all. So when this is unknown the letters are simply
    /// drawn at the tuned size: a glyph a little large for one frame is nothing, where a
    /// keyboard of hairlines is unusable.
    @State private var measuredUnit: CGFloat = 0

    var body: some View {
        let colors = theme.colors(in: scheme)
        VStack(spacing: spacing) {
            ForEach(rows) { row in
                KeyRowLayout(columns: columns, spacing: spacing, sizing: sizing) {
                    // The insets are the row's stagger, as empty columns. They are
                    // subviews so the layout can space them like anything else, and they
                    // draw and hit nothing.
                    inset(row.leadingUnits)
                    ForEach(Array(row.keys.enumerated()), id: \.element.id) { index, key in
                        keyButton(key, colors: colors, paletteIndex: row.id * 100 + index)
                            .keyUnits(key.widthUnits)
                    }
                    inset(row.trailingUnits)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .background(
            // Type size only — never the layout.
            GeometryReader { proxy in
                Color.clear
                    .onAppear { measuredUnit = unitWidth(available: proxy.size.width) }
                    .onChange(of: proxy.size.width) { _, width in
                        measuredUnit = unitWidth(available: width)
                    }
            }
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel(accessibilityLabel)
    }

    /// How tall a key is, for the things drawn inside it.
    ///
    /// The same arithmetic ``KeyRowLayout`` uses, so the glyph and the corner agree with
    /// the key they sit in.
    private var keyHeight: CGFloat {
        guard measuredUnit > 0 else { return CGFloat(sizing.fallbackHeight) }
        return sizing.height(forUnit: measuredUnit)
    }

    /// The stagger, as empty columns. Nothing is drawn and nothing can be pressed — it is
    /// the offset itself, not a disabled key.
    @ViewBuilder
    private func inset(_ units: Double) -> some View {
        if units > 0 {
            Color.clear
                .keyUnits(units)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private func unitWidth(available: CGFloat) -> CGFloat {
        KeyRowLayout.unitWidth(available: available, columns: columns, spacing: spacing)
    }

    /// A letter key on a phone is a third of a button's width, and a button's radius
    /// would turn it into a lozenge — so the key's own smaller side caps it.
    private var cornerRadius: CGFloat {
        let side = measuredUnit > 0 ? min(measuredUnit, keyHeight) : keyHeight
        return min(KeyGeometry.maximumCornerRadius, side / 3.5)
    }

    @ViewBuilder
    private func keyButton(_ key: Key, colors: KeyThemeColors, paletteIndex: Int) -> some View {
        if key.action == .gap {
            // Nothing drawn and nothing hittable: an empty cell has to be *empty*, or it
            // is a key that does nothing, which is worse than a hole.
            Color.clear
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        } else {
            KeyCap(
                key: key,
                fill: fill(for: key, colors: colors, paletteIndex: paletteIndex),
                textColor: textColor(for: key, colors: colors),
                activeColor: colors.active,
                outlined: colors.outlinesWideKeys && key.action == .word,
                letterPointSize: letterPointSize,
                symbolPointSize: symbolPointSize,
                cornerRadius: cornerRadius,
                showsCapitals: showsCapitals || isShifted,
                animates: animates,
                coordinateSpace: coordinateSpace,
                onPress: onKey
            )
        }
    }

    private func fill(for key: Key, colors: KeyThemeColors, paletteIndex: Int) -> Color {
        switch key.style {
        case .letter: colors.key(key.title, paletteIndex)
        case .control: colors.special
        case .primary: colors.primary
        }
    }

    private func textColor(for key: Key, colors: KeyThemeColors) -> Color {
        switch key.style {
        case .letter: colors.keyText
        case .control: colors.specialText
        case .primary: colors.primaryText
        }
    }

    /// Type size that fits the narrowest key, so no letter is ever scaled down alone.
    private var letterPointSize: CGFloat {
        guard measuredUnit > 0 else { return CGFloat(titlePointSize) }
        return min(CGFloat(titlePointSize), measuredUnit * 0.62, keyHeight * 0.52)
    }

    /// A symbol's size, which is not a letter's.
    ///
    /// A glyph is drawn to fill its own square, where a capital letter fills about two
    /// thirds of its line. Sized as though it were a letter, backspace is drawn larger
    /// than the key it sits in and spills over the ones beside it.
    private var symbolPointSize: CGFloat {
        min(letterPointSize, keyHeight * 0.44)
    }
}

/// A grid is compared by what it draws, never by the closure it calls.
///
/// Every key would otherwise be rebuilt on every keystroke — not because the keyboard has
/// changed, but because `onKey` is a closure and a closure is never equal to itself, so
/// SwiftUI cannot tell that nothing about the keys is different. Comparing the drawn state
/// instead lets SwiftUI skip the grid entirely while a sentence is being written. The
/// closure is left out on purpose and it is safe to: everything it touches is `@State`,
/// read live at the moment of the press rather than captured.
extension KeyGrid: Equatable {
    static func == (lhs: KeyGrid, rhs: KeyGrid) -> Bool {
        lhs.rows == rhs.rows
            && lhs.columns == rhs.columns
            && lhs.sizing == rhs.sizing
            && lhs.titlePointSize == rhs.titlePointSize
            && lhs.showsCapitals == rhs.showsCapitals
            && lhs.isShifted == rhs.isShifted
            && lhs.spacing == rhs.spacing
            && lhs.animates == rhs.animates
            && lhs.theme == rhs.theme
            && lhs.scheme == rhs.scheme
            && lhs.coordinateSpace == rhs.coordinateSpace
    }
}

// MARK: - One key cap

/// One pressable key.
///
/// It reports its own frame in `coordinateSpace` so the letter it inserted can fly from
/// where it was pressed to the sentence bar.
private struct KeyCap: View {
    let key: Key
    let fill: Color
    let textColor: Color
    let activeColor: Color
    /// Ghost paints its keys clear, which leaves the space bar — the one key that is all
    /// fill and no glyph — with no shape at all, so it gets a hairline instead of
    /// disappearing.
    let outlined: Bool
    let letterPointSize: CGFloat
    let symbolPointSize: CGFloat
    let cornerRadius: CGFloat
    let showsCapitals: Bool
    let animates: Bool
    let coordinateSpace: String
    let onPress: (KeyAction, CGRect) -> Void

    @State private var frame: CGRect = .zero
    @State private var pressed = false

    var body: some View {
        Button {
            onPress(key.action, frame)
            flash()
        } label: {
            label
                // The layout gives the key its frame; this only says the label should
                // fill it, so the whole key is the target rather than the glyph.
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    ZStack {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous).fill(fill)
                        if outlined {
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.22), lineWidth: 1.5)
                        }
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(activeColor)
                            .opacity(pressed ? 1 : 0)
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .scaleEffect(pressed ? 0.9 : 1)
                .background(
                    GeometryReader { geo in
                        Color.clear
                            .onAppear { frame = geo.frame(in: .named(coordinateSpace)) }
                            .onChange(of: geo.frame(in: .named(coordinateSpace))) { _, f in frame = f }
                    }
                )
        }
        .buttonStyle(.plain)
        .contentShape(Rectangle())
        .accessibilityLabel(key.accessibilityLabel)
        // A key's label is not unique on screen: a word chip above the keyboard can read
        // the same as a key, and a UI test asking for "G" then matches two elements and
        // cannot tap either. The identifier says which one is the key.
        .accessibilityIdentifier(key.id)
        .accessibilityAddTraits(.isKeyboardKey)
    }

    @ViewBuilder
    private var label: some View {
        if let symbolName = key.symbolName {
            Image(systemName: symbolName)
                .font(.system(size: symbolPointSize, weight: .bold))
                .foregroundStyle(textColor)
        } else {
            // Only a *letter* follows the capitals setting. The space bar shows the word
            // written on it, which is not a letter and must not be shouted.
            let followsCapitals = key.title.count == 1
            Text(followsCapitals && !showsCapitals ? key.title.lowercased() : key.title)
                // Heavier and larger than a caption: a key is read at a glance while the
                // eye is somewhere else, and a hairline letter on a pale key is the first
                // thing to disappear for a low-vision reader.
                .font(.system(size: followsCapitals ? letterPointSize : letterPointSize * 0.55,
                              design: .rounded).weight(.bold))
                .foregroundStyle(textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }

    private func flash() {
        if animates {
            withAnimation(.easeOut(duration: 0.08)) { pressed = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                withAnimation(.easeOut(duration: 0.28)) { pressed = false }
            }
        } else {
            pressed = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { pressed = false }
        }
    }
}
