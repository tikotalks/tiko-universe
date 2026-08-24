import Combine
import simd
import CoreGraphics
import Foundation
import SwiftUI
import TikoKit

/// The state behind the Earth: what is loaded, where the camera is pointing,
/// what is selected, and what should be said. The renderer reads the camera
/// every frame; SwiftUI reads the selection.
/// A country name drawn over the globe, already projected to view coordinates.
struct GlobeLabel: Identifiable, Equatable {
    let id: String
    let text: String
    let point: CGPoint
    /// How much of the visible globe this country covers, which sets its size.
    let prominence: Double
}

/// An occurrence that survived the density pass, ready to draw. `presence` runs
/// 0…1 as it arrives and back down as it leaves, so nothing blinks in or out.
struct GlobePlacedMarker: Identifiable, Equatable {
    let occurrence: GlobeOccurrence
    let entity: GlobeEntity
    let point: CGPoint
    let presence: Double

    var id: String { occurrence.id }
}

/// How much of the world's detail is visible at a given zoom. Importance is
/// authored 1…10; this table says how deep to go, and is a presentation choice
/// that can be retuned without touching the data.
enum GlobeImportanceBands {
    static func deepest(forVisibleRadius degrees: Double) -> Int {
        switch degrees {
        case 40...: 2
        case 15..<40: 4
        case 5..<15: 6
        case 1.5..<5: 8
        default: 10
        }
    }

    /// Below this, a child is looking at one country, and that country's own
    /// authored occurrences are what should fill it.
    static let countryZoomRadius: Double = 6
}

/// What the child has picked: a country, or an entity found somewhere on it.
enum GlobeSelection: Equatable {
    case country(GlobeCountry)
    case entity(GlobeEntity, GlobeOccurrence)
}

@MainActor
final class GlobeController: ObservableObject {
    enum LoadState: Equatable {
        case loading
        case ready
        case failed(String)
    }

    @Published private(set) var loadState: LoadState = .loading
    @Published private(set) var selection: GlobeSelection?
    /// Countries, Capitals, Animals or Landmarks. Changing it leaves the camera
    /// exactly where it is — the modes are ways of looking at the same Earth.
    @Published var mode: GlobeMode = .countries {
        didSet {
            guard mode != oldValue else { return }
            clearSelection()
            secondsSinceChoosing = .greatestFiniteMagnitude
        }
    }
    @Published private(set) var markers: [GlobePlacedMarker] = []
    /// Marker artwork scale, smallest at the whole Earth and largest close in —
    /// a zoomed-in animal should feel like you have walked up to it.
    @Published private(set) var markerScale: Double = 1

    /// How big the artwork is drawn, in points. Big enough to read as a picture
    /// of an animal rather than a pin, at every zoom — a child should be able to
    /// tell a lion from a leopard without going anywhere near it.
    var markerSize: Double { 108 * markerScale }
    /// Drives the "back to the whole Earth" action's visibility.
    @Published private(set) var isShowingWholeEarth = true
    /// Whether the zoom controls have anywhere left to go. Published rather than
    /// read from the camera, which changes every frame without SwiftUI hearing.
    @Published private(set) var canZoomIn = true
    @Published private(set) var canZoomOut = false
    /// The country names currently worth drawing, projected to view coordinates.
    @Published private(set) var labels: [GlobeLabel] = []
    /// And the names of the water they sit in, which are geography in every
    /// mode rather than a mode of their own.
    @Published private(set) var seaLabels: [GlobeLabel] = []
    /// And the islands inside countries, which the country layer cannot name:
    /// Sicily belongs to Italy, and Italy's own label is somewhere else.
    @Published private(set) var islandLabels: [GlobeLabel] = []
    private var seas: [GlobePlace] = []
    private var islands: [GlobePlace] = []

    /// Set by the surface view; labels cannot be placed without it.
    var viewSize: CGSize = .zero

