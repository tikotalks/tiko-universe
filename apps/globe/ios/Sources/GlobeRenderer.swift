import Foundation
import Metal
import MetalKit
import simd

/// Vertex layouts, mirrored exactly by `GlobeShaders.metal`. Positions are three
/// loose floats rather than a `SIMD3` so the Swift stride matches Metal's
/// `packed_float3`.
struct GlobeLandVertex {
    var x: Float
    var y: Float
    var z: Float
    /// Which country this triangle belongs to; the shader compares it with the
    /// selected country to decide the highlight.
    var country: Float
    /// Index into the per-country colour table.
    var color: Float
    /// 1 for the face a child looks down on, less for the cut edge around it.
    var shade: Float
}

struct GlobePositionVertex {
    var x: Float
    var y: Float
    var z: Float
}

/// Borders are ribbons rather than lines: `perpendicular` is the direction to
/// push the vertex sideways along the surface, `side` which way, and `country`
/// lets selection lift the outline with the fill it belongs to.
struct GlobeBorderVertex {
    var x: Float
    var y: Float
    var z: Float
    var px: Float
    var py: Float
    var pz: Float
    var side: Float
    var country: Float
}

struct GlobeUniforms {
    var viewProjection: simd_float4x4
    var lightDirection: SIMD3<Float>
    var selectedCountry: Int32
    var horizonCosine: Float
    var selectionLift: Float
    var selectionLiftDistance: Float
    var borderHalfWidth: Float
    var cameraDirection: SIMD3<Float>
    var oceanColor: SIMD4<Float>
    var atmosphereColor: SIMD4<Float>
    var borderColor: SIMD4<Float>
    var highlightColor: SIMD4<Float>
    var selectedBorderColor: SIMD4<Float>
}

/// The colours of the Earth, handed in by SwiftUI so light and dark mode stay a
/// view concern. The palette is Natural Earth's nine-colour map index, so
/// neighbouring countries never share a tint.
struct GlobeAppearance: Equatable {
    var background: SIMD4<Float>
    var ocean: SIMD4<Float>
    var atmosphere: SIMD4<Float>
    /// Outline weight in points. Zero draws no outline at all: the cut edge
    /// around each slab already separates one country from the next.
    var borderWidth: Float
    /// Rivers are drawn in their own colour and weight, always.
    var riverWidth: Float
    var river: SIMD4<Float>
    var border: SIMD4<Float>
    var selectedBorder: SIMD4<Float>
    var highlight: SIMD4<Float>
    /// Whether this is the dark appearance — the land table is built from it.
    var isDark: Bool
}

/// Turns the bundled lon/lat geometry into what the GPU draws. Kept apart from
/// the renderer so the shapes can be checked without a device.
enum GlobeMeshBuilder {
    /// Land and its borders share one radius. Lifting the border even slightly
    /// off the fill makes the two slide apart as soon as the globe turns away
    /// from the camera — the depth buffer's bias handles the overlap instead.
    static let landRadius: Float = 1.0
    static let borderRadius: Float = 1.0
    /// Countries are slabs, not decals: the cut edge between this and the top
    /// face is what gives them thickness when the globe turns.
    static let landBaseRadius: Float = 0.991
    static let oceanRadius: Float = 0.988
    /// How much darker the cut edge is than the face above it.
    static let edgeShade: Float = 0.78

    /// The top faces, in the order the geometry file stores them, so the fill
    /// indices still address them.
    static func landVertices(for geography: GlobeGeography) -> [GlobeLandVertex] {
        let geometry = geography.geometry
        var vertices: [GlobeLandVertex] = []
        vertices.reserveCapacity(geometry.meshVertices.count)
        for (index, country) in geometry.countries.enumerated() {
            let colorIndex = Float(index)
            for offset in 0..<country.meshVertexCount {
                let point = geometry.meshVertices[country.meshVertexOffset + offset]
                let position = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * landRadius
                vertices.append(GlobeLandVertex(
                    x: position.x, y: position.y, z: position.z,
                    country: Float(index), color: colorIndex, shade: 1
                ))
            }
        }
        return vertices
    }

    static func landIndices(for geography: GlobeGeography) -> [UInt32] {
        let geometry = geography.geometry
        var indices: [UInt32] = []
        indices.reserveCapacity(geometry.meshIndices.count)
        for country in geometry.countries {
            let base = UInt32(country.meshVertexOffset)
            for offset in 0..<country.meshIndexCount {
                indices.append(base + geometry.meshIndices[country.meshIndexOffset + offset])
            }
        }
        return indices
    }

