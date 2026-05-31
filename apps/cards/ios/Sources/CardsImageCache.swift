import CryptoKit
import Foundation
import UIKit

actor CardsImageCache {
    static let shared = CardsImageCache()

    private let directoryURL: URL
    private let session: URLSession

    init(
        fileManager: FileManager = .default,
        session: URLSession = .shared,
        directoryName: String = "CardsImageCache"
    ) {
        self.session = session
        let cachesURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first ?? fileManager.temporaryDirectory
        self.directoryURL = cachesURL.appending(path: directoryName, directoryHint: .isDirectory)
        try? fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    }

    func image(for url: URL) async -> UIImage? {
        if let cached = cachedImage(for: url) {
            return cached
        }

        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode), let image = UIImage(data: data) else {
                return cachedImage(for: url)
            }
            try? data.write(to: fileURL(for: url), options: .atomic)
            return image
        } catch {
            return cachedImage(for: url)
        }
    }

    func prefetch(_ urls: [URL]) async {
        await withTaskGroup(of: Void.self) { group in
            for url in urls {
                group.addTask { _ = await self.image(for: url) }
            }
        }
    }

    private func cachedImage(for url: URL) -> UIImage? {
        guard let data = try? Data(contentsOf: fileURL(for: url)) else { return nil }
        return UIImage(data: data)
    }

    private func fileURL(for url: URL) -> URL {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let key = digest.map { String(format: "%02x", $0) }.joined()
        return directoryURL.appending(path: "\(key).img")
    }
}
