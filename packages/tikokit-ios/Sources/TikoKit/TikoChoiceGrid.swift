import SwiftUI

public enum TikoChoiceTone: Equatable, Sendable {
    case primary
    case secondary
    case success
    case danger
}

public struct TikoAnswerChoice: Identifiable, Equatable, Sendable {
    public enum Icon: Equatable, Sendable {
        case systemName(String)
        case text(String)
    }

    public let id: String
    public let label: String
    public let icon: Icon
    public let tone: TikoChoiceTone

    public init(id: String, label: String, icon: Icon, tone: TikoChoiceTone) {
        self.id = id
        self.label = label
        self.icon = icon
        self.tone = tone
    }

    /// Convenience initializer accepting a plain string (treated as .text for backward compatibility).
    public init(id: String, label: String, symbol: String, tone: TikoChoiceTone) {
        self.init(id: id, label: label, icon: .text(symbol), tone: tone)
    }
}

public struct TikoAnswerButton: View {
    private let choice: TikoAnswerChoice
    private let action: () -> Void

    public init(choice: TikoAnswerChoice, action: @escaping () -> Void) {
        self.choice = choice
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                iconView
                    .frame(maxWidth: .infinity, minHeight: 160)
                    .background(tileColor)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 14, x: 0, y: 18)

                Text(choice.label)
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color(hex: 0x0b5a7a))
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(choice.label)
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
        switch choice.tone {
        case .primary, .success:
            Color(hex: 0x93ee3f)
        case .secondary, .danger:
            Color(hex: 0xef405d)
        }
    }
}

public struct TikoChoiceGrid: View {
    private let choices: [TikoAnswerChoice]
    private let onSelect: (TikoAnswerChoice) -> Void

    public init(choices: [TikoAnswerChoice], onSelect: @escaping (TikoAnswerChoice) -> Void) {
        self.choices = choices
        self.onSelect = onSelect
    }

    public var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 40) {
            ForEach(choices) { choice in
                TikoAnswerButton(choice: choice) {
                    onSelect(choice)
                }
            }
        }
        .padding(.horizontal, 24)
    }
}
