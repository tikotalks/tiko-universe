import SwiftUI
import TikoKit

/// Board layout that places words on a big pannable canvas: the most-used words
/// (earliest in the importance-ordered list) sit in the centre and larger, with
/// rarer words spiralling outward and smaller. The user drags to explore.
///
/// Importance comes from list order — the Sentence API returns words sorted by
/// frequency/likelihood, so index 0 is the most-used word.
struct TalkWordCloudView: View {
    let words: [TalkWordTile]
    let appColor: TikoAppColor
    let onTap: (TalkWordTile) -> Void

    // Phyllotaxis (sunflower) spiral: even, organic distribution with no gaps.
    private let goldenAngle = 2.399963229728653
    private let ringSpacing: CGFloat = 132
    private let margin: CGFloat = 110
    private let baseDiameter: CGFloat = 92

    private struct Placed: Identifiable {
        let id: String
        let word: TalkWordTile
        let point: CGPoint
        let diameter: CGFloat
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
                    TalkCloudBubble(word: item.word, diameter: item.diameter, appColor: appColor) {
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

        var raw: [(word: TalkWordTile, x: CGFloat, y: CGFloat, diameter: CGFloat)] = []
        var minX = CGFloat.zero, minY = CGFloat.zero, maxX = CGFloat.zero, maxY = CGFloat.zero

        for (index, word) in words.enumerated() {
            let radius = ringSpacing * CGFloat(sqrt(Double(index)))
            let angle = Double(index) * goldenAngle
            let x = radius * CGFloat(cos(angle))
            let y = radius * CGFloat(sin(angle))
            // Most-used words (lowest index) are biggest; taper to a readable floor.
            let scale = CGFloat(max(0.62, 1.5 - Double(index) * 0.035))
            raw.append((word, x, y, baseDiameter * scale))
            minX = min(minX, x); minY = min(minY, y)
            maxX = max(maxX, x); maxY = max(maxY, y)
        }

        // Shift into positive canvas space (SwiftUI origin is top-left).
        let placed = raw.map { item in
            Placed(
                id: item.word.id,
                word: item.word,
                point: CGPoint(x: item.x - minX + margin, y: item.y - minY + margin),
                diameter: item.diameter
            )
        }
        let canvas = CGSize(width: maxX - minX + margin * 2, height: maxY - minY + margin * 2)
        return Layout(placed: placed, canvas: canvas)
    }
}

/// A single round (1:1) word in the cloud. Shows Tiko media when the word defines
/// an image, otherwise just the word text centred. No decorative icons.
private struct TalkCloudBubble: View {
    let word: TalkWordTile
    let diameter: CGFloat
    let appColor: TikoAppColor
    let onTap: () -> Void

    private var mediaURL: URL? {
        guard let image = word.image, !image.isEmpty else { return nil }
        return URL(string: image)
    }

    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(word.isCustom == true ? appColor.palette.primary.opacity(0.18) : Color.white.opacity(0.85))
                    .overlay(Circle().stroke(appColor.palette.primary.opacity(word.isCustom == true ? 0.4 : 0.16), lineWidth: 1))
                    .shadow(color: appColor.palette.dark.opacity(0.1), radius: diameter * 0.06, y: 3)

                if let mediaURL {
                    AsyncImage(url: mediaURL) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Text(word.text)
                            .font(.system(size: diameter * 0.18, weight: .heavy, design: .rounded))
                            .foregroundStyle(appColor.palette.dark)
                            .lineLimit(2)
                            .minimumScaleFactor(0.6)
                            .multilineTextAlignment(.center)
                            .padding(diameter * 0.14)
                    }
                    .frame(width: diameter, height: diameter)
                    .clipShape(Circle())
                } else {
                    Text(word.text)
                        .font(.system(size: diameter * 0.2, weight: .heavy, design: .rounded))
                        .foregroundStyle(appColor.palette.dark)
                        .lineLimit(2)
                        .minimumScaleFactor(0.6)
                        .multilineTextAlignment(.center)
                        .padding(diameter * 0.14)
                }
            }
            .frame(width: diameter, height: diameter)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(word.text)
    }
}
