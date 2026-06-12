import AVFoundation
import Foundation
import TikoKit

@MainActor
final class TalkAudioPlayer {
    private var player: AVPlayer?

    func play(url: URL) {
        TikoSpeech.configurePlaybackSession()
        player = AVPlayer(url: url)
        player?.play()
    }

    func stop() {
        player?.pause()
        player = nil
    }
}
