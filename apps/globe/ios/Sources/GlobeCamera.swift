import CoreGraphics
import Foundation
import simd

/// Where the child is looking from. The globe never rolls: yaw spins it, pitch
/// tips it, and north stays up — an upside-down Earth is disorienting and there
/// is nothing here a roll would let a child reach.
struct GlobeCamera: Equatable, Sendable {
    /// Degrees. The point facing the camera is `GeoPoint(lat: pitch, lon: -yaw)`.
    var yaw: Double = -10
    var pitch: Double = 20
    /// Camera distance from the centre of the globe, in globe radii.
    var distance: Double = Self.earthDistance

    /// Vertical field of view.
    static let fieldOfViewDegrees: Double = 40
    /// Closest approach: a view roughly 12 km across — close enough to sit
    /// inside Malta and see its shape, far short of anything that would read as
    /// a street map.
    static let minDistance: Double = 1.0035
    /// Furthest: the complete planet, comfortably inside the frame.
    /// The furthest the camera goes on a screen shaped like a page. A narrow
    /// screen needs it further back — see `distanceFitting(aspect:)`.
    static let maxDistance: Double = 4.0
    /// The "show me the whole Earth" home distance.
    /// The whole Earth on a screen shaped like a page. On anything narrower it
    /// has to sit further back, which `earthDistance` on the instance knows.
    static let earthDistance: Double = 3.2

    /// Where "the whole Earth" is for this screen: far enough back that the
    /// sides do not run off, and never closer than the standing default.
    var earthDistance: Double { max(Self.earthDistance, fittingDistance) }

    /// How far back this screen needs the camera for the globe to fit on it.
    var fittingDistance: Double = GlobeCamera.earthDistance
    /// Where focusing on a country lands: the country fills the view without
    /// losing the sense that this is a ball.
    static let countryDistance: Double = 1.35

    private static let halfFieldOfViewRadians = fieldOfViewDegrees / 2 * .pi / 180

    /// How far back the camera has to sit for the Earth to fit between the
    /// chrome, top and bottom. Fitting the *width* of a phone held upright
    /// leaves the globe a small ball in a large empty page; fitting the height
    /// keeps it as big as the screen allows and lets the sides run off, which
    /// is what a globe on a narrow screen looks like anyway.
    static func distanceFitting(viewSize: CGSize, coveredHeight: Double) -> Double {
        guard viewSize.height > 1 else { return earthDistance }
        let usable = max(0.35, (viewSize.height - coveredHeight) / viewSize.height)
        let half = atan(tan(halfFieldOfViewRadians) * usable)
        // A little room, so the Earth is not touching what sits over it.
        return max(minDistance, 1 / sin(half) * 1.02)
    }

    /// The furthest this camera may go, which is exactly as far as the whole
    /// Earth needs: once all of it is on screen there is nothing further out to
    /// see, and headroom past that only makes the globe smaller.
    var maxDistance: Double { earthDistance }

    /// The whole Earth, as far as this screen can show it.
    var widestVisibleRadius: Double { acos(min(0.999, 1 / maxDistance)) * 180 / .pi }

    /// The geographic point in the middle of the screen.
    var centre: GeoPoint {
        GeoPoint(lat: pitch, lon: GlobeMath.longitudeDelta(-yaw, 0))
    }

    /// Angular radius of the visible piece of the globe, in degrees. Beyond the
    /// point where the whole hemisphere fits the frame, the horizon limits it.
    var visibleRadiusDegrees: Double {
        let reach = distance * sin(Self.halfFieldOfViewRadians)
        if reach >= 1 {
            return acos(1 / distance) * 180 / .pi
        }
        return (asin(reach) - Self.halfFieldOfViewRadians) * 180 / .pi
    }

    var isShowingWholeEarth: Bool {
        distance >= maxDistance - 0.001 || visibleRadiusDegrees >= 70
    }

    /// How much the globe turns per point dragged. One screen height is roughly
    /// one full sweep of what is currently visible, so the globe keeps the same
    /// feel whether it is a planet or a country on screen.
    func degreesPerPoint(viewSize: CGSize) -> Double {
        2 * max(visibleRadiusDegrees, 1) / max(1, Double(viewSize.height))
    }

    /// Drag translation in points, turned into rotation.
    mutating func rotate(byX dx: Double, y dy: Double, viewSize: CGSize) {
        let scale = degreesPerPoint(viewSize: viewSize)
        apply(deltaYaw: dx * scale, deltaPitch: dy * scale)
    }

    mutating func apply(deltaYaw: Double, deltaPitch: Double) {
        yaw = (yaw + deltaYaw).truncatingRemainder(dividingBy: 360)
        pitch = min(90, max(-90, pitch + deltaPitch))
    }

