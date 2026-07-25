import SwiftUI
import TikoKit

/// The child-facing play screen for both modes: a spoken formula, three big
/// answer tiles, icon-only round controls, celebration on every win. One
/// thing at a time, no explanations — per the family design principles.
struct SumPlayView: View {
    @ObservedObject var i18n: TikoI18n
    @StateObject private var viewModel: SumPlayViewModel
    let onClose: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var celebrationTrigger = 0
    @State private var celebrationVariant: TikoCelebrationVariant = .explosion
    @State private var winStyle: TikoCardWinStyle = .pop

    @AppStorage(SumSettings.minusEnabledKey) private var minusEnabled = true
    @AppStorage(SumSettings.timesEnabledKey) private var timesEnabled = false
    @AppStorage(SumSettings.divideEnabledKey) private var divideEnabled = false

    private let appColor = SumAppConfig.app.appColor

    init(
        path: SumPath?,
        store: SumPathStore,
        i18n: TikoI18n,
        languageCode: String,
        onClose: @escaping () -> Void,
        speech: TikoSpeechServicing? = nil,
        timings: SumPlayViewModel.Timings = .standard
    ) {
        self.i18n = i18n
        self.onClose = onClose
        let words = store.operatorWords(language: languageCode)
        let speaker = FormulaSpeaker(languageCode: languageCode, words: words)
        let defaults = UserDefaults.standard
        let maxNumber = defaults.object(forKey: SumSettings.maxNumberKey) as? Int ?? 20
        let voiceEnabled = defaults.bool(forKey: SumSettings.voiceAnswerKey)
        _viewModel = StateObject(wrappedValue: SumPlayViewModel(
            path: path,
            languageCode: languageCode,
            speaker: speaker,
            speech: speech ?? TikoSpeechPracticeService(),
            maxNumber: maxNumber,
            voiceAnsweringEnabled: voiceEnabled,
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
        .onChange(of: viewModel.state) { oldState, state in
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
                celebrationVariant = TikoCelebrationVariant.allCases.randomElement() ?? .explosion
                winStyle = TikoCardWinStyle.allCases.randomElement() ?? .pop
                TikoFeedback.playSuccess()
            }
            if case .retrying = state, oldState == .choosing {
                TikoFeedback.playRetry()
            }
        }
        .overlay {
            if viewModel.state == .celebrating {
                TikoCelebrationOverlay(
                    trigger: celebrationTrigger,
                    variant: celebrationVariant,
                    emoji: viewModel.session.path?.emoji ?? "🧮",
                    appColor: appColor
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
                } else if !viewModel.choices.isEmpty {
                    answerTiles(compact: isCompact)
                }

                Spacer(minLength: 0)

                controls
                    .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    @ViewBuilder
    private func formulaDisplay(compact: Bool) -> some View {
        let text = displayText
        Text(text.isEmpty ? " " : text)
            .font(.system(size: compact ? 56 : 76, weight: .heavy, design: .rounded))
            .minimumScaleFactor(0.4)
            .lineLimit(1)
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .phaseAnimator(
                reduceMotion ? [TikoCardWinStyle.Phase()] : winStyle.phases,
                trigger: celebrationTrigger
            ) { view, phase in
                view
                    .scaleEffect(phase.scale)
                    .rotationEffect(.degrees(phase.rotation))
                    .offset(y: phase.y)
            } animation: { _ in
                .spring(response: 0.34, dampingFraction: 0.44)
            }
            .accessibilityLabel(accessibilityFormula)
    }

    private var displayText: String {
        if viewModel.state == .building {
            var parts: [String] = []
            if !viewModel.draft.aText.isEmpty { parts.append(viewModel.draft.aText) }
            if let op = viewModel.draft.op { parts.append(op.symbol) }
            if !viewModel.draft.bText.isEmpty { parts.append(viewModel.draft.bText) }
            return parts.joined(separator: " ")
        }
        if let formula = viewModel.activeFormula {
            if viewModel.state == .celebrating, let result = formula.result {
                return "\(formula.a) \(formula.op.symbol) \(formula.b) = \(result)"
            }
            return "\(formula.a) \(formula.op.symbol) \(formula.b) ="
        }
        return ""
    }

    private var accessibilityFormula: String {
        guard let formula = viewModel.activeFormula else { return displayText }
        let speaker = FormulaSpeaker(languageCode: viewModel.languageCode)
        return speaker.formulaUtterance(formula)
    }

    // MARK: - Answer tiles

    private func answerTiles(compact: Bool) -> some View {
        HStack(spacing: compact ? 14 : 22) {
            ForEach(viewModel.choices) { choice in
                answerTile(choice, compact: compact)
            }
        }
    }

    private func answerTile(_ choice: AnswerChoice, compact: Bool) -> some View {
        let faded = viewModel.fadedValues.contains(choice.value)
        let pulsing = viewModel.pulseCorrect && choice.isCorrect
        return Button {
            viewModel.choose(choice)
        } label: {
            Text("\(choice.value)")
                .font(.system(size: compact ? 40 : 52, weight: .heavy, design: .rounded))
                .foregroundStyle(appColor.palette.primary)
                .frame(width: compact ? 92 : 120, height: compact ? 92 : 120)
                .background(appColor.palette.primary.opacity(0.16))
                .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                .opacity(faded ? 0.2 : 1)
                .scaleEffect(pulsing ? 1.08 : 1.0)
                .animation(
                    pulsing && !reduceMotion
                        ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                        : .default,
                    value: pulsing
                )
        }
        .buttonStyle(.plain)
        .disabled(faded || viewModel.state != .choosing)
        .onLongPressGesture(minimumDuration: 0.4) {
            // Audio preview without committing — choice-making the AAC way.
            let speaker = FormulaSpeaker(languageCode: viewModel.languageCode)
            Task { await TikoVoiceService.shared.speak(speaker.number(choice.value), languageCode: viewModel.languageCode) }
        }
        .accessibilityIdentifier("sum.answer.\(choice.value)")
        .accessibilityLabel(FormulaSpeaker(languageCode: viewModel.languageCode).number(choice.value))
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

    // MARK: - Completion / interruption

    private var completionView: some View {
        VStack(spacing: 24) {
            Spacer()
            Text(viewModel.session.path?.emoji ?? "🎉")
                .font(.system(size: 110))
                .accessibilityHidden(true)
            Spacer()
            HStack(spacing: 28) {
                roundButton(systemImage: "arrow.counterclockwise", prominent: true) {
                    viewModel.restart()
                }
                .accessibilityIdentifier("sum.play.restart")
                .accessibilityLabel(i18n.t("sum.practice.replay"))
                roundButton(systemImage: "square.grid.2x2", prominent: false, action: onClose)
                    .accessibilityIdentifier("sum.play.home")
                    .accessibilityLabel(i18n.t("sum.practice.back"))
            }
            .padding(.bottom, 32)
        }
        .onAppear { TikoFeedback.playSuccess() }
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
        var ops: [SumOperator] = [.plus]
        if minusEnabled { ops.append(.minus) }
        if timesEnabled { ops.append(.times) }
        if divideEnabled { ops.append(.dividedBy) }
        return ops
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
