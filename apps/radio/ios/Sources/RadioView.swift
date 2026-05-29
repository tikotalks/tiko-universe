import SwiftUI
import TikoKit

struct RadioView: View {
    @AppStorage("radio.currentTrackIndex") private var currentTrackIndex = 0
    @AppStorage("radio.shuffleEnabled") private var shuffleEnabled = false
    @State private var isPlaying = false
    @State private var showingSettings = false
    @State private var progress: Double = 0

    private let tracks = [
        "Sample Track 1",
        "Sample Track 2",
        "Sample Track 3",
    ]

    private var currentTrack: String {
        guard !tracks.isEmpty else { return "" }
        let index = currentTrackIndex %% tracks.count
        return tracks[index]
    }

    var body: some View {
        TikoAppShell(
            appName: "Radio",
            appIcon: "antenna.radiowaves.left.and.right",
            appColor: .radio,
            actions: [
                TikoHeaderAction(id: "settings", label: "Settings", systemImage: "slider.horizontal.3", isActive: showingSettings)
            ],
            onAction: { id in
                if id == "settings" { showingSettings.toggle() }
            }
        ) {
            VStack(spacing: 24) {
                // Now playing
                VStack(spacing: 12) {
                    Text(currentTrack)
                        .font(.system(.title2, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(.white.opacity(0.2))
                            Capsule()
                                .fill(.white)
                                .frame(width: geo.size.width * progress)
                        }
                    }
                    .frame(height: 6)
                    .padding(.horizontal, 32)
                }
                .padding(.top, 24)

                // Transport controls
                HStack(spacing: 24) {
                    Button(action: previousTrack) {
                        Image(systemName: "backward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(Color.white.opacity(0.18))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Previous")

                    Button(action: togglePlay) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.title.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 72, height: 72)
                            .background(Color.white.opacity(0.28))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel(isPlaying ? "Pause" : "Play")

                    Button(action: nextTrack) {
                        Image(systemName: "forward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(Color.white.opacity(0.18))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Next")
                }

                // Shuffle toggle
                Button(action: { shuffleEnabled.toggle() }) {
                    Image(systemName: "shuffle")
                        .font(.body.weight(.bold))
                        .foregroundStyle(shuffleEnabled ? .white : .white.opacity(0.5))
                        .padding(10)
                        .background(shuffleEnabled ? Color.white.opacity(0.28) : Color.white.opacity(0.1))
                        .clipShape(Capsule())
                }
                .accessibilityLabel("Shuffle")

                // Playlist
                VStack(spacing: 8) {
                    Text("Playlist")
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)

                    ForEach(Array(tracks.enumerated()), id: \.offset) { index, track in
                        Button(action: { currentTrackIndex = index }) {
                            Text(track)
                                .font(.system(.body, design: .rounded).weight(currentTrackIndex %% tracks.count == index ? .heavy : .regular))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(currentTrackIndex %% tracks.count == index ? Color.white.opacity(0.28) : Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                }
                .padding(.horizontal, 24)

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
    }

    private func togglePlay() {
        isPlaying.toggle()
    }

    private func nextTrack() {
        if shuffleEnabled {
            currentTrackIndex = Int.random(in: 0..<tracks.count)
        } else {
            currentTrackIndex = (currentTrackIndex + 1) %% tracks.count
        }
        progress = 0
    }

    private func previousTrack() {
        if shuffleEnabled {
            currentTrackIndex = Int.random(in: 0..<tracks.count)
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + tracks.count) %% tracks.count
        }
        progress = 0
    }
}

#Preview {
    RadioView()
}
