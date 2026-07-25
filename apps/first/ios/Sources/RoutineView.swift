import SwiftUI
import TikoKit

/// The child-facing routine screen. One step fills the screen, everything else
/// is quiet: an ordered strip of what is done and what is coming, and icon-only
/// round controls. There is nothing to get wrong here — no buzzer, no red
/// cross, and no way to cross a step off early.
struct RoutineScreen: View {
    @ObservedObject var store: FirstStore
    @ObservedObject var progressStore: FirstProgressStore
    @ObservedObject var i18n: TikoI18n
    @StateObject private var viewModel: RoutineViewModel
    let onClose: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var celebrationTrigger = 0
    @State private var celebrationVariant: TikoCelebrationVariant = .explosion
    @State private var winStyle: TikoCardWinStyle = .pop
    @State private var stepFlyIn = false

    private let appColor = FirstAppConfig.app.appColor

    init(
        routine: Routine,
        store: FirstStore,
        progressStore: FirstProgressStore,
        i18n: TikoI18n,
        languageCode: String,
        onClose: @escaping () -> Void,
        voice: FirstSpeaking? = nil,
        timings: RoutineViewModel.Timings = .standard
    ) {
        self.store = store
        self.progressStore = progressStore
        self.i18n = i18n
        self.onClose = onClose
        _viewModel = StateObject(wrappedValue: RoutineViewModel(
            routine: routine,
            progressStore: progressStore,
            languageCode: languageCode,
            voice: voice,
            timings: timings
        ))
    }

