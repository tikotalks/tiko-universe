import SwiftUI
import TikoKit

/// The alphabet, full screen, one letter at a time.
///
/// A mode of its own rather than one of Type's keyboard arrangements, because that is how
/// it is reached for. A letterboard is what a speech therapist tapes to a bed rail when
/// everything else has become too fine-grained to hit — somebody turns to it *instead of*
/// a keyboard, often being helped by another person, and it has to be one tap away rather
/// than three levels down inside a settings picker.
///
/// It shares Type's keys and grid the way two screens share a button, and nothing else.
/// Its shape and its sizes are its own (``LetterboardBoard``): five letters across, marks
/// down a rail on the right, DONE across the foot, and no word chips anywhere near it.
///
/// The whole alphabet is on screen at once, always. That is the one thing a letterboard
/// has to do — somebody reaching for a letter is relying on it being where it was a moment
/// ago, and a board that scrolls has taken that away.
struct LetterboardView: View {
    let languageCode: String
    let keySize: TypeKeySize
    let theme: KeyTheme
    let animates: Bool
    /// Says a letter as it is pressed, and the whole message when DONE is.
    let speak: (String) -> Void
    /// Back to the keyboard. A control on the board itself rather than in the header,
    /// because the header's buttons are a parent's and the board is not: somebody using
    /// the board in child mode still has to be able to leave it.
    let exit: () -> Void

