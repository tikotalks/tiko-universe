import SwiftUI
import TikoCore
import TikoKit

/// Categories, then the glyphs inside one, then one glyph at a time.
///
/// Three shallow levels rather than one long scroll: with 113 glyphs a single
/// grid buries everything below the fold, and the design principles ask for few
/// choices per screen and no scroll-dependent child interaction.
struct WriteView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .write)
    @StateObject private var store = WriteGlyphStore()
    @State private var category: WriteGlyphStore.Group?
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
            onIconTap: (category == nil && selection == nil) ? nil : goBack,
            settingsContent: { EmptyView() },
            content: {
                if let selection,
                   let glyph = store.glyph(packId: selection.packId, glyphID: selection.glyphID),
                   let pack = store.pack(selection.packId) {
                    TraceScreen(
                        glyph: glyph,
                        viewBox: CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight),
                        spokenName: store.spokenName(
                            packId: selection.packId, glyph: glyph, language: languageCode
                        ),
                        languageCode: languageCode,
                        i18n: i18n,
                        onNext: { self.selection = nil }
                    )
                    .id(selection.id)
                } else if let category {
                    GlyphGrid(store: store, group: category, i18n: i18n) { packId, glyphID in
                        selection = Selection(packId: packId, glyphID: glyphID)
                    }
                } else {
                    CategoryGrid(store: store, i18n: i18n) { category = $0 }
                }
            }
        )
    }

    private func goBack() {
        if selection != nil { selection = nil } else { category = nil }
    }
}

// MARK: - Categories

/// Each category card shows one of its own glyphs, so a child who cannot read
/// still knows what is behind it.
private struct CategoryGrid: View {
    @ObservedObject var store: WriteGlyphStore
    let i18n: TikoI18n
    let onPick: (WriteGlyphStore.Group) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 230), spacing: 16)]

    var body: some View {
        ScrollView {
            if let error = store.loadError {
                Text(error).font(.footnote).foregroundStyle(.secondary).padding()
            }
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(store.groups) { group in
                    Button { onPick(group) } label: {
                        VStack(spacing: 10) {
                            if let id = group.glyphIDs.first,
                               let glyph = store.glyph(packId: group.packId, glyphID: id),
                               let pack = store.pack(group.packId) {
                                GlyphShape(
                                    glyph: glyph,
                                    viewBox: CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight)
                                )
                                .stroke(
                                    TikoAppColor.write.palette.primary,
                                    style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round)
                                )
                                .frame(height: 92)
                                .padding(.top, 10)
                            }
                            Text(i18n.t(WriteGlyphStore.groupTitleKey(group.id)))
                                .font(.headline)
                            Text("\(group.glyphIDs.count)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .padding(.bottom, 12)
                        }
                        .frame(maxWidth: .infinity)
                        .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 26))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(i18n.t(WriteGlyphStore.groupTitleKey(group.id)))
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Glyphs inside a category

private struct GlyphGrid: View {
    @ObservedObject var store: WriteGlyphStore
    let group: WriteGlyphStore.Group
    let i18n: TikoI18n
    let onPick: (String, String) -> Void

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 140), spacing: 14)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(group.glyphIDs, id: \.self) { glyphID in
                    if let glyph = store.glyph(packId: group.packId, glyphID: glyphID),
                       let pack = store.pack(group.packId) {
                        Button { onPick(group.packId, glyphID) } label: {
                            GlyphShape(
                                glyph: glyph,
                                viewBox: CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight)
                            )
                            .stroke(
                                Color.primary.opacity(0.82),
                                style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round)
                            )
                            .padding(10)
                            .aspectRatio(1, contentMode: .fit)
                            .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 20))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(glyph.character)
                    }
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Tracing

private struct TraceScreen: View {
    @StateObject private var model: TraceViewModel
    private let spokenName: String
    private let languageCode: String
    private let i18n: TikoI18n
    private let onNext: () -> Void

