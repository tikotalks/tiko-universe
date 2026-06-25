import SwiftUI

public enum TikoChoiceTone: Equatable, Sendable {
    case primary
    case secondary
    case success
    case danger
}

public enum TikoChoiceStyle: String, CaseIterable, Codable, Sendable {
    case tiles
    case buttons
    case compact
    case textTile

    public var title: String {
        switch self {
        case .tiles: "Tiles"
        case .buttons: "Buttons"
        case .compact: "Compact"
        case .textTile: "Text"
        }
    }

    public var icon: String {
        switch self {
        case .tiles: "square.grid.2x2.fill"
        case .buttons: "rectangle.roundedtop.fill"
        case .compact: "rectangle.grid.1x2.fill"
        case .textTile: "textformat.size"
        }
    }
}

public struct TikoAnswerChoice: Identifiable, Equatable, Sendable {
    public enum Icon: Equatable, Sendable {
        case openIcon(String)
    }

    public let id: String
    public let label: String
    public let speech: String
    public let icon: Icon
    public let tone: TikoChoiceTone
    public let color: String?
    public let imageURL: URL?
    public let imageURLs: [URL]
    public let imageRef: String?

    public init(
        id: String,
        label: String,
        speech: String? = nil,
        icon: Icon,
        tone: TikoChoiceTone,
        color: String? = nil,
        imageURL: URL? = nil,
        imageURLs: [URL] = [],
        imageRef: String? = nil
    ) {
        self.id = id
        self.label = label
        self.speech = speech ?? label
        self.icon = icon
        self.tone = tone
        self.color = color
        self.imageURL = imageURL
        self.imageURLs = imageURLs
        self.imageRef = imageRef
    }

    /// Convenience initializer accepting an open-icon name.
    public init(id: String, label: String, symbol: String, tone: TikoChoiceTone) {
        self.init(id: id, label: label, icon: .openIcon(symbol), tone: tone)
    }
}

public struct TikoAnswerButton: View {
    private let choice: TikoAnswerChoice
    private let style: TikoChoiceStyle
    private let labelFont: Font?
    private let action: () -> Void
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(choice: TikoAnswerChoice, style: TikoChoiceStyle = .tiles, labelFont: Font? = nil, action: @escaping () -> Void) {
        self.choice = choice
        self.style = style
        self.labelFont = labelFont
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            buttonContent
        }
        .buttonStyle(.plain)
        .accessibilityLabel(choice.label)
    }

    @ViewBuilder
    private var buttonContent: some View {
        switch style {
        case .tiles:
            TikoSquareTile(
                title: choice.label,
                background: choice.resolvedColor ?? tileColor,
                labelFont: labelFont ?? (sizeClass == .regular
                    ? Font.system(.title2, design: .rounded).weight(.heavy)
                    : Font.system(.caption, design: .rounded).weight(.heavy))
            ) {
                if let ref = choice.imageRef, !ref.isEmpty {
                    TikoMediaImage(imageRef: ref) {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(.white.opacity(0.18))
                    }
                    .clipped()
                } else {
                    let imageURLs = choice.resolvedImageURLs
                    if imageURLs.count > 1 {
                        TikoMultiImageTileContent(imageURLs: imageURLs)
                    } else if let url = imageURLs.first {
                        TikoCachedRemoteImage(url: url) {
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(.white.opacity(0.18))
                        }
                        .clipped()
                    } else {
                        iconView
                            .foregroundStyle(.white.opacity(0.88))
                            .font(.system(size: 52, weight: .bold))
                    }
                }
            }
        case .buttons:
            Text(choice.label)
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 96)
                .background(tileColor)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .shadow(color: .black.opacity(0.16), radius: 12, x: 0, y: 10)
        case .compact:
            HStack(spacing: 16) {
                Group {
                    if let ref = choice.imageRef, !ref.isEmpty {
                        TikoMediaImage(imageRef: ref) { iconView }
                    } else if let url = choice.resolvedImageURLs.first {
                        TikoCachedRemoteImage(url: url) { iconView }
                    } else {
                        iconView
                    }
                }
                .font(.system(size: 30, weight: .bold))
                .frame(width: 64, height: 64)
                .background(.white.opacity(0.18))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                Text(choice.label)
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity, minHeight: 96)
            .background(tileColor)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.16), radius: 12, x: 0, y: 10)
        case .textTile:
            Text(choice.label)
                .font(.system(size: sizeClass == .regular ? 64 : 48, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: sizeClass == .regular ? 140 : 110)
                .background(tileColor)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .shadow(color: .black.opacity(0.16), radius: 12, x: 0, y: 10)
        }
    }

    @ViewBuilder
    private var iconView: some View {
        switch choice.icon {
        case .openIcon(let name):
            TikoOpenIconView(name)
                .frame(width: 58, height: 58)
        }
    }

    private var tileColor: Color {
        if let color = choice.resolvedColor { return color }
        switch choice.tone {
        case .primary, .success: return Color(hex: 0x93ee3f)
        case .secondary, .danger: return Color(hex: 0xef405d)
        }
    }

}

private extension TikoAnswerChoice {
    var resolvedImageURLs: [URL] {
        if !imageURLs.isEmpty { return Array(imageURLs.prefix(9)) }
        if let imageURL { return [imageURL] }
        return []
    }

    var resolvedColor: Color? {
        if let color, let named = TikoColors.color(named: color) { return named }
        return nil
    }
}

public struct TikoChoiceGrid: View {
    private let choices: [TikoAnswerChoice]
    private let style: TikoChoiceStyle
    private let labelFont: Font?
    private let onSelect: (TikoAnswerChoice) -> Void
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(
        choices: [TikoAnswerChoice],
        style: TikoChoiceStyle = .tiles,
        labelFont: Font? = nil,
        onSelect: @escaping (TikoAnswerChoice) -> Void
    ) {
        self.choices = choices
        self.style = style
        self.labelFont = labelFont
        self.onSelect = onSelect
    }

    private var tileSpacing: CGFloat {
        let base: CGFloat = choices.allSatisfy { $0.color != nil || !$0.resolvedImageURLs.isEmpty } ? 12 : 40
        return sizeClass == .regular ? max(base, 22) : base
    }

    public var body: some View {
        Group {
            if style == .tiles || style == .textTile {
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: tileSpacing), GridItem(.flexible())],
                    spacing: tileSpacing
                ) {
                    answerButtons
                }
            } else {
                VStack(spacing: 14) {
                    answerButtons
                }
            }
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: sizeClass == .regular ? 620 : nil)
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var answerButtons: some View {
        ForEach(choices) { choice in
            TikoAnswerButton(choice: choice, style: style, labelFont: labelFont) {
                onSelect(choice)
            }
        }
    }
}
