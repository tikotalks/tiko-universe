import SwiftUI
import TikoKit
import AVFoundation

// MARK: - Flow layout (wraps word chips onto multiple lines)

/// Lays subviews left-to-right, wrapping to a new line whenever the next
/// subview would overflow the available width.
private struct TypeFlowLayout: Layout {
    var horizontalSpacing: CGFloat = 6
    var verticalSpacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalWidth: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowWidth > 0, rowWidth + horizontalSpacing + size.width > maxWidth {
                totalWidth = max(totalWidth, rowWidth)
                totalHeight += rowHeight + verticalSpacing
                rowWidth = size.width
                rowHeight = size.height
            } else {
                rowWidth += (rowWidth > 0 ? horizontalSpacing : 0) + size.width
                rowHeight = max(rowHeight, size.height)
            }
        }
        totalWidth = max(totalWidth, rowWidth)
        totalHeight += rowHeight

        let resolvedWidth = maxWidth == .infinity ? totalWidth : maxWidth
        return CGSize(width: resolvedWidth, height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        // Group subviews into rows first so each row's total width is known, then
        // place each row centred within the available width.
        struct Row {
            var indices: [Int] = []
            var width: CGFloat = 0
            var height: CGFloat = 0
        }

        var rows: [Row] = []
        var current = Row()
        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            if current.width > 0, current.width + horizontalSpacing + size.width > bounds.width {
                rows.append(current)
                current = Row()
            }
            current.indices.append(index)
            current.width += (current.width > 0 ? horizontalSpacing : 0) + size.width
            current.height = max(current.height, size.height)
        }
        if !current.indices.isEmpty { rows.append(current) }

        var y = bounds.minY
        for row in rows {
            var x = bounds.minX + (bounds.width - row.width) / 2
            for index in row.indices {
                let subview = subviews[index]
                let size = subview.sizeThatFits(.unspecified)
                subview.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
                x += size.width + horizontalSpacing
            }
            y += row.height + verticalSpacing
        }
    }
}

// MARK: - Animated letters (fly to bar / explode on delete)

private struct FlyingLetter: Identifiable {
    enum Kind { case fly, explode }
    let id = UUID()
    let char: String
    let start: CGPoint
    let target: CGPoint
    let kind: Kind
    let color: Color
}

private struct FlyingLetterView: View {
    let item: FlyingLetter
    let color: Color
    let fontSize: CGFloat

    @State private var progress: CGFloat = 0

    var body: some View {
        Group {
            switch item.kind {
            case .fly:
                Text(item.char)
                    .font(.system(size: fontSize, design: .rounded).weight(.heavy))
                    .foregroundStyle(color)
                    .scaleEffect(1 - 0.55 * progress)
                    .opacity(1 - progress)
                    .position(
                        x: item.start.x + (item.target.x - item.start.x) * progress,
                        y: item.start.y + (item.target.y - item.start.y) * progress
                    )
            case .explode:
                ZStack {
                    Text(item.char)
                        .font(.system(size: fontSize, design: .rounded).weight(.heavy))
                        .foregroundStyle(color)
                        .scaleEffect(1 + 1.6 * progress)
                        .rotationEffect(.degrees(Double(progress) * 18))
                        .opacity(1 - progress)

                    ForEach(0..<7) { i in
                        let angle = Double(i) / 7 * 2 * .pi
                        Circle()
                            .fill(color)
                            .frame(width: 7, height: 7)
                            .offset(
                                x: CGFloat(cos(angle)) * 46 * progress,
                                y: CGFloat(sin(angle)) * 46 * progress
                            )
                            .opacity(1 - progress)
                    }
                }
                .position(item.start)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: item.kind == .fly ? 0.45 : 0.42)) {
                progress = 1
            }
        }
    }
}

// MARK: - Letter speech

/// Letters go through the shared voice service like everything else, on their
/// own instance so a keypress does not cut off sentence playback. The keyboard
/// is a fixed vocabulary, so `prefetch` warms every key up front and each
/// letter is served from the disk cache from then on — including in languages
/// the device has no voice for.
@MainActor
private final class LetterSpeaker {
    private let voice = TikoVoiceService()

