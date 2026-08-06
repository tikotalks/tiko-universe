import SwiftUI
import TikoKit
import TikoSpeechKit

/// The child-facing play screen for both modes: the formula lands part by part
/// while it is spoken, three big answer tiles are live from the first beat, and
/// the winning tile dances inside its own burst of fireworks. One thing at a
/// time, no explanations — per the family design principles.
struct SumPlayView: View {
    @ObservedObject var i18n: TikoI18n
    @StateObject private var viewModel: SumPlayViewModel
    let onClose: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var celebrationTrigger = 0
    @State private var celebrationVariant: TikoCelebrationVariant = .fireworks
    @State private var winStyle: TikoCardWinStyle = .pop
    @State private var finishTrigger = 0

    @AppStorage(SumSettings.minusEnabledKey) private var minusEnabled = true
    @AppStorage(SumSettings.timesEnabledKey) private var timesEnabled = true
    @AppStorage(SumSettings.divideEnabledKey) private var divideEnabled = true

    private let appColor = SumAppConfig.app.appColor

    init(
        game: SumGame?,
        store: SumPathStore,
        i18n: TikoI18n,
        languageCode: String,
        onClose: @escaping () -> Void,
        regenerate: (() -> SumGame)? = nil,
        speech: TikoSpeechServicing? = nil,
        timings: SumPlayViewModel.Timings = .standard
    ) {
        self.i18n = i18n
        self.onClose = onClose
        let words = store.operatorWords(language: languageCode)
        let speaker = FormulaSpeaker(languageCode: languageCode, words: words)
        let defaults = UserDefaults.standard
        let maxNumber = defaults.object(forKey: SumSettings.maxNumberKey) as? Int ?? 20
        let answerMode = SumAnswerMode(rawValue: defaults.string(forKey: SumSettings.answerModeKey) ?? "") ?? .choice
        _viewModel = StateObject(wrappedValue: SumPlayViewModel(
            game: game,
            languageCode: languageCode,
            speaker: speaker,
            speech: speech ?? TikoSpeechPracticeService(),
            maxNumber: maxNumber,
            answerMode: answerMode,
            regenerate: regenerate,
            timings: timings
        ))
    }

