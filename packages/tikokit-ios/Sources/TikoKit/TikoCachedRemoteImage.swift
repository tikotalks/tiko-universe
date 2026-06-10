import CryptoKit
import SwiftUI
import UIKit

public actor TikoRemoteImageCache {
    public static let shared = TikoRemoteImageCache()

    private let directoryURL: URL
    private let memoryCache = NSCache<NSURL, UIImage>()
    private let session: URLSession

    public init(
        fileManager: FileManager = .default,
        session: URLSession = .shared,
        directoryName: String = "TikoRemoteImageCache"
    ) {
        self.session = session
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        self.directoryURL = baseURL.appending(path: directoryName, directoryHint: .isDirectory)
        try? fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    }

    public func image(for url: URL) async -> UIImage? {
        if let cached = memoryCache.object(forKey: url as NSURL) {
            return cached
        }
        if let cached = diskImage(for: url) {
            memoryCache.setObject(cached, forKey: url as NSURL)
            return cached
        }

        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode),
                  let image = UIImage(data: data) else {
                return diskImage(for: url)
            }
            memoryCache.setObject(image, forKey: url as NSURL)
            try? data.write(to: fileURL(for: url), options: .atomic)
            return image
        } catch {
            return diskImage(for: url)
        }
    }

    public func prefetch(_ urls: [URL]) async {
        await withTaskGroup(of: Void.self) { group in
            for url in urls {
                group.addTask { _ = await self.image(for: url) }
            }
        }
    }

    private func diskImage(for url: URL) -> UIImage? {
        guard let data = try? Data(contentsOf: fileURL(for: url)),
              let image = UIImage(data: data) else { return nil }
        return image
    }

    private func fileURL(for url: URL) -> URL {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let key = digest.map { String(format: "%02x", $0) }.joined()
        return directoryURL.appending(path: "\(key).img")
    }
}

public struct TikoCachedRemoteImage<Placeholder: View>: View {
    private let url: URL
    private let contentMode: ContentMode
    private let placeholder: Placeholder

    @State private var image: UIImage?

    public init(
        url: URL,
        contentMode: ContentMode = .fill,
        @ViewBuilder placeholder: () -> Placeholder
    ) {
        self.url = url
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
        .task(id: url) {
            if url.isFileURL {
                image = UIImage(contentsOfFile: url.path)
            } else {
                image = await TikoRemoteImageCache.shared.image(for: url)
            }
        }
    }
}
