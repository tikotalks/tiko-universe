import SwiftUI

/// Shown once, shortly after the app opens, when a newer version is on the
/// store. It can be waved away, and once it has been it stays away until there
/// is a version newer than the one that was dismissed.
public struct TikoUpdatePanel: View {
    @Environment(\.colorScheme) private var colorScheme

    private let release: TikoStoreRelease
    private let accent: Color
    private let onDismiss: () -> Void

    public init(release: TikoStoreRelease, accent: Color, onDismiss: @escaping () -> Void) {
        self.release = release
        self.accent = accent
        self.onDismiss = onDismiss
    }

    public var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(accent)

                Text("Update available")
                    .font(.system(size: 23, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)

                Text("Version \(release.version) is on the App Store.")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 10) {
                if let url = release.storeURL {
                    Link(destination: url) {
                        Text("Update")
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(accent, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .simultaneousGesture(TapGesture().onEnded { onDismiss() })
                }

                Button(action: onDismiss) {
                    Text("Not now")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(24)
        .frame(maxWidth: 340)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(colorScheme == .dark ? Color(white: 0.13) : Color.white)
                .shadow(color: .black.opacity(colorScheme == .dark ? 0.34 : 0.16), radius: 26, y: 14)
        )
        .padding(.horizontal, 24)
    }
}

public extension View {
    /// Offers the update once the app has opened. Every Tiko app shows the same
    /// panel, so this is the only wiring an app needs.
    func tikoUpdateNotice(accent: Color) -> some View {
        modifier(TikoUpdateNoticeModifier(accent: accent))
    }
}

private struct TikoUpdateNoticeModifier: ViewModifier {
    let accent: Color

    @StateObject private var updates = TikoUpdateNotice(store: TikoUserDefaultsStore())
    @State private var isShowing = false

    func body(content: Content) -> some View {
        content
            .overlay {
                if isShowing, let release = updates.release {
                    ZStack {
                        Color.black.opacity(0.28)
                            .ignoresSafeArea()
                            .onTapGesture { dismiss() }

                        TikoUpdatePanel(release: release, accent: accent, onDismiss: dismiss)
                    }
                    .transition(.opacity)
                    .zIndex(900)
                }
            }
            .task {
                // After the splash has had its moment.
                try? await Task.sleep(for: .milliseconds(2_100))
                await updates.checkIfDue()
                guard updates.release != nil else { return }
                withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                    isShowing = true
                }
            }
    }

    private func dismiss() {
        withAnimation(.easeOut(duration: 0.22)) { isShowing = false }
        updates.dismiss()
    }
}