    var body: some View {
        ZStack {
            if viewModel.state == .completed {
                completionView
            } else {
                routineContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            viewModel.begin()
            stepFlyIn = true
            #if DEBUG
            // Hands-free celebrate scene for App Store capture: walk the whole
            // routine so the frame lands on the finish celebration.
            if TikoScreenshotMode.isActive, TikoScreenshotMode.scene == "celebrate" {
                Task { @MainActor in
                    while viewModel.state != .completed {
                        try? await Task.sleep(nanoseconds: 120_000_000)
                        guard let step = viewModel.currentStep else { break }
                        viewModel.complete(step: step)
                    }
                }
            }
            #endif
        }
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
        .onChange(of: viewModel.tickTrigger) { _, _ in
            TikoFeedback.playSuccess()
            winStyle = TikoCardWinStyle.allCases.randomElement() ?? .pop
        }
        .onChange(of: viewModel.finishTrigger) { _, _ in
            celebrationTrigger += 1
            celebrationVariant = TikoCelebrationVariant.allCases.randomElement() ?? .explosion
            TikoFeedback.playSuccess()
        }
        .onChange(of: viewModel.currentStep?.id) { _, _ in
            guard !reduceMotion else { return }
            stepFlyIn = false
            withAnimation(.spring(response: 0.55, dampingFraction: 0.72)) {
                stepFlyIn = true
            }
        }
        .onChange(of: store.revision) { _, _ in
            // A parent edited this routine while it was open.
            if let updated = store.routine(id: viewModel.routine.id, language: viewModel.languageCode) {
                viewModel.refresh(with: updated)
            }
        }
        .overlay {
            if viewModel.state == .completed {
                TikoCelebrationOverlay(
                    trigger: celebrationTrigger,
                    variant: celebrationVariant,
                    emoji: viewModel.routine.emoji,
                    appColor: appColor
                )
                .allowsHitTesting(false)
            }
        }
    }

    // MARK: - Routine content

    private var routineContent: some View {
        GeometryReader { geo in
            let isCompact = geo.size.width < 500
            let isLandscape = geo.size.width > geo.size.height
            let isLarge = min(geo.size.width, geo.size.height) >= 700
            VStack(spacing: isCompact ? 12 : 20) {
                Spacer(minLength: 0)

                if let step = viewModel.currentStep {
                    currentStepCard(
                        step,
                        size: min(geo.size.width, geo.size.height) * (isLandscape ? 0.42 : (isCompact ? 0.56 : (isLarge ? 0.62 : 0.48)))
                    )
                }

                Spacer(minLength: 0)

                stepStrip

                controls
                    .padding(.bottom, isCompact ? 10 : 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 20)
        }
    }

    /// The one thing that matters: big picture, short title, tap to finish.
    private func currentStepCard(_ step: RoutineStep, size: CGFloat) -> some View {
        let isTicking = viewModel.state == .ticking
        return Button {
            viewModel.complete(step: step)
        } label: {
            VStack(spacing: 16) {
                ZStack {
                    if let url = store.image(for: step.id) ?? step.imageURL {
                        TikoCachedRemoteImage(url: url) {
                            Text(step.emoji).font(.system(size: size * 0.55))
                        }
                    } else {
                        Text(step.emoji).font(.system(size: size * 0.55))
                    }

                    if isTicking {
                        // The tick lands on top of the step it belongs to.
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: size * 0.42, weight: .heavy))
                            .foregroundStyle(appColor.palette.primary)
                            .background(
                                Circle()
                                    .fill(.white)
                                    .frame(width: size * 0.36, height: size * 0.36)
                            )
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                .scaleEffect(tickScale)
                .rotationEffect(.degrees(tickRotation))
                .offset(y: stepFlyIn ? 0 : 40)
                .opacity(stepFlyIn ? 1 : 0)
                .animation(reduceMotion ? .easeInOut(duration: 0.25) : .spring(response: 0.5, dampingFraction: 0.7), value: isTicking)

                Text(step.title)
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.primary)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("first.step.current")
        .accessibilityLabel(step.title)
        .accessibilityValue(i18n.t("first.routine.progress", [
            "step": String(viewModel.currentPosition),
            "total": String(viewModel.totalCount),
        ]))
        .accessibilityHint(i18n.t("first.routine.done"))
    }

    private var tickScale: CGFloat {
        guard viewModel.state == .ticking, !reduceMotion else { return 1 }
        return CGFloat(winStyle.phases.first?.scale ?? 1.08)
    }

    private var tickRotation: Double {
        guard viewModel.state == .ticking, !reduceMotion else { return 0 }
        return winStyle.phases.first?.rotation ?? 0
    }

    // MARK: - Step strip

    /// Ordered, quiet, and honest: what is done, what is now, what is coming.
    /// Tapping ahead previews the step out loud — it can never complete it.
    private var stepStrip: some View {
        ScrollViewReader { proxy in
            // Short routines sit centred; long ones scroll and follow the
            // current step.
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    ForEach(viewModel.orderedSteps) { step in
                        stripItem(step)
                            .id(step.id)
                    }
                }
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(viewModel.orderedSteps) { step in
                            stripItem(step)
                                .id(step.id)
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 6)
                }
            }
            .frame(height: 92)
            .onChange(of: viewModel.currentStep?.id) { _, id in
                guard let id else { return }
                withAnimation(.easeInOut(duration: 0.3)) {
                    proxy.scrollTo(id, anchor: .center)
                }
            }
        }
    }