    /// Zoom works on how much of the world is on screen, not on where the
    /// camera sits. Distance is violently non-linear near the surface — 3.2 to
    /// 1.8 barely changes the view, 1.8 to 1.0 goes from a continent to a city —
    /// so a step in distance is not a step a child can feel.
    mutating func zoom(by scale: Double) {
        guard scale > 0 else { return }
        setVisibleRadius(visibleRadiusDegrees / scale)
    }

    /// Puts `degrees` of arc on screen, as close as the limits allow.
    mutating func setVisibleRadius(_ degrees: Double) {
        let radius = min(widestVisibleRadius, max(Self.narrowestVisibleRadius, degrees))
        distance = min(maxDistance, max(Self.minDistance, Self.distance(forVisibleRadius: radius)))
    }

    /// The inverse of `visibleRadiusDegrees`, in both of its regimes: inside 70°
    /// the frame's edge decides what is visible, beyond it the horizon does.
    static func distance(forVisibleRadius degrees: Double) -> Double {
        let radians = degrees * .pi / 180
        if degrees <= 70 {
            return sin(radians + halfFieldOfViewRadians) / sin(halfFieldOfViewRadians)
        }
        return 1 / cos(radians)
    }

    /// The two ends of the ladder, derived from the distance limits so the two
    /// cannot drift apart.
    static var narrowestVisibleRadius: Double {
        (asin(minDistance * sin(halfFieldOfViewRadians)) - halfFieldOfViewRadians) * 180 / .pi
    }

    /// Turns the globe so `point` sits under `viewPoint` again. Solved by
    /// stepping rather than in closed form: one correction lands within a
    /// fraction of a degree and a second removes the curvature error out near
    /// the edge of the disc, which is cheaper than inverting the projection.
    mutating func keep(_ point: GeoPoint, under viewPoint: CGPoint, viewSize: CGSize) {
        for _ in 0..<2 {
            guard let current = geoPoint(atViewPoint: viewPoint, viewSize: viewSize) else { return }
            let deltaLat = point.lat - current.lat
            let deltaLon = GlobeMath.longitudeDelta(point.lon, current.lon)
            if abs(deltaLat) < 0.0005 && abs(deltaLon) < 0.0005 { return }
            yaw -= deltaLon
            pitch = min(90, max(-90, pitch + deltaLat))
        }
    }

    mutating func focus(on point: GeoPoint, distance: Double = GlobeCamera.countryDistance) {
        pitch = min(90, max(-90, point.lat))
        yaw = -point.lon
        self.distance = min(maxDistance, max(Self.minDistance, distance))
    }

    /// The direction of the camera as seen from the centre of the globe, in
    /// globe space — what the renderer needs to know which half of the planet
    /// is facing away.
    var globeSpaceCameraDirection: SIMD3<Float> {
        rotation.transpose * SIMD3<Float>(0, 0, 1)
    }

    /// The light, in globe space: fixed relative to the viewer — up and to the
    /// left of the camera — so turning the globe does not drag the shading
    /// around with it.
    var globeSpaceLightDirection: SIMD3<Float> {
        let inverse = rotation.transpose
        let toCamera = inverse * SIMD3<Float>(0, 0, 1)
        let right = inverse * SIMD3<Float>(1, 0, 0)
        let up = inverse * SIMD3<Float>(0, 1, 0)
        return simd_normalize(toCamera + right * -0.35 + up * 0.45)
    }

    /// The horizon, pulled in by a fraction of what is left above it — so a
    /// label or a marker never slides around the rim. A fixed margin cannot
    /// work: zoomed in the horizon cosine is already 0.9965, and adding a
    /// constant to that puts the threshold past 1, which hides everything.
    var insetHorizonCosine: Double {
        let horizon = horizonCosine
        return horizon + (1 - horizon) * 0.08
    }

    /// How far a selected country rises, in globe radii. Proportional to the
    /// camera distance so the lift is the same size on screen at any zoom, and
    /// capped well under the gap between the surface and the camera so a
    /// country can never rise past the lens.
    var selectionLiftDistance: Double {
        // A fraction of what the child can actually see, rather than of how far
        // away the camera is. Sized from the distance, a country lifts by the
        // same amount whether the screen holds a hemisphere or one island — and
        // an island the size of Malta ends up hovering over its own sea.
        let visibleArc = visibleRadiusDegrees * .pi / 180
        return min(0.06, max(0.0003, 0.05 * visibleArc))
    }

    /// Cosine of the angle from the sub-camera point to the horizon. A surface
    /// point is visible only while its normal points more directly at the
    /// camera than this.
    var horizonCosine: Double { 1 / distance }