    /// The cut edge around every country: one quad per outline segment, dropped
    /// from the top face to the base. Appended to the same buffer as the faces,
    /// with its own indices, so the whole planet is still one draw.
    static func wallVertices(for geography: GlobeGeography, faceCount: Int) -> (vertices: [GlobeLandVertex], indices: [UInt32]) {
        let geometry = geography.geometry
        var vertices: [GlobeLandVertex] = []
        var indices: [UInt32] = []
        vertices.reserveCapacity(geometry.outlinePoints.count * 4)
        indices.reserveCapacity(geometry.outlinePoints.count * 6)

        for (index, country) in geometry.countries.enumerated() {
            let colorIndex = Float(index)
            for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
                let ring = geometry.rings[ringIndex]
                guard ring.pointCount >= 2 else { continue }
                for offset in 0..<ring.pointCount {
                    let start = geometry.outlinePoints[ring.pointOffset + offset]
                    let end = geometry.outlinePoints[ring.pointOffset + (offset + 1) % ring.pointCount]
                    let a = GlobeMath.unitVector(lat: Double(start.y), lon: Double(start.x))
                    let b = GlobeMath.unitVector(lat: Double(end.y), lon: Double(end.x))
                    let base = UInt32(faceCount + vertices.count)
                    for (point, radius) in [(a, landRadius), (a, landBaseRadius), (b, landRadius), (b, landBaseRadius)] {
                        let position = point * radius
                        vertices.append(GlobeLandVertex(
                            x: position.x, y: position.y, z: position.z,
                            country: Float(index), color: colorIndex,
                            shade: radius == landRadius ? 1 : edgeShade
                        ))
                    }
                    indices.append(contentsOf: [base, base + 1, base + 2])
                    indices.append(contentsOf: [base + 2, base + 1, base + 3])
                }
            }
        }
        return (vertices, indices)
    }

    /// Rivers: the same mitred strip, but open — a river has two ends.
    static func riverVertices(for water: GlobeWater) -> (vertices: [GlobeBorderVertex], indices: [UInt32]) {
        var vertices: [GlobeBorderVertex] = []
        var indices: [UInt32] = []
        for line in water.rivers {
            guard line.pointCount >= 2 else { continue }
            let base = UInt32(vertices.count)
            for offset in 0..<line.pointCount {
                let point = water.riverPoints[line.pointOffset + offset]
                let current = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * borderRadius
                let previousPoint = water.riverPoints[line.pointOffset + max(0, offset - 1)]
                let nextPoint = water.riverPoints[line.pointOffset + min(line.pointCount - 1, offset + 1)]
                let previous = GlobeMath.unitVector(lat: Double(previousPoint.y), lon: Double(previousPoint.x)) * borderRadius
                let next = GlobeMath.unitVector(lat: Double(nextPoint.y), lon: Double(nextPoint.x)) * borderRadius
                let normal = simd_normalize(current)
                let incoming = sidewaysDirection(at: current, from: previous, to: current, normal: normal)
                let outgoing = sidewaysDirection(at: current, from: current, to: next, normal: normal)
                var miter = incoming + outgoing
                let length = simd_length(miter)
                if length < 1e-6 {
                    miter = simd_length(outgoing) > 0 ? outgoing : incoming
                } else {
                    miter /= length
                    miter *= 1 / max(0.4, simd_dot(miter, simd_length(outgoing) > 0 ? outgoing : incoming))
                }
                for side in [Float(-1), Float(1)] {
                    vertices.append(GlobeBorderVertex(
                        x: current.x, y: current.y, z: current.z,
                        px: miter.x, py: miter.y, pz: miter.z,
                        // −1 is no country, so a river never lifts with a selection.
                        side: side, country: -1
                    ))
                }
            }
            for offset in 0..<(line.pointCount - 1) {
                let here = base + UInt32(offset * 2)
                let there = here + 2
                indices.append(contentsOf: [here, here + 1, there])
                indices.append(contentsOf: [there, here + 1, there + 1])
            }
        }
        return (vertices, indices)
    }

    /// Lakes are flat fills, painted in the ocean's colour.
    static func lakeVertices(for water: GlobeWater) -> [GlobePositionVertex] {
        water.lakeVertices.map { point in
            let position = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * borderRadius
            return GlobePositionVertex(x: position.x, y: position.y, z: position.z)
        }
    }

    /// A continuous mitred strip per ring: two vertices per outline point,
    /// offset along the bisector of the two segments meeting there. Building it
    /// per segment instead leaves every corner unjoined, which at close zoom
    /// splays the border into a row of loose tabs.
    static func borderVertices(for geography: GlobeGeography) -> (vertices: [GlobeBorderVertex], indices: [UInt32]) {
        let geometry = geography.geometry
        var vertices: [GlobeBorderVertex] = []
        var indices: [UInt32] = []
        vertices.reserveCapacity(geometry.outlinePoints.count * 2)
        indices.reserveCapacity(geometry.outlinePoints.count * 6)

        for (index, country) in geometry.countries.enumerated() {
            let countryIndex = Float(index)
            for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
                let ring = geometry.rings[ringIndex]
                guard ring.pointCount >= 3 else { continue }
                let base = UInt32(vertices.count)

                for offset in 0..<ring.pointCount {
                    let previous = point(of: ring, at: (offset + ring.pointCount - 1) % ring.pointCount, in: geometry)
                    let current = point(of: ring, at: offset, in: geometry)
                    let next = point(of: ring, at: (offset + 1) % ring.pointCount, in: geometry)
                    let normal = simd_normalize(current)
                    let incoming = sidewaysDirection(at: current, from: previous, to: current, normal: normal)
                    let outgoing = sidewaysDirection(at: current, from: current, to: next, normal: normal)

                    // The bisector, lengthened by how sharp the corner is, so
                    // the outer edge of the turn stays the same thickness.
                    var miter = incoming + outgoing
                    let length = simd_length(miter)
                    if length < 1e-6 {
                        miter = outgoing
                    } else {
                        miter /= length
                        // Capped, or a hairpin corner would throw a spike.
                        miter *= 1 / max(0.4, simd_dot(miter, outgoing))
                    }

                    for side in [Float(-1), Float(1)] {
                        vertices.append(GlobeBorderVertex(
                            x: current.x, y: current.y, z: current.z,
                            px: miter.x, py: miter.y, pz: miter.z,
                            side: side, country: countryIndex
                        ))
                    }
                }

                for offset in 0..<ring.pointCount {
                    let here = base + UInt32(offset * 2)
                    let there = base + UInt32(((offset + 1) % ring.pointCount) * 2)
                    indices.append(contentsOf: [here, here + 1, there])
                    indices.append(contentsOf: [there, here + 1, there + 1])
                }
            }
        }
        return (vertices, indices)
    }

    private static func point(of ring: GlobeGeometry.Ring, at offset: Int, in geometry: GlobeGeometry) -> SIMD3<Float> {
        let value = geometry.outlinePoints[ring.pointOffset + offset]
        return GlobeMath.unitVector(lat: Double(value.y), lon: Double(value.x)) * borderRadius
    }

    /// Across the border, along the surface: perpendicular to both the segment
    /// and the globe's normal at that point.
    private static func sidewaysDirection(
        at point: SIMD3<Float>,
        from start: SIMD3<Float>,
        to end: SIMD3<Float>,
        normal: SIMD3<Float>
    ) -> SIMD3<Float> {
        let along = end - start
        guard simd_length(along) > 1e-7 else { return SIMD3<Float>(0, 0, 0) }
        let sideways = simd_cross(normal, simd_normalize(along))
        let length = simd_length(sideways)
        return length > 1e-7 ? sideways / length : SIMD3<Float>(0, 0, 0)
    }

    static func sphere(rings: Int = 96, segments: Int = 192, radius: Float = oceanRadius)
        -> (vertices: [GlobePositionVertex], indices: [UInt32]) {
        var vertices: [GlobePositionVertex] = []
        var indices: [UInt32] = []
        for ring in 0...rings {
            let v = Double(ring) / Double(rings)
            let lat = 90 - v * 180
            for segment in 0...segments {
                let u = Double(segment) / Double(segments)
                let lon = -180 + u * 360
                let position = GlobeMath.unitVector(lat: lat, lon: lon) * radius
                vertices.append(GlobePositionVertex(x: position.x, y: position.y, z: position.z))
            }
        }
        let stride = segments + 1
        for ring in 0..<rings {
            for segment in 0..<segments {
                let topLeft = UInt32(ring * stride + segment)
                let topRight = topLeft + 1
                let bottomLeft = UInt32((ring + 1) * stride + segment)
                let bottomRight = bottomLeft + 1
                indices.append(contentsOf: [topLeft, bottomLeft, topRight])
                indices.append(contentsOf: [topRight, bottomLeft, bottomRight])
            }
        }
        return (vertices, indices)
    }
}

