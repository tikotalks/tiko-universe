import SwiftUI
import TikoKit

/// The child-facing practice loop for one category. One card dominates the
/// screen; there is never a transcript, confidence value or technical status
/// visible to the child, and never harsh negative feedback.
struct PracticeScreen: View {
    @ObservedObject var i18n: TikoI18n
    @ObservedObject var store: SayCardStore
    @StateObject private var viewModel: PracticeViewModel
    let onClose: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var celebrationTrigger = 0
    @State private var celebrationVariant: CelebrationVariant = .explosion
    @State private var cardWinStyle: CardWinStyle = .pop
    @State private var showDebugOverlay = false

    private let appColor = SayAppConfig.app.appColor
    /// One source of truth for the fly-in length so the word's spelling can
    /// start right after the image has landed.
    static let cardFlyDuration: TimeInterval = 0.75

    init(
        category: SayCategory,
        store: SayCardStore,
        i18n: TikoI18n,
        languageCode: String,
        onClose: @escaping () -> Void,
        speech: SaySpeechServicing? = nil,
        shuffle: Bool = true,
        timings: PracticeViewModel.Timings = .standard
    ) {
        self.i18n = i18n
        self.store = store
        self.onClose = onClose
        let cards = store.visibleCards(categoryID: category.id, language: languageCode)
        _viewModel = StateObject(wrappedValue: PracticeViewModel(
            category: category,
            cards: cards,
            languageCode: languageCode,
            speech: speech ?? SpeechPracticeService(),
            timings: timings,
            shuffle: shuffle
        ))
    }

    var body: some View {
        ZStack {
            switch viewModel.state {
            case .requestingPermission:
                SpeechPermissionRequestView(i18n: i18n)
            case .permissionDenied:
                SpeechPermissionDeniedView(i18n: i18n) {
                    onClose()
                }
            case .recognitionUnavailable:
                RecognitionUnavailableView(i18n: i18n, languageCode: viewModel.languageCode) {
                    onClose()
                }
            case .completed:
                SessionCompleteView(i18n: i18n) {
                    viewModel.restartSession()
                } onChooseCategory: {
                    onClose()
                }
            default:
                practiceContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            viewModel.begin()
            let category = viewModel.category
            let language = viewModel.languageCode
            Task { await store.hydrateMedia(categoryID: category.id, language: language) }
        }
        .onDisappear {
            viewModel.cancel()
            SayFeedback.stop()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                // Returning from Settings with the microphone switched on
                // should resume practice, not strand the parent on the
                // recovery screen.
                viewModel.recheckPermissionsAfterSettings()
            } else {
                viewModel.pauseForInterruption()
                SayFeedback.stop()
            }
        }
        .onChange(of: viewModel.state) { oldState, state in
            if state == .celebrating {
                celebrationTrigger += 1
                celebrationVariant = CelebrationVariant.allCases.randomElement() ?? .explosion
                cardWinStyle = CardWinStyle.allCases.randomElement() ?? .pop
                SayFeedback.playSuccess()
            }
            if case .retrying = state, oldState == .processing {
                // One soft acknowledgement — never a buzzer, never a red cross.
                SayFeedback.playRetry()
            }
        }
    }

