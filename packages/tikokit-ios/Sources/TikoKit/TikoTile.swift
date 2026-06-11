import SwiftUI

public struct TikoTile<Visual: View>: View {
    public let title: String
    public let subtitle: String?
    public let minHeight: CGFloat
    public let cornerRadius: CGFloat
    public let background: Color
    public let titleColor: Color
    public let subtitleColor: Color
    public let action: () -> Void
    public let visual: () -> Visual

    public init(
        title: String,
        subtitle: String? = nil,
        minHeight: CGFloat = 150,
        cornerRadius: CGFloat = 24,
        background: Color = .white.opacity(0.78),
        titleColor: Color = .primary,
        subtitleColor: Color = .secondary,
        action: @escaping () -> Void,
        @ViewBuilder visual: @escaping () -> Visual
    ) {
        self.title = title
        self.subtitle = subtitle
        self.minHeight = minHeight
        self.cornerRadius = cornerRadius
        self.background = background
        self.titleColor = titleColor
        self.subtitleColor = subtitleColor
        self.action = action
        self.visual = visual
    }

    public var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                visual()

                Text(title)
                    .font(.system(.body, design: .rounded).weight(.heavy))
                    .foregroundStyle(titleColor)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(.caption, design: .rounded).weight(.bold))
                        .foregroundStyle(subtitleColor)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .leading)
            .padding(10)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(subtitle.map { "\(title), \($0)" } ?? title)
    }
}

public struct TikoSquareTile<Content: View>: View {
    public let title: String
    public let subtitle: String?
    public let cornerRadius: CGFloat
    public let background: Color
    public let isActive: Bool
    public let labelFont: Font
    public let content: () -> Content

    public init(
        title: String,
        subtitle: String? = nil,
        cornerRadius: CGFloat = 24,
        background: Color,
        isActive: Bool = false,
        labelFont: Font = Font.system(.caption, design: .rounded).weight(.heavy),
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.subtitle = subtitle
        self.cornerRadius = cornerRadius
        self.background = background
        self.isActive = isActive
        self.labelFont = labelFont
        self.content = content
    }

    public var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(background)

            // Image at 60% tile size, centre at 33% from top / 50% horizontal
            GeometryReader { geo in
                content()
                    .frame(width: geo.size.width * 0.75, height: geo.size.width * 0.75)
                    .clipShape(RoundedRectangle(cornerRadius: cornerRadius * 0.55, style: .continuous))
                    .position(x: geo.size.width * 0.5, y: geo.size.height * 0.45)
            }

            // Label: adaptive pill — dark text/light bg in light mode, inverse in dark
            VStack(spacing: 0) {
                Spacer()
                Text(title)
                    .font(labelFont)
                    .foregroundStyle(Color.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.65)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .padding(8)
        }
        .aspectRatio(1, contentMode: .fit)
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(isActive ? Color(hex: 0xff8a1f) : .white.opacity(0.28), lineWidth: isActive ? 5 : 1)
        }
        .shadow(color: .black.opacity(isActive ? 0.18 : 0.10), radius: isActive ? 13 : 8, x: 0, y: isActive ? 9 : 5)
        .scaleEffect(isActive ? 1.04 : 1)
        .animation(.spring(response: 0.24, dampingFraction: 0.72), value: isActive)
        .accessibilityLabel(title)
    }
}

public struct TikoMultiImageTileContent: View {
    public let imageURLs: [URL]
    public let cornerRadius: CGFloat

    public init(imageURLs: [URL], cornerRadius: CGFloat = 12) {
        self.imageURLs = Array(imageURLs.prefix(9))
        self.cornerRadius = cornerRadius
    }

    private var columns: [GridItem] {
        let count = imageURLs.count
        let columnCount = count <= 1 ? 1 : count <= 4 ? 2 : 3
        return Array(repeating: GridItem(.flexible(), spacing: 3), count: columnCount)
    }

    public var body: some View {
        LazyVGrid(columns: columns, spacing: 3) {
            ForEach(Array(imageURLs.enumerated()), id: \.offset) { _, url in
                TikoCachedRemoteImage(url: url) {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.white.opacity(0.18))
                }
                .aspectRatio(1, contentMode: .fill)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            }
        }
    }
}
