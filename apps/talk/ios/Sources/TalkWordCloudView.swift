import SwiftUI
import TikoKit

/// Board layout that places words in concentric rings: the single most-used word
/// sits dead centre, the next-most-used form the first ring around it (slightly
/// smaller), then progressively smaller rings outward. Semi-organised — evenly
/// spaced on each ring with a per-ring angular stagger so it stays organic. The
/// user drags to explore.
///
/// Importance comes from list order — the Sentence API returns words sorted by
/// frequency/likelihood, so index 0 is the most-used word.
struct TalkWordCloudView: View {
    let words: [TalkWordTile]
    let appColor: TikoAppColor
    let onTap: (TalkWordTile) -> Void

    private let centreDiameter: CGFloat = 96   // a touch smaller than before
    private let minDiameter: CGFloat = 46
    private let ringShrink = 0.84              // each ring is 84% of the previous
    private let gap: CGFloat = 14
    private let margin: CGFloat = 110

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

    @State private var appeared = false

    var body: some View {
        let layout = computeLayout()

        ScrollView([.horizontal, .vertical], showsIndicators: false) {
            ZStack {
                ForEach(Array(layout.placed.enumerated()), id: \.element.id) { index, item in
                    TalkCloudBubble(word: item.word, diameter: item.diameter, appColor: appColor) {
                        onTap(item.word)
                    }
                    .position(item.point)
                    // Staggered pop-in from the centre outward when the cloud shows.
                    .scaleEffect(appeared ? 1 : 0.4)
                    .opacity(appeared ? 1 : 0)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.7).delay(Double(min(index, 28)) * 0.018),
                        value: appeared
                    )
                }
            }
            .frame(width: layout.canvas.width, height: layout.canvas.height)
            // Smoothly reflow when the board reorders (e.g. after a word is tapped).
            .animation(.spring(response: 0.55, dampingFraction: 0.82), value: words.map(\.id))
        }
        .defaultScrollAnchor(.center)
        .scrollClipDisabled()
        .accessibilityLabel("Word cloud. Most used words are in the centre. Drag to explore.")
        .onAppear { appeared = true }
    }

    private func computeLayout() -> Layout {
        guard !words.isEmpty else { return Layout(placed: [], canvas: CGSize(width: 1, height: 1)) }

        var placed: [(word: TalkWordTile, x: CGFloat, y: CGFloat, diameter: CGFloat)] = []

        // Centre: the single most-used word.
        placed.append((words[0], 0, 0, centreDiameter))

        var index = 1
        var ring = 1
        var outerEdge = centreDiameter / 2          // radius to the edge of placed content
        var diameter = centreDiameter

        while index < words.count {
            diameter = max(minDiameter, centreDiameter * CGFloat(pow(ringShrink, Double(ring))))
            let radius = outerEdge + gap + diameter / 2
            let circumference = 2 * Double.pi * Double(radius)
            // Geometric packing: how many bubbles of this size fit on the ring.
            let capacity = max(1, Int(floor(circumference / Double(diameter + gap))))
            let count = min(capacity, words.count - index)
            let step = (2 * Double.pi) / Double(count)
            // Stagger each ring so the rings don't line up into rigid spokes.
            let offset = Double(ring) * 0.55

            for slot in 0..<count {
                let angle = offset + Double(slot) * step
                let x = radius * CGFloat(cos(angle))
                let y = radius * CGFloat(sin(angle))
                placed.append((words[index], x, y, diameter))
                index += 1
            }

            outerEdge = radius + diameter / 2
            ring += 1
        }

        // Shift into positive canvas space (SwiftUI origin is top-left), padding by
        // each bubble's radius so nothing clips at the edges.
        var minX = CGFloat.zero, minY = CGFloat.zero, maxX = CGFloat.zero, maxY = CGFloat.zero
        for item in placed {
            minX = min(minX, item.x - item.diameter / 2); maxX = max(maxX, item.x + item.diameter / 2)
            minY = min(minY, item.y - item.diameter / 2); maxY = max(maxY, item.y + item.diameter / 2)
        }

        let resolved = placed.map { item in
            Placed(
                id: item.word.id,
                word: item.word,
                point: CGPoint(x: item.x - minX + margin, y: item.y - minY + margin),
                diameter: item.diameter
            )
        }
        let canvas = CGSize(width: maxX - minX + margin * 2, height: maxY - minY + margin * 2)
        return Layout(placed: resolved, canvas: canvas)
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
