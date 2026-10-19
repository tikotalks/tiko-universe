import Foundation
import simd

/// Turns a point on the globe into the country under it.
///
/// Two passes, in this order:
///  1. the polygons themselves — even-odd crossing over every ring of a country,
///     which makes holes (Lesotho inside South Africa) fall out for free;
///  2. a forgiving pass — the nearest coastline within a tolerance the caller
///     derives from the current zoom, so a child aiming at Malta with a
///     fingertip still gets Malta instead of nothing.
struct GlobeHitTester: Sendable {
    let geography: GlobeGeography

    init(geography: GlobeGeography) {
        self.geography = geography
    }

    /// The country containing `point`, or nil if the tap landed in open water.
    func country(containing point: GeoPoint) -> Int? {
        let geometry = geography.geometry
        for (index, country) in geometry.countries.enumerated() {
            guard boundingBoxContains(country, point) else { continue }
            if contains(countryAt: index, point: point) { return index }
        }
        return nil
    }

    /// The containing country, or the nearest one whose outline lies within
    /// `toleranceDegrees` of the tap.
    func country(near point: GeoPoint, toleranceDegrees: Double) -> Int? {
        if let hit = country(containing: point) { return hit }
        guard toleranceDegrees > 0 else { return nil }

        var best: (index: Int, distance: Double)?
        let geometry = geography.geometry
        for (index, country) in geometry.countries.enumerated() {
            guard boundingBoxContains(country, point, padding: toleranceDegrees) else { continue }
            let distance = distanceToOutline(countryAt: index, point: point)
            guard distance <= toleranceDegrees else { continue }
            if best == nil || distance < best!.distance { best = (index, distance) }
        }
        return best?.index
    }

    // MARK: - Polygons

    private func boundingBoxContains(_ country: GlobeGeometry.Country, _ point: GeoPoint, padding: Double = 0) -> Bool {
        guard point.lat >= country.minLat - padding, point.lat <= country.maxLat + padding else { return false }
        // A country split by the date line (Russia, Fiji, the United States)
        // has a box spanning the whole world, so this stays a cheap pre-filter
        // rather than an answer.
        let longitudePadding = padding / max(0.15, cos(point.lat * .pi / 180))
        return point.lon >= country.minLon - longitudePadding && point.lon <= country.maxLon + longitudePadding
    }

    private func contains(countryAt index: Int, point: GeoPoint) -> Bool {
        let geometry = geography.geometry
        let country = geometry.countries[index]
        var inside = false
        for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
            let ring = geometry.rings[ringIndex]
            if crosses(ring: ring, point: point) { inside.toggle() }
        }
        return inside
    }

    /// Even-odd ray crossing, with longitudes rebased around the tap so a ring
    /// that sits either side of the date line still tests as one shape.
    private func crosses(ring: GlobeGeometry.Ring, point: GeoPoint) -> Bool {
        let points = geography.geometry.outlinePoints
        let last = points[ring.pointOffset + ring.pointCount - 1]
        var crossings = false
        var previousLon = GlobeMath.longitudeDelta(Double(last.x), point.lon)
        var previousLat = Double(last.y)
        for offset in 0..<ring.pointCount {
            let current = points[ring.pointOffset + offset]
            let currentLon = GlobeMath.longitudeDelta(Double(current.x), point.lon)
            let currentLat = Double(current.y)
            if (currentLat > point.lat) != (previousLat > point.lat) {
                let t = (point.lat - currentLat) / (previousLat - currentLat)
                if currentLon + t * (previousLon - currentLon) > 0 { crossings.toggle() }
            }
            previousLon = currentLon
            previousLat = currentLat
        }
        return crossings
    }

    /// Distance in degrees from the tap to the closest outline segment.
    private func distanceToOutline(countryAt index: Int, point: GeoPoint) -> Double {
        let geometry = geography.geometry
        let country = geometry.countries[index]
        let points = geometry.outlinePoints
        let scale = max(0.15, cos(point.lat * .pi / 180))
        var best = Double.greatestFiniteMagnitude

        for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
            let ring = geometry.rings[ringIndex]
            var previous = points[ring.pointOffset + ring.pointCount - 1]
            for offset in 0..<ring.pointCount {
                let current = points[ring.pointOffset + offset]
                let distance = distanceToSegment(
                    point: point,
                    from: previous,
                    to: current,
                    longitudeScale: scale
                )
                if distance < best {
                    best = distance
                    if best == 0 { return 0 }
                }
                previous = current
            }
        }
        return best
    }

    private func distanceToSegment(
        point: GeoPoint,
        from start: SIMD2<Float>,
        to end: SIMD2<Float>,
        longitudeScale: Double
    ) -> Double {
        // Flat-earth distance is fine here: it only ever runs over a few degrees
        // around the tap, and longitudes are scaled by latitude so a degree east
        // is worth what it is worth at that latitude.
        let px = 0.0
        let py = point.lat
        let ax = GlobeMath.longitudeDelta(Double(start.x), point.lon) * longitudeScale
        let ay = Double(start.y)
        let bx = GlobeMath.longitudeDelta(Double(end.x), point.lon) * longitudeScale
        let by = Double(end.y)
        let dx = bx - ax
        let dy = by - ay
        let lengthSquared = dx * dx + dy * dy
        guard lengthSquared > 0 else { return hypot(px - ax, py - ay) }
        let t = min(1, max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
        return hypot(px - (ax + t * dx), py - (ay + t * dy))
    }
}
