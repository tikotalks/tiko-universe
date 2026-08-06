import SwiftUI
import TikoKit

/// Picks a page to colour. Large, high-contrast targets: the audience is children,
/// often with limited fine motor control.
struct ColoringLibraryView: View {
    let onSelect: (ColoringPage) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 18)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 18) {
                ForEach(ColoringPage.bundled) { page in
                    Button {
                        onSelect(page)
                    } label: {
                        ColoringPageTile(page: page)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Colour the \(page.title)")
                }
            }
            .padding(18)
        }
    }
}

private struct ColoringPageTile: View {
    let page: ColoringPage

    private var accent: Color { ColoringAppConfig.app.appColor.palette.primary }

    var body: some View {
        VStack(spacing: 10) {
            ColoringPageThumbnail(page: page)
                .frame(height: 118)
                .frame(maxWidth: .infinity)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            Text(page.title)
                .font(.headline)
                .foregroundStyle(.primary)
        }
        .padding(10)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(accent.opacity(0.25), lineWidth: 1)
        }
    }
}

/// Renders the page outlines — the thumbnail is what the child is about to fill in.
private struct ColoringPageThumbnail: View {
    let page: ColoringPage

    @State private var snapshot: ColoringSnapshot?

    var body: some View {
        GeometryReader { geometry in
            if let snapshot {
                let transform = CanvasTransform(canvas: snapshot.document.canvas, viewSize: geometry.size)
                Canvas { context, _ in
                    for region in snapshot.document.outlinedRegions.sorted(by: { $0.zIndex < $1.zIndex }) {
                        context.stroke(
                            transform.path(for: region.path.points),
                            with: .color(.black.opacity(0.75)),
                            style: StrokeStyle(lineWidth: 2, lineJoin: .round)
                        )
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task { snapshot = ColoringSession.previewSnapshot(for: page) }
    }
}
