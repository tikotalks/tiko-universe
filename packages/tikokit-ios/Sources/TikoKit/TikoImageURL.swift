import Foundation

public enum TikoImageSize: String, CaseIterable, Sendable {
    case small, medium, large, original
}

public enum TikoImageURL {
    private static let cdnHost = "data.tikocdn.org"

    private static let sizeWidths: [TikoImageSize: Int] = [
        .small: 200,
        .medium: 800,
        .large: 1200,
        .original: 0,
    ]

    /// Build a CDN-resized image URL from a media original_url.
    /// Returns the original URL unchanged if it's not on the Tiko CDN.
    public static func resized(_ url: URL, size: TikoImageSize = .small) -> URL {
        guard size != .original,
              url.host == cdnHost,
              url.path.hasPrefix("/uploads/") else { return url }

        let width = sizeWidths[size] ?? 200
        return resized(url, width: width, quality: size == .small ? 80 : 85)
    }

    /// Build a CDN-resized image URL with an explicit pixel width.
    public static func resized(_ url: URL, width: Int, quality: Int = 80) -> URL {
        guard url.host == cdnHost, url.path.hasPrefix("/uploads/") else { return url }
        let cdnPath = "/cdn-cgi/image/width=\(width),quality=\(quality),f=auto\(url.path)"
        return URL(string: "https://\(cdnHost)\(cdnPath)") ?? url
    }

    /// Convenience overload for string URLs.
    public static func resized(_ urlString: String, size: TikoImageSize = .small) -> String {
        guard let url = URL(string: urlString) else { return urlString }
        return resized(url, size: size).absoluteString
    }
}