    private(set) var geography: GlobeGeography?
    private(set) var content = GlobeContentLibrary()
    /// Sorted once, not on every frame: ordering two thousand occurrences sixty
    /// times a second is most of what made spinning the globe feel heavy.
    private var rankedByMode: [GlobeMode: [GlobeOccurrence]] = [:]
    /// Built with the geography, off the main thread.
    private(set) var meshes: GlobeMeshes?
    private var hitTester: GlobeHitTester?
    private(set) var selectedIndex: Int?

    var camera = GlobeCamera()
    var languageCode = "en"
    /// What VoiceOver calls the globe itself, handed in from the app's strings.
    var earthLabel = "Earth"
    /// Reduced Motion removes the spin-on and the fly-to; the globe still moves
    /// under the finger, it just never keeps moving on its own.
    var reduceMotion = false
    var speaksNames = true

    /// How far the selected country has risen off the surface, 0…1. The
    /// renderer turns this into the actual lift.
    private(set) var selectionLift: Double = 0

    /// Degrees per second, decaying after the finger leaves the screen.
    private var velocityYaw: Double = 0
    private var velocityPitch: Double = 0
    private var focusAnimation: FocusAnimation?
    private var speechTask: Task<Void, Never>?
    private var liftElapsed: Double = 0
    /// Two clocks. *Which* labels and markers to show is an expensive question —
    /// collision tests against everything already placed — and the answer only
    /// changes when the view changes appreciably, so it is asked a few times a
    /// second. *Where* they go is cheap, and is answered every frame, which is
    /// what keeps them stuck to the ground as the globe turns.
    private var secondsSinceChoosing: Double = .greatestFiniteMagnitude
    private static let chooseInterval: Double = 0.12
    private var chosenLabels: [GlobeCountry] = []
    private var chosenMarkers: [GlobeOccurrence] = []
    /// How far in or out each marker is, keyed by id. A marker leaving the set
    /// keeps its entry until it has shrunk away.
    private var markerPresence: [String: Double] = [:]
    private var leavingMarkers: [String: GlobeOccurrence] = [:]
    /// A marker pops in over this long.
    private static let presenceDuration: Double = 0.28

    private struct FocusAnimation {
        let from: GlobeCamera
        let to: GlobeCamera
        var elapsed: Double = 0
        let duration: Double
    }

    /// Momentum is gone within a second: a globe that keeps spinning is a globe
    /// the child has lost control of.
    private static let momentumHalfLife: Double = 0.16
    private static let momentumFloor: Double = 4

    var countries: [GlobeCountry] { geography?.countries ?? [] }

    func load() async {
        guard case .loading = loadState else { return }
        do {
            let loaded = try await Task.detached(priority: .userInitiated) {
                let geography = try GlobeGeography.loadFromBundle()
                // Water is a nice-to-have: a missing river file must not cost
                // the child the Earth.
                let water = try? GlobeWater.loadFromBundle()
                return (geography, GlobeMeshes.build(for: geography, water: water))
            }.value
            let geography = loaded.0
            self.geography = geography
            meshes = loaded.1
            content = GlobeContentLibrary.load(countries: geography.countries)
            seas = GlobePlaces.load("seas")
            islands = GlobePlaces.load("islands")
            // Most important first, then by id — a stable order that owes
            // nothing to how the data was generated.
            rankedByMode = content.occurrences.mapValues { occurrences in
                occurrences.sorted { ($0.importance, $0.id) < ($1.importance, $1.id) }
            }
            hitTester = GlobeHitTester(geography: geography)
            loadState = .ready
        } catch {
            loadState = .failed(error.localizedDescription)
        }
    }

    // MARK: - Gestures

    func beginInteraction() {
        velocityYaw = 0
        velocityPitch = 0
        focusAnimation = nil
    }

    func drag(deltaX: Double, deltaY: Double, viewSize: CGSize) {
        camera.rotate(byX: deltaX, y: deltaY, viewSize: viewSize)
        refreshCameraFlags()
    }