    func speak(_ letter: String, languageCode: String) {
        voice.speakDetached(letter, languageCode: languageCode)
    }

    func warm(keys: [String], languageCode: String) {
        Task { await voice.prefetch(texts: keys, languageCode: languageCode) }
    }
}

// MARK: - Virtual keyboard

/// The panel at the foot of the screen.
///
/// It owns no arrangement of its own: it asks ``KeyboardLayoutDefinition`` what the keys
/// are and hands them to the one ``KeyGrid``. Everything that makes a keyboard look like
/// a keyboard — the home row's half-key offset, backspace reaching the right edge, a
/// space bar wide enough to hit blind — is arithmetic in that definition, in columns
/// rather than points, so the same keyboard is right on a phone and on a 13-inch iPad.
private struct TypeKeyboardPanel: View {
    let layout: TypeKeyboardLayout
    let languageCode: String
    let keySize: TypeKeySize
    let theme: KeyTheme
    let showsCapitals: Bool
    let isShifted: Bool
    let showingNumbers: Bool
    let animates: Bool
    let coordSpace: String
    /// Vertical space the keyboard may occupy. Rows are tuned down to this so they don't
    /// become oversized on short layouts (e.g. iPhone landscape). 0 = no height cap.
    let maxKeyboardHeight: CGFloat
    let onKey: (KeyAction, CGRect) -> Void

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorScheme) private var scheme

    private let spacing: CGFloat = 7
    private let sidePadding: CGFloat = 12

    /// The arrangement, as data. A phone and an iPad get different ones — the digits
    /// live behind `123` where there is no room for a numeral row.
    var definition: KeyboardLayoutDefinition {
        KeyboardLayoutDefinition.definition(
            for: layout,
            languageCode: languageCode,
            keySize: keySize,
            enlargedForAccessibilityText: dynamicTypeSize.isAccessibilitySize,
            isShifted: isShifted,
            isCompactWidth: horizontalSizeClass == .compact,
            showingNumbers: showingNumbers
        )
    }

    var body: some View {
        let keyboard = definition
        KeyGrid(
            rows: keyboard.rows,
            columns: keyboard.totalUnits,
            sizing: .panel(tunedHeight: tunedHeight(keyboard)),
            titlePointSize: keyboard.titlePointSize,
            showsCapitals: showsCapitals,
            isShifted: isShifted,
            theme: theme,
            scheme: scheme,
            spacing: spacing,
            animates: animates,
            accessibilityLabel: "Keyboard",
            coordinateSpace: coordSpace,
            onKey: onKey
        )
        .equatable()
        .padding(.horizontal, sidePadding)
        .padding(.vertical, sidePadding * 0.6)
        // Pin the keyboard to the available width rather than letting its own content
        // decide: measuring the content created a feedback loop where keys could grow on
        // rotation to landscape but never shrink back in portrait.
        .frame(maxWidth: .infinity)
    }

    /// The tuned row height, brought down to whatever height the panel was actually given.
    ///
    /// The preset says how tall a row wants to be; this says how tall it may be. Never
    /// below the platform touch floor — a keyboard too tall for its box is a bug to see,
    /// not one to hide behind keys nobody can hit.
    private func tunedHeight(_ definition: KeyboardLayoutDefinition) -> Double {
        let rows = Double(definition.rows.count)
        guard maxKeyboardHeight > 0, rows > 0 else { return definition.keyHeight }
        let chrome = Double(sidePadding * 1.2) + Double(spacing) * (rows - 1)
        let perRow = (Double(maxKeyboardHeight) - chrome) / rows
        return max(Double(KeyGeometry.minimumHittableSide), min(definition.keyHeight, perRow))
    }
}

// MARK: - Settings menu row

private struct TypePickerRow<MenuContent: View>: View {
    let title: String
    let icon: String
    let valueLabel: String
    let appColor: TikoAppColor
    @ViewBuilder let menuContent: () -> MenuContent

