import SwiftUI
import TikoKit

/// How the word board is laid out. Persisted via @AppStorage; Cloud is the default.
enum TalkBoardMode: String, CaseIterable, Sendable {
    /// Pannable canvas, most-used in the centre, rarer words spiralling outward.
    case cloud
    /// Grid of equal tiles, most-used at the top, scroll down for more.
    case tile
}

/// Board layout that places words on a big pannable canvas: the most-used words
/// (earliest in the importance-ordered list) sit in the centre and larger, with
/// rarer words spiralling outward and smaller. The user drags to explore.
///
/// Importance comes from list order — the Sentence API returns words sorted by
/// frequency/score, so index 0 is the most-used word.
struct TalkWordCloudView: View {
    let words: [TalkWordTile]
    let appColor: TikoAppColor
    let onTap: (TalkWordTile) -> Void

    // Phyllotaxis (sunflower) spiral: even, organic distribution with no gaps.
    private let goldenAngle = 2.399963229728653
    private let ringSpacing: CGFloat = 84
    private let margin: CGFloat = 96

    private struct Placed: Identifiable {
        let id: String
        let word: TalkWordTile
        let point: CGPoint
        let scale: CGFloat
    }

    private struct Layout {
        var placed: [Placed]
        var canvas: CGSize
    }

    var body: some View {
        let layout = computeLayout()

        ScrollView([.horizontal, .vertical], showsIndicators: false) {
            ZStack {
                ForEach(layout.placed) { item in
                    TalkCloudBubble(word: item.word, scale: item.scale, appColor: appColor) {
                        onTap(item.word)
                    }
                    .position(item.point)
                }
            }
            .frame(width: layout.canvas.width, height: layout.canvas.height)
        }
        .defaultScrollAnchor(.center)
        .scrollClipDisabled()
        .accessibilityLabel("Word cloud. Most used words are in the centre. Drag to explore.")
    }

    private func computeLayout() -> Layout {
        guard !words.isEmpty else { return Layout(placed: [], canvas: CGSize(width: 1, height: 1)) }

        var raw: [(word: TalkWordTile, x: CGFloat, y: CGFloat, scale: CGFloat)] = []
        var minX = CGFloat.zero, minY = CGFloat.zero, maxX = CGFloat.zero, maxY = CGFloat.zero

        for (index, word) in words.enumerated() {
            let radius = ringSpacing * CGFloat(sqrt(Double(index)))
            let angle = Double(index) * goldenAngle
            let x = radius * CGFloat(cos(angle))
            let y = radius * CGFloat(sin(angle))
            // Most-used words (lowest index) are biggest; taper to a readable floor.
            let scale = CGFloat(max(0.62, 1.45 - Double(index) * 0.035))
            raw.append((word, x, y, scale))
            minX = min(minX, x); minY = min(minY, y)
            maxX = max(maxX, x); maxY = max(maxY, y)
        }

        // Shift into positive canvas space (SwiftUI origin is top-left).
        let placed = raw.map { item in
            Placed(
                id: item.word.id,
                word: item.word,
                point: CGPoint(x: item.x - minX + margin, y: item.y - minY + margin),
                scale: item.scale
            )
        }
        let canvas = CGSize(width: maxX - minX + margin * 2, height: maxY - minY + margin * 2)
        return Layout(placed: placed, canvas: canvas)
    }
}

private struct TalkCloudBubble: View {
    let word: TalkWordTile
    let scale: CGFloat
    let appColor: TikoAppColor
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4 * scale) {
                if let icon = word.icon, !icon.isEmpty {
                    Image(systemName: icon)
                        .font(.system(size: 16 * scale, weight: .bold))
                        .foregroundStyle(appColor.palette.primary)
                }
                Text(word.text)
                    .font(.system(size: 15 * scale, weight: .heavy, design: .rounded))
                    .foregroundStyle(appColor.palette.dark)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, 14 * scale)
            .padding(.vertical, 10 * scale)
            .background(
                word.isCustom == true
                    ? appColor.palette.primary.opacity(0.18)
                    : Color.white.opacity(0.82)
            )
            .overlay(
                Capsule().stroke(appColor.palette.primary.opacity(word.isCustom == true ? 0.4 : 0.16), lineWidth: 1)
            )
            .clipShape(Capsule())
            .shadow(color: appColor.palette.dark.opacity(0.1), radius: 6 * scale, y: 3)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(word.text)
    }
}
