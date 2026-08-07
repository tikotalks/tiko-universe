import SwiftUI
import TikoKit

struct TimerView: View {
    @AppStorage("timer.customMinutes") private var customMinutes = 5
    @AppStorage("timer.customSeconds") private var customSeconds = 0
    @AppStorage("timer.mode") private var persistedMode = "idle"
    @AppStorage("timer.targetMs") private var persistedTargetMs = 0.0
    @AppStorage("timer.remainingMs") private var persistedRemainingMs = 0.0
    @AppStorage("timer.soundEnabled") private var soundEnabled = true
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.system.rawValue

    @StateObject private var i18n = TikoI18n(app: .timer)

    /// Bumped when the countdown reaches zero, to fire the celebration overlay.
    @State private var celebrationTrigger = 0

    /// All countdown state + math lives in the pure, unit-tested engine.
    @State private var engine = TimerEngine()
    /// Updated on every tick so SwiftUI recomputes the derived values.
    @State private var now = Date()

    private let timer = Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()

    private var presets: [(label: String, ms: Double)] {
        [
            (i18n.t("timer.presets.oneMin"), TimerEngine.presetsMs[0]),
            (i18n.t("timer.presets.threeMin"), TimerEngine.presetsMs[1]),
            (i18n.t("timer.presets.fiveMin"), TimerEngine.presetsMs[2]),
            (i18n.t("timer.presets.tenMin"), TimerEngine.presetsMs[3]),
        ]
    }

    private var displayTime: String { engine.displayTime(now: now) }
    private var progress: Double { engine.progress(now: now) }

    private let ringCircumference = 2 * Double.pi * 80

    private var effectiveColorScheme: ColorScheme {
        (TikoColorMode(rawValue: colorModeRawValue) ?? .light) == .dark ? .dark : .light
    }

    private var timerPrimary: Color { TimerPalette.primary }
    private var timerDark: Color { TimerPalette.foreground(for: effectiveColorScheme) }
    private var controlBackground: Color { TimerPalette.controlBackground(for: effectiveColorScheme) }
    private var presetBackground: Color { TimerPalette.presetBackground(for: effectiveColorScheme) }
    private var presetForeground: Color { TimerPalette.presetForeground(for: effectiveColorScheme) }

    var body: some View {
        TikoAppShell(
            appConfig: TimerAppConfig.app,
            appName: i18n.t("timer.appName"),
            settingsContent: {
                TikoSettingsSection(title: i18n.t("timer.settings.title")) {
                    TikoSettingsToggleRow(title: i18n.t("timer.settings.sound"), icon: "bell.fill", appColor: .timer, isOn: $soundEnabled)
                }
            }
        ) {
            VStack(spacing: 24) {
                // Countdown ring
                ZStack {
                    Circle()
                        .stroke(TimerPalette.ringTrack(for: effectiveColorScheme), lineWidth: 12)
                        .frame(width: 180, height: 180)

                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(timerPrimary, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                        .frame(width: 180, height: 180)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 4) {
                        Text(displayTime)
                            .font(.system(size: 44, weight: .bold, design: .rounded))
                            .foregroundStyle(timerDark)
                            .monospacedDigit()
                            .accessibilityIdentifier("timer.display")

                        if engine.mode == .expired {
                            Text(i18n.t("timer.display.expired"))
                                .font(.system(.headline, design: .rounded).weight(.heavy))
                                .foregroundStyle(timerDark.opacity(0.82))
                        }
                    }
                }
                .padding(.top, 18)

                // Preset buttons (only when idle)
                if engine.mode == .idle {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 2), spacing: 12) {
                        ForEach(presets.indices, id: \.self) { index in
                            Button(presets[index].label) {
                                start(durationMs: presets[index].ms)
                            }
                            .font(.system(.title3, design: .rounded).weight(.heavy))
                            .foregroundStyle(presetForeground)
                            .frame(maxWidth: .infinity, minHeight: 56)
                            .background(presetBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .accessibilityIdentifier("timer.preset.\(index)")
                        }
                    }
                    .padding(.horizontal, 24)
                }

                // Controls
                HStack(spacing: 16) {
                    if engine.mode == .idle || engine.mode == .expired {
                        Button(action: startCustom) {
                            Image(systemName: "play.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(controlBackground)
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Start")
                        .accessibilityIdentifier("timer.start")
                    }

                    if engine.mode == .running {
                        Button(action: pause) {
                            Image(systemName: "pause.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(controlBackground)
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Pause")
                        .accessibilityIdentifier("timer.pause")
                    }

                    if engine.mode == .paused {
                        Button(action: resume) {
                            Image(systemName: "play.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(controlBackground)
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Resume")
                        .accessibilityIdentifier("timer.resume")
                    }

                    if engine.mode != .idle {
                        Button(action: reset) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(TimerPalette.resetBackground(for: effectiveColorScheme))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Reset")
                        .accessibilityIdentifier("timer.reset")
                    }
                }
            }
        }
        .overlay {
            // Reaching zero is the whole point of the app, so it gets the same
            // payoff the other Tiko apps give a win.
            TikoCelebrationOverlay(
                trigger: celebrationTrigger,
                variant: .confettiRain,
                emoji: "⏰",
                appColor: .timer
            )
            .allowsHitTesting(false)
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            if TikoScreenshotMode.isActive { return }
            restoreFromPersisted()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
        .onReceive(timer) { _ in
            guard engine.mode == .running else { return }
            now = Date()
            if engine.expireIfElapsed(now: now) {
                celebrationTrigger += 1
                if soundEnabled {
                    TikoFeedback.playSuccess()
                }
                persist()
            }
        }
    }

    private func start(durationMs: Double) {
        now = Date()
        engine.start(durationMs: durationMs, now: now)
        persist()
    }

    private func startCustom() {
        now = Date()
        engine.startCustom(minutes: customMinutes, seconds: customSeconds, now: now)
        guard engine.mode == .running else { return }
        persist()
    }

    private func pause() {
        now = Date()
        engine.pause(now: now)
        persist()
    }

    private func resume() {
        now = Date()
        engine.resume(now: now)
        persist()
    }

    private func reset() {
        engine.reset()
        persist()
    }

    private func persist() {
        persistedMode = engine.mode.rawValue
        persistedTargetMs = engine.targetDate.timeIntervalSince1970 * 1000
        persistedRemainingMs = engine.remainingMs
    }

    private func restoreFromPersisted() {
        guard persistedMode != TimerEngine.Mode.idle.rawValue else { return }
        now = Date()
        engine = TimerEngine.restored(
            persistedMode: persistedMode,
            targetMs: persistedTargetMs,
            remainingMs: persistedRemainingMs,
            now: now
        )
    }
}

#Preview {
    TimerView()
}
