import SwiftUI

/// A country's flag, as the modelled artwork the rest of the app is made of.
/// The emoji is the fallback: 28 of the 242 territories have no flag in the
/// media library, and a device's own emoji flag is better than nothing at all.
struct GlobeFlagImage: View {
    let country: GlobeCountry
    var size: CGFloat = 44

    var body: some View {
        if let image = GlobeFlagImage.artwork(for: country) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        } else if let emoji = GlobeCountryNaming.flag(for: country) {
            Text(emoji)
                .font(.system(size: size * 0.86))
                .accessibilityHidden(true)
        }
    }

    /// Whether there is anything to draw at all, for callers deciding on layout.
    static func exists(for country: GlobeCountry) -> Bool {
        artwork(for: country) != nil || GlobeCountryNaming.flag(for: country) != nil
    }

    private static let cache = NSCache<NSString, UIImage>()

    static func artwork(for country: GlobeCountry) -> UIImage? {
        let key = country.id as NSString
        if let cached = cache.object(forKey: key) { return cached }
        let bundle = Bundle(for: GlobeController.self)
        guard let url = bundle.url(forResource: country.id, withExtension: "png", subdirectory: "content/flags")
            ?? bundle.url(forResource: country.id, withExtension: "png", subdirectory: "flags"),
            let image = UIImage(contentsOfFile: url.path)
        else { return nil }
        cache.setObject(image, forKey: key)
        return image
    }
}
