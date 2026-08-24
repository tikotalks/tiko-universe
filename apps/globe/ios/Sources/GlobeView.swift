import SwiftUI
import TikoKit

enum GlobeSettings {
    static let saysNamesKey = "tiko.globe.saysNames"
}

/// Tiko Globe: a round Earth, and nothing else to learn before using it.
struct GlobeView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @AppStorage(GlobeSettings.saysNamesKey) private var saysNames = true
    @StateObject private var i18n = TikoI18n(app: .globe)
    @StateObject private var controller = GlobeController()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showingCountryList = false

    private let appColor = GlobeAppConfig.app.appColor

    var body: some View {
        TikoAppShell(
            appConfig: GlobeAppConfig.app,
            appName: i18n.t("globe.appName"),
            backgroundColor: GlobeAppearance.lightBackgroundColor,
            darkBackgroundColor: GlobeAppearance.darkBackgroundColor,
            actions: [
                TikoHeaderAction(
                    id: "country-list",
                    label: i18n.t("globe.action.countryList"),
                    systemImage: "list.bullet"
                ),
            ],
            onAction: { actionID in
                guard actionID == "country-list" else { return }
                showingCountryList = true
            },
            settingsContent: {
                GlobeSettingsContent(i18n: i18n)
            },
            content: {
                content
            }
        )
        .task {
            controller.i18n = i18n
            controller.languageCode = languageCode
            controller.earthLabel = i18n.t("globe.earth")
            controller.speaksNames = saysNames
            controller.reduceMotion = reduceMotion
            await controller.load()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
            controller.languageCode = code
            controller.earthLabel = i18n.t("globe.earth")
        }
        .onChange(of: saysNames) { _, value in controller.speaksNames = value }
        .onChange(of: reduceMotion) { _, value in controller.reduceMotion = value }
        .sheet(isPresented: $showingCountryList) {
            GlobeCountryList(
                countries: controller.countries,
                entities: controller.entitiesForCurrentMode,
                languageCode: languageCode,
                i18n: i18n,
                onSelect: { country in controller.select(country: country, focus: true) },
                onSelectEntity: { entity in controller.select(entityID: entity.id, focus: true) },
                appColor: appColor
            )
            .presentationCornerRadius(34)
        }
    }

    /// The animals and landmarks a country holds — empty for anything that is
    /// not a country, because an animal's card is about the animal.
    private func countryEntities(in selection: GlobeSelection, kind: GlobeEntity.Kind) -> [GlobeEntity] {
        guard case .country(let country) = selection else { return [] }
        return controller.entities(in: country, kind: kind)
    }

    @ViewBuilder
    private var content: some View {
        ZStack(alignment: .bottom) {
            switch controller.loadState {
            case .loading:
                ProgressView().controlSize(.large)
            case .failed(let message):
                failure(message)
            case .ready:
                if let meshes = controller.meshes {
                    GlobeSurfaceView(
                        controller: controller,
                        meshes: meshes,
                        climates: controller.countries.map(\.climate),
                        appearance: GlobeAppearance.appearance(for: colorScheme)
                    )
                    .ignoresSafeArea(edges: .bottom)
                    .accessibilityLabel(i18n.t("globe.earth"))
                    .accessibilityHint(i18n.t("globe.hint.explore"))
                    .accessibilityIdentifier("globe-surface")
                    .overlay { labels }
                }
            }

            zoomControls
                .padding(16)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

            if let selection = controller.selection, let geography = controller.geography {
                GlobeDetailPanel(
                    selection: selection,
                    geography: geography,
                    languageCode: languageCode,
                    i18n: i18n,
                    appColor: appColor,
                    onSpeak: { controller.speakSelection() },
                    onClose: { controller.clearSelection() },
                    onSelectCountry: { country in controller.select(country: country, focus: true) },
                    inhabitants: countryEntities(in: selection, kind: .animal),
                    landmarks: countryEntities(in: selection, kind: .landmark),
                    onSelectEntity: { entity in controller.select(entityID: entity.id, focus: true) }
                )
                .frame(width: panelWidth)
                .padding(.vertical, 12)
                .padding(.trailing, 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }

            VStack(spacing: 12) {
                Spacer(minLength: 0)
                if !controller.isShowingWholeEarth {
                    Button {
                        controller.showWholeEarth()
                    } label: {
                        Label(i18n.t("globe.action.wholeEarth"), systemImage: "globe")
                            .font(.headline)
                            .padding(.horizontal, 18)
                            .frame(minHeight: 44)
                            .background(.thinMaterial, in: Capsule())
                    }
                    .accessibilityIdentifier("globe-whole-earth")
                    .transition(.opacity)
                }
                modeSelector
            }
            .padding(16)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: controller.selection)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: controller.isShowingWholeEarth)
        }
    }

    /// The mode switch. One row, large targets, a modelled icon *and* a word
    /// each — changing it leaves the globe exactly where it is.
    private var modeSelector: some View {
        HStack(spacing: 8) {
            ForEach(GlobeMode.allCases) { mode in
                let isActive = controller.mode == mode
                Button {
                    controller.mode = mode
                } label: {
                    VStack(spacing: 4) {
                        // Every icon at full strength: the pill behind the
                        // active one is what says which mode you are in, and a
                        // greyed-out giraffe just looks like a broken giraffe.
                        modeIcon(mode)
                            .frame(width: 46, height: 46)
                        Text(i18n.t(mode.labelKey))
                            .font(.caption.weight(.semibold))
                            .lineLimit(1)
                            .foregroundStyle(isActive ? Color.white : Color.white.opacity(0.8))
                    }
                    .frame(minWidth: 84, minHeight: 80)
                    .padding(.horizontal, 6)
                    .background {
                        if isActive {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(.white.opacity(0.24))
                        }
                    }
                    .contentShape(Rectangle())
                }
                .accessibilityLabel(i18n.t(mode.labelKey))
                .accessibilityAddTraits(isActive ? [.isSelected] : [])
                .accessibilityIdentifier("globe-mode-\(mode.rawValue)")
            }
        }
        .padding(6)
        // Solid, in the app's own colour: this is Globe's main control and it
        // should look like a thing rather than like frosted glass.
        .background(appColor.palette.primary, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.18), radius: 14, y: 6)
        // No identifier on the row itself: SwiftUI hands a container's
        // identifier down to its children, which would leave every mode button
        // answering to the same name.
        .accessibilityLabel(i18n.t("globe.mode.picker"))
    }

    /// Capitals, animals and landmarks, standing on the globe. Drawn into the
    /// label canvas rather than as views: a hundred SwiftUI buttons laid out
    /// again every frame is what turns a globe full of animals into a slideshow.
    /// Taps are matched against the same positions in `GlobeController.tap`, and
    /// the country list is the route that does not need a fingertip at all.
    private func drawMarkers(in context: inout GraphicsContext) {
        guard controller.mode != .countries, controller.mode != .capitals else { return }
        let fullSize = controller.markerSize
        for placed in controller.markers {
            // Eased so a marker lands rather than simply appearing at full size.
            let t = placed.presence
            let eased = 1 - pow(1 - t, 3)
            let size = fullSize * (0.4 + 0.6 * eased)
            context.opacity = min(1, t * 1.4)
            if let image = GlobeMarkerImage.drawable(named: placed.entity.imageName, size: fullSize * 2) {
                context.draw(
                    image,
                    in: CGRect(
                        x: placed.point.x - size / 2,
                        y: placed.point.y - size / 2 - size * 0.2,
                        width: size,
                        height: size
                    )
                )
            } else {
                context.draw(
                    context.resolve(Text(placed.entity.glyph).font(.system(size: size * 0.8))),
                    at: CGPoint(x: placed.point.x, y: placed.point.y - size * 0.2),
                    anchor: .center
                )
            }
            // The name once the artwork is big enough to have room under it.
            if controller.markerScale > 1.0, t > 0.6 {
                draw(
                    GlobeNaming.displayName(for: placed.entity, i18n: i18n),
                    at: CGPoint(x: placed.point.x, y: placed.point.y + size * 0.45),
                    size: 13 * min(controller.markerScale, 1.4),
                    in: &context,
                    isPlace: false
                )
            }
            context.opacity = 1
        }
    }

    /// Country names, drawn over the globe rather than into it: the renderer
    /// stays a renderer, and the text gets Dynamic Type and the system's font
    /// rendering for free. VoiceOver ignores them — it has the country list.
    private var labels: some View {
        Canvas { context, _ in
            for label in controller.seaLabels {
                drawWaterName(label, in: &context)
            }
            for label in controller.islandLabels {
                drawIslandName(label, in: &context)
            }
            for label in controller.labels {
                draw(label.text, at: label.point, size: labelSize(for: label), in: &context, isPlace: false)
            }
            if controller.mode == .capitals {
                for placed in controller.markers {
                    draw(
                        GlobeNaming.displayName(for: placed.entity, i18n: i18n),
                        at: placed.point, size: 13, in: &context, isPlace: true
                    )
                }
            }
            drawMarkers(in: &context)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// A name on a chip: rounded, tinted, and readable over whatever colour the
    /// country underneath happens to be.
    /// The name of a sea, written the way a chart writes it: spaced out, italic,
    /// and in the water's own colour rather than in a chip. A name in a chip
    /// reads as a place you could stand on.
    private func drawWaterName(_ label: GlobeLabel, in context: inout GraphicsContext) {
        let size = min(19.0, max(10.0, 10 + label.prominence * 7))
        let spaced = label.text.uppercased().map(String.init).joined(separator: "\u{2009}")
        var text = context.resolve(
            Text(spaced)
                .font(.system(size: size, weight: .semibold, design: .rounded).italic())
        )
        text.shading = .color(waterNameColor.opacity(0.85))
        context.draw(text, at: label.point, anchor: .center)
    }

    /// An island's name is land, so it is written like a place rather than like
    /// water — but quieter than a country, which is the thing it belongs to.
    private func drawIslandName(_ label: GlobeLabel, in context: inout GraphicsContext) {
        let size = min(15.0, max(9.0, 9 + label.prominence * 5))
        var text = context.resolve(
            Text(label.text)
                .font(.system(size: size, weight: .medium, design: .rounded))
        )
        text.shading = .color(islandNameColor)
        context.draw(text, at: label.point, anchor: .center)
    }

    private var islandNameColor: Color {
        colorScheme == .dark ? Color(white: 0.78) : Color(red: 0.24, green: 0.26, blue: 0.20)
    }

    private var waterNameColor: Color {
        colorScheme == .dark ? Color(white: 0.86) : Color(red: 0.06, green: 0.24, blue: 0.44)
    }

    private func draw(_ text: String, at point: CGPoint, size: CGFloat, in context: inout GraphicsContext, isPlace: Bool) {
        let resolved = context.resolve(
            Text(text)
                .font(.system(size: size, weight: .semibold, design: .rounded))
                .foregroundStyle(labelInk)
        )
        let measured = resolved.measure(in: CGSize(width: 400, height: 100))
        let padding = CGSize(width: size * 0.55, height: size * 0.3)
        let chip = CGRect(
            x: point.x - measured.width / 2 - padding.width,
            y: point.y - measured.height / 2 - padding.height,
            width: measured.width + padding.width * 2,
            height: measured.height + padding.height * 2
        )
        context.fill(
            Path(roundedRect: chip, cornerRadius: chip.height / 2, style: .continuous),
            with: .color(isPlace ? placeChip : countryChip)
        )
        context.draw(resolved, at: point, anchor: .center)
    }

    private var labelInk: Color {
        colorScheme == .dark ? Color(white: 0.97) : Color(white: 0.12)
    }

    private var countryChip: Color {
        colorScheme == .dark ? Color.black.opacity(0.42) : Color.white.opacity(0.72)
    }

    /// Cities get the app's own colour so a capital never reads as a country.
    private var placeChip: Color {
        appColor.palette.primary.opacity(colorScheme == .dark ? 0.55 : 0.42)
    }

    private func countryNamed(_ id: String) -> GlobeCountry? {
        controller.countries.first { $0.id == id }
    }

    /// Wide enough for a name and a map, never more than half the screen.
    private var panelWidth: CGFloat {
        horizontalSizeClass == .compact ? 320 : 380
    }

    /// Bigger countries get bigger names, within a range that stays readable at
    /// arm's length and never turns into map-style micro-type.
    private func labelSize(for label: GlobeLabel) -> CGFloat {
        min(23, max(13, 12 + label.prominence * 9))
    }

    /// A mode's own picture, from the media library. The symbol is the fallback
    /// for a build where the artwork did not come along.
    @ViewBuilder
    private func modeIcon(_ mode: GlobeMode) -> some View {
        if let image = UIImage(named: mode.artworkName) {
            Image(uiImage: image).resizable().scaledToFit()
        } else {
            Image(systemName: mode.systemImage)
                .font(.title3)
                .foregroundStyle(.white)
        }
    }

    /// Pinch works, but a child (or a caregiver on a Mac trackpad, or anyone
    /// using Switch Control) should not have to discover it. Two big buttons do
    /// the same thing.
    @ViewBuilder
    private var zoomControls: some View {
        if case .ready = controller.loadState {
            VStack(spacing: 1) {
                zoomButton(systemImage: "plus", label: i18n.t("globe.action.zoomIn"), identifier: "globe-zoom-in", enabled: controller.canZoomIn) {
                    controller.zoomStep(by: GlobeController.zoomStepFactor)
                }
                Rectangle().fill(.white.opacity(0.28)).frame(width: 34, height: 1)
                zoomButton(systemImage: "minus", label: i18n.t("globe.action.zoomOut"), identifier: "globe-zoom-out", enabled: controller.canZoomOut) {
                    controller.zoomStep(by: 1 / GlobeController.zoomStepFactor)
                }
            }
            .background(appColor.palette.primary, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 12, y: 5)
        }
    }

    private func zoomButton(
        systemImage: String,
        label: String,
        identifier: String,
        enabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.title2.weight(.bold))
                .foregroundStyle(enabled ? Color.white : Color.white.opacity(0.4))
                .frame(width: 54, height: 54)
                .contentShape(Rectangle())
        }
        .disabled(!enabled)
        .accessibilityLabel(label)
        .accessibilityIdentifier(identifier)
    }

    private func failure(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "globe.badge.chevron.backward")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text(i18n.t("globe.error.title")).font(.headline)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Text(i18n.t("globe.error.hint"))
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .accessibilityIdentifier("globe-load-error")
    }
}

struct GlobeSettingsContent: View {
    @ObservedObject var i18n: TikoI18n
    @AppStorage(GlobeSettings.saysNamesKey) private var saysNames = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(i18n.t("globe.settings.sayNames"), isOn: $saysNames)
                .accessibilityIdentifier("globe-setting-say-names")
            Text(i18n.t("globe.settings.sayNamesHint"))
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }
}