    /// Hands the gesture's parting speed (points per second) to the globe. A
    /// flick should feel like a flick, not a launch, so it is capped — and with
    /// Reduced Motion it stops the moment the finger lifts.
    func endDrag(velocityX: Double, velocityY: Double, viewSize: CGSize) {
        guard !reduceMotion else {
            velocityYaw = 0
            velocityPitch = 0
            return
        }
        let scale = camera.degreesPerPoint(viewSize: viewSize)
        velocityYaw = min(max(velocityX * scale, -240), 240)
        velocityPitch = min(max(velocityY * scale, -240), 240)
    }

    /// Two-finger zoom, anchored the way every map app anchors it: whatever was
    /// under the fingers when the pinch started stays under them. That is what
    /// makes moving two fingers together also carry the globe along, and what
    /// stops the planet sliding out from under a child mid-pinch.
    func pinch(scale: Double, at point: CGPoint, viewSize: CGSize, anchor: GeoPoint?) {
        focusAnimation = nil
        velocityYaw = 0
        velocityPitch = 0
        camera.zoom(by: scale)
        if let anchor { camera.keep(anchor, under: point, viewSize: viewSize) }
        refreshCameraFlags()
    }

    /// Zoom with nothing to anchor to — the on-screen controls, which simply
    /// move in and out of the middle of the view.
    func zoom(by scale: Double) {
        focusAnimation = nil
        camera.zoom(by: scale)
        refreshCameraFlags()
    }

    /// A tap on the globe. Returns true when it found something to select, so
    /// the caller can leave the current selection alone on a miss.
    @discardableResult
    func tap(at point: CGPoint, viewSize: CGSize) -> Bool {
        // A marker under the finger wins over the country under the marker:
        // a child aiming at the elephant means the elephant. This runs here
        // rather than relying on the marker's own button, so a tap that lands
        // beside the artwork still counts.
        let reach = 44 + 30 * markerScale
        if let nearest = markers
            .map({ ($0.occurrence, hypot($0.point.x - point.x, $0.point.y - point.y)) })
            .filter({ $0.1 <= reach })
            .min(by: { $0.1 < $1.1 })?.0 {
            select(occurrence: nearest)
            return true
        }

        guard let hitTester, let geoPoint = camera.geoPoint(atViewPoint: point, viewSize: viewSize) else {
            return false
        }
        let tolerance = camera.hitToleranceDegrees(viewSize: viewSize)
        guard let index = hitTester.country(near: geoPoint, toleranceDegrees: tolerance) else { return false }
        select(index: index)
        return true
    }

    // MARK: - Selection

    /// A marker tap: the marker is what was chosen, and the country under it is
    /// lifted so the child can see where the thing they tapped lives.
    /// Everything the current mode could show, one row per entity, for the list
    /// route. A child looking for the elephant wants one elephant.
    var entitiesForCurrentMode: [GlobeEntity] {
        var seen = Set<String>()
        return (rankedByMode[mode] ?? []).compactMap { occurrence in
            guard !seen.contains(occurrence.entityID) else { return nil }
            seen.insert(occurrence.entityID)
            return content.entities[occurrence.entityID]
        }
    }

    /// The occurrence of an entity a child should be taken to: the one they can
    /// see, else the most important.
    /// Everything of one kind that the geography puts inside a country, best
    /// first. A country's card is a way in to its animals and its landmarks.
    func entities(in country: GlobeCountry, kind: GlobeEntity.Kind) -> [GlobeEntity] {
        let mode: GlobeMode = switch kind {
        case .animal: .animals
        case .landmark: .landmarks
        case .capital: .capitals
        }
        var seen = Set<String>()
        var found: [(entity: GlobeEntity, importance: Int)] = []
        for occurrence in content.occurrences[mode] ?? [] {
            guard occurrence.countryID == country.id || occurrence.countryIDs.contains(country.id) else { continue }
            guard !seen.contains(occurrence.entityID) else { continue }
            guard let entity = content.entity(for: occurrence) else { continue }
            seen.insert(occurrence.entityID)
            found.append((entity, occurrence.importance))
        }
        return found
            .sorted { ($0.importance, $0.entity.id) < ($1.importance, $1.entity.id) }
            .map(\.entity)
    }

