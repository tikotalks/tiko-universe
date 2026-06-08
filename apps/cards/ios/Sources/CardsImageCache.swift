import Foundation
import TikoKit
import UIKit

actor CardsImageCache {
    static let shared = CardsImageCache()

    func image(for url: URL) async -> UIImage? {
        await TikoRemoteImageCache.shared.image(for: url)
    }

    func prefetch(_ urls: [URL]) async {
        await TikoRemoteImageCache.shared.prefetch(urls)
    }
}
