import Foundation
import WebKit

@MainActor
final class YouTubePlaybackBridge {
    let webView: WKWebView

    init() {
        let config = WKWebViewConfiguration()
        // Required to allow autoplay without a user gesture inside the hidden WebView
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
    }

    func play(videoId: String) {
        let urlString = "https://www.youtube.com/embed/\(videoId)?autoplay=1&controls=0&playsinline=1&enablejsapi=1"
        guard let url = URL(string: urlString) else { return }
        webView.load(URLRequest(url: url))
    }

    func pause() {
        webView.evaluateJavaScript("document.querySelectorAll('video').forEach(function(v){v.pause()})") { _, _ in }
    }

    func resume() {
        webView.evaluateJavaScript("document.querySelectorAll('video').forEach(function(v){v.play()})") { _, _ in }
    }

    func stop() {
        webView.stopLoading()
        webView.load(URLRequest(url: URL(string: "about:blank")!))
    }
}