    func bestOccurrence(of entityID: String) -> GlobeOccurrence? {
        let candidates = (rankedByMode[mode] ?? []).filter { $0.entityID == entityID }
        let cameraDirection = camera.globeSpaceCameraDirection
        let visible = candidates.first { occurrence in
            simd_dot(GlobeMath.unitVector(occurrence.point), cameraDirection) > Float(camera.insetHorizonCosine)
        }
        return visible ?? candidates.first
    }

    /// An occurrence tap: the entity is what was chosen, and the country under
    /// it is lifted so the child can see where the thing they tapped is.
    func select(occurrence: GlobeOccurrence, speak: Bool = true, focus: Bool = false) {
        guard let entity = content.entities[occurrence.entityID] else { return }
        let countryIndex = occurrence.countryID.flatMap { geography?.index(of: $0) }
        if selectedIndex != countryIndex {
            liftElapsed = 0
            selectionLift = reduceMotion ? 1 : 0
        }
        selectedIndex = countryIndex
        selection = .entity(entity, occurrence)
        if speak { speakSelection() }
        if focus { focusOnSelection() }
    }

    /// Picks the right occurrence of an entity for where the child is looking.
    func select(entityID: String, speak: Bool = true, focus: Bool = false) {
        guard let occurrence = bestOccurrence(of: entityID) else { return }
        select(occurrence: occurrence, speak: speak, focus: focus)
    }

    func select(index: Int, speak: Bool = true) {
        guard let country = geography?.country(at: index) else { return }
        // A different country starts its rise from flat, so the pop reads as
        // this country lifting rather than the last one's height being inherited.
        if selectedIndex != index {
            liftElapsed = 0
            selectionLift = reduceMotion ? 1 : 0
        }
        selectedIndex = index
        selection = .country(country)
        if speak { speakSelection() }
    }

    func select(country: GlobeCountry, focus: Bool = false) {
        guard let index = geography?.index(of: country.id) else { return }
        select(index: index)
        if focus { focusOnSelection() }
    }

    /// What the panel and the voice call the current selection. Entities are
    /// named through their translation key, so this needs the app's strings.
    var i18n: TikoI18n?

    var selectionName: String {
        switch selection {
        case .country(let country): GlobeCountryNaming.name(for: country, languageCode: languageCode)
        case .entity(let entity, _): i18n.map { GlobeNaming.displayName(for: entity, i18n: $0) } ?? entity.fallbackName
        case nil: ""
        }
    }

    /// What the voice says, which may differ from what is written.
    var spokenSelectionName: String {
        switch selection {
        case .country(let country): GlobeCountryNaming.spokenName(for: country, languageCode: languageCode)
        case .entity(let entity, _): i18n.map { GlobeNaming.spokenName(for: entity, i18n: $0) } ?? entity.fallbackName
        case nil: ""
        }
    }

    func clearSelection() {
        selectedIndex = nil
        selection = nil
        selectionLift = 0
        speechTask?.cancel()
    }

    func speakSelection() {
        guard speaksNames, selection != nil else { return }
        let text = spokenSelectionName
        speechTask?.cancel()
        let language = languageCode
        speechTask = Task { await TikoVoiceService.shared.speak(text, languageCode: language) }
    }

    // MARK: - Camera moves

    func focusOnSelection() {
        switch selection {
        case .country(let country):
            var target = camera
            target.focus(on: country.labelPoint, distance: focusDistance(for: country))
            move(to: target)
        case .entity(_, let occurrence):
            var target = camera
            target.focus(on: occurrence.point, distance: min(camera.distance, GlobeCamera.countryDistance))
            move(to: target)
        case nil:
            break
        }
    }

    /// One step of the on-screen zoom controls — the route to zooming that does
    /// not need two fingers, a trackpad, or knowing that pinch is a thing.
    /// One rung of the ladder. The steps are even in what the child sees, not
    /// in where the camera is.
    static let zoomStepFactor: Double = 1.5

