import SwiftUI

public struct TikoHeaderAction: Identifiable, Sendable {
    public let id: String
    public let label: String
    public let systemImage: String
    public let isActive: Bool

    public init(id: String, label: String, systemImage: String, isActive: Bool = false) {
        self.id = id
        self.label = label
        self.systemImage = systemImage
        self.isActive = isActive
    }
}

public struct TikoAppHeader: View {
    private let appName: String
    private let appIcon: String
    private let avatar: String
    private let appColor: TikoAppColor
    private let actions: [TikoHeaderAction]
    private let onAction: (String) -> Void

    public init(
        appName: String,
        appIcon: String = "👍",
        avatar: String = "🐷",
        appColor: TikoAppColor,
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in }
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.avatar = avatar
        self.appColor = appColor
        self.actions = actions
        self.onAction = onAction
    }

    public var body: some View {
        HStack(spacing: 12) {
            Text(appIcon)
                .font(.system(size: 30))
                .frame(width: 48, height: 48)
                .background(.white.opacity(0.28))
                .clipShape(Circle())

            Text(appName)
                .font(.system(.title3, design: .rounded).weight(.heavy))
                .foregroundStyle(.white)

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                ForEach(actions) { action in
                    Button(action: { onAction(action.id) }) {
                        Image(systemName: action.systemImage)
                            .font(.system(size: 18, weight: .bold))
                            .frame(width: 36, height: 36)
                            .background(appColor.palette.dark.opacity(action.isActive ? 0.88 : 0.56))
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(action.label)
                }

                Text(avatar)
                    .font(.system(size: 30))
                    .frame(width: 48, height: 48)
                    .background(.white.opacity(0.28))
                    .clipShape(Circle())
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(appColor.palette.primary)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.12), radius: 0, x: 0, y: 4)
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }
}

public struct TikoAppShell<Content: View>: View {
    private let appName: String
    private let appIcon: String
    private let avatar: String
    private let appColor: TikoAppColor
    private let actions: [TikoHeaderAction]
    private let onAction: (String) -> Void
    private let content: Content

    public init(
        appName: String,
        appIcon: String = "👍",
        avatar: String = "🐷",
        appColor: TikoAppColor,
        actions: [TikoHeaderAction] = [],
        onAction: @escaping (String) -> Void = { _ in },
        @ViewBuilder content: () -> Content
    ) {
        self.appName = appName
        self.appIcon = appIcon
        self.avatar = avatar
        self.appColor = appColor
        self.actions = actions
        self.onAction = onAction
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) {
            TikoAppHeader(
                appName: appName,
                appIcon: appIcon,
                avatar: avatar,
                appColor: appColor,
                actions: actions,
                onAction: onAction
            )

            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(red: 0.973, green: 0.965, blue: 0.945))
    }
}