/// Everything the GPU needs, built from the geography once and away from the
/// main thread — a million-odd vertices is not work to do while the first frame
/// is waiting.
struct GlobeMeshes: Sendable {
    var land: [GlobeLandVertex]
    var landIndices: [UInt32]
    var border: [GlobeBorderVertex]
    var borderIndices: [UInt32]
    var ocean: [GlobePositionVertex]
    var oceanIndices: [UInt32]
    var river: [GlobeBorderVertex]
    var riverIndices: [UInt32]
    var lake: [GlobePositionVertex]
    var lakeIndices: [UInt32]

    static func build(for geography: GlobeGeography, water: GlobeWater?) -> GlobeMeshes {
        let faces = GlobeMeshBuilder.landVertices(for: geography)
        var faceIndices = GlobeMeshBuilder.landIndices(for: geography)
        let walls = GlobeMeshBuilder.wallVertices(for: geography, faceCount: faces.count)
        faceIndices.append(contentsOf: walls.indices)
        let border = GlobeMeshBuilder.borderVertices(for: geography)
        let sphere = GlobeMeshBuilder.sphere()
        let rivers = water.map(GlobeMeshBuilder.riverVertices) ?? (vertices: [], indices: [])
        return GlobeMeshes(
            land: faces + walls.vertices,
            landIndices: faceIndices,
            border: border.vertices,
            borderIndices: border.indices,
            ocean: sphere.vertices,
            oceanIndices: sphere.indices,
            river: rivers.vertices,
            riverIndices: rivers.indices,
            lake: water.map(GlobeMeshBuilder.lakeVertices) ?? [],
            lakeIndices: water?.lakeIndices ?? []
        )
    }
}