    func zoomStep(by factor: Double) {
        guard factor > 0 else { return }
        var target = camera
        target.setVisibleRadius(camera.visibleRadiusDegrees / factor)
        move(to: target)
    }


    func showWholeEarth() {
        var target = camera
        target.distance = GlobeCamera.earthDistance
        move(to: target)
    }

    /// Zoom so the whole country fits, with room around it — a big country ends
    /// up further away than a small island.
    private func focusDistance(for country: GlobeCountry) -> Double {
        guard country.bbox.count == 4 else { return GlobeCamera.countryDistance }
        let spanLat = abs(country.bbox[3] - country.bbox[1])
        let spanLon = abs(GlobeMath.longitudeDelta(country.bbox[2], country.bbox[0]))
            * max(0.15, cos(country.labelPoint.lat * .pi / 180))
        let radius = max(1.5, max(spanLat, spanLon) / 2 * 1.6)
        // Invert `visibleRadiusDegrees`: the distance whose visible cap is `radius`.
        let halfFov = GlobeCamera.fieldOfViewDegrees / 2 * .pi / 180
        let distance = sin(radius * .pi / 180 + halfFov) / sin(halfFov)
        return min(GlobeCamera.maxDistance, max(GlobeCamera.minDistance, distance))
    }

    private func move(to target: GlobeCamera) {
        velocityYaw = 0
        velocityPitch = 0
        guard !reduceMotion else {
            camera = target
            refreshCameraFlags()
            return
        }
        var start = camera
        // Always take the short way round the planet.
        start.yaw = target.yaw + GlobeMath.longitudeDelta(start.yaw, target.yaw)
        camera = start
        focusAnimation = FocusAnimation(from: start, to: target, duration: 0.65)
    }

    // MARK: - Frame

    /// Called by the renderer once per frame.
    func advance(by seconds: Double) {
        advanceSelectionLift(by: seconds)
        secondsSinceChoosing += seconds
        if secondsSinceChoosing >= Self.chooseInterval {
            secondsSinceChoosing = 0
            chooseLabels()
            chooseMarkers()
        }
        advanceMarkerPresence(by: seconds)
        placeLabels()
        placeSeaLabels()
        placeIslandLabels()
        placeMarkers()

        if var animation = focusAnimation {
            animation.elapsed += seconds
            let t = min(1, animation.elapsed / animation.duration)
            let eased = t * t * (3 - 2 * t)
            camera.yaw = animation.from.yaw + (animation.to.yaw - animation.from.yaw) * eased
            camera.pitch = animation.from.pitch + (animation.to.pitch - animation.from.pitch) * eased
            camera.distance = animation.from.distance + (animation.to.distance - animation.from.distance) * eased
            focusAnimation = t >= 1 ? nil : animation
            refreshCameraFlags()
            return
        }

        guard velocityYaw != 0 || velocityPitch != 0 else { return }
        camera.apply(deltaYaw: velocityYaw * seconds, deltaPitch: velocityPitch * seconds)
        let decay = pow(0.5, seconds / Self.momentumHalfLife)
        velocityYaw *= decay
        velocityPitch *= decay
        if abs(velocityYaw) < Self.momentumFloor && abs(velocityPitch) < Self.momentumFloor {
            velocityYaw = 0
            velocityPitch = 0
        }
        refreshCameraFlags()
    }

    /// The pop-out: a country rises over about a third of a second, overshoots
    /// by a hair and settles — the same motion as something being picked up.
    /// Reduced Motion gets the lifted state with none of the movement.
    private func advanceSelectionLift(by seconds: Double) {
        guard !reduceMotion else {
            selectionLift = selection == nil ? 0 : 1
            return
        }
        guard selection != nil else {
            guard selectionLift > 0 else { return }
            liftElapsed = 0
            selectionLift = max(0, selectionLift - seconds * 5)
            return
        }
        guard selectionLift < 1 || liftElapsed < Self.liftDuration else { return }
        liftElapsed += seconds
        let t = min(1, liftElapsed / Self.liftDuration)
        selectionLift = Self.easeOutBack(t)
    }

