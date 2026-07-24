import Foundation

/// Reads deterministic screenshot-capture directives from launch arguments so
/// App Store screenshots and promo videos can be captured via `xcrun simctl`
/// without a UI-test target.
///
/// The `@sil/app-release` capture tooling launches the app with:
///   --screenshot-mode            → we're capturing, switch off normal behaviour
///   --screenshot <scene>         → render a fixed scene (app-defined, e.g. "home")
/// and sets UserDefaults per the scenario's `colorModes`/`locales`.
///
/// Apps consume this in their root view, e.g.:
///
///     let scene = TikoScreenshotMode.scene
///     if TikoScreenshotMode.isActive { /* render `scene` deterministically */ }
///
/// Define scene ids per app in `apps/<app>/release/ios.json` scenarios.
public enum TikoScreenshotMode {
    /// True when launched with `--screenshot-mode` (capture in progress).
    public static var isActive: Bool {
        CommandLine.arguments.contains("--screenshot-mode")
    }

    /// The scene requested via `--screenshot <scene>`, or `nil` in normal use.
    public static var scene: String? {
        let args = CommandLine.arguments
        guard let index = args.firstIndex(of: "--screenshot"), index + 1 < args.count else { return nil }
        return args[index + 1]
    }
}