    var body: some View {
        Menu {
            menuContent()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(appColor.palette.primary)
                    .frame(width: 40, height: 40)
                    .background(appColor.palette.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                Text(title)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))

                Spacer()

                Text(valueLabel)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)

                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .foregroundStyle(.primary)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(14)
        .background(Color(.systemBackground))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

// MARK: - Main view

struct TypeView: View {
    @AppStorage("type.words") private var wordsData = Data()
    @AppStorage("type.currentWord") private var currentWord = ""
    @AppStorage("type.keyboardLayout") private var keyboardLayoutID = TypeKeyboardLayout.familiar.rawValue
    @AppStorage("type.keySize") private var keySizeRaw = TypeKeySize.standard.rawValue
    @AppStorage("type.keyTheme") private var keyThemeRaw = KeyTheme.classic.rawValue
    @AppStorage("type.speakLetters") private var speakLetters = false
    @AppStorage("type.useCapitals") private var useCapitals = true
    @AppStorage("type.showAnimations") private var showAnimations = true
    @AppStorage("tiko.language") private var languageCode = "en"

    @StateObject private var i18n = TikoI18n(app: .type)
    @State private var words: [String] = []
    @State private var isSpeaking = false
    @State private var flyingLetters: [FlyingLetter] = []
    @State private var barFrame: CGRect = .zero
    @State private var currentWordFrame: CGRect = .zero
    @State private var availableHeight: CGFloat = 0
    /// Shift, one press at a time — it capitalises the next letter and lets go, which is
    /// what a phone keyboard does and what somebody writing a name expects.
    @State private var isShifted = false
    /// Whether `123` has been pressed. Not persisted: a keyboard comes back to letters.
    @State private var showingNumbers = false
    /// Whether the letterboard has the screen instead of the keyboard.
    @State private var showingLetterboard = false

    private let coordSpace = "typeRoot"
    private let currentWordColor = Color(hex: 0x4dabf7)

    private let speechService = TikoVoiceService()
    private let letterSpeaker = LetterSpeaker()

    @Environment(\.colorScheme) private var scheme

    private var typePrimary: Color { TikoAppColor.type.palette.primary }
    private var typeDark: Color { TikoAppColor.type.palette.dark }

    private var keyTheme: KeyTheme {
        KeyTheme(rawValue: keyThemeRaw) ?? .classic
    }

    private var keySize: TypeKeySize {
        TypeKeySize(rawValue: keySizeRaw) ?? .standard
    }

    private var currentLayout: TypeKeyboardLayout {
        KeyboardLayouts.layout(for: keyboardLayoutID)
    }

    /// What the Familiar option resolves to right now, so the picker can say so rather
    /// than making the person guess which keyboard "Familiar" means for their language.
    private var familiarLabel: String {
        "Familiar (\(TypeKeyboardLayout.familiarArrangement(forLanguageCode: languageCode).label))"
    }

    private var hasContent: Bool {
        !words.isEmpty || !currentWord.isEmpty
    }