    private static let liftDuration: Double = 0.34

    /// Ease-out with a small overshoot; `c` sets how far past 1 it goes.
    private static func easeOutBack(_ t: Double) -> Double {
        let c = 1.35
        let p = t - 1
        return 1 + (c + 1) * p * p * p + c * p * p
    }

    private func chooseLabels() {
        guard mode == .countries, let geography, viewSize.width > 0, viewSize.height > 0 else {
            chosenLabels = []
            return
        }
        let cameraDirection = camera.globeSpaceCameraDirection
        let horizon = Float(camera.insetHorizonCosine)
        let visibleRadius = max(camera.visibleRadiusDegrees, 0.001)

        // Every country is eligible — no cap, no size threshold, because a
        // labelled Algeria beside an unlabelled Egypt reads as a bug. A name is
        // only dropped when it would land on top of one already placed, biggest
        // country first, so zooming in reveals the rest instead of reshuffling.
        var candidates: [(country: GlobeCountry, label: GlobeLabel, prominence: Double)] = []
        for country in geography.countries {
            let normal = GlobeMath.unitVector(country.labelPoint)
            guard simd_dot(normal, cameraDirection) > horizon else { continue }
            guard let point = camera.viewPoint(for: country.labelPoint, viewSize: viewSize) else { continue }
            guard point.x > 4, point.y > 4, point.x < viewSize.width - 4, point.y < viewSize.height - 4 else { continue }
            let prominence = country.labelSpanDegrees / visibleRadius
            candidates.append((
                country,
                GlobeLabel(
                    id: country.id,
                    text: GlobeCountryNaming.name(for: country, languageCode: languageCode),
                    point: point,
                    prominence: min(prominence, 1.6)
                ),
                prominence
            ))
        }

        var placed: [CGRect] = []
        var next: [GlobeCountry] = []
        for candidate in candidates.sorted(by: { $0.prominence > $1.prominence }) {
            let box = Self.chipBox(for: candidate.label)
            guard !placed.contains(where: { $0.intersects(box) }) else { continue }
            placed.append(box)
            next.append(candidate.country)
        }
        chosenLabels = next
    }

    /// Re-projects the chosen names. A couple of hundred trig calls per frame.
    private func placeLabels() {
        guard mode == .countries, viewSize.width > 0 else {
            if !labels.isEmpty { labels = [] }
            return
        }
        let cameraDirection = camera.globeSpaceCameraDirection
        let horizon = Float(camera.insetHorizonCosine)
        let visibleRadius = max(camera.visibleRadiusDegrees, 0.001)
        var next: [GlobeLabel] = []
        next.reserveCapacity(chosenLabels.count)
        for country in chosenLabels {
            let normal = GlobeMath.unitVector(country.labelPoint)
            guard simd_dot(normal, cameraDirection) > horizon else { continue }
            guard let point = camera.viewPoint(for: country.labelPoint, viewSize: viewSize) else { continue }
            next.append(GlobeLabel(
                id: country.id,
                text: GlobeCountryNaming.name(for: country, languageCode: languageCode),
                point: point,
                prominence: min(country.labelSpanDegrees / visibleRadius, 1.6)
            ))
        }
        if next != labels { labels = next }
    }

    /// The names of the water. Cheap enough to redo every frame — there are a
    /// hundred of them and only a handful ever pass — so they need no separate
    /// choose pass. A name shows when the zoom has reached its importance and
    /// when its water is wide enough on screen to carry it.
    private func placeSeaLabels() {
        let next = place(seas, roomNeeded: 0.07)
        if next != seaLabels { seaLabels = next }
    }

    /// Islands need less room than an ocean does — a name beside a small island
    /// still reads — but they wait until there is something to see.
    private func placeIslandLabels() {
        let next = place(islands, roomNeeded: 0.05)
        if next != islandLabels { islandLabels = next }
    }

