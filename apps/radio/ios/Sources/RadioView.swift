import SwiftUI
import TikoKit
import AVFoundation
import WebKit

// MARK: - WebViewController

private class WebViewController: NSObject, ObservableObject {
    let webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))

    override init() {
        super.init()
        webView.isHidden = true
        webView.navigationDelegate = nil
    }

    func playYouTube(videoId: String) {
        let urlString = "https://www.youtube.com/embed/\(videoId)?autoplay=1&controls=0&playsinline=1"
        guard let url = URL(string: urlString) else { return }
        webView.load(URLRequest(url: url))
    }

    func pause() {
        webView.evaluateJavaScript("document.querySelectorAll('video, iframe').forEach(el => { try { el.contentWindow.postMessage('{\"event\":\"command\",\"func\":\"pauseVideo\"}', '*') } catch(e) { el.pause?.() } });") { _ in }
    }

    func resume() {
        webView.evaluateJavaScript("document.querySelectorAll('video, iframe').forEach(el => { try { el.contentWindow.postMessage('{\"event\":\"command\",\"func\":\"playVideo\"}', '*') } catch(e) { el.play?.() } });") { _ in }
    }

    func stop() {
        webView.stopLoading()
        webView.load(URLRequest(url: URL(string: "about:blank")!))
    }
}

// MARK: - WebViewRepresentable

private struct HiddenWebView: UIViewRepresentable {
    let controller: WebViewController

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
    @State private var isPlaying = false
    @State private var showingSettings = false
    @State private var progress: Double = 0
    @State private var currentTime: TimeInterval = 0
    @State private var showAddSheet = false
    @State private var webController = WebViewController()
    @State private var audioPlayer: AVAudioPlayer?
    @State private var progressTimer: Timer?

    // MARK: - Computed Properties

    private var tracks: [RadioTrack] {
        library.tracks
    }

    private var currentTrack: RadioTrack? {
        guard !tracks.isEmpty else { return nil }
        let index = currentTrackIndex % tracks.count
        return tracks[index]
    }

    private var currentTrackTitle: String {
        currentTrack?.title ?? "No Track Selected"
    }

    private var currentTrackArtist: String? {
        currentTrack?.artist
    }

    private var timeDisplay: String {
        let current = Int(currentTime)
        let minutes = current / 60
        let seconds = current % 60
        let duration = currentTrack?.duration.map { Int($0) } ?? 0
        let durMin = duration / 60
        let durSec = duration % 60
        return String(format: "%d:%02d / %d:%02d", minutes, seconds, durMin, durSec)
    }

