import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import UIKit

// ────────────────────────────────────────────────────────────────
// Collections that travel.
//
// A collection is published once and handed around by its share code: a QR on
// the fridge, a link in a message, or eight characters read out loud. Curated
// sets ("Disney", "Bedtime") are the same thing, marked featured.
// ────────────────────────────────────────────────────────────────

struct RadioSharedSong: Codable, Equatable, Sendable {
    var title: String
    var artist: String?
    var source: String
    var youtubeVideoId: String?
    var audioUrl: String?
    var externalId: String?
    var externalUrl: String?
    var thumbnailUrl: String?
    var duration: Double?
}

struct RadioSharedCollection: Codable, Equatable, Identifiable, Sendable {
    var code: String
    var name: String
    var color: String
    var imageUrl: String?
    var songs: [RadioSharedSong]
    var songCount: Int
    var featured: Bool
    var shareUrl: String

    var id: String { code }

    var imageURL: URL? {
        guard let imageUrl else { return nil }
        return URL(string: imageUrl)
    }
}

enum RadioShareCode {
    /// Crockford-style base32 without I, L, O and U — nothing a parent can misread.
    static let alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    static let length = 8

    /// Accept a code however it was typed: lower case, spaced, hyphenated, or
    /// with the letters that look like digits substituted.
    static func normalize(_ input: String) -> String? {
        let cleaned = input
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "O", with: "0")
            .replacingOccurrences(of: "I", with: "1")
            .replacingOccurrences(of: "L", with: "1")
        guard cleaned.count == length else { return nil }
        guard cleaned.allSatisfy({ alphabet.contains($0) }) else { return nil }
        return cleaned
    }

    /// The code carried by a scan: a share link, or the bare code.
    static func fromScan(_ text: String) -> String? {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return nil }

        if let components = URLComponents(string: value), components.host != nil {
            if let queryValue = components.queryItems?.first(where: { $0.name == "collection" })?.value {
                return normalize(queryValue)
            }
            if let lastSegment = components.path.split(separator: "/").last {
                return normalize(String(lastSegment))
            }
            return nil
        }

        return normalize(value)
    }

    /// The code split in two halves — eight characters read aloud in one go slip.
    static func formatted(_ code: String) -> String {
        guard code.count == length else { return code }
        let middle = code.index(code.startIndex, offsetBy: 4)
        return "\(code[code.startIndex..<middle]) \(code[middle...])"
    }
}

enum RadioShareConversion {
    /// Sources that mean the same thing on someone else's device. An uploaded
    /// file lives in one device's storage, so it is left out rather than shared
    /// as a dead tile.
    static let shareableSources: Set<TrackSource> = [.youtube, .r2, .spotify, .appleMusic]

    static func sharedSongs(from tracks: [RadioTrack]) -> (songs: [RadioSharedSong], skipped: Int) {
        var songs: [RadioSharedSong] = []
        var skipped = 0

        for track in tracks {
            guard shareableSources.contains(track.source) else {
                skipped += 1
                continue
            }
            songs.append(RadioSharedSong(
                title: track.title,
                artist: track.artist,
                source: track.source.rawValue,
                youtubeVideoId: track.youtubeVideoId,
                audioUrl: track.audioUrl,
                externalId: track.externalId,
                externalUrl: track.externalUrl,
                thumbnailUrl: track.thumbnailUrl,
                duration: track.duration
            ))
        }

        return (songs, skipped)
    }

    /// Songs from a scanned collection, as library tracks.
    ///
    /// The id is derived from the shelf they land on, so re-scanning the same
    /// code into the same collection replaces its songs while a second import
    /// onto a new shelf keeps both copies.
    static func tracks(from collection: RadioSharedCollection, categoryID: String) -> [RadioTrack] {
        collection.songs.compactMap { song in
            guard let source = TrackSource(rawValue: song.source) else { return nil }
            let identity = song.youtubeVideoId ?? song.externalId ?? song.audioUrl ?? song.title
            return RadioTrack(
                id: "shared:\(categoryID):\(identity)",
                title: song.title,
                artist: song.artist,
                source: source,
                youtubeVideoId: song.youtubeVideoId,
                audioUrl: song.audioUrl,
                thumbnailUrl: song.thumbnailUrl,
                duration: song.duration,
                categoryId: categoryID,
                externalId: song.externalId,
                externalUrl: song.externalUrl
            )
        }
    }
}

enum RadioQRCode {
    private static let context = CIContext()

    /// A QR image for `value`, rendered at `size` points.
    ///
    /// Medium error correction: it still scans with a thumb over a corner,
    /// without the density of the higher levels.
    static func image(for value: String, size: CGFloat = 220) -> UIImage? {
        guard !value.isEmpty, let data = value.data(using: .utf8) else { return nil }

        let filter = CIFilter.qrCodeGenerator()
        filter.message = data
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }

        // The generator emits one pixel per module; scale up before rasterising
        // so the code stays crisp instead of being smoothed on the way out.
        let scale = max(size / output.extent.width, 1)
        let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