    private func place(_ places: [GlobePlace], roomNeeded: Double) -> [GlobeLabel] {
        guard viewSize.width > 0, !places.isEmpty else { return [] }
        let cameraDirection = camera.globeSpaceCameraDirection
        let horizon = Float(camera.insetHorizonCosine)
        let visibleRadius = max(camera.visibleRadiusDegrees, 0.001)
        let deepest = GlobeImportanceBands.deepest(forVisibleRadius: visibleRadius)

        var next: [GlobeLabel] = []
        var placed: [CGRect] = []
        for place in places where place.importance <= deepest {
            // Room for the name in the place it names, not just on the screen.
            let span = place.reachDegrees / visibleRadius
            guard span > roomNeeded else { continue }
            let normal = GlobeMath.unitVector(place.point)
            guard simd_dot(normal, cameraDirection) > horizon else { continue }
            guard let point = camera.viewPoint(for: place.point, viewSize: viewSize) else { continue }
            guard point.x > 4, point.y > 4, point.x < viewSize.width - 4, point.y < viewSize.height - 4 else { continue }
            let label = GlobeLabel(
                id: place.id,
                text: place.name(languageCode: languageCode),
                point: point,
                prominence: min(span, 1.4)
            )
            let box = Self.chipBox(for: label)
            guard !placed.contains(where: { $0.intersects(box) }) else { continue }
            placed.append(box)
            next.append(label)
        }
        return next
    }

    /// Roughly the chip a name will be drawn in — enough to keep two of them
    /// off each other without measuring text every frame.
    private static func chipBox(for label: GlobeLabel) -> CGRect {
        let size = min(23.0, max(13.0, 12 + label.prominence * 9))
        let width = Double(label.text.count) * size * 0.58 + size * 1.1
        let height = size * 1.6
        return CGRect(
            x: label.point.x - width / 2,
            y: label.point.y - height / 2,
            width: width,
            height: height
        )
    }

    /// The markers worth drawing right now. Priority decides who gets in, a
    /// collision pass decides who fits, and the cap keeps the Earth sparse — the
    /// plan asks for a readable handful, not every marker at once.
    private func chooseMarkers() {
        guard mode != .countries, viewSize.width > 0, viewSize.height > 0,
              let candidates = rankedByMode[mode], !candidates.isEmpty
        else {
            chosenMarkers = []
            return
        }

        let cameraDirection = camera.globeSpaceCameraDirection
        let horizon = Float(camera.insetHorizonCosine)
        let visible = camera.visibleRadiusDegrees
        // Capitals behave like country names: all of them, all the time.
        let limit = mode == .capitals ? Int.max : (visible > 40 ? 70 : 140)
        // Zooming in is how a child finds more: the whole Earth carries the
        // lions and the elephants, a country carries its beetles. Importance is
        // authored per subject, 1 from space to 10 at the closest zoom.
        let deepestImportance: Int
        switch visible {
        case 40...: deepestImportance = 2
        case 15..<40: deepestImportance = 4
        case 5..<15: deepestImportance = 6
        case 1.5..<5: deepestImportance = 8
        default: deepestImportance = 10
        }
        let showsCloseUps = visible < 6

        var placed: [CGRect] = []
        var next: [GlobeOccurrence] = []
        // One elephant, however many places it lives: a view with the same
        // animal three times reads as three animals. Zoomed into a country its
        // own copy is the one that wins, which is why close-ups sort first.
        var alreadyShowing = Set<String>()
        let ordered = showsCloseUps
            ? candidates.sorted { ($0.isWithinCountry ? 0 : 1, $0.importance) < ($1.isWithinCountry ? 0 : 1, $1.importance) }
            : candidates
        for marker in ordered {
            guard next.count < limit else { break }
            guard marker.importance <= deepestImportance else { continue }
            guard !marker.isWithinCountry || showsCloseUps else { continue }
            guard !alreadyShowing.contains(marker.entityID) else { continue }
            let normal = GlobeMath.unitVector(marker.point)
            guard simd_dot(normal, cameraDirection) > horizon else { continue }
            guard let point = camera.viewPoint(for: marker.point, viewSize: viewSize) else { continue }
            guard point.x > 24, point.y > 24, point.x < viewSize.width - 24, point.y < viewSize.height - 24 else { continue }
            // Sized from the artwork at this zoom, so zooming in spreads the
            // markers out rather than just making them bigger.
            // The same size the artwork is drawn at, so what fits on screen and
            // what is chosen agree.
            let half = mode == .capitals ? 4.0 : markerSize * 0.5 + 2
            let box = CGRect(x: point.x - half, y: point.y - half, width: half * 2, height: half * 2)
            guard !placed.contains(where: { $0.intersects(box) }) else { continue }
            placed.append(box)
            alreadyShowing.insert(marker.entityID)
            next.append(marker)
        }

        // Anything dropped this round leaves on screen rather than vanishing.
        let chosenIDs = Set(next.map(\.id))
        for marker in chosenMarkers where !chosenIDs.contains(marker.id) {
            leavingMarkers[marker.id] = marker
        }
        for marker in next { leavingMarkers[marker.id] = nil }
        chosenMarkers = next
    }

