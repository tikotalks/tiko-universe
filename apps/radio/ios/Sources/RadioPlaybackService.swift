import AVFoundation
import Foundation
import Observation

@MainActor
@Observable
final class RadioPlaybackService {
    let youtubeBridge = YouTubePlaybackBridge()

    private var player: AVPlayer?
    private var progressTimer: Timer?

    private(set) var currentTrack: RadioTrack?
    private(set) var isPlaying = false
    private(set) var progress: Double = 0
    private(set) var currentTime: TimeInterval = 0

    var hasCurrentTrack: Bool {
        currentTrack != nil
    }

    var duration: TimeInterval? {
        if let playerDuration = player?.currentItem?.duration.seconds, playerDuration.isFinite {
            return playerDuration
        }
        return currentTrack?.duration
    }

    func play(_ track: RadioTrack) {
        stop(resetTrack: false)
        currentTrack = track
        currentTime = 0
        progress = 0

        switch track.source {
        case .youtube:
            guard let videoId = track.youtubeVideoId else { return }
            youtubeBridge.play(videoId: videoId)
            isPlaying = true
            startProgressTimer()
        case .r2, .upload:
            guard let urlString = track.audioUrl,
                  let url = URL(string: urlString) else { return }
            configureAudioSession()
            let player = AVPlayer(url: url)
            self.player = player
            player.play()
            isPlaying = true
            startProgressTimer()
        }
    }

    func pause() {
        player?.pause()
        youtubeBridge.pause()
        isPlaying = false
        stopProgressTimer()
    }

    func resume() {
        if let player {
            player.play()
            isPlaying = true
            startProgressTimer()
            return
        }

        guard currentTrack?.source == .youtube else { return }
        youtubeBridge.resume()
        isPlaying = true
        startProgressTimer()
    }

    func stop(resetTrack: Bool = true) {
        player?.pause()
        player = nil
        youtubeBridge.stop()
        isPlaying = false
        stopProgressTimer()
        progress = 0
        currentTime = 0
        if resetTrack {
            currentTrack = nil
        }
    }

    private func configureAudioSession() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    private func startProgressTimer() {
        stopProgressTimer()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateProgress()
            }
        }
    }

    private func stopProgressTimer() {
        progressTimer?.invalidate()
        progressTimer = nil
    }

    private func updateProgress() {
        if let player {
            let current = player.currentTime().seconds
            if current.isFinite {
                currentTime = current
            }
            if let duration, duration > 0 {
                progress = min(max(currentTime / duration, 0), 1)
            }
            if player.rate == 0, isPlaying, progress >= 0.995 {
                isPlaying = false
                stopProgressTimer()
            }
            return
        }

        guard currentTrack?.source == .youtube else { return }
        currentTime += 0.5
        if let duration, duration > 0 {
            progress = min(currentTime / duration, 1)
            if currentTime >= duration {
                isPlaying = false
                stopProgressTimer()
            }
        }
    }
}