    var body: some View {
        ZStack {
            if viewModel.state == .completed {
                completionView
            } else {
                playContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { viewModel.begin() }
        .onDisappear {
            viewModel.cancel()
            TikoFeedback.stop()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active {
                viewModel.pauseForInterruption()
                TikoFeedback.stop()
            }
        }
        .onChange(of: viewModel.revealTrigger) { _, _ in
            // One small pop per part as it lands.
            TikoFeedback.playPop()
        }
        .onChange(of: viewModel.missTrigger) { _, _ in
            TikoFeedback.playRetry()
        }
        .onChange(of: viewModel.state) { _, state in
            #if DEBUG
            // Hands-free celebrate scene for App Store promo capture.
            if state == .choosing, TikoScreenshotMode.isActive, TikoScreenshotMode.scene == "celebrate" {
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    if let correct = viewModel.choices.first(where: { $0.isCorrect }) {
                        viewModel.choose(correct)
                    }
                }
            }
            #endif
            if state == .celebrating {
                celebrationTrigger += 1
                celebrationVariant = TikoCelebrationVariant.allCases.randomElement() ?? .fireworks
                winStyle = TikoCardWinStyle.allCases.randomElement() ?? .pop
                TikoFeedback.playSuccess()
            }
        }
        // The burst belongs to the whole window, not to the tile that earned it.
        // Pinned to a box around the tile it was clipped at the box edge, which
        // read as fireworks going off inside a picture frame.
        .overlay {
            if viewModel.wonValue != nil || viewModel.state == .celebrating {
                TikoCelebrationOverlay(
                    trigger: celebrationTrigger,
                    variant: celebrationVariant,
                    emoji: viewModel.session.game?.emoji ?? "🎉",
                    appColor: appColor,
                    // Ten of these per round, so the burst is trimmed to fit
                    // inside the hold rather than outliving it.
                    duration: 1.0
                )
                .allowsHitTesting(false)
            }
        }
        .overlay {
            if viewModel.isPausedForInterruption {
                interruptionOverlay
            }
        }
    }

    // MARK: - Play content

    private var playContent: some View {
        GeometryReader { geo in
            let isCompact = geo.size.width < 500
            VStack(spacing: isCompact ? 10 : 18) {
                Spacer(minLength: 0)

                formulaDisplay(compact: isCompact)

                if viewModel.state == .building {
                    KeypadView(
                        i18n: i18n,
                        appColor: appColor,
                        minusEnabled: minusEnabled,
                        timesEnabled: timesEnabled,
                        divideEnabled: divideEnabled,
                        canSubmit: viewModel.canSubmit,
                        onDigit: { viewModel.pressDigit($0) },
                        onOperator: { viewModel.pressOperator($0) },
                        onDelete: { viewModel.pressDelete() },
                        onEquals: { viewModel.pressEquals() }
                    )
                    .frame(maxWidth: 460)
                } else if viewModel.activeFormula != nil {
                    if viewModel.showsChoiceTiles {
                        if !viewModel.choices.isEmpty {
                            answerTiles(compact: isCompact)
                        }
                    } else {
                        AnswerTypePad(
                            i18n: i18n,
                            appColor: appColor,
                            canSubmit: viewModel.canSubmitTyped,
                            onDigit: { viewModel.typeDigit($0) },
                            onDelete: { viewModel.typeDelete() },
                            onSubmit: { viewModel.submitTyped() }
                        )
                        .frame(maxWidth: 380)
                    }
                }

                Spacer(minLength: 0)

                controls
                    .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // Old tiles leave, new ones come in, while the next sum is spoken.
            .animation(
                reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.75),
                value: viewModel.activeFormula
            )
        }
    }

    // MARK: - Formula display

    /// No equals sign: the sum reads "10 + 20" and the answer is the tile the
    /// child picks, never something the screen fills in.
    @ViewBuilder
    private func formulaDisplay(compact: Bool) -> some View {
        let size: CGFloat = compact ? 56 : 76
        Group {
            if viewModel.state == .building {
                Text(draftText.isEmpty ? " " : draftText)
                    .font(.system(size: size, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.4)
                    .lineLimit(1)
            } else if let formula = viewModel.activeFormula {
                HStack(spacing: compact ? 14 : 22) {
                    formulaPart("\(formula.a)", index: 0, size: size)
                    formulaPart(formula.op.symbol, index: 1, size: size)
                    formulaPart("\(formula.b)", index: 2, size: size)
                }
            } else {
                Text(" ").font(.system(size: size, weight: .heavy, design: .rounded))
            }
        }
        .foregroundStyle(.primary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityFormula)
    }

    @ViewBuilder
    private func formulaPart(_ text: String, index: Int, size: CGFloat) -> some View {
        let landed = viewModel.revealedParts > index
        Text(text)
            .font(.system(size: size, weight: .heavy, design: .rounded))
            .minimumScaleFactor(0.4)
            .lineLimit(1)
            .scaleEffect(landed ? 1 : 0.3)
            .opacity(landed ? 1 : 0)
            .animation(
                reduceMotion ? .easeOut(duration: 0.15) : .spring(response: 0.34, dampingFraction: 0.5),
                value: landed
            )
    }

    private var draftText: String {
        var parts: [String] = []
        if !viewModel.draft.aText.isEmpty { parts.append(viewModel.draft.aText) }
        if let op = viewModel.draft.op { parts.append(op.symbol) }
        if !viewModel.draft.bText.isEmpty { parts.append(viewModel.draft.bText) }
        return parts.joined(separator: " ")
    }

    private var accessibilityFormula: String {
        guard let formula = viewModel.activeFormula else { return draftText }
        return FormulaSpeaker(languageCode: viewModel.languageCode).formulaUtterance(formula)
    }

    // MARK: - Answer tiles

    private func answerTiles(compact: Bool) -> some View {
        HStack(spacing: compact ? 14 : 22) {
            ForEach(viewModel.choices) { choice in
                AnswerTileView(
                    choice: choice,
                    side: compact ? 92 : 120,
                    appColor: appColor,
                    languageCode: viewModel.languageCode,
                    isWrong: viewModel.wrongValue == choice.value,
                    isOff: viewModel.disabledValues.contains(choice.value),
                    hasWon: viewModel.wonValue == choice.value,
                    isPulsing: viewModel.pulseCorrect && choice.isCorrect && viewModel.wonValue == nil,
                    isAnswerable: viewModel.isAnswerable,
                    celebrationTrigger: celebrationTrigger,
                    winStyle: winStyle
                ) {
                    viewModel.choose(choice)
                }
            }
        }
        .transition(.scale(scale: 0.6).combined(with: .opacity))
    }

    // MARK: - Controls (icon-only round buttons)

    private var controls: some View {
        HStack(spacing: 28) {
            if viewModel.activeFormula != nil {
                roundButton(systemImage: "arrow.counterclockwise", prominent: false) {
                    viewModel.replay()
                }
                .accessibilityIdentifier("sum.play.replay")
                .accessibilityLabel(i18n.t("sum.practice.replay"))
            }
            if !viewModel.isFreePlay {
                roundButton(systemImage: "arrow.forward", prominent: false) {
                    viewModel.skip()
                }
                .accessibilityIdentifier("sum.play.skip")
                .accessibilityLabel(i18n.t("sum.practice.skip"))
            }
        }
    }

    private func roundButton(systemImage: String, prominent: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(prominent ? .white : appColor.palette.primary)
                .frame(width: 64, height: 64)
                .background(prominent ? appColor.palette.primary : appColor.palette.primary.opacity(0.14))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Completion

    /// The end of a ten: one big celebration, then the only two things worth
    /// doing next — go back, or play another ten.
    private var completionView: some View {
        VStack(spacing: 28) {
            Spacer()

            Text(viewModel.session.game?.emoji ?? "🎉")
                .font(.system(size: 120))
                .accessibilityHidden(true)
                .phaseAnimator(
                    reduceMotion ? [TikoCardWinStyle.Phase()] : TikoCardWinStyle.bounce.phases,
                    trigger: finishTrigger
                ) { view, phase in
                    view
                        .scaleEffect(phase.scale)
                        .rotationEffect(.degrees(phase.rotation))
                        .offset(y: phase.y)
                } animation: { _ in
                    .spring(response: 0.38, dampingFraction: 0.5)
                }

            Spacer()

            HStack(spacing: 16) {
                endButton(
                    systemImage: "square.grid.2x2",
                    label: i18n.t("sum.practice.back"),
                    prominent: false,
                    action: onClose
                )
                .accessibilityIdentifier("sum.play.home")

                endButton(
                    systemImage: "arrow.counterclockwise",
                    label: i18n.t("sum.play.playAgain"),
                    prominent: true
                ) {
                    viewModel.restart()
                }
                .accessibilityIdentifier("sum.play.restart")
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay {
            TikoCelebrationOverlay(
                trigger: finishTrigger,
                variant: .fireworks,
                emoji: viewModel.session.game?.emoji ?? "🎉",
                appColor: appColor
            )
            .allowsHitTesting(false)
        }
        .onAppear {
            finishTrigger += 1
            TikoFeedback.playSuccess()
        }
    }

    private func endButton(
        systemImage: String,
        label: String,
        prominent: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 30, weight: .heavy))
                Text(label)
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            .foregroundStyle(prominent ? .white : appColor.palette.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 22)
            .background(prominent ? appColor.palette.primary : appColor.palette.primary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var interruptionOverlay: some View {
        Button {
            viewModel.resumeAfterInterruption()
        } label: {
            Image(systemName: "play.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(appColor.palette.primary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.regularMaterial)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(i18n.t("sum.practice.replay"))
    }
}

// MARK: - Answer tile

/// One answer tile through its whole life: waiting, wrongly picked (stays put,
/// flashes red, wobbles), switched off (dimmed but still readable), or the
/// winner (which dances where it stands, while the fireworks go off across the
/// whole window). Owns its shake counter so a miss on one tile never twitches
/// the others.
private struct AnswerTileView: View {
    let choice: AnswerChoice
    let side: CGFloat
    let appColor: TikoAppColor
    let languageCode: String
    let isWrong: Bool
    let isOff: Bool
    let hasWon: Bool
    let isPulsing: Bool
    let isAnswerable: Bool
    let celebrationTrigger: Int
    let winStyle: TikoCardWinStyle
    let onTap: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shakeTrigger = 0

    private var background: Color {
        isWrong ? Color(hex: 0xef4444) : appColor.palette.primary.opacity(isOff ? 0.08 : 0.16)
    }

    var body: some View {
        Button(action: onTap) {
            Text("\(choice.value)")
                .font(.system(size: side * 0.43, weight: .heavy, design: .rounded))
                .foregroundStyle(isWrong ? Color.white : appColor.palette.primary)
                .frame(width: side, height: side)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                .opacity(isOff ? 0.4 : 1)
                .animation(.easeOut(duration: 0.16), value: isWrong)
                .animation(.easeOut(duration: 0.25), value: isOff)
                .scaleEffect(isPulsing ? 1.08 : 1.0)
                .animation(
                    isPulsing && !reduceMotion
                        ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                        : .default,
                    value: isPulsing
                )
                .phaseAnimator(shakePhases, trigger: shakeTrigger) { view, offset in
                    view.offset(x: offset)
                } animation: { _ in
                    .easeInOut(duration: 0.06)
                }
                // The winning tile dances where it stands; the burst that goes
                // with it is a full-window overlay owned by the play view.
                .phaseAnimator(
                    reduceMotion ? [TikoCardWinStyle.Phase()] : winStyle.phases,
                    trigger: hasWon ? celebrationTrigger : 0
                ) { view, phase in
                    view
                        .scaleEffect(phase.scale)
                        .rotationEffect(.degrees(phase.rotation))
                        .offset(y: phase.y)
                } animation: { _ in
                    .spring(response: 0.34, dampingFraction: 0.44)
                }
        }
        .buttonStyle(.plain)
        .disabled(isOff || !isAnswerable)
        .onChange(of: isWrong) { _, wrong in
            if wrong, !reduceMotion { shakeTrigger += 1 }
        }
        .onLongPressGesture(minimumDuration: 0.4) {
            // Audio preview without committing — choice-making the AAC way.
            let speaker = FormulaSpeaker(languageCode: languageCode)
            Task { await TikoVoiceService.shared.speak(speaker.number(choice.value), languageCode: languageCode) }
        }
        .accessibilityIdentifier("sum.answer.\(choice.value)")
        .accessibilityLabel(FormulaSpeaker(languageCode: languageCode).number(choice.value))
    }

    private var shakePhases: [CGFloat] { [0, -13, 11, -8, 6, -3, 0] }
}

// MARK: - Keypad

/// Big friendly keypad: digits left, visible operators right, equals below.
/// Every key speaks; disabled equals just dims (never an error).
struct KeypadView: View {
    @ObservedObject var i18n: TikoI18n
    let appColor: TikoAppColor
    let minusEnabled: Bool
    let timesEnabled: Bool
    let divideEnabled: Bool
    let canSubmit: Bool
    let onDigit: (Int) -> Void
    let onOperator: (SumOperator) -> Void
    let onDelete: () -> Void
    let onEquals: () -> Void

    private var visibleOperators: [SumOperator] {
        SumOperator.enabled(minus: minusEnabled, times: timesEnabled, divide: divideEnabled)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 12) {
                ForEach([[7, 8, 9], [4, 5, 6], [1, 2, 3]], id: \.self) { row in
                    HStack(spacing: 12) {
                        ForEach(row, id: \.self) { digit in
                            digitKey(digit)
                        }
                    }
                }
                HStack(spacing: 12) {
                    key(systemImage: "delete.left", tint: .secondary, action: onDelete)
                        .accessibilityIdentifier("sum.key.delete")
                        .accessibilityLabel(i18n.t("sum.practice.delete"))
                    digitKey(0)
                    key(systemImage: "equal", tint: canSubmit ? .primaryStyle : .dimmed, action: onEquals)
                        .disabled(!canSubmit)
                        .accessibilityIdentifier("sum.key.equals")
                        .accessibilityLabel(i18n.t("sum.practice.equals"))
                }
            }

            VStack(spacing: 12) {
                ForEach(visibleOperators, id: \.self) { op in
                    key(systemImage: op.systemImage, tint: .primaryStyle) {
                        onOperator(op)
                    }
                    .accessibilityIdentifier("sum.key.\(op.rawValue)")
                    .accessibilityLabel(op.symbol)
                }
            }
        }
    }

    private enum KeyTint { case primaryStyle, secondary, dimmed }

    private func digitKey(_ digit: Int) -> some View {
        Button {
            onDigit(digit)
        } label: {
            Text("\(digit)")
                .font(.system(size: 30, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)
                .frame(width: 72, height: 64)
                .background(appColor.palette.primary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.key.\(digit)")
    }

    private func key(systemImage: String, tint: KeyTint, action: @escaping () -> Void) -> some View {
        let foreground: Color
        let background: Color
        switch tint {
        case .primaryStyle:
            foreground = .white
            background = appColor.palette.primary
        case .secondary:
            foreground = .secondary
            background = appColor.palette.primary.opacity(0.08)
        case .dimmed:
            foreground = .white.opacity(0.6)
            background = appColor.palette.primary.opacity(0.35)
        }
        return Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(foreground)
                .frame(width: 72, height: 64)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}


// MARK: - Type-mode answer pad

/// Digits + delete + check: the child types the result. Same big friendly
/// keys as the free-play keypad, no operators.
struct AnswerTypePad: View {
    @ObservedObject var i18n: TikoI18n
    let appColor: TikoAppColor
    let canSubmit: Bool
    let onDigit: (Int) -> Void
    let onDelete: () -> Void
    let onSubmit: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            ForEach([[7, 8, 9], [4, 5, 6], [1, 2, 3]], id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(row, id: \.self) { digit in
                        digitKey(digit)
                    }
                }
            }
            HStack(spacing: 12) {
                iconKey("delete.left", enabled: true, filled: false, action: onDelete)
                    .accessibilityIdentifier("sum.type.delete")
                    .accessibilityLabel(i18n.t("sum.practice.delete"))
                digitKey(0)
                iconKey("checkmark", enabled: canSubmit, filled: true, action: onSubmit)
                    .accessibilityIdentifier("sum.type.submit")
                    .accessibilityLabel(i18n.t("common.done"))
            }
        }
    }

    private func digitKey(_ digit: Int) -> some View {
        Button {
            onDigit(digit)
        } label: {
            Text("\(digit)")
                .font(.system(size: 30, weight: .heavy, design: .rounded))
                .foregroundStyle(.primary)
                .frame(width: 72, height: 64)
                .background(appColor.palette.primary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sum.type.\(digit)")
    }

    private func iconKey(_ systemImage: String, enabled: Bool, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(filled ? .white.opacity(enabled ? 1 : 0.6) : Color.secondary)
                .frame(width: 72, height: 64)
                .background(filled ? appColor.palette.primary.opacity(enabled ? 1 : 0.35) : appColor.palette.primary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
