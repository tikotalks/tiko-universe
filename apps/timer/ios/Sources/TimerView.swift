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

    @StateObject private var i18n = TikoI18n(app: .timer)

    @State private var mode: TimerMode = .idle
    @State private var targetDate = Date()
    @State private var remainingMs: Double = 0
    @State private var totalDuration: Double = 0
    @State private var tickCounter = 0

    private let timer = Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()

    private var presets: [(label: String, ms: Double)] {
        [
            (i18n.t("timer.presets.oneMin"), 60_000),
            (i18n.t("timer.presets.threeMin"), 180_000),
            (i18n.t("timer.presets.fiveMin"), 300_000),
            (i18n.t("timer.presets.tenMin"), 600_000),
        ]
    }

    private enum TimerMode: String {
        case idle, running, paused, expired
    }

    private var remaining: Double {
        switch mode {
        case .idle: return 0
        case .running: return max(0, targetDate.timeIntervalSinceNow * 1000)
        case .paused: return remainingMs
        case .expired: return 0
        }
    }

    private var progress: Double {
        guard totalDuration > 0 else { return 0 }
        if mode == .expired { return 1 }
        return 1 - remaining / totalDuration
    }

    private var displayTime: String {
        let totalSeconds = Int(max(0, remaining / 1000))
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    private let ringCircumference = 2 * Double.pi * 80

    private var timerPrimary: Color { TikoAppColor.timer.palette.primary }
    private var timerDark: Color { TikoAppColor.timer.palette.dark }

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
                        .stroke(timerPrimary.opacity(0.22), lineWidth: 12)
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

                        if mode == .expired {
                            Text(i18n.t("timer.display.expired"))
                                .font(.system(.headline, design: .rounded).weight(.heavy))
                                .foregroundStyle(timerDark.opacity(0.82))
                        }
                    }
                }
                .padding(.top, 18)

                // Preset buttons (only when idle)
                if mode == .idle {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 2), spacing: 12) {
                        ForEach(presets.indices, id: \.self) { index in
                            Button(presets[index].label) {
                                start(durationMs: presets[index].ms)
                            }
                            .font(.system(.title3, design: .rounded).weight(.heavy))
                            .foregroundStyle(Color(hex: 0x8a5d00))
                            .frame(maxWidth: .infinity, minHeight: 56)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }
                    .padding(.horizontal, 24)
                }

                // Controls
                HStack(spacing: 16) {
                    if mode == .idle || mode == .expired {
                        Button(action: startCustom) {
                            Image(systemName: "play.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(timerPrimary.opacity(0.22))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Start")
                    }

                    if mode == .running {
                        Button(action: pause) {
                            Image(systemName: "pause.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(timerPrimary.opacity(0.22))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Pause")
                    }

                    if mode == .paused {
                        Button(action: resume) {
                            Image(systemName: "play.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(timerPrimary.opacity(0.22))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Resume")
                    }

                    if mode != .idle {
                        Button(action: reset) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(timerDark)
                                .frame(width: 64, height: 64)
                                .background(timerPrimary.opacity(0.14))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Reset")
                    }
                }
            }
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            restoreFromPersisted()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
        .onReceive(timer) { _ in
            guard mode == .running else { return }
            tickCounter += 1
            if remaining <= 0 {
                mode = .expired
                if soundEnabled {
                    // TODO: play shared Tiko completion sound when the audio asset is available.
                }
                persist()
            }
        }
    }

    private func start(durationMs: Double) {
        totalDuration = durationMs
        targetDate = Date().addingTimeInterval(durationMs / 1000)
        mode = .running
        persist()
    }

    private func startCustom() {
        let ms = (Double(customMinutes) * 60 + Double(customSeconds)) * 1000
        guard ms > 0 else { return }
        start(durationMs: ms)
    }

    private func pause() {
        guard mode == .running else { return }
        remainingMs = max(0, targetDate.timeIntervalSinceNow * 1000)
        mode = .paused
        persist()
    }

    private func resume() {
        guard mode == .paused else { return }
        targetDate = Date().addingTimeInterval(remainingMs / 1000)
        mode = .running
        persist()
    }

    private func reset() {
        mode = .idle
        totalDuration = 0
        remainingMs = 0
        persist()
    }

    private func persist() {
        persistedMode = mode.rawValue
        persistedTargetMs = targetDate.timeIntervalSince1970 * 1000
        persistedRemainingMs = remainingMs
    }

    private func restoreFromPersisted() {
        guard persistedMode != "idle" else { return }
        if persistedMode == "running" {
            let target = Date(timeIntervalSince1970: persistedTargetMs / 1000)
            let left = target.timeIntervalSinceNow * 1000
            if left > 0 {
                targetDate = target
                mode = .running
                // totalDuration unknown after restore; approximate from remaining
                totalDuration = left
            } else {
                mode = .expired
            }
        } else if persistedMode == "paused" {
            remainingMs = persistedRemainingMs
            mode = .paused
        } else if persistedMode == "expired" {
            mode = .expired
        }
    }
}

#Preview {
    TimerView()
}