/// Draws the Earth: an ocean sphere, the country slabs, the borders on top.
/// Everything the frame needs is set from the main thread before the draw, so
/// the renderer itself holds no mutable state a gesture could race.
final class GlobeRenderer: NSObject, MTKViewDelegate {
    private let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let oceanPipeline: MTLRenderPipelineState
    private let landPipeline: MTLRenderPipelineState
    private let borderPipeline: MTLRenderPipelineState
    private let depthState: MTLDepthStencilState

    private let oceanVertices: MTLBuffer
    private let oceanIndices: MTLBuffer
    private let oceanIndexCount: Int
    private let landVertices: MTLBuffer
    private let landIndices: MTLBuffer
    private let landIndexCount: Int
    private let borderVertices: MTLBuffer
    private let borderIndices: MTLBuffer
    private let borderIndexCount: Int
    private let riverVertices: MTLBuffer?
    private let riverIndices: MTLBuffer?
    private let riverIndexCount: Int
    private let lakeVertices: MTLBuffer?
    private let lakeIndices: MTLBuffer?
    private let lakeIndexCount: Int
    private var countryColors: MTLBuffer
    private let countryCount: Int
    private let climates: [GlobeClimate]

    /// Set from the main thread between frames.
    var camera = GlobeCamera()
    var selectedCountryIndex: Int?
    /// 0 flush with the surface, 1 fully popped out.
    var selectionLift: Float = 0
    /// Border weight in points; the shader converts it to world units per frame.
    var borderWidthPoints: Float { appearance.borderWidth }
    var appearance: GlobeAppearance {
        didSet { updateCountryColors() }
    }
    /// Called once per frame with the elapsed time, so momentum and focus
    /// animations advance on the display's clock rather than a timer of ours.
    var onFrame: ((Double) -> Void)?

    private var lastFrameTime: CFTimeInterval?

