import SwiftUI
import TikoKit
import WebKit

// MARK: - WebViewRepresentable

private struct HiddenWebView: UIViewRepresentable {
    let controller: YouTubePlaybackBridge

    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - AddTrackSheet

struct AddTrackSheet: View {
    @State private var youtubeUrl = ""
    @State private var trackTitle = ""
    @State private var trackArtist = ""
    @Environment(\.dismiss) private var dismiss
    var onAdd: (RadioTrack) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Add from YouTube") {
                    TextField("YouTube URL or Video ID", text: $youtubeUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextField("Title (optional — auto-filled from URL)", text: $trackTitle)
                    TextField("Artist (optional)", text: $trackArtist)

                    Button(action: addYouTubeTrack) {
                        HStack {
                            Image(systemName: "link")
                            Text("Add YouTube Track")
                        }
                    }
                    .disabled(youtubeUrl.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                Section("Upload Audio File") {
                    Button(action: { /* DocumentPicker would be wired here */ }) {
                        HStack {
                            Image(systemName: "doc.badge.plus")
                            Text("Choose Audio File")
                        }
                    }
                    Text("File uploads require R2 storage configuration.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Add Track")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func addYouTubeTrack() {
        let videoId = YouTubeVideoIDParser.parse(youtubeUrl)

        let title = trackTitle.trimmingCharacters(in: .whitespaces).isEmpty
            ? "YouTube Track (\(videoId.prefix(8)))"
            : trackTitle.trimmingCharacters(in: .whitespaces)
        let artist = trackArtist.trimmingCharacters(in: .whitespaces).isEmpty
            ? nil
            : trackArtist.trimmingCharacters(in: .whitespaces)

        let track = RadioTrack(
            title: title,
            artist: artist,
            source: .youtube,
            youtubeVideoId: videoId
        )
        onAdd(track)
        dismiss()
    }
}

// MARK: - RadioView

struct RadioView: View {
    // Persistence
    @AppStorage("radio.currentTrackIndex") private var currentTrackIndex = 0
    @AppStorage("radio.shuffleEnabled") private var shuffleEnabled = false
    @AppStorage("radio.repeatEnabled") private var repeatEnabled = false

    // State
    @State private var library = RadioLibraryStore()
    @State private var playback = RadioPlaybackService()
    @State private var showAddSheet = false

    // MARK: - Computed Properties

    private var tracks: [RadioTrack] {
        library.tracks
    }

    private var currentTrack: RadioTrack? {
        guard !tracks.isEmpty else { return nil }
        let index = currentTrackIndex % tracks.count
        return tracks[index]
    }

    private var currentDisplayTrack: RadioTrack? {
        playback.currentTrack ?? currentTrack
    }

    private var currentTrackTitle: String {
        currentDisplayTrack?.title ?? "No Track Selected"
    }

    private var currentTrackArtist: String? {
        currentDisplayTrack?.artist
    }

    private var timeDisplay: String {
        let current = Int(playback.currentTime)
        let minutes = current / 60
        let seconds = current % 60
        let duration = Int(playback.duration ?? currentDisplayTrack?.duration ?? 0)
        let durMin = duration / 60
        let durSec = duration % 60
        return String(format: "%d:%02d / %d:%02d", minutes, seconds, durMin, durSec)
    }

    private var radioPrimary: Color { TikoAppColor.radio.palette.primary }
    private var radioDark: Color { TikoAppColor.radio.palette.dark }

    // MARK: - Body

    var body: some View {
        TikoAppShell(
            appName: "Radio",
            appIcon: "antenna.radiowaves.left.and.right",
            appColor: .radio,
            settingsContent: {
                TikoSettingsSection(title: "Radio") {
                    TikoSettingsToggleRow(title: "Shuffle", icon: "shuffle", appColor: .radio, isOn: $shuffleEnabled)
                    TikoSettingsToggleRow(title: "Repeat", icon: "repeat", appColor: .radio, isOn: $repeatEnabled)
                }
            }
        ) {
            VStack(spacing: 20) {
                // Now Playing
                VStack(spacing: 8) {
                    Text(currentTrackTitle)
                        .font(.system(.title2, design: .rounded).weight(.heavy))
                        .foregroundStyle(radioDark)
                        .lineLimit(1)

                    if let artist = currentTrackArtist, !artist.isEmpty {
                        Text(artist)
                            .font(.system(.subheadline, design: .rounded).weight(.medium))
                            .foregroundStyle(radioDark.opacity(0.72))
                            .lineLimit(1)
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(radioPrimary.opacity(0.18))
                            Capsule().fill(radioPrimary).frame(width: geo.size.width * playback.progress)
                        }
                    }
                    .frame(height: 6)
                    .padding(.horizontal, 32)

                    Text(timeDisplay)
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(radioDark.opacity(0.62))
                }
                .padding(.top, 24)

                // Transport controls
                HStack(spacing: 20) {
                    Button(action: previousTrack) {
                        Image(systemName: "backward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(radioDark)
                            .frame(width: 50, height: 50)
                            .background(radioPrimary.opacity(0.14))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Previous")

                    Button(action: togglePlay) {
                        Image(systemName: playback.isPlaying ? "pause.fill" : "play.fill")
                            .font(.title.weight(.bold))
                            .foregroundStyle(radioDark)
                            .frame(width: 64, height: 64)
                            .background(radioPrimary.opacity(0.22))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel(playback.isPlaying ? "Pause" : "Play")

                    Button(action: nextTrack) {
                        Image(systemName: "forward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(radioDark)
                            .frame(width: 50, height: 50)
                            .background(radioPrimary.opacity(0.14))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Next")
                }

                // Shuffle + Repeat
                HStack(spacing: 16) {
                    Button(action: { shuffleEnabled.toggle() }) {
                        Image(systemName: "shuffle")
                            .font(.body.weight(.bold))
                            .foregroundStyle(shuffleEnabled ? radioDark : radioDark.opacity(0.48))
                            .padding(8)
                            .background(shuffleEnabled ? radioPrimary.opacity(0.22) : radioPrimary.opacity(0.10))
                            .clipShape(Capsule())
                    }
                    .accessibilityLabel("Shuffle")

                    Button(action: { repeatEnabled.toggle() }) {
                        Image(systemName: "repeat")
                            .font(.body.weight(.bold))
                            .foregroundStyle(repeatEnabled ? radioDark : radioDark.opacity(0.48))
                            .padding(8)
                            .background(repeatEnabled ? radioPrimary.opacity(0.22) : radioPrimary.opacity(0.10))
                            .clipShape(Capsule())
                    }
                    .accessibilityLabel("Repeat")
                }

                // Add Track Button
                Button(action: { showAddSheet = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(radioDark)
                }
                .padding(.top, 4)

                // Library
                VStack(spacing: 6) {
                    Text("Library")
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(radioDark)

                    if tracks.isEmpty {
                        Text("No tracks yet. Add music to get started.")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(radioDark.opacity(0.55))
                            .padding()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 4) {
                                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                                    Button(action: { selectTrack(index) }) {
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(track.title)
                                                    .font(.system(.body, design: .rounded).weight(currentTrackIndex == index ? .heavy : .regular))
                                                    .foregroundStyle(radioDark)
                                                    .lineLimit(1)
                                                if let artist = track.artist {
                                                    Text(artist)
                                                        .font(.system(.caption, design: .rounded))
                                                        .foregroundStyle(radioDark.opacity(0.62))
                                                        .lineLimit(1)
                                                }
                                            }
                                            Spacer()
                                            if currentTrackIndex == index {
                                                Image(systemName: "speaker.wave.2.fill")
                                                    .foregroundStyle(radioDark)
                                                    .font(.caption)
                                            }
                                        }
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                                        .background(currentTrackIndex == index ? radioPrimary.opacity(0.20) : Color.white.opacity(0.72))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
        // Hidden WebView for YouTube playback
        HiddenWebView(controller: playback.youtubeBridge)
            .frame(width: 1, height: 1)
            .hidden()
        .sheet(isPresented: $showAddSheet) {
            AddTrackSheet { newTrack in
                addTrack(newTrack)
            }
        }
        .onAppear {
            library.load()
        }
        .onDisappear {
            playback.stop()
        }
    }

    // MARK: - Track Management

    private func addTrack(_ track: RadioTrack) {
        let wasEmpty = tracks.isEmpty
        library.addTrack(track)
        if wasEmpty {
            selectTrack(0)
        }
    }

    private func selectTrack(_ index: Int) {
        guard index >= 0, index < tracks.count else { return }
        currentTrackIndex = index
        playCurrentTrack()
    }

    // MARK: - Playback

    private func playCurrentTrack() {
        guard let track = currentTrack else { return }
        playback.play(track)
    }

    private func togglePlay() {
        if playback.isPlaying {
            playback.pause()
        } else if playback.currentTrack != nil {
            playback.resume()
        } else {
            playCurrentTrack()
        }
    }

    private func nextTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            var newIndex = Int.random(in: 0..<tracks.count)
            while newIndex == currentTrackIndex % tracks.count && tracks.count > 1 {
                newIndex = Int.random(in: 0..<tracks.count)
            }
            currentTrackIndex = newIndex
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % tracks.count
        }
        playCurrentTrack()
    }

    private func previousTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            var newIndex = Int.random(in: 0..<tracks.count)
            while newIndex == currentTrackIndex % tracks.count && tracks.count > 1 {
                newIndex = Int.random(in: 0..<tracks.count)
            }
            currentTrackIndex = newIndex
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + tracks.count) % tracks.count
        }
        playCurrentTrack()
    }
}

#Preview {
    RadioView()
}
