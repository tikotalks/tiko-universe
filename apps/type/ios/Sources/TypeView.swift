import SwiftUI
import TikoKit
import AVFoundation

// MARK: - Keyboard layouts

private struct KeyboardLayout: Identifiable, Hashable {
    let id: String
    let label: String
    let rows: [[String]]
}

private enum KeyboardLayouts {
    static let all: [KeyboardLayout] = [
        KeyboardLayout(id: "qwerty", label: "QWERTY", rows: [
            ["q","w","e","r","t","y","u","i","o","p"],
            ["a","s","d","f","g","h","j","k","l"],
            ["z","x","c","v","b","n","m"],
        ]),
        KeyboardLayout(id: "abc", label: "ABC", rows: [
            ["a","b","c","d","e","f","g","h","i"],
            ["j","k","l","m","n","o","p","q","r"],
            ["s","t","u","v","w","x","y","z"],
        ]),
        KeyboardLayout(id: "azerty", label: "AZERTY", rows: [
            ["a","z","e","r","t","y","u","i","o","p"],
            ["q","s","d","f","g","h","j","k","l","m"],
            ["w","x","c","v","b","n"],
        ]),
        KeyboardLayout(id: "qwertz", label: "QWERTZ", rows: [
            ["q","w","e","r","t","z","u","i","o","p"],
            ["a","s","d","f","g","h","j","k","l"],
            ["y","x","c","v","b","n","m"],
        ]),
        KeyboardLayout(id: "dvorak", label: "Dvorak", rows: [
            ["'",",",".","p","y","f","g","c","r","l"],
            ["a","o","e","u","i","d","h","t","n","s"],
            [";","q","j","k","x","b","m","w","v","z"],
        ]),
    ]

    static let symbols: [[String]] = [
        ["1","2","3","4","5","6","7","8","9","0"],
        ["-","/",":",";","(",")","$","@","&"],
        [".",",","?","!","'"],
    ]

    static func layout(for id: String) -> KeyboardLayout {
        all.first { $0.id == id } ?? all[0]
    }
}

// MARK: - Key themes

private struct KeyThemeColors {
    let key: (String, Int) -> Color
    let keyText: Color
    let special: Color
    let specialText: Color
    /// Background shown briefly while a key is pressed.
    let active: Color
}

private let colorfulPalette: [Color] = [
    Color(hex: 0xFF6B6B),
    Color(hex: 0xFF922B),
    Color(hex: 0xFCC419),
    Color(hex: 0x69DB7C),
    Color(hex: 0x4DABF7),
    Color(hex: 0xCC5DE8),
    Color(hex: 0xF783AC),
    Color(hex: 0x63E6BE),
]

private enum KeyTheme: String, CaseIterable, Identifiable {
    case classic, warm, cool, colorful, contrast, ghost

    var id: String { rawValue }

    var label: String {
        switch self {
        case .classic: "Classic"
        case .warm: "Warm"
        case .cool: "Cool"
        case .colorful: "Colorful"
        case .contrast: "Contrast"
        case .ghost: "Ghost"
        }
    }

    var swatch: Color {
        switch self {
        case .classic: Color(.systemGray5)
        case .warm: TikoAppColor.type.palette.primary
        case .cool: Color(hex: 0x4dabf7)
        case .colorful: colorfulPalette[0]
        case .contrast: .black
        case .ghost: Color(.systemGray3)
        }
    }

    func colors(in scheme: ColorScheme) -> KeyThemeColors {
        switch self {
        case .classic:
            let keyColor = scheme == .dark ? Color(white: 0.24) : Color.white
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: .primary,
                special: scheme == .dark ? Color(white: 0.17) : Color(white: 0.92),
                specialText: .primary,
                active: TikoAppColor.type.palette.primary.opacity(0.40)
            )
        case .warm:
            let keyColor = TikoAppColor.type.palette.primary.opacity(scheme == .dark ? 0.30 : 0.18)
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .white : TikoAppColor.type.palette.dark,
                special: TikoAppColor.type.palette.dark.opacity(scheme == .dark ? 0.55 : 0.30),
                specialText: .white,
                active: TikoAppColor.type.palette.primary.opacity(0.65)
            )
        case .cool:
            let keyColor = Color(hex: 0x4dabf7).opacity(scheme == .dark ? 0.30 : 0.20)
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .white : Color(hex: 0x1864ab),
                special: Color(hex: 0x1864ab).opacity(scheme == .dark ? 0.60 : 0.35),
                specialText: .white,
                active: Color(hex: 0x4dabf7).opacity(0.70)
            )
        case .colorful:
            return KeyThemeColors(
                key: { _, idx in colorfulPalette[idx % colorfulPalette.count] },
                keyText: .white,
                special: scheme == .dark ? Color(white: 0.17) : Color(white: 0.88),
                specialText: .primary,
                active: Color.white.opacity(0.45)
            )
        case .contrast:
            let keyColor: Color = scheme == .dark ? .white : .black
            return KeyThemeColors(
                key: { _, _ in keyColor },
                keyText: scheme == .dark ? .black : .white,
                special: scheme == .dark ? Color(white: 0.10) : Color(white: 0.96),
                specialText: .primary,
                active: TikoAppColor.type.palette.primary
            )
        case .ghost:
            return KeyThemeColors(
                key: { _, _ in Color.clear },
                keyText: .primary,
                special: Color.clear,
                specialText: .primary.opacity(0.6),
                active: TikoAppColor.type.palette.primary.opacity(0.45)
            )
        }
    }
}

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

