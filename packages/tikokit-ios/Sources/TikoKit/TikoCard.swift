import SwiftUI

// MARK: - Variant

public enum TikoCardVariant: String, CaseIterable, Sendable {
    case button
    case graphic
    case icon
}

// MARK: - TikoCard

public struct TikoCard: View {
    public let variant: TikoCardVariant
    public let label: String
    public let icon: String?
    public let color: Color
    public let textColor: Color
    public let cornerRadius: CGFloat
    public let action: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(
        variant: TikoCardVariant,
        label: String,
        icon: String? = nil,
        color: Color = Color(hex: 0x93ee3f),
        textColor: Color = .white,
        cornerRadius: CGFloat = 12,
        action: @escaping () -> Void
    ) {
        self.variant = variant
        self.label = label
        self.icon = icon
        self.color = color
        self.textColor = textColor
        self.cornerRadius = cornerRadius
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            cardContent
        }
        .buttonStyle(TikoCardButtonStyle(color: color, cornerRadius: cornerRadius))
        .accessibilityLabel(label)
    }

    // MARK: - Content per variant

    @ViewBuilder
    private var cardContent: some View {
        switch variant {
        case .button:
            buttonLayout
        case .graphic:
            graphicLayout
        case .icon:
            iconLayout
        }
    }

    // MARK: Button variant – horizontal pill

    private var buttonLayout: some View {
        Text(label)
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(textColor)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
    }

    // MARK: Graphic variant – large emoji, text below, tall card

    private var graphicLayout: some View {
        VStack(spacing: 10) {
            if let emoji = icon {
                Text(emoji)
                    .font(.system(size: 56))
            }

            Text(label)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(textColor)
        }
        .frame(maxWidth: .infinity, minHeight: 140)
        .padding(.vertical, 16)
        .padding(.horizontal, 12)
    }

    // MARK: Icon variant – emoji + text inline, wide card

    private var iconLayout: some View {
        HStack(spacing: 10) {
            if let emoji = icon {
                Text(emoji)
                    .font(.system(size: 32))
            }

            Text(label)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(textColor)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - (Icon scale on press is handled by ButtonStyle's scaleEffect)

// MARK: - Button Style (pillow effect + glow on press)

private struct TikoCardButtonStyle: ButtonStyle {
    let color: Color
    let cornerRadius: CGFloat

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(pillowOverlay)
            .shadow(
                color: configuration.isPressed
                    ? color.opacity(0.55)
                    : .black.opacity(0.22),
                radius: configuration.isPressed ? 18 : 10,
                x: 0,
                y: configuration.isPressed ? 4 : 8
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0, anchor: .center)
            .offset(y: configuration.isPressed ? 2 : 0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }

    // MARK: Gradient background (top-to-bottom: color → darkened)

    private var cardBackground: some View {
        LinearGradient(
            colors: [color, color.darkened(by: 0.15)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    // MARK: Pillow / inset-shadow overlay

    private var pillowOverlay: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .stroke(
                LinearGradient(
                    stops: [
                        .init(color: color.lightened(by: 0.50).opacity(0.55), location: 0.0),
                        .init(color: Color.clear.opacity(0.0), location: 0.15),
                        .init(color: Color.clear.opacity(0.0), location: 0.85),
                        .init(color: color.darkened(by: 0.35).opacity(0.50), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                lineWidth: 1.5
            )
    }
}

// MARK: - Color darkening / lightening

extension Color {
    /// Returns this color darkened by the given fraction (0‥1).
    ///
    /// A value of `0.15` reduces each RGB component by 15 %.
    func darkened(by fraction: Double = 0.15) -> Color {
        let uiColor = UIColor(self)
        var r: CGFloat = 0; var g: CGFloat = 0; var b: CGFloat = 0; var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        return Color(
            red:   max(r * (1 - fraction), 0),
            green: max(g * (1 - fraction), 0),
            blue:  max(b * (1 - fraction), 0),
            opacity: Double(a)
        )
    }

    /// Returns this color lightened by mixing with white (0‥1).
    ///
    /// A value of `0.5` blends each RGB component 50 % towards white.
    func lightened(by fraction: Double = 0.50) -> Color {
        let uiColor = UIColor(self)
        var r: CGFloat = 0; var g: CGFloat = 0; var b: CGFloat = 0; var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        return Color(
            red:   r + (1 - r) * fraction,
            green: g + (1 - g) * fraction,
            blue:  b + (1 - b) * fraction,
            opacity: Double(a)
        )
    }
}