    private var practiceContent: some View {
        GeometryReader { geo in
            let isCompact = geo.size.width < 500
            VStack(spacing: isCompact ? 12 : 20) {
                if viewModel.recognitionFallbackLanguage != nil {
                    languageFallbackNotice
                }

                Spacer(minLength: 0)

                if let card = viewModel.currentCard {
                    // Each card flies in from a random direction with a bouncy
                    // bezier and leaves through another; letters of the word
                    // spell themselves out underneath.
                    VStack(spacing: isCompact ? 12 : 20) {
                        cardImage(card, size: min(geo.size.width, geo.size.height) * (isCompact ? 0.52 : 0.46))
                        SpellingWordView(
                            word: card.title,
                            fontSize: isCompact ? 40 : 56,
                            // Wait for the card's fly-in to fully land before
                            // spelling — overlapping the two reads stuttery.
                            startDelay: Self.cardFlyDuration + 0.15,
                            reduceMotion: reduceMotion
                        )
                        .accessibilityIdentifier("say.practice.title")
                    }
                    .id(card.id)
                    .transition(reduceMotion ? .opacity : .cardFly(seed: card.id))
                }

                ListeningWave(
                    state: viewModel.state,
                    audioLevel: viewModel.audioLevel,
                    appColor: appColor,
                    listeningLabel: i18n.t("say.practice.listening"),
                    speakingLabel: i18n.t("say.practice.speaking")
                )

                Spacer(minLength: 0)

                PracticeControls(
                    i18n: i18n,
                    skipProminent: viewModel.skipProminent,
                    appColor: appColor,
                    onReplay: { viewModel.replay() },
                    onSkip: { viewModel.skip() }
                )
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .animation(
                reduceMotion ? .easeInOut(duration: 0.3) : .timingCurve(0.16, 1.32, 0.32, 1, duration: Self.cardFlyDuration),
                value: viewModel.currentCard?.id
            )
        }
        .overlay {
            if viewModel.state == .celebrating {
                CelebrationOverlay(
                    trigger: celebrationTrigger,
                    variant: celebrationVariant,
                    emoji: viewModel.currentCard?.emoji ?? "⭐️",
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
        #if DEBUG
        .overlay(alignment: .bottomTrailing) {
            if showDebugOverlay {
                RecognitionDebugOverlay(viewModel: viewModel) {
                    showDebugOverlay = false
                }
            }
        }
        .onAppear {
            if CommandLine.arguments.contains("--say-debug") {
                showDebugOverlay = true
            }
        }
        .onLongPressGesture(minimumDuration: 2) {
            showDebugOverlay.toggle()
        }
        #endif
    }

    @ViewBuilder
    private func cardImage(_ card: SayCard, size: CGFloat) -> some View {
        let celebrating = viewModel.state == .celebrating
        let base = ZStack {
            appColor.palette.primary.opacity(0.14)
            if let imageURL = store.imageURL(for: card) {
                TikoCachedRemoteImage(url: imageURL) {
                    Text(card.emoji).font(.system(size: size * 0.6))
                }
            } else {
                Text(card.emoji)
                    .font(.system(size: size * 0.66))
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.18, style: .continuous))
        .accessibilityHidden(true)

        if reduceMotion {
            base
                .scaleEffect(celebrating ? 1.08 : 1.0)
                .animation(.easeInOut(duration: 0.4), value: celebrating)
        } else {
            // The image itself joins the party: a random dance per win.
            base.phaseAnimator(cardWinStyle.phases, trigger: celebrationTrigger) { view, phase in
                view
                    .scaleEffect(phase.scale)
                    .rotationEffect(.degrees(phase.rotation))
                    .offset(y: phase.y)
            } animation: { _ in
                // Slightly slower and extra bouncy — the win should feel juicy.
                .spring(response: 0.34, dampingFraction: 0.44)
            }
        }
    }

    private var languageFallbackNotice: some View {
        let suggestionName = viewModel.recognitionFallbackLanguage.map {
            Locale.current.localizedString(forLanguageCode: $0) ?? $0
        } ?? ""
        return Label(
            i18n.t("say.language.fallback", ["suggestion": suggestionName]),
            systemImage: "globe"
        )
        .font(.system(.footnote, design: .rounded).weight(.bold))
        .foregroundStyle(.secondary)
        .padding(.vertical, 8)
        .padding(.horizontal, 14)
        .background(.thinMaterial)
        .clipShape(Capsule())
        .padding(.top, 8)
    }

    private var interruptionOverlay: some View {
        Button {
            viewModel.resumeAfterInterruption()
        } label: {
            VStack(spacing: 12) {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(appColor.palette.primary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.regularMaterial)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(i18n.t("say.practice.tapToResume"))
    }
}

// MARK: - Card fly transition

/// Slides the card in from one random screen edge and out through another,
/// with a slight tilt and scale. The direction is derived from the card ID so
/// re-renders never change it mid-flight.
private struct CardFlyModifier: ViewModifier {
    let offset: CGSize
    let rotation: Double
    let active: Bool

    func body(content: Content) -> some View {
        content
            .offset(active ? offset : .zero)
            .rotationEffect(.degrees(active ? rotation : 0))
            .scaleEffect(active ? 0.6 : 1)
            .opacity(active ? 0 : 1)
    }
}

extension AnyTransition {
    static func cardFly(seed: String) -> AnyTransition {
        let directions: [CGSize] = [
            CGSize(width: -560, height: 0), CGSize(width: 560, height: 0),
            CGSize(width: 0, height: -640), CGSize(width: 0, height: 640),
            CGSize(width: -460, height: -420), CGSize(width: 460, height: -420),
        ]
        var hasher = Hasher()
        hasher.combine(seed)
        let hash = abs(hasher.finalize())
        let inDirection = directions[hash % directions.count]
        let outDirection = directions[(hash / directions.count + 1) % directions.count]
        let tilt = Double((hash % 17)) - 8
        return .asymmetric(
            insertion: .modifier(
                active: CardFlyModifier(offset: inDirection, rotation: tilt, active: true),
                identity: CardFlyModifier(offset: inDirection, rotation: tilt, active: false)
            ),
            removal: .modifier(
                active: CardFlyModifier(offset: outDirection, rotation: -tilt, active: true),
                identity: CardFlyModifier(offset: outDirection, rotation: -tilt, active: false)
            )
        )
    }
}

// MARK: - Spelling word

/// The word spells itself out: letters cascade in one by one with a bouncy
/// bezier, right after the card lands. With Reduce Motion the word simply
/// appears.
struct SpellingWordView: View {
    let word: String
    let fontSize: CGFloat
    /// When the cascade begins — after the card image has finished animating
    /// in, never during it.
    var startDelay: TimeInterval = 0.9
    let reduceMotion: Bool

    @State private var appeared = false

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(word.enumerated()), id: \.offset) { index, character in
                Text(String(character))
                    .font(.system(size: fontSize, weight: .heavy, design: .rounded))
                    .opacity(appeared ? 1 : 0)
                    .scaleEffect(appeared ? 1 : 0.8, anchor: .bottom)
                    .offset(y: appeared ? 0 : fontSize * 0.15)
                    .animation(
                        reduceMotion
                            ? .easeInOut(duration: 0.2)
                            : .timingCurve(0.25, 1.15, 0.45, 1, duration: 0.55)
                                .delay(startDelay + Double(index) * 0.09),
                        value: appeared
                    )
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.5)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(word)
        .onAppear { appeared = true }
    }
}

// MARK: - Listening wave

/// Calm animated waveform instead of text: gentle idle wobble while
/// listening, amplified by the microphone level; a speaker glyph while the
/// app itself talks. State is still exposed to VoiceOver.
struct ListeningWave: View {
    let state: PracticeState
    let audioLevel: Float
    let appColor: TikoAppColor
    let listeningLabel: String
    let speakingLabel: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isListening: Bool {
        if case .listening = state { return true }
        if case .retrying = state { return true }
        return false
    }

    private var isSpeaking: Bool {
        state == .speaking || state == .preparingToListen || state == .presenting
    }

    private let barCount = 5

    var body: some View {
        ZStack {
            Circle()
                .fill(appColor.palette.primary.opacity(0.14))
                .frame(width: 92, height: 92)

            if isSpeaking {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(appColor.palette.primary)
                    .transition(.opacity)
            } else if reduceMotion || !isListening {
                Image(systemName: "mic.fill")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(appColor.palette.primary.opacity(isListening ? 1 : 0.45))
            } else {
                TimelineView(.animation) { timeline in
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    HStack(spacing: 5) {
                        ForEach(0..<barCount, id: \.self) { index in
                            let wobble = (sin(time * 5.5 + Double(index) * 1.1) + 1) / 2
                            let level = Double(min(audioLevel, 1))
                            let height = 12 + wobble * 14 + level * 26
                            RoundedRectangle(cornerRadius: 3, style: .continuous)
                                .fill(appColor.palette.primary)
                                .frame(width: 6, height: height)
                        }
                    }
                    .frame(height: 56)
                }
            }
        }
        .opacity(isListening || isSpeaking ? 1 : 0.35)
        .animation(.easeInOut(duration: 0.2), value: isSpeaking)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isSpeaking ? speakingLabel : listeningLabel)
    }
}

// MARK: - Controls

/// Icon-only round buttons: replay and next/skip. Skip fills with the app
/// colour (and grows slightly) when it should be more prominent.
struct PracticeControls: View {
    @ObservedObject var i18n: TikoI18n
    let skipProminent: Bool
    let appColor: TikoAppColor
    let onReplay: () -> Void
    let onSkip: () -> Void

    var body: some View {
        HStack(spacing: 28) {
            roundButton(systemImage: "arrow.counterclockwise", prominent: false, action: onReplay)
                .accessibilityIdentifier("say.practice.replay")
                .accessibilityLabel(i18n.t("say.practice.replay"))

            roundButton(systemImage: "arrow.forward", prominent: skipProminent, action: onSkip)
                .accessibilityIdentifier("say.practice.skip")
                .accessibilityLabel(i18n.t("say.practice.skip"))
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
                .scaleEffect(prominent ? 1.12 : 1.0)
                .animation(.spring(response: 0.3), value: prominent)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Permission request / recovery

/// Shown underneath the system microphone and speech-recognition prompts. It
/// explains what is about to be asked, but it never gates the prompt: there is
/// no button to press and no way to dismiss it instead of answering.
struct SpeechPermissionRequestView: View {
    @ObservedObject var i18n: TikoI18n

    private let appColor = SayAppConfig.app.appColor

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "mic.fill")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(appColor.palette.primary)
                .accessibilityHidden(true)
            Text(i18n.t("say.permission.body"))
                .font(.title3.weight(.bold))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
                .accessibilityIdentifier("say.permission.requesting")
            Spacer()
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 560)
    }
}

/// Recovery after a refusal: say what is missing and link straight to Settings.
struct SpeechPermissionDeniedView: View {
    @ObservedObject var i18n: TikoI18n
    let onBack: () -> Void

    private let appColor = SayAppConfig.app.appColor

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "mic.slash.fill")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(appColor.palette.primary)
                .accessibilityHidden(true)
            Text(i18n.t("say.permission.deniedTitle"))
                .font(.title3.weight(.bold))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
            Spacer()
            Button {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text(i18n.t("say.permission.openSettings"))
                    .font(.system(.body, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("say.permission.openSettings")
            Button(action: onBack) {
                Text(i18n.t("say.practice.back"))
                    .font(.system(.body, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 560)
    }
}

// MARK: - Recognizer unavailable

struct RecognitionUnavailableView: View {
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let onBack: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "waveform.slash")
                .font(.system(size: 52, weight: .bold))
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text(i18n.t("say.language.unsupportedTitle", [
                "language": Locale.current.localizedString(forLanguageCode: languageCode) ?? languageCode,
            ]))
            .font(.title3.weight(.heavy))
            .multilineTextAlignment(.center)
            Spacer()
            Button(action: onBack) {
                Text(i18n.t("say.practice.back"))
                    .font(.system(.body, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(SayAppConfig.app.appColor.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("say.recognitionUnavailable.back")
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 560)
    }
}

// MARK: - Session complete

struct SessionCompleteView: View {
    @ObservedObject var i18n: TikoI18n
    let onRestart: () -> Void
    let onChooseCategory: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    private let appColor = SayAppConfig.app.appColor

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text("🎉")
                .font(.system(size: 110))
                .scaleEffect(appeared ? 1 : 0.6)
                .animation(reduceMotion ? .easeOut(duration: 0.3) : .spring(response: 0.4, dampingFraction: 0.55), value: appeared)
                .accessibilityHidden(true)
            Spacer()
            HStack(spacing: 28) {
                completionButton(systemImage: "arrow.counterclockwise", prominent: true, action: onRestart)
                    .accessibilityIdentifier("say.session.restart")
                    .accessibilityLabel(i18n.t("say.session.restart"))
                completionButton(systemImage: "square.grid.2x2", prominent: false, action: onChooseCategory)
                    .accessibilityIdentifier("say.session.chooseCategory")
                    .accessibilityLabel(i18n.t("say.session.chooseCategory"))
            }
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 560)
        .onAppear {
            appeared = true
            SayFeedback.playSuccess()
        }
    }

    private func completionButton(systemImage: String, prominent: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 26, weight: .heavy))
                .foregroundStyle(prominent ? .white : appColor.palette.primary)
                .frame(width: 72, height: 72)
                .background(prominent ? appColor.palette.primary : appColor.palette.primary.opacity(0.14))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }
}