// MARK: - Single key cap

private struct KeyCap: View {
    let key: String
    let display: String
    let fill: Color
    let textColor: Color
    let activeColor: Color
    let keySide: CGFloat
    let cornerRadius: CGFloat
    let coordSpace: String
    let animate: Bool
    let onKey: (String, CGRect) -> Void

    @State private var frame: CGRect = .zero
    @State private var pressed = false

    var body: some View {
        Button {
            onKey(key, frame)
            triggerPress()
        } label: {
            Text(display)
                .font(.system(size: keySide * 0.42, design: .rounded).weight(.bold))
                .foregroundStyle(textColor)
                .frame(width: keySide, height: keySide)
                .background(
                    ZStack {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous).fill(fill)
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
                            .onAppear { frame = geo.frame(in: .named(coordSpace)) }
                            .onChange(of: geo.frame(in: .named(coordSpace))) { _, f in frame = f }
                    }
                )
        }
        .buttonStyle(.plain)
    }

    private func triggerPress() {
        if animate {
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

// MARK: - Local letter speech (instant, no network)

private final class LetterSpeaker {
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ letter: String, languageCode: String) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        TikoSpeech.configurePlaybackSession()
        let utterance = AVSpeechUtterance(string: letter)
        utterance.voice = AVSpeechSynthesisVoice(language: TikoSpeech.languageCode(for: languageCode))
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.82
        utterance.pitchMultiplier = 1.05
        synthesizer.speak(utterance)
    }
}

// MARK: - Virtual keyboard

private struct TypeKeyboard: View {
    let layout: KeyboardLayout
    let theme: KeyTheme
    let useCapitals: Bool
    let animate: Bool
    let coordSpace: String
    let onKey: (String, CGRect) -> Void
    let onBackspace: () -> Void

    @Environment(\.colorScheme) private var scheme
    @State private var measuredWidth: CGFloat = .zero
    @State private var showSymbols = false

    private let spacing: CGFloat = 7
    private let sidePadding: CGFloat = 12

    private var rows: [[String]] {
        showSymbols ? KeyboardLayouts.symbols : layout.rows
    }

    private var maxKeysPerRow: Int {
        rows.map(\.count).max() ?? 10
    }

    private var keySide: CGFloat {
        let contentWidth = measuredWidth - sidePadding * 2
        guard contentWidth > 0 else { return 32 }
        let totalSpacing = spacing * CGFloat(maxKeysPerRow - 1)
        return max(28, (contentWidth - totalSpacing) / CGFloat(maxKeysPerRow))
    }

    private var cornerRadius: CGFloat { keySide * 0.22 }

