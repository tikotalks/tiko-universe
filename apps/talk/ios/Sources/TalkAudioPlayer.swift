import AVFoundation
import Foundation

@MainActor
final class TalkAudioPlayer {
    private var player: AVPlayer?

    func play(url: URL) {
        player = AVPlayer(url: url)
        player?.play()
    }

    func stop() {
        player?.pause()
        player = nil
    }
}