    /// What has been spelled, as the run of letters it is. Not persisted: a board comes
    /// back to an empty line, the way the paper one comes back wiped.
    @State private var spelled = ""
    /// Whether the Numbers control has been pressed. Not persisted either — a board comes
    /// back to its letters.
    @State private var showingNumbers = false

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorScheme) private var scheme

    private let coordSpace = "letterboardRoot"

    private var isCompact: Bool { horizontalSizeClass == .compact }

    var body: some View {
        VStack(spacing: isCompact ? 10 : 16) {
            spelledBand
                .padding(.horizontal, isCompact ? 16 : 24)
                .frame(height: spelledHeight)
            controls
                .padding(.horizontal, isCompact ? 16 : 24)
            board
                .padding(.horizontal, isCompact ? 0 : 24)
        }
        .padding(.top, 8)
        .padding(.bottom, isCompact ? 0 : 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .coordinateSpace(name: coordSpace)
        .accessibilityIdentifier("letterboard")
    }

    // MARK: - What has been spelled

    /// Letters, not words.
    ///
    /// Type shows the message as word chips because it is building a sentence out of them.
    /// Here the person is spelling, and the thing they and whoever is helping them need to
    /// see is the run of letters exactly as it stands.
    private var spelledBand: some View {
        ScrollView {
            Group {
                if spelled.isEmpty {
                    Text("Point at letters to spell a word.")
                        .font(.system(size: spelledPointSize * 0.42, design: .rounded).weight(.semibold))
                        .foregroundStyle(.primary.opacity(0.38))
                        .multilineTextAlignment(.center)
                } else {
                    Text(spelled)
                        .font(.system(size: spelledPointSize, design: .rounded).weight(.heavy))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.4)
                        .textCase(.uppercase)
                }
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .scrollBounceBehavior(.basedOnSize)
        .defaultScrollAnchor(.center)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spelled.isEmpty ? "Nothing spelled yet" : spelled)
        .accessibilityIdentifier("letterboardSpelled")
    }

    private var spelledPointSize: CGFloat { isCompact ? 44 : 72 }

    /// A fixed band for what has been spelled, so the board below it gets everything else.
    /// Two flexible halves would split the screen between them and leave the letters at
    /// half the size they can be — and on this screen the letters are the point.
    private var spelledHeight: CGFloat { spelledPointSize * 1.7 }

    // MARK: - Controls

    /// No Speak button: DONE, on the board itself, is the speak key — that is what DONE
    /// means on a letterboard, and two of them would be one too many.
    private var controls: some View {
        HStack(spacing: isCompact ? 10 : 16) {
            LetterboardControl(
                title: "Keyboard",
                symbolName: "keyboard",
                isEnabled: true,
                isCompact: isCompact,
                action: exit
            )
            .accessibilityIdentifier("letterboardExit")

            LetterboardControl(
                title: showingNumbers ? "Letters" : "Numbers",
                symbolName: showingNumbers ? "character" : "number",
                isEnabled: true,
                isCompact: isCompact
            ) {
                showingNumbers.toggle()
            }
            .accessibilityIdentifier("letterboardNumbers")

            LetterboardControl(
                title: "Clear",
                symbolName: "trash",
                isDestructive: true,
                isEnabled: !spelled.isEmpty,
                isCompact: isCompact
            ) {
                spelled = ""
            }
            .accessibilityIdentifier("letterboardClear")
        }
    }

    // MARK: - The letters

    private var board: some View {
        let padding: CGFloat = isCompact ? 12 : 18
        let spacing: CGFloat = isCompact ? 6 : 10
        let letters = LetterboardBoard.board(
            letters: KeyboardAlphabet.alphabet(forLanguageCode: languageCode).letters,
            showingNumbers: showingNumbers,
            keySize: keySize,
            enlargedForAccessibilityText: dynamicTypeSize.isAccessibilitySize
        )
        // The board takes the rest of the screen and divides it between its rows. This is
        // where "fits on the screen" is actually decided: the height is known here, before
        // a key has been drawn, so the keys are made to suit it rather than overflowing
        // and being scrolled.
        return GeometryReader { proxy in
            let rows = CGFloat(letters.rows.count)
            let budget = (proxy.size.height - padding * 2 - (rows - 1) * spacing) / max(rows, 1)
            grid(letters, budget: budget, padding: padding, spacing: spacing)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }

    private func grid(
        _ board: LetterboardBoard,
        budget: CGFloat,
        padding: CGFloat,
        spacing: CGFloat
    ) -> some View {
        KeyGrid(
            rows: board.rows,
            columns: board.columns,
            // A board, not a panel: it has the screen to itself, and the whole alphabet
            // has to be on it at once.
            sizing: .board(budget: max(budget, KeyGeometry.minimumHittableSide)),
            titlePointSize: board.titlePointSize,
            // The physical board is printed in capitals — the letterform that survives
            // being read at arm's length, across a room, or by somebody whose vision is
            // not what it was. The message it builds is still ordinary text; the board is
            // the thing that shouts.
            showsCapitals: true,
            theme: theme,
            scheme: scheme,
            spacing: spacing,
            animates: animates,
            accessibilityLabel: "Letterboard",
            coordinateSpace: coordSpace,
            onKey: { action, _ in press(action) }
        )
        .equatable()
        .padding(padding)
        .frame(maxWidth: .infinity)
        .background {
            if isCompact {
                UnevenRoundedRectangle(
                    topLeadingRadius: 24,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 24,
                    style: .continuous
                )
                .fill(Color.primary.opacity(0.05))
                .ignoresSafeArea(edges: .bottom)
            } else {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Color.primary.opacity(0.05))
            }
        }
    }

    // MARK: - One key

    private func press(_ action: KeyAction) {
        switch action {
        case .numbers:
            showingNumbers.toggle()
        case .backspace:
            if !spelled.isEmpty { spelled.removeLast() }
        case .finish:
            guard !spelled.isEmpty else { return }
            speak(spelled)
        case .insert(let character):
            guard !character.isEmpty else { return }
            spelled += character
            // Every letter is said as it is pressed.
            //
            // On a letterboard the letter *is* the utterance: somebody points, and whoever
            // is with them reads it back. Saying it is what closes that loop, and it is the
            // reason a paper board needs a second person at all. So it happens here by
            // default, rather than behind the setting Type puts it behind.
            speak(character)
        // Things the board has no key for. A space bar and a shift are a keyboard's, and
        // a gap is not a key at all.
        case .word, .shift, .gap:
            break
        }
    }
}

/// One of the two controls above the letters.
private struct LetterboardControl: View {
    let title: String
    let symbolName: String
    var isDestructive: Bool = false
    let isEnabled: Bool
    let isCompact: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: symbolName)
                    .font(.system(size: isCompact ? 18 : 22, weight: .bold))
                Text(title)
                    .font(.system(size: isCompact ? 15 : 19, design: .rounded).weight(.bold))
                    .lineLimit(1)
            }
            .foregroundStyle(isDestructive ? Color.red : Color.primary)
            .frame(maxWidth: .infinity)
            .frame(minHeight: isCompact ? 52 : 64)
            .background(Color.primary.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled)
        .opacity(isEnabled ? 1 : 0.55)
        .accessibilityLabel(title)
    }
}