    var body: some View {
        let colors = theme.colors(in: scheme)

        VStack(spacing: spacing) {
            ForEach(Array(rows.enumerated()), id: \.offset) { rowIdx, row in
                HStack(spacing: spacing) {
                    ForEach(Array(row.enumerated()), id: \.offset) { colIdx, key in
                        let flatIndex = rowIdx * 100 + colIdx
                        KeyCap(
                            key: key,
                            display: useCapitals ? key.uppercased() : key,
                            fill: colors.key(key, flatIndex),
                            textColor: colors.keyText,
                            activeColor: colors.active,
                            keySide: keySide,
                            cornerRadius: cornerRadius,
                            coordSpace: coordSpace,
                            animate: animate,
                            onKey: onKey
                        )
                    }
                }
            }

            HStack(spacing: spacing) {
                Button { showSymbols.toggle() } label: {
                    Text(showSymbols ? "ABC" : "123")
                        .font(.system(size: keySide * 0.34, design: .rounded).weight(.bold))
                        .foregroundStyle(colors.specialText)
                        .frame(width: keySide * 1.5, height: keySide)
                        .background(colors.special)
                        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                }
                .buttonStyle(.plain)

                Button { onKey(" ", .zero) } label: {
                    ZStack {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(theme == .ghost ? Color.primary.opacity(0.06) : colors.key(" ", 0))
                        if theme == .ghost {
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.22), lineWidth: 1.5)
                        }
                    }
                    .frame(height: keySide)
                }
                .buttonStyle(.plain)

                Button(action: onBackspace) {
                    Image(systemName: "delete.left")
                        .font(.system(size: keySide * 0.42, weight: .bold))
                        .foregroundStyle(colors.specialText)
                        .frame(width: keySide * 1.5, height: keySide)
                        .background(colors.special)
                        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, sidePadding)
        .padding(.vertical, sidePadding * 0.6)
        // Pin the keyboard to the available width so `measuredWidth` reflects
        // the parent, not the keyboard's own (key-size-derived) content width.
        // Measuring the content created a feedback loop where keys could grow
        // on rotation to landscape but never shrink back in portrait.
        .frame(maxWidth: .infinity)
        .background(
            GeometryReader { proxy in
                Color.clear
                    .onAppear { measuredWidth = proxy.size.width }
                    .onChange(of: proxy.size.width) { _, w in measuredWidth = w }
            }
        )
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
    @AppStorage("type.keyboardLayout") private var keyboardLayoutID = "qwerty"
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

    private let coordSpace = "typeRoot"
    private let currentWordColor = Color(hex: 0x4dabf7)

    private let speechService = TikoAtlasSpeechService(app: "type", purpose: "typed-speech")
    private let letterSpeaker = LetterSpeaker()

    @Environment(\.colorScheme) private var scheme

    private var typePrimary: Color { TikoAppColor.type.palette.primary }
    private var typeDark: Color { TikoAppColor.type.palette.dark }

    private var keyTheme: KeyTheme {
        KeyTheme(rawValue: keyThemeRaw) ?? .classic
    }

    private var currentLayout: KeyboardLayout {
        KeyboardLayouts.layout(for: keyboardLayoutID)
    }

    private var hasContent: Bool {
        !words.isEmpty || !currentWord.isEmpty
    }

    var body: some View {
        TikoAppShell(
            appConfig: TypeAppConfig.app,
            appName: i18n.t("type.appName"),
            onAccountDeleted: { resetLocalDataAfterAccountDeletion() },
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
                        valueLabel: currentLayout.label,
                        appColor: .type
                    ) {
                        ForEach(KeyboardLayouts.all) { layout in
                            Button {
                                keyboardLayoutID = layout.id
                            } label: {
                                if layout.id == keyboardLayoutID {
                                    Label(layout.label, systemImage: "checkmark")
                                } else {
                                    Text(layout.label)
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
                    }
                }

                Spacer(minLength: 8)

                TypeKeyboard(
                    layout: currentLayout,
                    theme: keyTheme,
                    useCapitals: useCapitals,
                    animate: showAnimations,
                    coordSpace: coordSpace,
                    onKey: handleKey,
                    onBackspace: handleBackspace
                )
            }
            .padding(.top, 8)

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
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            loadWords()
            migrateOldText()
        }
        .onChange(of: languageCode) { _, code in i18n.setLanguage(code) }
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
            }
        }
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
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

    private func handleKey(_ key: String, from frame: CGRect) {
        if key == " " {
            if !currentWord.isEmpty {
                words.append(currentWord)
                currentWord = ""
                saveWords()
            }
        } else {
            currentWord += key
            if speakLetters {
                letterSpeaker.speak(key, languageCode: languageCode)
            }
            spawnFly(key, from: frame)
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
        let full = (words + (currentWord.isEmpty ? [] : [currentWord])).joined(separator: " ")
        guard !full.isEmpty else { return }
        speechService.speak(full, languageCode: languageCode) { state in
            isSpeaking = state == .playing
        }
    }

    private func speakWord(_ word: String) {
        speechService.speak(word, languageCode: languageCode) { state in
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
        keyboardLayoutID = "qwerty"
        keyThemeRaw = KeyTheme.classic.rawValue
        speakLetters = false
        useCapitals = true
        showAnimations = true
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
            let parts = oldText.split(separator: " ").map(String.init)
            if let last = parts.last, !oldText.hasSuffix(" ") {
                words = Array(parts.dropLast())
                currentWord = last
            } else {
                words = parts
            }
            saveWords()
            defaults.removeObject(forKey: "type.text")
        }
    }
}

#Preview {
    TypeView()
}
