import SwiftUI

/// The Tiko media picture for a marker, bundled at build time by
/// `tools/geography/map-media.mjs` so it is there in airplane mode. Falls back
/// to the entry's glyph when the library has no picture of that subject yet.
struct GlobeMarkerImage: View {
    let entity: GlobeEntity
    let size: CGFloat

    var body: some View {
        if let image = Self.image(named: entity.imageName) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        } else {
            Text(entity.glyph)
                .font(.system(size: size * 0.82))
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        }
    }

    /// Decoded once per name: a marker redraws every frame as the globe turns.
    private static let cache = NSCache<NSString, UIImage>()
    private static let thumbnails = NSCache<NSString, UIImage>()
    /// SwiftUI `Image` values, kept so the canvas is not building a hundred of
    /// them every frame.
    private static var drawables: [String: Image] = [:]

    /// The marker-sized `Image` for the canvas to draw.
    static func drawable(named name: String?, size: CGFloat) -> Image? {
        guard let name else { return nil }
        let bucket = max(32, (size / 16).rounded(.up) * 16)
        let key = "\(name)@\(Int(bucket))"
        if let cached = drawables[key] { return cached }
        guard let bitmap = thumbnail(named: name, size: bucket) else { return nil }
        let image = Image(uiImage: bitmap)
        drawables[key] = image
        return image
    }

    /// A marker-sized copy, drawn once and kept. Handing the full-size art to
    /// the renderer every frame is what made a globe full of animals crawl.
    static func thumbnail(named name: String?, size: CGFloat) -> UIImage? {
        guard let name else { return nil }
        // Bucketed, so zooming does not spawn a new bitmap per frame.
        let bucket = max(32, (size / 16).rounded(.up) * 16)
        let key = "\(name)@\(Int(bucket))" as NSString
        if let cached = thumbnails.object(forKey: key) { return cached }
        guard let full = image(named: name) else { return nil }
        let format = UIGraphicsImageRendererFormat.default()
        format.opaque = false
        let rendered = UIGraphicsImageRenderer(size: CGSize(width: bucket, height: bucket), format: format)
            .image { _ in
                let aspect = full.size.width / max(full.size.height, 1)
                let width = aspect >= 1 ? bucket : bucket * aspect
                let height = aspect >= 1 ? bucket / aspect : bucket
                full.draw(in: CGRect(
                    x: (bucket - width) / 2, y: (bucket - height) / 2, width: width, height: height
                ))
            }
        thumbnails.setObject(rendered, forKey: key)
        return rendered
    }

    static func image(named name: String?) -> UIImage? {
        guard let name else { return nil }
        if let cached = cache.object(forKey: name as NSString) { return cached }
        guard let url = Bundle.main.url(
            forResource: (name as NSString).deletingPathExtension,
            withExtension: (name as NSString).pathExtension,
            subdirectory: "content/images"
        ) ?? Bundle.main.url(
            forResource: (name as NSString).deletingPathExtension,
            withExtension: (name as NSString).pathExtension,
            subdirectory: "images"
        ), let image = UIImage(contentsOfFile: url.path) else { return nil }
        cache.setObject(image, forKey: name as NSString)
        return image
    }
}