    init?(device: MTLDevice, meshes: GlobeMeshes, climates: [GlobeClimate], appearance: GlobeAppearance) {
        guard let queue = device.makeCommandQueue(), let library = device.makeDefaultLibrary() else { return nil }
        self.device = device
        commandQueue = queue
        self.appearance = appearance

        func pipeline(vertex: String, fragment: String) -> MTLRenderPipelineState? {
            let descriptor = MTLRenderPipelineDescriptor()
            descriptor.vertexFunction = library.makeFunction(name: vertex)
            descriptor.fragmentFunction = library.makeFunction(name: fragment)
            descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
            descriptor.depthAttachmentPixelFormat = .depth32Float
            descriptor.rasterSampleCount = GlobeRenderer.sampleCount
            return try? device.makeRenderPipelineState(descriptor: descriptor)
        }
        guard let ocean = pipeline(vertex: "ocean_vertex", fragment: "ocean_fragment"),
              let land = pipeline(vertex: "land_vertex", fragment: "land_fragment"),
              let border = pipeline(vertex: "border_vertex", fragment: "border_fragment")
        else { return nil }
        oceanPipeline = ocean
        landPipeline = land
        borderPipeline = border

        let depthDescriptor = MTLDepthStencilDescriptor()
        depthDescriptor.depthCompareFunction = .less
        depthDescriptor.isDepthWriteEnabled = true
        guard let depth = device.makeDepthStencilState(descriptor: depthDescriptor) else { return nil }
        depthState = depth

        func buffer<T>(_ values: [T]) -> MTLBuffer? {
            guard !values.isEmpty else { return nil }
            return values.withUnsafeBytes { raw in
                device.makeBuffer(bytes: raw.baseAddress!, length: raw.count, options: .storageModeShared)
            }
        }
        guard let oceanVertexBuffer = buffer(meshes.ocean),
              let oceanIndexBuffer = buffer(meshes.oceanIndices),
              let landVertexBuffer = buffer(meshes.land),
              let landIndexBuffer = buffer(meshes.landIndices),
              let borderVertexBuffer = buffer(meshes.border),
              let borderIndexBuffer = buffer(meshes.borderIndices),
              let colors = device.makeBuffer(
                  length: MemoryLayout<SIMD4<Float>>.stride * max(1, climates.count),
                  options: .storageModeShared
              )
        else { return nil }
        oceanVertices = oceanVertexBuffer
        oceanIndices = oceanIndexBuffer
        oceanIndexCount = meshes.oceanIndices.count
        landVertices = landVertexBuffer
        landIndices = landIndexBuffer
        landIndexCount = meshes.landIndices.count
        borderVertices = borderVertexBuffer
        borderIndices = borderIndexBuffer
        borderIndexCount = meshes.borderIndices.count
        riverVertices = buffer(meshes.river)
        riverIndices = buffer(meshes.riverIndices)
        riverIndexCount = meshes.riverIndices.count
        lakeVertices = buffer(meshes.lake)
        lakeIndices = buffer(meshes.lakeIndices)
        lakeIndexCount = meshes.lakeIndices.count
        countryColors = colors
        countryCount = climates.count
        self.climates = climates

        super.init()
        updateCountryColors()
    }

    static let sampleCount = 4

    /// The world-space half-width that draws `borderWidthPoints` on screen at
    /// the current camera distance — so a border keeps its weight whether the
    /// child is looking at the planet or at one country.
    private func borderHalfWidth(drawableHeight: Double, scale: Double, points: Float? = nil) -> Float {
        guard drawableHeight > 0 else { return 0 }
        let halfFov = GlobeCamera.fieldOfViewDegrees / 2 * .pi / 180
        let worldPerPixel = 2 * camera.distance * tan(halfFov) / drawableHeight
        return Float(worldPerPixel * Double(points ?? borderWidthPoints) * max(scale, 1) / 2)
    }

    /// One colour per country: its climate's, nudged by a value derived from
    /// its position in the table. Two neighbours in the same climate would
    /// otherwise melt into one shape now that there are no outlines.
    private func updateCountryColors() {
        guard countryCount > 0 else { return }
        let pointer = countryColors.contents().bindMemory(to: SIMD4<Float>.self, capacity: countryCount)
        for index in 0..<countryCount {
            let base = GlobeAppearance.landColor(for: climates[index], dark: appearance.isDark)
            // A repeating, deterministic wobble — nothing a child would read as
            // meaning, enough for one country to end where the next begins.
            let tone = Float(1 + (Double((index &* 7) % 5) - 2) * 0.022)
            pointer[index] = SIMD4<Float>(
                min(1, base.x * tone), min(1, base.y * tone), min(1, base.z * tone), 1
            )
        }
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let elapsed = lastFrameTime.map { now - $0 } ?? 0
        lastFrameTime = now
        onFrame?(min(elapsed, 0.1))

        guard let descriptor = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: descriptor)
        else { return }