    private func stripItem(_ step: RoutineStep) -> some View {
        let resolved = viewModel.isResolved(step)
        let skipped = viewModel.isSkipped(step)
        let current = viewModel.isCurrent(step)
        return Button {
            if current {
                viewModel.complete(step: step)
            } else if resolved {
                // Only the most recent tick can be undone, and only from here.
                if viewModel.orderedSteps.filter({ viewModel.isResolved($0) }).last?.id == step.id {
                    viewModel.undo()
                } else {
                    viewModel.preview(step: step)
                }
            } else {
                viewModel.preview(step: step)
            }
        } label: {
            ZStack {
                if let url = store.image(for: step.id) ?? step.imageURL {
                    TikoCachedRemoteImage(url: url) {
                        Text(step.emoji).font(.system(size: 30))
                    }
                } else {
                    Text(step.emoji).font(.system(size: 30))
                }

                if resolved {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.black.opacity(0.45))
                    Image(systemName: skipped ? "arrow.uturn.forward" : "checkmark")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 64, height: 64)
            .background(appColor.palette.primary.opacity(current ? 0.28 : 0.12))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(appColor.palette.primary, lineWidth: current ? 3 : 0)
            )
            .opacity(resolved ? 0.75 : 1)
            .scaleEffect(current ? 1.06 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("first.strip.\(step.id)")
        .accessibilityLabel(step.title)
        .accessibilityValue(
            resolved
                ? i18n.t(skipped ? "first.routine.stepSkipped" : "first.routine.stepDone")
                : (current ? i18n.t("first.routine.done") : i18n.t("first.routine.upcoming"))
        )
    }

    // MARK: - Controls

    private var controls: some View {
        HStack(spacing: 22) {
            roundButton(systemImage: "arrow.counterclockwise", prominent: false) {
                viewModel.replay()
            }
            .accessibilityIdentifier("first.control.replay")
            .accessibilityLabel(i18n.t("first.routine.replay"))

            doneButton

            if viewModel.canSkip {
                roundButton(systemImage: "arrow.forward", prominent: false) {
                    viewModel.skipCurrent()
                }
                .accessibilityIdentifier("first.control.skip")
                .accessibilityLabel(i18n.t("first.routine.skip"))
            } else if viewModel.canUndo {
                roundButton(systemImage: "arrow.uturn.backward", prominent: false) {
                    viewModel.undo()
                }
                .accessibilityIdentifier("first.control.undo")
                .accessibilityLabel(i18n.t("first.routine.undo"))
            }
        }
    }

    /// The big, unmissable one.
    private var doneButton: some View {
        Button {
            guard let step = viewModel.currentStep else { return }
            viewModel.complete(step: step)
        } label: {
            Image(systemName: "checkmark")
                .font(.system(size: 34, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 92, height: 92)
                .background(appColor.palette.primary)
                .clipShape(Circle())
                .shadow(color: appColor.palette.primary.opacity(0.35), radius: 12, y: 6)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.currentStep == nil || viewModel.state == .ticking)
        .opacity(viewModel.state == .ticking ? 0.6 : 1)
        .accessibilityIdentifier("first.control.done")
        .accessibilityLabel(i18n.t("first.routine.done"))
    }

    private func roundButton(systemImage: String, prominent: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .heavy))
                .foregroundStyle(prominent ? .white : appColor.palette.primary)
                .frame(width: 62, height: 62)
                .background(prominent ? appColor.palette.primary : appColor.palette.primary.opacity(0.14))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Completion

    private var completionView: some View {
        VStack(spacing: 24) {
            Spacer()

            // What the child just did, all of it, ticked.
            ZStack {
                if let url = store.image(for: viewModel.routine.id) {
                    TikoCachedRemoteImage(url: url) {
                        Text(viewModel.routine.emoji).font(.system(size: 110))
                    }
                } else {
                    Text(viewModel.routine.emoji).font(.system(size: 110))
                }
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 76, weight: .heavy))
                    .foregroundStyle(appColor.palette.primary)
                    .background(Circle().fill(.white).frame(width: 66, height: 66))
            }
            .frame(width: 190, height: 190)
            .clipShape(RoundedRectangle(cornerRadius: 36, style: .continuous))
            .accessibilityHidden(true)

            HStack(spacing: 10) {
                ForEach(viewModel.orderedSteps) { step in
                    ZStack {
                        if let url = store.image(for: step.id) ?? step.imageURL {
                            TikoCachedRemoteImage(url: url) {
                                Text(step.emoji).font(.system(size: 24))
                            }
                        } else {
                            Text(step.emoji).font(.system(size: 24))
                        }
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(.black.opacity(0.4))
                        Image(systemName: viewModel.isSkipped(step) ? "arrow.uturn.forward" : "checkmark")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(.white)
                    }
                    .frame(width: 54, height: 54)
                    .background(appColor.palette.primary.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            .accessibilityHidden(true)

            Spacer()
            HStack(spacing: 18) {
                roundButton(systemImage: "arrow.counterclockwise", prominent: false) {
                    viewModel.startOver()
                }
                .accessibilityIdentifier("first.finish.again")
                .accessibilityLabel(i18n.t("first.finish.again"))

                roundButton(systemImage: "house.fill", prominent: true, action: onClose)
                    .accessibilityIdentifier("first.finish.done")
                    .accessibilityLabel(i18n.t("first.finish.done"))
            }
            .padding(.bottom, 30)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .contain)
    }
}