    /// Grows arriving markers and shrinks departing ones, one frame at a time.
    private func advanceMarkerPresence(by seconds: Double) {
        let step = reduceMotion ? 1 : seconds / Self.presenceDuration
        for marker in chosenMarkers {
            markerPresence[marker.id] = min(1, (markerPresence[marker.id] ?? 0) + step)
        }
        for id in leavingMarkers.keys {
            let value = max(0, (markerPresence[id] ?? 0) - step)
            markerPresence[id] = value
            if value == 0 {
                markerPresence[id] = nil
                leavingMarkers[id] = nil
            }
        }
    }

    /// Re-projects the chosen markers, every frame.
    private func placeMarkers() {
        guard mode != .countries, viewSize.width > 0 else {
            if !markers.isEmpty { markers = [] }
            return
        }
        let cameraDirection = camera.globeSpaceCameraDirection
        let horizon = Float(camera.insetHorizonCosine)
        var next: [GlobePlacedMarker] = []
        next.reserveCapacity(chosenMarkers.count + leavingMarkers.count)
        for occurrence in chosenMarkers + Array(leavingMarkers.values) {
            let presence = markerPresence[occurrence.id] ?? 0
            guard presence > 0.001 else { continue }
            guard let entity = content.entities[occurrence.entityID] else { continue }
            let normal = GlobeMath.unitVector(occurrence.point)
            guard simd_dot(normal, cameraDirection) > horizon else { continue }
            guard let point = camera.viewPoint(for: occurrence.point, viewSize: viewSize) else { continue }
            next.append(GlobePlacedMarker(occurrence: occurrence, entity: entity, point: point, presence: presence))
        }
        if next != markers { markers = next }
    }

    private func refreshCameraFlags() {
        let showing = camera.isShowingWholeEarth
        if showing != isShowingWholeEarth { isShowingWholeEarth = showing }
        let zoomIn = camera.distance > GlobeCamera.minDistance + 0.0001
        if zoomIn != canZoomIn { canZoomIn = zoomIn }
        let zoomOut = camera.distance < GlobeCamera.maxDistance - 0.0001
        if zoomOut != canZoomOut { canZoomOut = zoomOut }

        // Between 1 and 2, on the same ladder the zoom itself uses.
        let widest = log(GlobeCamera.widestVisibleRadius)
        let narrowest = log(max(GlobeCamera.narrowestVisibleRadius, 0.01))
        let here = log(max(camera.visibleRadiusDegrees, 0.01))
        let closeness = min(1, max(0, (widest - here) / (widest - narrowest)))
        let scale = 0.92 + closeness * 0.85
        if abs(scale - markerScale) > 0.01 { markerScale = scale }
    }
}
