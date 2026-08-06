import SwiftUI
import TikoKit

/// The colouring screen. Kotlin owns the document, hit testing, fills, strokes and
/// history; this view owns drawing, gestures and the tools.
struct ColoringView: View {
    let page: ColoringPage

    @State private var session: ColoringSession?
    @State private var loadFailure: String?
    @State private var mode: ColoringMode = .fill
    @State private var brushSize: BrushSize = .medium
    @State private var stayInsideLines = true
    @State private var selected = ColoringPalette.crayons[0]
    @State private var showingClearConfirmation = false

    private var accent: Color { ColoringAppConfig.app.appColor.palette.primary }

    var body: some View {
        Group {
            if let session {
                VStack(spacing: 14) {
                    canvas(for: session)
                    toolbar(for: session)
                    crayonTray
                }
            } else if let loadFailure {
                ContentUnavailableView(
                    "This page could not be opened",
                    systemImage: "exclamationmark.triangle",
                    description: Text(loadFailure)
                )
            } else {
                ProgressView().frame(maxHeight: .infinity)
            }
        }
        .task {
            do {
                session = try ColoringSession(page: page)
            } catch {
                loadFailure = error.localizedDescription
            }
        }
    }

    // MARK: - Canvas

    private func canvas(for session: ColoringSession) -> some View {
        GeometryReader { geometry in
            let snapshot = session.snapshot
            let transform = CanvasTransform(canvas: snapshot.document.canvas, viewSize: geometry.size)

            Canvas { context, _ in
                draw(snapshot: snapshot, activeStroke: session.activeStroke, in: &context, transform: transform)
            }
            .background(.white)
            .contentShape(Rectangle())
            .gesture(drawGesture(for: session, transform: transform))
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func draw(
        snapshot: ColoringSnapshot,
        activeStroke: ColoringStrokeShape?,
        in context: inout GraphicsContext,
        transform: CanvasTransform
    ) {
        let regions = snapshot.document.regions.sorted { $0.zIndex < $1.zIndex }

        // 1. Fills, back to front.
        for region in regions {
            guard let fill = region.fill else { continue }
            context.fill(transform.path(for: region.path.points), with: .color(Color(coloringHex: fill.hex)))
        }

        // 2. Brush strokes, clipped to their region when they were drawn inside the lines.
        for stroke in snapshot.document.strokes {
            drawStroke(stroke, in: &context, transform: transform, regions: regions)
        }
        if let activeStroke {
            drawStroke(activeStroke, in: &context, transform: transform, regions: regions)
        }

        // 3. Outlines last, so ink never covers the line art the child is colouring in.
        for region in snapshot.document.outlinedRegions.sorted(by: { $0.zIndex < $1.zIndex }) {
            context.stroke(
                transform.path(for: region.path.points),
                with: .color(.black.opacity(0.85)),
                style: StrokeStyle(lineWidth: 3, lineJoin: .round)
            )
        }
    }

    private func drawStroke(
        _ stroke: ColoringStrokeShape,
        in context: inout GraphicsContext,
        transform: CanvasTransform,
        regions: [ColoringRegion]
    ) {
        let path = transform.strokePath(for: stroke.points)
        let style = StrokeStyle(lineWidth: transform.viewWidth(for: stroke.width), lineCap: .round, lineJoin: .round)
        let paint = GraphicsContext.Shading.color(Color(coloringHex: stroke.color.hex))

        if let regionID = stroke.clippedRegionId,
           let region = regions.first(where: { $0.id == regionID }) {
            // Clip to the shape the stroke started in — this is what "stay inside the
            // lines" means, and it is why a rough scribble still colours neatly.
            var clipped = context
            clipped.clip(to: transform.path(for: region.path.points))
            clipped.stroke(path, with: paint, style: style)
        } else {
            context.stroke(path, with: paint, style: style)
        }
    }

    private func drawGesture(for session: ColoringSession, transform: CanvasTransform) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let point = transform.documentPoint(for: value.location)
                switch mode {
                case .fill:
                    break
                case .brush:
                    if session.activeStroke == nil {
                        session.beginStroke(
                            x: point.x,
                            y: point.y,
                            colorHex: selected.hex,
                            width: brushSize.rawValue,
                            stayInsideLines: stayInsideLines
                        )
                    } else {
                        session.extendStroke(x: point.x, y: point.y)
                    }
                }
            }
            .onEnded { value in
                let point = transform.documentPoint(for: value.location)
                switch mode {
                case .fill:
                    session.fill(x: point.x, y: point.y, colorHex: selected.hex)
                case .brush:
                    session.endStroke()
                }
            }
    }

    // MARK: - Tools

    private func toolbar(for session: ColoringSession) -> some View {
        HStack(spacing: 10) {
            ForEach(ColoringMode.allCases) { candidate in
                Button {
                    mode = candidate
                } label: {
                    Label(candidate.label, systemImage: candidate.systemImage)
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(mode == candidate ? accent : Color.clear)
                        .foregroundStyle(mode == candidate ? .white : .primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(mode == candidate ? .isSelected : [])
            }

            if mode == .brush {
                brushControls
            }

            Spacer(minLength: 0)

            toolButton("arrow.uturn.backward", "Undo", enabled: session.canUndo) { session.undo() }
            toolButton("arrow.uturn.forward", "Redo", enabled: session.canRedo) { session.redo() }
            toolButton("trash", "Start again", enabled: session.hasArtwork) { showingClearConfirmation = true }
        }
        .padding(.horizontal, 16)
        .confirmationDialog("Start this page again?", isPresented: $showingClearConfirmation, titleVisibility: .visible) {
            Button("Start again", role: .destructive) { session.clear() }
            Button("Keep colouring", role: .cancel) {}
        }
    }

    private var brushControls: some View {
        HStack(spacing: 10) {
            ForEach(BrushSize.allCases) { size in
                Button {
                    brushSize = size
                } label: {
                    Circle()
                        .fill(brushSize == size ? accent : Color.primary.opacity(0.35))
                        .frame(width: size.previewDiameter, height: size.previewDiameter)
                        .frame(width: 38, height: 38)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(size.label) brush")
                .accessibilityAddTraits(brushSize == size ? .isSelected : [])
            }

            Toggle(isOn: $stayInsideLines) {
                Image(systemName: stayInsideLines ? "scribble.variable" : "scribble")
            }
            .toggleStyle(.button)
            .tint(accent)
            .accessibilityLabel(stayInsideLines ? "Staying inside the lines" : "Colouring anywhere")
        }
    }

    private func toolButton(_ systemImage: String, _ label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.title3)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.35)
        .accessibilityLabel(label)
    }

    private var crayonTray: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(ColoringPalette.crayons) { crayon in
                    Button {
                        selected = crayon
                    } label: {
                        Circle()
                            .fill(Color(coloringHex: crayon.hex))
                            .frame(width: 46, height: 46)
                            .overlay { Circle().strokeBorder(.black.opacity(0.15), lineWidth: 1) }
                            .overlay {
                                if selected == crayon {
                                    Circle().strokeBorder(accent, lineWidth: 4).padding(-6)
                                }
                            }
                            .padding(6)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(crayon.name)
                    .accessibilityAddTraits(selected == crayon ? .isSelected : [])
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 8)
    }
}
