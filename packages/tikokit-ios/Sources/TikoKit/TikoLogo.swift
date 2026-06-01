import SwiftUI

/// The Tiko wordmark logo, rendered as a template image so it inherits the current foreground style.
public struct TikoLogo: View {
    public var width: CGFloat

    public init(width: CGFloat = 120) {
        self.width = width
    }

    public var body: some View {
        Image("TikoLogo", bundle: .module)
            .resizable()
            .renderingMode(.template)
            .scaledToFit()
            .frame(width: width)
    }
}

#Preview {
    VStack(spacing: 32) {
        TikoLogo(width: 160)
            .foregroundStyle(.primary)
        TikoLogo(width: 160)
            .foregroundStyle(.white)
            .padding(24)
            .background(Color(hex: 0x9b3fbd))
            .clipShape(RoundedRectangle(cornerRadius: 20))
    }
    .padding()
}
