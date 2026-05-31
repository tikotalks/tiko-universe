import Foundation
import WebKit

@MainActor
final class YouTubePlaybackBridge {
    let webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))

    init() {
        webView.isHidden = true
        webView.navigationDelegate = nil
    }

    func play(videoId: String) {
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
