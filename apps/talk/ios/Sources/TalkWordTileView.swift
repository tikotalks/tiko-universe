import SwiftUI
import TikoKit

struct TalkWordTileView: View {
    let word: TalkWordTile
    let appColor: TikoAppColor
    var isSuggested = false
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                if let icon = word.icon, !icon.isEmpty {
                    Image(systemName: icon)
                        .font(.system(size: isSuggested ? 16 : 22, weight: .bold))
                        .foregroundStyle(appColor.palette.primary)
                        .frame(height: isSuggested ? 18 : 24)
                }

                Text(word.text)
                    .font(.system(isSuggested ? .body : .title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(appColor.palette.dark)
                    .lineLimit(2)
                    .minimumScaleFactor(0.72)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: isSuggested ? 54 : 86)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isSuggested ? appColor.palette.primary.opacity(0.14) : Color.white.opacity(0.75))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(TalkPosColor.color(for: word.pos).opacity(isSuggested ? 0.55 : 0.4), lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .shadow(color: appColor.palette.dark.opacity(0.08), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(word.text)
    }
}
