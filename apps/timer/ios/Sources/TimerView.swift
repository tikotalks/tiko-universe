import SwiftUI
import TikoKit

struct TimerView: View {
    @AppStorage("timer.customMinutes") private var customMinutes = 5
    @AppStorage("timer.customSeconds") private var customSeconds = 0
    @AppStorage("timer.mode") private var persistedMode = "idle"
    @AppStorage("timer.targetMs") private var persistedTargetMs = 0.0
    @AppStorage("timer.remainingMs") private var persistedRemainingMs = 0.0
    @State private var showingSettings = false

    @State private var mode: TimerMode = .idle
    @State private var targetDate = Date()
    @State private var remainingMs: Double = 0
    @State private var totalDuration: Double = 0
    @State private var tickCounter = 0

    private let timer = Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()

    private let presets: [(label: String, ms: Double)] = [
        ("1 min", 60_000),
        ("3 min", 180_000),
        ("5 min", 300_000),
        ("10 min", 600_000),
    ]

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

    var body: some View {
        TikoAppShell(
            appName: "Timer",
            appIcon: "timer",
            appColor: .timer,
            actions: [
                TikoHeaderAction(id: "settings", label: "Settings", systemImage: "slider.horizontal.3", isActive: showingSettings)
            ],
            onAction: { id in
                if id == "settings" { showingSettings.toggle() }
            }
        ) {
            VStack(spacing: 24) {
                // Countdown ring
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 12)
                        .frame(width: 180, height: 180)

                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                        .frame(width: 180, height: 180)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 4) {
                        Text(displayTime)
                            .font(.system(size: 44, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .monospacedDigit()

                        if mode == .expired {
                            Text("Time is up!")
                                .font(.system(.headline, design: .rounded).weight(.heavy))
                                .foregroundStyle(.white.opacity(0.9))
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
                                .foregroundStyle(.white)
                                .frame(width: 64, height: 64)
                                .background(Color.white.opacity(0.28))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Start")
                    }

                    if mode == .running {
                        Button(action: pause) {
                            Image(systemName: "pause.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 64, height: 64)
                                .background(Color.white.opacity(0.28))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Pause")
                    }

                    if mode == .paused {
                        Button(action: resume) {
                            Image(systemName: "play.fill")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 64, height: 64)
                                .background(Color.white.opacity(0.28))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Resume")
                    }

                    if mode != .idle {
                        Button(action: reset) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 64, height: 64)
                                .background(Color.white.opacity(0.18))
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Reset")
                    }
                }

                if showingSettings {
                    Text("Settings will use the shared API-first language and color contracts.")
                        .font(.system(.body, design: .rounded).weight(.semibold))
                        .padding()
                        .background(.white.opacity(0.35))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.horizontal, 24)
                }
            }
        }
        .onAppear {
            restoreFromPersisted()
        }
        .onReceive(timer) { _ in
            guard mode == .running else { return }
            tickCounter += 1
            if remaining <= 0 {
                mode = .expired
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