    init(
        glyph: Glyph,
        viewBox: CGSize,
        spokenName: String,
        languageCode: String,
        i18n: TikoI18n,
        onNext: @escaping () -> Void
    ) {
        _model = StateObject(
            wrappedValue: TraceViewModel(
                glyph: glyph, viewBox: viewBox, settings: TraceSettings.companion.forgiving
            )
        )
        self.spokenName = spokenName
        self.languageCode = languageCode
        self.i18n = i18n
        self.onNext = onNext
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                TraceCanvasView(model: model, tint: TikoAppColor.write.palette.primary)
                    .accessibilityLabel(model.glyph.character)
                TikoCelebrationOverlay(
                    trigger: model.celebrationTrigger,
                    variant: TikoCelebrationVariant.allCases.randomElement() ?? .stars,
                    emoji: "⭐️",
                    appColor: .write
                )
                .allowsHitTesting(false)

                if model.isComplete {
                    WellDoneCard(
                        glyph: model.glyph,
                        viewBox: model.viewBox,
                        spokenName: spokenName,
                        languageCode: languageCode,
                        i18n: i18n,
                        onNext: onNext
                    )
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.72), value: model.isComplete)
            .padding(20)

            if !model.isComplete {
                HStack(spacing: 28) {
                    Button { model.restart() } label: {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 26, weight: .semibold))
                            .frame(width: 64, height: 64)
                    }
                    .accessibilityLabel(i18n.t("write.action.again"))

                    Button(action: onNext) {
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
}

/// The finish: the glyph shown big, its name spoken and written, and one way on.
///
/// A rounded card rather than a full-bleed panel — everything else in the family
/// is soft-cornered, and a hard rectangle over a child's drawing reads as an
/// error dialog.
private struct WellDoneCard: View {
    let glyph: Glyph
    let viewBox: CGSize
    let spokenName: String
    let languageCode: String
    let i18n: TikoI18n
    let onNext: () -> Void

    @State private var appeared = false
    @State private var voice = TikoVoiceService()

    var body: some View {
        ZStack {
            Color.black.opacity(0.18).ignoresSafeArea()

            VStack(spacing: 18) {
                GlyphShape(glyph: glyph, viewBox: viewBox)
                    .stroke(
                        TikoAppColor.write.palette.primary,
                        style: StrokeStyle(lineWidth: 16, lineCap: .round, lineJoin: .round)
                    )
                    .frame(width: 210, height: 210)
                    .scaleEffect(appeared ? 1 : 0.68)
                    .animation(.spring(response: 0.5, dampingFraction: 0.58), value: appeared)

                // What it was, so the trace attaches to a word.
                Text(spokenName.capitalized)
                    .font(.system(size: 30, weight: .semibold, design: .rounded))
                    .multilineTextAlignment(.center)

                Text(i18n.t("write.wellDone"))
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(TikoAppColor.write.palette.primary)

                Button(action: onNext) {
                    Image(systemName: "arrow.forward")
                        .font(.system(size: 30, weight: .bold))
                        .frame(width: 78, height: 78)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .tint(TikoAppColor.write.palette.primary)
                .accessibilityLabel(i18n.t("write.action.next"))
            }
            .padding(.horizontal, 30)
            .padding(.vertical, 32)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 44, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 44, style: .continuous)
                    .strokeBorder(TikoAppColor.write.palette.primary.opacity(0.25), lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.16), radius: 26, y: 10)
            .padding(24)
        }
        .onAppear {
            appeared = true
            // Say what it was. The celebration chime lands first, so give it a
            // beat rather than talking over it.
            Task {
                try? await Task.sleep(nanoseconds: 550_000_000)
                await voice.speak(spokenName, languageCode: languageCode)
            }
        }
        .onDisappear { voice.stop() }
    }
}

/// A glyph as a SwiftUI shape, scaled into whatever space it is given.
struct GlyphShape: Shape {
    let glyph: Glyph
    let viewBox: CGSize

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard viewBox.width > 0, viewBox.height > 0 else { return path }
        let scale = min(rect.width / viewBox.width, rect.height / viewBox.height) * 0.9
        let dx = rect.midX - viewBox.width * scale / 2
        let dy = rect.midY - viewBox.height * scale / 2
        for i in 0..<Int(glyph.strokeCount) {
            let pts = WriteEngine.points(glyph.polyline(strokeIndex: Int32(i)))
            guard let first = pts.first else { continue }
            path.move(to: CGPoint(x: first.x * scale + dx, y: first.y * scale + dy))
            for p in pts.dropFirst() {
                path.addLine(to: CGPoint(x: p.x * scale + dx, y: p.y * scale + dy))
            }
        }
        return path
    }
}
