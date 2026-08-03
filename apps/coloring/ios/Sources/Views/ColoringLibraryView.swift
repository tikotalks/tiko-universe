import SwiftUI

/// Picks a page to colour. Deliberately large, high-contrast targets: the audience
/// is children, often using the app one-handed or with limited fine motor control.
struct ColoringLibraryView: View {
    @State private var selection: ColoringPage?

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 20)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(ColoringPage.bundled) { page in
                        Button {
                            selection = page
                        } label: {
                            ColoringPageTile(page: page)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Colour the \(page.title)")
                    }
                }
                .padding(20)
            }
            .navigationTitle("Colouring")
            .background(Color(uiColor: .systemGroupedBackground))
            .fullScreenCover(item: $selection) { page in
                ColoringView(page: page)
            }
        }
    }
}

private struct ColoringPageTile: View {
    let page: ColoringPage

    var body: some View {
        VStack(spacing: 12) {
            ColoringPageThumbnail(page: page)
                .frame(height: 120)
                .frame(maxWidth: .infinity)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            Text(page.title)
                .font(.headline)
                .foregroundStyle(.primary)
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

/// Renders the page outlines only — the thumbnail is what the child is about to fill in.
private struct ColoringPageThumbnail: View {
    let page: ColoringPage

    @State private var snapshot: ColoringSnapshot?

    var body: some View {
        GeometryReader { geometry in
            if let snapshot {
                let transform = CanvasTransform(canvas: snapshot.document.canvas, viewSize: geometry.size)
                Canvas { context, _ in
                    for region in snapshot.document.regions.sorted(by: { $0.zIndex < $1.zIndex }) {
                        let path = transform.path(for: region.path.points)
                        context.stroke(path, with: .color(.black.opacity(0.8)), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
                    }
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            snapshot = ColoringSession.previewSnapshot(for: page)
        }
    }
}

#Preview {
    ColoringLibraryView()
}
