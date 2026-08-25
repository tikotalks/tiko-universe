import simd

/// A point on Earth in degrees. The whole app speaks this unit; only the
/// renderer and the hit test convert to and from the unit sphere.
struct GeoPoint: Equatable, Codable, Sendable {
    var lat: Double
    var lon: Double

    static let zero = GeoPoint(lat: 0, lon: 0)
}

/// Sphere conventions, in one place so the renderer, the camera and the hit
/// test cannot drift apart: y is north, the camera looks down −z, and an
/// unrotated globe faces the camera at 0°N 0°E.
enum GlobeMath {
    static func unitVector(lat: Double, lon: Double) -> SIMD3<Float> {
        let latitude = lat * .pi / 180
        let longitude = lon * .pi / 180
        return SIMD3<Float>(
            Float(cos(latitude) * sin(longitude)),
            Float(sin(latitude)),
            Float(cos(latitude) * cos(longitude))
        )
    }

    static func unitVector(_ point: GeoPoint) -> SIMD3<Float> {
        unitVector(lat: point.lat, lon: point.lon)
    }

    /// The inverse. `atan2` keeps the date line continuous, and clamping before
    /// `asin` keeps a vector that rounding pushed just past the pole valid.
    static func geoPoint(from vector: SIMD3<Float>) -> GeoPoint {
        let normalized = simd_normalize(vector)
        let lat = asin(Double(min(max(normalized.y, -1), 1))) * 180 / .pi
        let lon = atan2(Double(normalized.x), Double(normalized.z)) * 180 / .pi
        return GeoPoint(lat: lat, lon: lon)
    }

    /// Shortest signed distance in degrees from `lon` to `other`, across the
    /// date line rather than the long way round the planet.
    static func longitudeDelta(_ lon: Double, _ other: Double) -> Double {
        var delta = lon - other
        while delta > 180 { delta -= 360 }
        while delta < -180 { delta += 360 }
        return delta
    }

    /// Great-circle distance in degrees of arc.
    static func angularDistance(_ a: GeoPoint, _ b: GeoPoint) -> Double {
        let lat1 = a.lat * .pi / 180
        let lat2 = b.lat * .pi / 180
        let deltaLat = (b.lat - a.lat) * .pi / 180
        let deltaLon = longitudeDelta(b.lon, a.lon) * .pi / 180
        let haversine = sin(deltaLat / 2) * sin(deltaLat / 2)
            + cos(lat1) * cos(lat2) * sin(deltaLon / 2) * sin(deltaLon / 2)
        return 2 * asin(min(1, sqrt(haversine))) * 180 / .pi
    }

    /// Nearest hit of a ray against the unit sphere, or nil when it misses.
    /// The near root is the visible side of the globe, which is the only side a
    /// tap can mean.
    static func intersectUnitSphere(origin: SIMD3<Float>, direction: SIMD3<Float>) -> SIMD3<Float>? {
        let unit = simd_normalize(direction)
        let b = simd_dot(origin, unit)
        let c = simd_dot(origin, origin) - 1
        let discriminant = b * b - c
        guard discriminant >= 0 else { return nil }
        let root = -b - sqrt(discriminant)
        guard root > 0 else { return nil }
        return origin + unit * root
    }
}