    var body: some View {
        TikoAppShell(
            appConfig: TypeAppConfig.app,
            appName: i18n.t("type.appName"),
            onAccountDeleted: { resetLocalDataAfterAccountDeletion() },
            onLoggedOut: { resetLocalDataAfterAccountDeletion() },
            settingsContent: {
                TikoSettingsSection(title: i18n.t("type.settings.title")) {
                    TikoSettingsToggleRow(
                        title: "Speak each letter",
                        icon: "character.bubble.fill",
                        appColor: .type,
                        isOn: $speakLetters
                    )
                    TikoSettingsToggleRow(
                        title: "Use capital letters",
                        icon: "textformat.alt",
                        appColor: .type,
                        isOn: $useCapitals
                    )
                    TikoSettingsToggleRow(
                        title: "Show animations",
                        icon: "sparkles",
                        appColor: .type,
                        isOn: $showAnimations
                    )
                    TypePickerRow(
                        title: "Keyboard layout",
                        icon: "keyboard",
                        valueLabel: currentLayout == .familiar ? familiarLabel : currentLayout.label,
                        appColor: .type
                    ) {
                        ForEach(KeyboardLayouts.all) { layout in
                            Button {
                                keyboardLayoutID = layout.id
                            } label: {
                                let label = layout == .familiar ? familiarLabel : layout.label
                                if layout.id == keyboardLayoutID {
                                    Label(label, systemImage: "checkmark")
                                } else {
                                    Text(label)
                                }
                            }
                        }
                    }
                    TypePickerRow(
                        title: "Key size",
                        icon: "arrow.up.left.and.arrow.down.right",
                        valueLabel: keySize.label,
                        appColor: .type
                    ) {
                        ForEach(TypeKeySize.allCases) { size in
                            Button {
                                keySizeRaw = size.rawValue
                            } label: {
                                if size.rawValue == keySizeRaw {
                                    Label(size.label, systemImage: "checkmark")
                                } else {
                                    Text(size.label)
                                }
                            }
                        }
                    }
                    TypePickerRow(
                        title: "Key theme",
                        icon: "paintpalette.fill",
                        valueLabel: keyTheme.label,
                        appColor: .type
                    ) {
                        ForEach(KeyTheme.allCases) { theme in
                            Button {
                                keyThemeRaw = theme.rawValue
                            } label: {
                                HStack {
                                    Circle().fill(theme.swatch).frame(width: 14, height: 14)
                                    Text(theme.label)
                                    if theme.rawValue == keyThemeRaw {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ) {
            Group {
                if showingLetterboard {
                    LetterboardView(
                        languageCode: languageCode,
                        keySize: keySize,
                        theme: keyTheme,
                        animates: showAnimations,
                        speak: speakOnBoard,
                        exit: { showingLetterboard = false }
                    )
                } else {
                    keyboardScreen
                }
            }
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            if TikoScreenshotMode.isActive {
                // Screenshot / UI-test mode is deterministic: never inherit the
                // persisted in-progress word or saved chips from a previous run.
                words = []
                currentWord = ""
                if TikoScreenshotMode.scene == "sentence" { words = ["Hello", "world"] }
                return
            }
            loadWords()
            migrateOldText()
            warmLetterVoices()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
            warmLetterVoices()
        }
        .onChange(of: keyboardLayoutID) { _, _ in warmLetterVoices() }
    }

    // MARK: - The typing screen

    private var keyboardScreen: some View {
        ZStack {
            VStack(spacing: 0) {
                Spacer(minLength: 8)

                VStack(spacing: 16) {
                    typeBar

                    HStack(spacing: 16) {
                        Button(action: speakAll) {
                            Image(systemName: isSpeaking ? "speaker.wave.3.fill" : "speaker.wave.2.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(typeDark)
                                .frame(width: 56, height: 56)
                                .background(typePrimary.opacity(0.22))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                        .disabled(!hasContent)
                        .accessibilityLabel("Speak")
                        .accessibilityIdentifier("speakButton")

                        Button(action: clearAll) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(typeDark)
                                .frame(width: 56, height: 56)
                                .background(typePrimary.opacity(0.14))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                        .disabled(!hasContent)
                        .accessibilityLabel("Clear")
                        .accessibilityIdentifier("clearButton")

                        // The letterboard lives here rather than in the header, because
                        // the header's buttons belong to a parent and this one does not:
                        // somebody who can no longer hit a keyboard key still has to be
                        // able to reach the board.
                        Button { showingLetterboard = true } label: {
                            Image(systemName: "square.grid.3x3.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(typeDark)
                                .frame(width: 56, height: 56)
                                .background(typePrimary.opacity(0.14))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Letterboard")
                        .accessibilityIdentifier("letterboardButton")
                    }
                }

                Spacer(minLength: 8)

                TypeKeyboardPanel(
                    layout: currentLayout,
                    languageCode: languageCode,
                    keySize: keySize,
                    theme: keyTheme,
                    showsCapitals: useCapitals,
                    isShifted: isShifted,
                    showingNumbers: showingNumbers,
                    animates: showAnimations,
                    coordSpace: coordSpace,
                    maxKeyboardHeight: availableHeight > 0 ? availableHeight * 0.55 : 0,
                    onKey: handleKey
                )
            }
            .padding(.top, 8)
            .background(
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { availableHeight = proxy.size.height }
                        .onChange(of: proxy.size.height) { _, h in availableHeight = h }
                }
            )

            ForEach(flyingLetters) { letter in
                FlyingLetterView(
                    item: letter,
                    color: letter.color,
                    fontSize: letter.kind == .fly ? 32 : 38
                )
            }
        }
        .coordinateSpace(name: coordSpace)
    }

    // MARK: - Type bar (word chips)

    @ViewBuilder
    private var typeBar: some View {
        // Words flow left-to-right and wrap onto new lines when the sentence is
        // wider than the bar, rather than scrolling off-screen horizontally.
        TypeFlowLayout(horizontalSpacing: 6, verticalSpacing: 6) {
            if words.isEmpty && currentWord.isEmpty {
                Text("Type to speak…")
                    .font(.system(.title2, design: .rounded).weight(.bold))
                    .foregroundStyle(.primary.opacity(0.38))
            } else {
                ForEach(Array(words.enumerated()), id: \.offset) { index, word in
                    Text(useCapitals ? word.uppercased() : word)
                        .font(.system(size: UIDevice.current.userInterfaceIdiom == .pad ? 30 : 22, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, UIDevice.current.userInterfaceIdiom == .pad ? 20 : 14)
                        .padding(.vertical, UIDevice.current.userInterfaceIdiom == .pad ? 14 : 10)
                        .background(typePrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .onTapGesture(count: 2) { removeWord(at: index) }
                        .onTapGesture(count: 1) { speakWord(word) }
                        .accessibilityLabel(word)
                        .accessibilityHint("Tap to say, double tap to remove")
                }
            }

            if !currentWord.isEmpty {
                Text(useCapitals ? currentWord.uppercased() : currentWord)
                    .font(.system(size: UIDevice.current.userInterfaceIdiom == .pad ? 30 : 22, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, UIDevice.current.userInterfaceIdiom == .pad ? 20 : 14)
                    .padding(.vertical, UIDevice.current.userInterfaceIdiom == .pad ? 14 : 10)
                    .background(currentWordColor)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .background(
                        GeometryReader { geo in
                            Color.clear
                                .onAppear { currentWordFrame = geo.frame(in: .named(coordSpace)) }
                                .onChange(of: geo.frame(in: .named(coordSpace))) { _, f in currentWordFrame = f }
                        }
                    )
                    .accessibilityLabel(currentWord)
                    .accessibilityIdentifier("typeCurrentWord")
            }
        }
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .accessibilityIdentifier("typeBar")
        .padding(.horizontal, 24)
        .background(
            GeometryReader { geo in
                Color.clear
                    .onAppear { barFrame = geo.frame(in: .named(coordSpace)) }
                    .onChange(of: geo.frame(in: .named(coordSpace))) { _, f in barFrame = f }
            }
        )
    }

    // MARK: - Key handling

    private func handleKey(_ action: KeyAction, from frame: CGRect) {
        switch action {
        case .insert(let fragment):
            // Shift is the only thing that puts a capital into the message. `useCapitals`
            // is a display choice — it shouts the keys and the chips, and leaves the words
            // themselves alone.
            let typed = isShifted ? fragment.uppercased() : fragment
            currentWord += typed
            if speakLetters {
                letterSpeaker.speak(fragment, languageCode: languageCode)
            }
            spawnFly(typed, from: frame)
            // One press, one capital: shift lets go the moment it has been used.
            if isShifted { isShifted = false }
        case .word:
            if !currentWord.isEmpty {
                words = TypeText.committing(words: words, currentWord: currentWord)
                currentWord = ""
                saveWords()
            }
        case .backspace:
            handleBackspace()
        case .numbers:
            showingNumbers.toggle()
        case .shift:
            isShifted.toggle()
        // Not keys this keyboard has. DONE belongs to the letterboard, and a gap is a hole
        // in a row rather than something to press.
        case .finish, .gap:
            break
        }
    }

    private func handleBackspace() {
        if !currentWord.isEmpty {
            let removed = String(currentWord.removeLast())
            spawnExplode(removed)
        } else if !words.isEmpty {
            currentWord = words.removeLast()
            saveWords()
        }
    }

    // MARK: - Letter animations

    private func spawnFly(_ char: String, from frame: CGRect) {
        guard showAnimations, frame != .zero, barFrame != .zero else { return }
        let item = FlyingLetter(
            char: useCapitals ? char.uppercased() : char,
            start: CGPoint(x: frame.midX, y: frame.midY),
            target: CGPoint(x: barFrame.midX, y: barFrame.midY),
            kind: .fly,
            color: typePrimary
        )
        flyingLetters.append(item)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            flyingLetters.removeAll { $0.id == item.id }
        }
    }

    private func spawnExplode(_ char: String) {
        guard showAnimations else { return }
        // Explode at the trailing edge of the current word — where the deleted
        // letter actually sat — falling back to the bar centre if unknown.
        let origin: CGPoint
        if currentWordFrame != .zero {
            origin = CGPoint(x: currentWordFrame.maxX - 12, y: currentWordFrame.midY)
        } else if barFrame != .zero {
            origin = CGPoint(x: barFrame.midX, y: barFrame.midY)
        } else {
            return
        }
        let item = FlyingLetter(
            char: useCapitals ? char.uppercased() : char,
            start: origin,
            target: origin,
            kind: .explode,
            color: .white
        )
        flyingLetters.append(item)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            flyingLetters.removeAll { $0.id == item.id }
        }
    }

    // MARK: - Speech

    private func speakAll() {
        let full = TypeText.speechString(words: words, currentWord: currentWord)
        guard !full.isEmpty else { return }
        speechService.speakDetached(full, languageCode: languageCode) { state in
            isSpeaking = state == .playing
        }
    }

    /// Caches every letter of the current alphabet so typed letters play instantly and
    /// keep working offline. The alphabet rather than the arrangement: the same letters
    /// are on the keyboard whichever way they are arranged, and they are also what the
    /// letterboard is made of.
    private func warmLetterVoices() {
        guard speakLetters else { return }
        let alphabet = KeyboardAlphabet.alphabet(forLanguageCode: languageCode)
        letterSpeaker.warm(keys: alphabet.letters.map(String.init), languageCode: languageCode)
    }

    /// The letterboard's voice: every letter as it is pressed, and the whole spelled
    /// message when DONE is. It does not touch `isSpeaking`, which belongs to the sentence
    /// bar's speak button on the other screen.
    private func speakOnBoard(_ text: String) {
        speechService.speakDetached(text, languageCode: languageCode)
    }

    private func speakWord(_ word: String) {
        speechService.speakDetached(word, languageCode: languageCode) { state in
            isSpeaking = state == .playing
        }
    }

    // MARK: - Word management

    private func removeWord(at index: Int) {
        guard words.indices.contains(index) else { return }
        words.remove(at: index)
        saveWords()
    }

    private func clearAll() {
        words = []
        currentWord = ""
        saveWords()
    }

    /// Called by the shell once the account has been deleted: wipe the saved
    /// sentence and reset all Type settings to their defaults so nothing from
    /// the previous user lingers on the device.
    private func resetLocalDataAfterAccountDeletion() {
        // Clear the typed text.
        words = []
        currentWord = ""
        wordsData = Data()
        UserDefaults.standard.removeObject(forKey: "type.text")

        // Reset settings to defaults.
        keyboardLayoutID = TypeKeyboardLayout.familiar.rawValue
        keySizeRaw = TypeKeySize.standard.rawValue
        keyThemeRaw = KeyTheme.classic.rawValue
        speakLetters = false
        useCapitals = true
        showAnimations = true
        isShifted = false
        showingNumbers = false
        showingLetterboard = false

        // Shared device-level prefs → device defaults (language follows the
        // device locale / English; colour mode follows the device appearance).
        TikoDeviceDefaults.resetSharedPreferences()
    }

    private func saveWords() {
        wordsData = (try? JSONEncoder().encode(words)) ?? Data()
    }

    private func loadWords() {
        guard let decoded = try? JSONDecoder().decode([String].self, from: wordsData) else {
            words = []
            return
        }
        words = decoded
    }

    private func migrateOldText() {
        guard words.isEmpty, currentWord.isEmpty else { return }
        let defaults = UserDefaults.standard
        if let oldText = defaults.string(forKey: "type.text"), !oldText.isEmpty {
            let split = TypeText.split(sentence: oldText)
            words = split.words
            currentWord = split.current
            saveWords()
            defaults.removeObject(forKey: "type.text")
        }
    }
}

#Preview {
    TypeView()
}