    // MARK: - Body

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
            VStack(spacing: 20) {
                // Now Playing
                VStack(spacing: 8) {
                    Text(currentTrackTitle)
                        .font(.system(.title2, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    if let artist = currentTrackArtist, !artist.isEmpty {
                        Text(artist)
                            .font(.system(.subheadline, design: .rounded).weight(.medium))
                            .foregroundStyle(.white.opacity(0.7))
                            .lineLimit(1)
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white).frame(width: geo.size.width * progress)
                        }
                    }
                    .frame(height: 6)
                    .padding(.horizontal, 32)

                    Text(timeDisplay)
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(.white.opacity(0.6))
                }
                .padding(.top, 24)

                // Transport controls
                HStack(spacing: 20) {
                    Button(action: previousTrack) {
                        Image(systemName: "backward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.white.opacity(0.18))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Previous")

                    Button(action: togglePlay) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.title.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 64, height: 64)
                            .background(Color.white.opacity(0.28))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel(isPlaying ? "Pause" : "Play")

                    Button(action: nextTrack) {
                        Image(systemName: "forward.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.white.opacity(0.18))
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Next")
                }

                // Shuffle + Repeat
                HStack(spacing: 16) {
                    Button(action: { shuffleEnabled.toggle() }) {
                        Image(systemName: "shuffle")
                            .font(.body.weight(.bold))
                            .foregroundStyle(shuffleEnabled ? .white : .white.opacity(0.5))
                            .padding(8)
                            .background(shuffleEnabled ? Color.white.opacity(0.28) : Color.white.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    .accessibilityLabel("Shuffle")

                    Button(action: { repeatEnabled.toggle() }) {
                        Image(systemName: "repeat")
                            .font(.body.weight(.bold))
                            .foregroundStyle(repeatEnabled ? .white : .white.opacity(0.5))
                            .padding(8)
                            .background(repeatEnabled ? Color.white.opacity(0.28) : Color.white.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    .accessibilityLabel("Repeat")
                }

                // Add Track Button
                Button(action: { showAddSheet = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                }
                .padding(.top, 4)

                // Library
                VStack(spacing: 6) {
                    Text("Library")
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)

                    if tracks.isEmpty {
                        Text("No tracks yet. Add music to get started.")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(.white.opacity(0.5))
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
                                                    .foregroundStyle(.white)
                                                    .lineLimit(1)
                                                if let artist = track.artist {
                                                    Text(artist)
                                                        .font(.system(.caption, design: .rounded))
                                                        .foregroundStyle(.white.opacity(0.6))
                                                        .lineLimit(1)
                                                }
                                            }
                                            Spacer()
                                            if currentTrackIndex == index {
                                                Image(systemName: "speaker.wave.2.fill")
                                                    .foregroundStyle(.white)
                                                    .font(.caption)
                                            }
                                        }
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                                        .background(currentTrackIndex == index ? Color.white.opacity(0.28) : Color.white.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)

                // Settings placeholder
                if showingSettings {
                    Text("Settings: Language and color mode synced via API.")
                        .font(.system(.body, design: .rounded).weight(.semibold))
                        .padding()
                        .background(.white.opacity(0.35))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.horizontal, 20)
                }
            }
        }
        // Hidden WebView for YouTube playback
        HiddenWebView(controller: webController)
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
            stopPlayback()
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
        progress = 0
        currentTime = 0
        playCurrentTrack()
    }

    // MARK: - Playback

    private func playCurrentTrack() {
        stopPlayback()
        guard let track = currentTrack else { return }

        switch track.source {
        case .youtube:
            if let videoId = track.youtubeVideoId {
                webController.playYouTube(videoId: videoId)
                isPlaying = true
                startProgressTimer()
            }
        case .r2, .upload:
            if let urlString = track.audioUrl, let url = URL(string: urlString) {
                DispatchQueue.global(qos: .userInitiated).async {
                    if let data = try? Data(contentsOf: url) {
                        DispatchQueue.main.async {
                            do {
                                self.audioPlayer = try AVAudioPlayer(data: data)
                                self.audioPlayer?.play()
                                self.isPlaying = true
                                self.startProgressTimer()
                            } catch {
                                self.isPlaying = false
                            }
                        }
                    }
                }
            }
        }
    }

    private func stopPlayback() {
        audioPlayer?.stop()
        audioPlayer = nil
        webController.stop()
        isPlaying = false
        stopProgressTimer()
    }

    private func togglePlay() {
        if isPlaying {
            // Pause
            audioPlayer?.pause()
            webController.pause()
            isPlaying = false
            stopProgressTimer()
        } else {
            // Resume or start
            if audioPlayer != nil {
                audioPlayer?.play()
                webController.resume()
                isPlaying = true
                startProgressTimer()
            } else {
                playCurrentTrack()
            }
        }
    }

    private func nextTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            var newIndex = Int.random(in: 0..<tracks.count)
            while newIndex == currentTrackIndex %% tracks.count && tracks.count > 1 {
                newIndex = Int.random(in: 0..<tracks.count)
            }
            currentTrackIndex = newIndex
        } else {
            currentTrackIndex = (currentTrackIndex + 1) %% tracks.count
        }
        progress = 0
        currentTime = 0
        playCurrentTrack()
    }

    private func previousTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            var newIndex = Int.random(in: 0..<tracks.count)
            while newIndex == currentTrackIndex %% tracks.count && tracks.count > 1 {
                newIndex = Int.random(in: 0..<tracks.count)
            }
            currentTrackIndex = newIndex
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + tracks.count) %% tracks.count
        }
        progress = 0
        currentTime = 0
        playCurrentTrack()
    }

    // MARK: - Progress Timer

    private func startProgressTimer() {
        stopProgressTimer()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            updateProgress()
        }
    }

    private func stopProgressTimer() {
        progressTimer?.invalidate()
        progressTimer = nil
    }

    private func updateProgress() {
        if let player = audioPlayer, player.duration > 0 {
            currentTime = player.currentTime
            progress = player.currentTime / player.duration

            if !player.isPlaying {
                isPlaying = false
                stopProgressTimer()
                if repeatEnabled {
                    playCurrentTrack()
                } else {
                    nextTrack()
                }
            }
        } else {
            // YouTube tracks — estimate progress based on duration if available
            currentTime += 0.5
            if let duration = currentTrack?.duration, duration > 0 {
                progress = min(currentTime / duration, 1.0)
                if currentTime >= duration {
                    isPlaying = false
                    stopProgressTimer()
                    if repeatEnabled {
                        playCurrentTrack()
                    } else {
                        nextTrack()
                    }
                }
            }
        }
    }
}

#Preview {
    RadioView()
}
