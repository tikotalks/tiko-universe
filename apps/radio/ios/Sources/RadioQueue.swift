import Foundation

/// Pure, testable navigation logic for the radio playback queue.
///
/// Extracted from `RadioView` so the next/previous track selection — including
/// linear wrap-around and shuffle behaviour — can be verified in unit tests
/// without any UI or playback dependency. See `REQUIREMENTS.md`.
enum RadioQueue {
    /// The index of the next track to play.
    ///
    /// - In linear order (`shuffle == false`) it advances by one and wraps
    ///   around the end back to the start.
    /// - In shuffle order it returns a random in-range index.
    /// - Returns `nil` when the queue is empty.
    static func advance(current: Int, count: Int, shuffle: Bool) -> Int? {
        var rng = SystemRandomNumberGenerator()
        return advance(current: current, count: count, shuffle: shuffle, using: &rng)
    }

    /// The index of the previous track to play (mirror of `advance`).
    static func rewind(current: Int, count: Int, shuffle: Bool) -> Int? {
        var rng = SystemRandomNumberGenerator()
        return rewind(current: current, count: count, shuffle: shuffle, using: &rng)
    }

    /// `advance` with an injectable random-number generator (for deterministic tests).
    static func advance<G: RandomNumberGenerator>(current: Int, count: Int, shuffle: Bool, using generator: inout G) -> Int? {
        guard count > 0 else { return nil }
        guard count > 1 else { return 0 }
        if shuffle { return Int.random(in: 0..<count, using: &generator) }
        return (current + 1) % count
    }

    /// `rewind` with an injectable random-number generator (for deterministic tests).
    static func rewind<G: RandomNumberGenerator>(current: Int, count: Int, shuffle: Bool, using generator: inout G) -> Int? {
        guard count > 0 else { return nil }
        guard count > 1 else { return 0 }
        if shuffle { return Int.random(in: 0..<count, using: &generator) }
        return (current - 1 + count) % count
    }
}
