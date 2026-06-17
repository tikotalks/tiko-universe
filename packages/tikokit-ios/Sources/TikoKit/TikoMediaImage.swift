import SwiftUI
import UIKit

// MARK: - MediaImageResolver

/// Resolves media library IDs to loadable image URLs via the media service.
/// Results are cached so repeated lookups for the same ID are instant.
public actor MediaImageResolver {
    public static let shared = MediaImageResolver()

    /// Override at app launch: `MediaImageResolver.baseURL = "https://media.tikoapi.org/v1"`
    public var baseURL = "https://media.tikoapi.org/v1"

    private var cache: [String: URL] = [:]

    private struct MediaResponse: Decodable {
        let original_url: String?
    }

    /// Resolve a media ID (or full URL) to a loadable image URL.
    /// - Media IDs are looked up via `<baseURL>/media/<id>` and the `original_url` is cached.
    /// - Full URLs (starting with `http`) are returned as-is.
    public func resolve(_ imageRef: String) async -> URL? {
        if let cached = cache[imageRef] { return cached }

        if imageRef.hasPrefix("http"), let url = URL(string: imageRef) {
            cache[imageRef] = url
            return url
        }

        let encoded = imageRef.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? imageRef
        guard let url = URL(string: "\(baseURL)/media/\(encoded)") else { return nil }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return nil }
            let result = try JSONDecoder().decode(MediaResponse.self, from: data)
            if let originalURLString = result.original_url, let resolved = URL(string: originalURLString) {
                cache[imageRef] = resolved
                return resolved
            }
        } catch {
            // Network or decoding failure — leave unresolved
        }
        return nil
    }

    /// Pre-populate the cache (useful when the media picker already has the URL).
    public func cache(_ imageRef: String, url: URL) {
        cache[imageRef] = url
    }
}

// MARK: - TikoMediaImage

/// Loads and displays an image from a media library ID (or full URL).
/// Resolves the ID through `MediaImageResolver` on first appear, then loads via `TikoRemoteImageCache`.
/// Use this instead of `TikoCachedRemoteImage` when you only have a media ID, not a direct URL.
public struct TikoMediaImage<Placeholder: View>: View {
    public let imageRef: String?
    public let contentMode: ContentMode
    public let placeholder: Placeholder

    @State private var image: UIImage?

    public init(
        imageRef: String?,
        contentMode: ContentMode = .fill,
        @ViewBuilder placeholder: () -> Placeholder
    ) {
        self.imageRef = imageRef
        self.contentMode = contentMode
        self.placeholder = placeholder()
    }

    public var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else {
                placeholder
            }
        }
        .task(id: imageRef) {
            guard let imageRef, !imageRef.isEmpty else { return }
            if let resolvedURL = await MediaImageResolver.shared.resolve(imageRef) {
                image = await TikoRemoteImageCache.shared.image(for: resolvedURL)
            }
        }
    }
}
