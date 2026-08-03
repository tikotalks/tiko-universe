import SwiftUI

/// The colouring screen. Kotlin owns the document, hit testing, fills and history;
/// this view owns drawing, gestures and controls.
struct ColoringView: View {
    let page: ColoringPage

    @Environment(\.dismiss) private var dismiss
    @State private var session: ColoringSession?
    @State private var loadFailure: String?
    @State private var selectedColor = ColoringPalette.colors[0]

    var body: some View {
        VStack(spacing: 0) {
            header

            if let session {
                canvas(for: session)
                palette(for: session)
            } else if let loadFailure {
                ContentUnavailableView("This page could not be opened", systemImage: "exclamationmark.triangle", description: Text(loadFailure))
                    .frame(maxHeight: .infinity)
            } else {
                ProgressView().frame(maxHeight: .infinity)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .task {
            do {
                session = try ColoringSession(page: page)
            } catch {
                loadFailure = error.localizedDescription
            }
        }
    }

    private var header: some View {
        HStack(spacing: 16) {
            Button {
                dismiss()
            } label: {
                Label("Back", systemImage: "chevron.left")
                    .labelStyle(.iconOnly)
                    .font(.title2.weight(.semibold))
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Back to the library")

            Text(page.title)
                .font(.title2.weight(.semibold))

            Spacer()

            Button {
                session?.undo()
            } label: {
                Image(systemName: "arrow.uturn.backward")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .disabled(session?.canUndo != true)
            .accessibilityLabel("Undo")

            Button {
                session?.redo()
            } label: {
                Image(systemName: "arrow.uturn.forward")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .disabled(session?.canRedo != true)
            .accessibilityLabel("Redo")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    private func canvas(for session: ColoringSession) -> some View {
        GeometryReader { geometry in
            let snapshot = session.snapshot
            let transform = CanvasTransform(canvas: snapshot.document.canvas, viewSize: geometry.size)

            Canvas { context, _ in
                // Painter's order: a child expects the shape they see on top to be the
                // one they filled, and hit testing already prefers the smallest region.
                for region in snapshot.document.regions.sorted(by: { $0.zIndex < $1.zIndex }) {
                    let path = transform.path(for: region.path.points)
                    context.fill(path, with: .color(region.fill.map { Color(coloringHex: $0.hex) } ?? .white))
                    context.stroke(
                        path,
                        with: .color(.black.opacity(0.85)),
                        style: StrokeStyle(lineWidth: 3, lineJoin: .round)
                    )
                }
            }
            .background(.white)
            .contentShape(Rectangle())
            .gesture(
                SpatialTapGesture().onEnded { value in
                    let point = transform.documentPoint(for: value.location)
                    session.fill(x: point.x, y: point.y, colorHex: selectedColor)
                }
            )
        }
        .padding(20)
    }

    private func palette(for _: ColoringSession) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                ForEach(ColoringPalette.colors, id: \.self) { color in
                    Button {
                        selectedColor = color
                    } label: {
                        Circle()
                            .fill(Color(coloringHex: color))
                            .frame(width: 52, height: 52)
                            .overlay {
                                Circle().stroke(.black.opacity(0.15), lineWidth: 1)
                            }
                            .overlay {
                                if selectedColor == color {
                                    Circle()
                                        .stroke(.primary, lineWidth: 4)
                                        .padding(-6)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(ColoringPalette.name(for: color))
                    .accessibilityAddTraits(selectedColor == color ? .isSelected : [])
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
        }
    }
}

enum ColoringPalette {
    static let colors = [
        "#E5443B", "#F2802B", "#F5C518", "#4CAF50",
        "#2196F3", "#7B61FF", "#E86BC7", "#8D5A3B",
        "#2E2E2E", "#FFFFFF",
    ]

    private static let names = [
        "#E5443B": "Red", "#F2802B": "Orange", "#F5C518": "Yellow", "#4CAF50": "Green",
        "#2196F3": "Blue", "#7B61FF": "Purple", "#E86BC7": "Pink", "#8D5A3B": "Brown",
        "#2E2E2E": "Black", "#FFFFFF": "White",
    ]

    static func name(for hex: String) -> String { names[hex] ?? hex }
}
