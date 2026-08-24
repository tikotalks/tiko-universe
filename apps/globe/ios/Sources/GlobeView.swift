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
                onSelectEntity: { entity in controller.select(entityID: entity.id, focus: true) }
            )
        }
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
                    onSelectCountry: { country in controller.select(country: country, focus: true) }
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

    /// The mode switch. One row, large targets, an icon *and* a word each —
    /// changing it leaves the globe exactly where it is.
    private var modeSelector: some View {
        HStack(spacing: 8) {
            ForEach(GlobeMode.allCases) { mode in
                let isActive = controller.mode == mode
                Button {
                    controller.mode = mode
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: mode.systemImage).font(.title3)
                        Text(i18n.t(mode.labelKey))
                            .font(.caption.weight(isActive ? .semibold : .regular))
                            .lineLimit(1)
                    }
                    .frame(minWidth: 72, minHeight: 56)
                    .padding(.horizontal, 6)
                    .background {
                        if isActive {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(appColor.palette.primary.opacity(0.22))
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
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
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
                    size: 11 * min(controller.markerScale, 1.4),
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
                Divider().frame(width: 44)
                zoomButton(systemImage: "minus", label: i18n.t("globe.action.zoomOut"), identifier: "globe-zoom-out", enabled: controller.canZoomOut) {
                    controller.zoomStep(by: 1 / GlobeController.zoomStepFactor)
                }
            }
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
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
                .font(.title3.weight(.semibold))
                .frame(width: 52, height: 52)
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
