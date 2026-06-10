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

    public var title: String {
        switch self {
        case .tiles: "Tiles"
        case .buttons: "Buttons"
        case .compact: "Compact"
        }
    }

    public var icon: String {
        switch self {
        case .tiles: "square.grid.2x2.fill"
        case .buttons: "rectangle.roundedtop.fill"
        case .compact: "rectangle.grid.1x2.fill"
        }
    }
}

public struct TikoAnswerChoice: Identifiable, Equatable, Sendable {
    public enum Icon: Equatable, Sendable {
        case systemName(String)
        case text(String)
    }

    public let id: String
    public let label: String
    public let speech: String
    public let icon: Icon
    public let tone: TikoChoiceTone
    public let colorHex: UInt32?
    public let imageURL: URL?

    public init(
        id: String,
        label: String,
        speech: String? = nil,
        icon: Icon,
        tone: TikoChoiceTone,
        colorHex: UInt32? = nil,
        imageURL: URL? = nil
    ) {
        self.id = id
        self.label = label
        self.speech = speech ?? label
        self.icon = icon
        self.tone = tone
        self.colorHex = colorHex
        self.imageURL = imageURL
    }

    /// Convenience initializer accepting a plain string symbol (backward compatibility).
    public init(id: String, label: String, symbol: String, tone: TikoChoiceTone) {
        self.init(id: id, label: label, icon: .text(symbol), tone: tone)
    }
}

public struct TikoAnswerButton: View {
    private let choice: TikoAnswerChoice
    private let style: TikoChoiceStyle
    private let action: () -> Void
    @Environment(\.colorScheme) private var colorScheme

    public init(choice: TikoAnswerChoice, style: TikoChoiceStyle = .tiles, action: @escaping () -> Void) {
        self.choice = choice
        self.style = style
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
            if choice.colorHex != nil || choice.imageURL != nil {
                TikoSquareTile(
                    title: choice.label,
                    background: choice.colorHex.map { Color(hex: $0) } ?? tileColor
                ) {
                    if let url = choice.imageURL {
                        TikoCachedRemoteImage(url: url) {
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(.white.opacity(0.18))
                        }
                        .clipped()
                    }
                }
            } else {
                VStack(spacing: 8) {
                    iconView
                        .frame(maxWidth: .infinity, minHeight: 160)
                        .background(tileColor)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .shadow(color: .black.opacity(0.18), radius: 14, x: 0, y: 18)

                    Text(choice.label)
                        .font(.system(size: 40, weight: .heavy, design: .rounded))
                        .foregroundStyle(labelColor)
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
                iconView
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
        }
    }

    @ViewBuilder
    private var iconView: some View {
        switch choice.icon {
        case .systemName(let name):
            Image(systemName: name)
                .renderingMode(.template)
                .foregroundStyle(.white)
                .font(.system(size: 48, weight: .bold))
        case .text(let text):
            Text(text)
                .font(.system(size: 92))
        }
    }

    private var tileColor: Color {
        if let hex = choice.colorHex { return Color(hex: hex) }
        switch choice.tone {
        case .primary, .success: return Color(hex: 0x93ee3f)
        case .secondary, .danger: return Color(hex: 0xef405d)
        }
    }

    private var labelColor: Color {
        colorScheme == .dark ? .white.opacity(0.92) : Color(hex: 0x0b5a7a)
    }
}

public struct TikoChoiceGrid: View {
    private let choices: [TikoAnswerChoice]
    private let style: TikoChoiceStyle
    private let onSelect: (TikoAnswerChoice) -> Void

    public init(
        choices: [TikoAnswerChoice],
        style: TikoChoiceStyle = .tiles,
        onSelect: @escaping (TikoAnswerChoice) -> Void
    ) {
        self.choices = choices
        self.style = style
        self.onSelect = onSelect
    }

    private var tileSpacing: CGFloat {
        choices.allSatisfy { $0.colorHex != nil || $0.imageURL != nil } ? 12 : 40
    }

    public var body: some View {
        Group {
            if style == .tiles {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: tileSpacing) {
                    answerButtons
                }
            } else {
                VStack(spacing: 14) {
                    answerButtons
                }
            }
        }
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private var answerButtons: some View {
        ForEach(choices) { choice in
            TikoAnswerButton(choice: choice, style: style) {
                onSelect(choice)
            }
        }
    }
}