        let size = view.drawableSize
        var uniforms = GlobeUniforms(
            viewProjection: camera.viewProjectionMatrix(aspect: Double(size.width) / Double(max(1, size.height))),
            lightDirection: camera.globeSpaceLightDirection,
            selectedCountry: Int32(selectedCountryIndex ?? -1),
            horizonCosine: Float(camera.horizonCosine),
            selectionLift: selectionLift,
            selectionLiftDistance: Float(camera.selectionLiftDistance),
            borderHalfWidth: borderHalfWidth(drawableHeight: Double(size.height), scale: Double(view.contentScaleFactor)),
            cameraDirection: camera.globeSpaceCameraDirection,
            oceanColor: appearance.ocean,
            atmosphereColor: appearance.atmosphere,
            borderColor: appearance.border,
            highlightColor: appearance.highlight,
            selectedBorderColor: appearance.selectedBorder
        )

        encoder.setDepthStencilState(depthState)
        encoder.setCullMode(.back)
        encoder.setRenderPipelineState(oceanPipeline)
        encoder.setVertexBuffer(oceanVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: oceanIndexCount, indexType: .uint32,
            indexBuffer: oceanIndices, indexBufferOffset: 0
        )

        // Land keeps both faces: the depth buffer already hides whatever is
        // behind the ocean sphere, and winding varies across the source polygons.
        encoder.setCullMode(.none)
        encoder.setRenderPipelineState(landPipeline)
        encoder.setVertexBuffer(landVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setVertexBuffer(countryColors, offset: 0, index: 2)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: landIndexCount, indexType: .uint32,
            indexBuffer: landIndices, indexBufferOffset: 0
        )

        // A hair towards the camera in depth, rather than in space: the border
        // stays exactly on the fill's surface and still wins the depth test.
        // Water on top of the land it runs through, biased forward in depth
        // rather than lifted off the surface.
        encoder.setDepthBias(-0.00004, slopeScale: -1.2, clamp: -0.001)
        if let lakeVertices, let lakeIndices, lakeIndexCount > 0 {
            encoder.setRenderPipelineState(oceanPipeline)
            encoder.setCullMode(.none)
            encoder.setVertexBuffer(lakeVertices, offset: 0, index: 0)
            encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.drawIndexedPrimitives(
                type: .triangle, indexCount: lakeIndexCount, indexType: .uint32,
                indexBuffer: lakeIndices, indexBufferOffset: 0
            )
        }
        if let riverVertices, let riverIndices, riverIndexCount > 0 {
            var riverUniforms = uniforms
            riverUniforms.borderColor = appearance.river
            riverUniforms.selectedBorderColor = appearance.river
            riverUniforms.borderHalfWidth = borderHalfWidth(
                drawableHeight: Double(size.height),
                scale: Double(view.contentScaleFactor),
                points: appearance.riverWidth
            )
            encoder.setRenderPipelineState(borderPipeline)
            encoder.setVertexBuffer(riverVertices, offset: 0, index: 0)
            encoder.setVertexBytes(&riverUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.setFragmentBytes(&riverUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.drawIndexedPrimitives(
                type: .triangle, indexCount: riverIndexCount, indexType: .uint32,
                indexBuffer: riverIndices, indexBufferOffset: 0
            )
        }
        encoder.setDepthBias(0, slopeScale: 0, clamp: 0)

        guard appearance.borderWidth > 0 else {
            encoder.endEncoding()
            commandBuffer.present(drawable)
            commandBuffer.commit()
            return
        }
        encoder.setDepthBias(-0.00004, slopeScale: -1.2, clamp: -0.001)
        encoder.setRenderPipelineState(borderPipeline)
        encoder.setVertexBuffer(borderVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: borderIndexCount, indexType: .uint32,
            indexBuffer: borderIndices, indexBufferOffset: 0
        )
        encoder.setDepthBias(0, slopeScale: 0, clamp: 0)

        encoder.endEncoding()
        commandBuffer.present(drawable)
        commandBuffer.commit()
    }
}
