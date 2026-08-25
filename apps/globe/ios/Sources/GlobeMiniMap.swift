import SwiftUI

/// A small orthographic globe for the detail panel: the same outlines the main
/// renderer uses, drawn flat in a `Canvas` and centred on whatever is selected,
/// with the countries that matter picked out. Static — it redraws when the
/// selection changes, not every frame.
struct GlobeMiniMap: View {
    let geography: GlobeGeography
    let centre: GeoPoint
    let highlighted: Set<String>
    let pins: [GeoPoint]

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Canvas { context, size in
            let radius = min(size.width, size.height) / 2 - 2
            let middle = CGPoint(x: size.width / 2, y: size.height / 2)
            context.fill(
                Path(ellipseIn: CGRect(
                    x: middle.x - radius, y: middle.y - radius, width: radius * 2, height: radius * 2
                )),
                with: .color(ocean)
            )

            let geometry = geography.geometry
            for (index, country) in geometry.countries.enumerated() {
                let isHighlighted = highlighted.contains(country.id)
                var path = Path()
                var drewSomething = false
                for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
                    let ring = geometry.rings[ringIndex]
                    // Rings are dense for the big renderer; every third point is
                    // plenty at thumbnail size.
                    let step = max(1, ring.pointCount / 240)
                    var started = false
                    var offset = 0
                    while offset < ring.pointCount {
                        let point = geometry.outlinePoints[ring.pointOffset + offset]
                        offset += step
                        guard let position = project(
                            GeoPoint(lat: Double(point.y), lon: Double(point.x)),
                            middle: middle,
                            radius: radius
                        ) else {
                            started = false
                            continue
                        }
                        if started {
                            path.addLine(to: position)
                        } else {
                            path.move(to: position)
                            started = true
                        }
                        drewSomething = true
                    }
                    path.closeSubpath()
                }
                guard drewSomething else { continue }
                context.fill(path, with: .color(isHighlighted ? highlight : land))
                _ = index
            }

            for pin in pins {
                guard let position = project(pin, middle: middle, radius: radius) else { continue }
                let dot = CGRect(x: position.x - 4, y: position.y - 4, width: 8, height: 8)
                context.fill(Path(ellipseIn: dot), with: .color(.white))
                context.fill(Path(ellipseIn: dot.insetBy(dx: 1.5, dy: 1.5)), with: .color(pinColor))
            }
        }
        .accessibilityHidden(true)
    }

    /// Orthographic: the far side of the globe is simply not drawn.
    private func project(_ point: GeoPoint, middle: CGPoint, radius: CGFloat) -> CGPoint? {
        let lat = point.lat * .pi / 180
        let lon = point.lon * .pi / 180
        let centreLat = centre.lat * .pi / 180
        let centreLon = centre.lon * .pi / 180
        let cosC = sin(centreLat) * sin(lat) + cos(centreLat) * cos(lat) * cos(lon - centreLon)
        guard cosC >= 0 else { return nil }
        let x = cos(lat) * sin(lon - centreLon)
        let y = cos(centreLat) * sin(lat) - sin(centreLat) * cos(lat) * cos(lon - centreLon)
        return CGPoint(x: middle.x + radius * x, y: middle.y - radius * y)
    }

    private var ocean: Color {
        colorScheme == .dark ? Color(red: 0.10, green: 0.20, blue: 0.28) : Color(red: 0.80, green: 0.90, blue: 0.96)
    }

    private var land: Color {
        colorScheme == .dark ? Color(red: 0.28, green: 0.33, blue: 0.30) : Color(red: 0.85, green: 0.86, blue: 0.80)
    }

    private var highlight: Color {
        colorScheme == .dark ? Color(red: 1.0, green: 0.78, blue: 0.30) : Color(red: 0.98, green: 0.68, blue: 0.15)
    }

    private var pinColor: Color {
        colorScheme == .dark ? Color(red: 1.0, green: 0.45, blue: 0.35) : Color(red: 0.86, green: 0.28, blue: 0.20)
    }
}