    /// Globe-space rotation: world = Rx(pitch) · Ry(yaw) · globe.
    var rotation: simd_float3x3 {
        let yawRadians = Float(yaw * .pi / 180)
        let pitchRadians = Float(pitch * .pi / 180)
        let cy = cos(yawRadians), sy = sin(yawRadians)
        let cp = cos(pitchRadians), sp = sin(pitchRadians)
        let aroundY = simd_float3x3(
            SIMD3<Float>(cy, 0, -sy),
            SIMD3<Float>(0, 1, 0),
            SIMD3<Float>(sy, 0, cy)
        )
        let aroundX = simd_float3x3(
            SIMD3<Float>(1, 0, 0),
            SIMD3<Float>(0, cp, sp),
            SIMD3<Float>(0, -sp, cp)
        )
        return aroundX * aroundY
    }

    /// View-projection for the renderer, with the globe rotation folded in.
    func viewProjectionMatrix(aspect: Double) -> simd_float4x4 {
        let rotation = simd_float4x4(rotation)
        let translation = simd_float4x4(translationZ: Float(-distance))
        let projection = simd_float4x4(
            perspectiveFieldOfView: Float(Self.fieldOfViewDegrees * .pi / 180),
            aspect: Float(max(0.0001, aspect)),
            near: Float(max(0.01, distance - 1.5)),
            far: Float(distance + 2)
        )
        return projection * translation * rotation
    }

    /// Where a point on Earth lands on screen, or nil when it is behind the
    /// globe or outside the frustum. The inverse of `geoPoint(atViewPoint:)`.
    func viewPoint(for point: GeoPoint, viewSize: CGSize) -> CGPoint? {
        guard viewSize.width > 0, viewSize.height > 0 else { return nil }
        let aspect = Double(viewSize.width) / Double(viewSize.height)
        let clip = viewProjectionMatrix(aspect: aspect) * SIMD4<Float>(GlobeMath.unitVector(point), 1)
        guard clip.w > 0 else { return nil }
        let x = Double(clip.x / clip.w)
        let y = Double(clip.y / clip.w)
        return CGPoint(
            x: (x * 0.5 + 0.5) * Double(viewSize.width),
            y: (1 - (y * 0.5 + 0.5)) * Double(viewSize.height)
        )
    }

    /// The point on Earth under a touch, or nil when the touch missed the globe.
    func geoPoint(atViewPoint point: CGPoint, viewSize: CGSize) -> GeoPoint? {
        guard viewSize.width > 0, viewSize.height > 0 else { return nil }
        let ndcX = Double(point.x) / Double(viewSize.width) * 2 - 1
        let ndcY = 1 - Double(point.y) / Double(viewSize.height) * 2
        let tanHalf = tan(Self.halfFieldOfViewRadians)
        let aspect = Double(viewSize.width) / Double(viewSize.height)
        let direction = SIMD3<Float>(
            Float(ndcX * aspect * tanHalf),
            Float(ndcY * tanHalf),
            -1
        )
        let origin = SIMD3<Float>(0, 0, Float(distance))
        guard let hit = GlobeMath.intersectUnitSphere(origin: origin, direction: direction) else { return nil }
        let inverse = rotation.transpose
        return GlobeMath.geoPoint(from: inverse * hit)
    }

    /// How far off a tap may land and still count, in degrees of arc. Sized from
    /// a comfortable fingertip rather than a pixel, so small islands stay
    /// reachable at every zoom level.
    func hitToleranceDegrees(viewSize: CGSize, fingertipPoints: Double = 22) -> Double {
        degreesPerPoint(viewSize: viewSize) * fingertipPoints
    }
}

extension simd_float4x4 {
    init(translationZ z: Float) {
        self.init(
            SIMD4<Float>(1, 0, 0, 0),
            SIMD4<Float>(0, 1, 0, 0),
            SIMD4<Float>(0, 0, 1, 0),
            SIMD4<Float>(0, 0, z, 1)
        )
    }

    /// Metal's clip space, not OpenGL's: depth runs 0…1, so a projection built
    /// for the −1…1 convention silently clips away everything in the near half
    /// of the scene — which here is most of the globe.
    init(perspectiveFieldOfView fovy: Float, aspect: Float, near: Float, far: Float) {
        let scaleY = 1 / tan(fovy * 0.5)
        let scaleX = scaleY / aspect
        let zScale = far / (near - far)
        self.init(
            SIMD4<Float>(scaleX, 0, 0, 0),
            SIMD4<Float>(0, scaleY, 0, 0),
            SIMD4<Float>(0, 0, zScale, -1),
            SIMD4<Float>(0, 0, zScale * near, 0)
        )
    }

    init(_ rotation: simd_float3x3) {
        self.init(
            SIMD4<Float>(rotation.columns.0, 0),
            SIMD4<Float>(rotation.columns.1, 0),
            SIMD4<Float>(rotation.columns.2, 0),
            SIMD4<Float>(0, 0, 0, 1)
        )
    }
}
