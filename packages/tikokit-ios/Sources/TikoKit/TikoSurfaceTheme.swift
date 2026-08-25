import SwiftUI

/// How dark "dark" is and how light "light" is.
///
/// Both surfaces are the user's choice, so nothing here may assume a
/// particular brightness. The foreground is always derived from whichever
/// background is in effect — that is what makes a free colour choice safe:
/// pick a pale "dark" and the text turns dark rather than staying light and
/// disappearing.
public struct TikoSurfaces: Equatable, Sendable {
    public let light: Color
    public let dark: Color

    public init(light: Color, dark: Color) {
        self.light = light
        self.dark = dark
    }

    /// The values that were hardcoded in `TikoAppShell`, kept as defaults so
    /// an app that has never been themed looks exactly as it did.
    public static let `default` = TikoSurfaces(
        light: Color(hex: 0xf8f6f1),
        dark: Color(hex: 0x140e18)
    )

    public static let defaultLightHex = "#f8f6f1"
    public static let defaultDarkHex = "#140e18"

    public func background(for scheme: ColorScheme) -> Color {
        scheme == .dark ? dark : light
    }
}

public enum TikoSurfaceStorage {
    public static let lightKey = "tiko.lightBackground"
    public static let darkKey = "tiko.darkBackground"
}

public extension Color {
    /// Relative luminance, used to decide whether text on this colour should
    /// be light or dark.
    var tikoLuminance: Double {
        #if canImport(UIKit)
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        UIColor(self).getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return 0.2126 * Double(red) + 0.7152 * Double(green) + 0.0722 * Double(blue)
        #else
        return 1
        #endif
    }

    /// The readable text colour for this background. Deliberately derived
    /// rather than chosen — no pair of user choices can produce unreadable
    /// text.
    var tikoForeground: Color {
        tikoLuminance > 0.58 ? Color(hex: 0x17131c) : Color(hex: 0xf6f4ef)
    }

    var tikoHexString: String {
        #if canImport(UIKit)
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        UIColor(self).getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        let clamp: (CGFloat) -> Int = { Int((max(0, min(1, $0)) * 255).rounded()) }
        return String(format: "#%02x%02x%02x", clamp(red), clamp(green), clamp(blue))
        #else
        return TikoSurfaces.defaultLightHex
        #endif
    }
}

/// Reads the user's chosen surfaces, falling back to what the app passed in
/// and then to the Tiko defaults.
public struct TikoSurfaceResolver {
    public static func surfaces(
        lightHex: String,
        darkHex: String,
        appLight: Color,
        appDark: Color
    ) -> TikoSurfaces {
        TikoSurfaces(
            light: Color(hexString: lightHex) ?? appLight,
            dark: Color(hexString: darkHex) ?? appDark
        )
    }
}

/// Lets a parent pick exactly how light "light" is and how dark "dark" is.
///
/// Only the two backgrounds are choosable. Text colour is derived from
/// whichever background is picked, so no combination can end up unreadable —
/// the preview below each picker shows the real result.
public struct TikoSurfacePickerSheet: View {
    private let appColor: TikoAppColor
    private let labels: TikoSettingsLabels
    private let onClose: () -> Void

    @AppStorage(TikoSurfaceStorage.lightKey) private var lightHex = ""
    @AppStorage(TikoSurfaceStorage.darkKey) private var darkHex = ""

    public init(
        appColor: TikoAppColor,
        labels: TikoSettingsLabels,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.labels = labels
        self.onClose = onClose
    }

    private var lightColor: Color {
        Color(hexString: lightHex) ?? TikoSurfaces.default.light
    }

    private var darkColor: Color {
        Color(hexString: darkHex) ?? TikoSurfaces.default.dark
    }

    private var isDefault: Bool {
        lightHex.isEmpty && darkHex.isEmpty
    }

    public var body: some View {
        TikoPopupCard(
            title: labels.surfaceColors,
            subtitle: labels.surfaceColorsSubtitle,
            icon: "paintpalette.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 16) {
                surfaceRow(
                    title: labels.lightColor,
                    icon: "sun.max.fill",
                    color: lightColor,
                    binding: Binding(
                        get: { lightColor },
                        set: { lightHex = $0.tikoHexString }
                    )
                )

                surfaceRow(
                    title: labels.darkColor,
                    icon: "moon.fill",
                    color: darkColor,
                    binding: Binding(
                        get: { darkColor },
                        set: { darkHex = $0.tikoHexString }
                    )
                )

                if !isDefault {
                    Button {
                        lightHex = ""
                        darkHex = ""
                    } label: {
                        Text(labels.resetColors)
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                            .foregroundStyle(appColor.palette.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(appColor.palette.primary.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func surfaceRow(title: String, icon: String, color: Color, binding: Binding<Color>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ColorPicker(selection: binding, supportsOpacity: false) {
                HStack(spacing: 12) {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(appColor.palette.primary)
                        .frame(width: 40, height: 40)
                        .background(appColor.palette.primary.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    Text(title)
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                }
            }

            // The real result, derived exactly as the app derives it.
            Text(labels.colorPreview)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(color.tikoForeground)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .tikoSettingsRowSurface()
    }
}
