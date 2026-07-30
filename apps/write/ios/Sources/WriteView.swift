import SwiftUI
import TikoCore
import TikoKit

/// Home, then one glyph at a time.
struct WriteView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .write)
    @StateObject private var store = WriteGlyphStore()
    @State private var selection: Selection?

    struct Selection: Identifiable, Equatable {
        let packId: String
        let glyphID: String
        var id: String { "\(packId)/\(glyphID)" }
    }

    var body: some View {
        TikoAppShell(
            appConfig: WriteAppConfig.app,
            appName: i18n.t("write.appName"),
            onIconTap: selection == nil ? nil : { selection = nil },
            settingsContent: {
                WriteSettingsContent(i18n: i18n)
            },
            content: {
                if let selection, let glyph = store.glyph(packId: selection.packId, glyphID: selection.glyphID),
                   let pack = store.pack(selection.packId) {
                    TraceScreen(
                        glyph: glyph,
                        viewBox: CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight),
                        i18n: i18n,
                        onBack: { self.selection = nil }
                    )
                    .id(selection.id)
                } else {
                    GlyphGrid(store: store, i18n: i18n) { packId, glyphID in
                        selection = Selection(packId: packId, glyphID: glyphID)
                    }
                }
            }
        )
    }
}

/// The chooser: groups of glyph tiles, each showing the finished glyph.
private struct GlyphGrid: View {
    @ObservedObject var store: WriteGlyphStore
    let i18n: TikoI18n
    let onPick: (String, String) -> Void

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 140), spacing: 14)]

    var body: some View {
        ScrollView {
            if let error = store.loadError {
                // Surfaced rather than swallowed: an empty grid with no reason is
                // the worst way for this to fail.
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding()
            }
            VStack(alignment: .leading, spacing: 22) {
                ForEach(store.groups) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(i18n.t(WriteGlyphStore.groupTitleKey(group.id)))
                            .font(.headline)
                            .padding(.horizontal, 4)
                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(group.glyphIDs, id: \.self) { glyphID in
                                if let glyph = store.glyph(packId: group.packId, glyphID: glyphID),
                                   let pack = store.pack(group.packId) {
                                    Button {
                                        onPick(group.packId, glyphID)
                                    } label: {
                                        GlyphTile(
                                            glyph: glyph,
                                            viewBox: CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel(glyph.character)
                                }
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
    }
}

/// A tile showing the glyph itself, not its name — the child reads the shape.
private struct GlyphTile: View {
    let glyph: Glyph
    let viewBox: CGSize

    var body: some View {
        GeometryReader { geo in
            Path { path in
                let scale = min(geo.size.width / viewBox.width, geo.size.height / viewBox.height) * 0.72
                let dx = (geo.size.width - viewBox.width * scale) / 2
                let dy = (geo.size.height - viewBox.height * scale) / 2
                for i in 0..<Int(glyph.strokeCount) {
                    let pts = WriteEngine.points(glyph.polyline(strokeIndex: Int32(i)))
                    guard let first = pts.first else { continue }
                    path.move(to: CGPoint(x: first.x * scale + dx, y: first.y * scale + dy))
                    for p in pts.dropFirst() {
                        path.addLine(to: CGPoint(x: p.x * scale + dx, y: p.y * scale + dy))
                    }
                }
            }
            // Scaled to the tile: a fixed width fills in the gaps of a tight
            // curve like the spiral and turns the glyph into a blob.
            .stroke(
                Color.primary.opacity(0.8),
                style: StrokeStyle(lineWidth: max(2, geo.size.width * 0.035), lineCap: .round, lineJoin: .round)
            )
        }
        .aspectRatio(1, contentMode: .fit)
        .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 18))
    }
}

/// One glyph, as large as the device allows.
private struct TraceScreen: View {
    @StateObject private var model: TraceViewModel
    private let i18n: TikoI18n
    private let onBack: () -> Void

    init(glyph: Glyph, viewBox: CGSize, i18n: TikoI18n, onBack: @escaping () -> Void) {
        _model = StateObject(
            wrappedValue: TraceViewModel(
                glyph: glyph,
                viewBox: viewBox,
                settings: TraceSettings.companion.forgiving
            )
        )
        self.i18n = i18n
        self.onBack = onBack
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                TraceCanvasView(model: model, appColor: .write)
                    .accessibilityLabel(model.glyph.character)
                TikoCelebrationOverlay(
                    trigger: model.celebrationTrigger,
                    variant: TikoCelebrationVariant.allCases.randomElement() ?? .stars,
                    emoji: "⭐️",
                    appColor: .write
                )
                .allowsHitTesting(false)
            }
            .padding(20)

            HStack(spacing: 28) {
                // Icon-only, round, per the family's child-control convention.
                Button(action: { model.restart() }) {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.system(size: 26, weight: .semibold))
                        .frame(width: 64, height: 64)
                }
                .accessibilityLabel(i18n.t("write.action.again"))

                Button(action: onBack) {
                    Image(systemName: "arrow.forward")
                        .font(.system(size: 26, weight: .semibold))
                        .frame(width: 64, height: 64)
                }
                .accessibilityLabel(i18n.t("write.action.next"))
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.circle)
            .padding(.bottom, 18)
        }
    }
}

private struct WriteSettingsContent: View {
    let i18n: TikoI18n
    var body: some View {
        // The shared language and colour-mode pickers come from the shell; Write
        // adds its own difficulty controls in Parent Mode (TIKO-029).
        EmptyView()
    }
}
