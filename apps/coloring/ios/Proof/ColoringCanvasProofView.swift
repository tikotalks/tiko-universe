import SwiftUI
import ColoringCore

/// First native rendering proof for ColoringCore.
///
/// This is deliberately not an app shell yet. It proves the boundary:
/// Kotlin owns regions, hit testing, fills, undo/redo and serialization;
/// Swift owns drawing, gestures and controls.
struct ColoringCanvasProofView: View {
    private let engine: ColoringEngine

    @State private var snapshot: SnapshotDTO
    @State private var selectedColor = "#FF6B6B"

    private let palette = [
        "#FF6B6B", "#FFB84D", "#FFE66D", "#65D68E",
        "#4D96FF", "#7B61FF", "#E66BC7", "#795548",
    ]

    init() {
        let engine = ColoringEngine.companion.fromSvg(
            documentId: "proof-house",
            svg: Self.sampleSVG,
            title: "House"
        )
        self.engine = engine
        _snapshot = State(initialValue: Self.decode(engine.snapshotJson()))
    }

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("ColoringCore proof")
                    .font(.headline)

                Spacer()

                Button {
                    _ = engine.undo()
                    reload()
                } label: {
                    Image(systemName: "arrow.uturn.backward")
                }
                .disabled(!snapshot.canUndo)
                .accessibilityLabel("Undo")

                Button {
                    _ = engine.redo()
                    reload()
                } label: {
                    Image(systemName: "arrow.uturn.forward")
                }
                .disabled(!snapshot.canRedo)
                .accessibilityLabel("Redo")
            }

            GeometryReader { geometry in
                let transform = CanvasTransform(
                    canvas: snapshot.document.canvas,
                    viewSize: geometry.size
                )

                Canvas { context, _ in
                    for region in snapshot.document.regions.sorted(by: { $0.zIndex < $1.zIndex }) {
                        let path = transform.path(for: region.path.points)
                        context.fill(path, with: .color(Color(hex: region.fill?.hex ?? "#FFFFFF")))
                        context.stroke(
                            path,
                            with: .color(.black.opacity(0.86)),
                            style: StrokeStyle(lineWidth: 4, lineJoin: .round)
                        )
                    }
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .contentShape(Rectangle())
                .gesture(
                    SpatialTapGesture()
                        .onEnded { value in
                            let point = transform.documentPoint(for: value.location)
                            _ = engine.fill(x: point.x, y: point.y, colorHex: selectedColor)
                            reload()
                        }
                )
            }
            .aspectRatio(5.0 / 3.0, contentMode: .fit)
            .shadow(color: .black.opacity(0.08), radius: 18, y: 8)

            HStack(spacing: 12) {
                ForEach(palette, id: \.self) { color in
                    Button {
                        selectedColor = color
                    } label: {
                        Circle()
                            .fill(Color(hex: color))
                            .frame(width: 42, height: 42)
                            .overlay {
                                if selectedColor == color {
                                    Circle()
                                        .stroke(.primary, lineWidth: 3)
                                        .padding(-4)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Color \(color)")
                    .accessibilityAddTraits(selectedColor == color ? .isSelected : [])
                }
            }
        }
        .padding(24)
        .background(Color(uiColor: .systemGroupedBackground))
    }

    private func reload() {
        snapshot = Self.decode(engine.snapshotJson())
    }

    private static func decode(_ value: String) -> SnapshotDTO {
        do {
            return try JSONDecoder().decode(SnapshotDTO.self, from: Data(value.utf8))
        } catch {
            preconditionFailure("ColoringCore returned an invalid snapshot: \(error)")
        }
    }

    private static let sampleSVG = """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
      <path id="background" data-z-index="0" d="M 5 5 H 195 V 115 H 5 Z"/>
      <path id="house" data-parent-region="background" data-z-index="1" d="M 35 55 L 100 15 L 165 55 V 108 H 35 Z"/>
      <path id="door" data-parent-region="house" data-z-index="2" d="M 82 65 H 118 V 108 H 82 Z"/>
    </svg>
    """
}

private struct SnapshotDTO: Decodable {
    let document: DocumentDTO
    let canUndo: Bool
    let canRedo: Bool
}

private struct DocumentDTO: Decodable {
    let canvas: CanvasDTO
    let regions: [RegionDTO]
}

private struct CanvasDTO: Decodable {
    let width: Double
    let height: Double
}

private struct RegionDTO: Decodable {
    let id: String
    let path: RegionPathDTO
    let fill: ColorDTO?
    let zIndex: Int
}

private struct RegionPathDTO: Decodable {
    let points: [PointDTO]
}

private struct PointDTO: Decodable {
    let x: Double
    let y: Double
}

private struct ColorDTO: Decodable {
    let hex: String
}

private struct DocumentPoint {
    let x: Double
    let y: Double
}

private struct CanvasTransform {
    let canvas: CanvasDTO
    let viewSize: CGSize

    private var canvasWidth: CGFloat { CGFloat(canvas.width) }
    private var canvasHeight: CGFloat { CGFloat(canvas.height) }

    private var scale: CGFloat {
        min(viewSize.width / canvasWidth, viewSize.height / canvasHeight)
    }

    private var offset: CGPoint {
        CGPoint(
            x: (viewSize.width - canvasWidth * scale) / 2,
            y: (viewSize.height - canvasHeight * scale) / 2
        )
    }

    func path(for points: [PointDTO]) -> Path {
        var path = Path()
        guard let first = points.first else { return path }
        path.move(to: viewPoint(for: first))
        for point in points.dropFirst() {
            path.addLine(to: viewPoint(for: point))
        }
        path.closeSubpath()
        return path
    }

    func documentPoint(for point: CGPoint) -> DocumentPoint {
        DocumentPoint(
            x: Double((point.x - offset.x) / scale),
            y: Double((point.y - offset.y) / scale)
        )
    }

    private func viewPoint(for point: PointDTO) -> CGPoint {
        CGPoint(
            x: offset.x + CGFloat(point.x) * scale,
            y: offset.y + CGFloat(point.y) * scale
        )
    }
}

private extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard let value = UInt64(clean, radix: 16), clean.count == 6 || clean.count == 8 else {
            self = .clear
            return
        }

        let hasAlpha = clean.count == 8
        let red = Double((value >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
        let green = Double((value >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
        let blue = Double((value >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
        let alpha = hasAlpha ? Double(value & 0xFF) / 255 : 1
        self.init(red: red, green: green, blue: blue, opacity: alpha)
    }
}

#Preview {
    ColoringCanvasProofView()
        .frame(minWidth: 700, minHeight: 600)
}
