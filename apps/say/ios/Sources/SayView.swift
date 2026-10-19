import SwiftUI
import TikoKit

struct SayView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .say)
    @StateObject private var store = SayCardStore()
    @State private var selectedCategory: SayCategory?
    @State private var showingCardManager = false
    @State private var managerCategory: SayCategory?
    @State private var editingCard: SayCard?
    @State private var editingCategory: SayCategory?
    @State private var showingCardEditor = false

    var body: some View {
        TikoAppShell(
            appConfig: SayAppConfig.app,
            appName: i18n.t("say.appName"),
            onIconTap: selectedCategory == nil ? nil : { selectedCategory = nil },
            actions: [
                TikoHeaderAction(id: "edit-cards", label: i18n.t("say.settings.editCards"), systemImage: "pencil"),
            ],
            onAction: { actionID in
                guard actionID == "edit-cards" else { return }
                managerCategory = selectedCategory
                showingCardManager = true
            },
            settingsContent: {
                settingsContent
            },
            content: {
                ZStack {
                    if let category = selectedCategory {
                        PracticeScreen(
                            category: category,
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { selectedCategory = nil },
                            speech: TikoScreenshotMode.isActive ? ScreenshotSpeechService() : nil,
                            shuffle: !TikoScreenshotMode.isActive
                        )
                        .id("\(category.id)-\(languageCode)-\(store.revision)")
                    } else {
                        CategoryGridView(
                            store: store,
                            i18n: i18n,
                            languageCode: languageCode,
                            onSelect: { selectedCategory = $0 },
                            onEdit: { category in
                                managerCategory = category
                                showingCardManager = true
                            }
                        )
                    }
                }
            }
        )
        .tikoPopup(isPresented: $showingCardManager) {
            SayCardManagerSheet(
                store: store,
                i18n: i18n,
                languageCode: languageCode,
                selectedCategory: $managerCategory,
                onEditCard: { card, category in
                    editingCard = card
                    editingCategory = category
                    showingCardEditor = true
                },
                onAddCard: { category in
                    editingCard = nil
                    editingCategory = category
                    showingCardEditor = true
                },
                onClose: { showingCardManager = false }
            )
        }
        .tikoPopup(isPresented: $showingCardEditor) {
            if let category = editingCategory {
                SayCardEditSheet(
                    store: store,
                    i18n: i18n,
                    languageCode: languageCode,
                    category: category,
                    card: editingCard,
                    onClose: { showingCardEditor = false }
                )
            }
        }
        .onAppear {
            i18n.setLanguage(languageCode)
            // App Store capture: render a fixed, deterministic scene. Other
            // apps follow the same TikoScreenshotMode pattern in their root view.
            if TikoScreenshotMode.isActive, TikoScreenshotMode.scene == "practice" || TikoScreenshotMode.scene == "celebrate" {
                selectedCategory = SayCatalog.category(id: "animals")
            }
        }
        .task {
            // Atlas voice and content APIs need a session token; make sure a
            // device identity exists on first launch (same pattern as Talk).
            // The shell refreshes existing sessions itself — only bootstrap
            // when there is none at all.
            if (try? TikoDeviceSessionStore().load())?.accessToken == nil,
               !TikoScreenshotMode.isActive {
                if let bundle = try? await TikoIdentityClient().bootstrapDevice(name: UIDevice.current.name, platform: "ios") {
                    try? TikoDeviceSessionStore().save(bundle)
                }
            }
            await store.hydrateAllCategories(language: languageCode)
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
    }

    private var settingsContent: some View {
        Button {
            managerCategory = nil
            showingCardManager = true
        } label: {
            HStack {
                Image(systemName: "pencil")
                    .font(.system(size: 16, weight: .bold))
                Text(i18n.t("say.settings.editCards"))
                    .font(.system(.body, design: .rounded).weight(.bold))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(SayAppConfig.app.appColor.palette.primary.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(i18n.t("say.settings.editCards"))
    }
}

// MARK: - Category grid

struct CategoryGridView: View {
    @ObservedObject var store: SayCardStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let onSelect: (SayCategory) -> Void
    let onEdit: (SayCategory) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 240), spacing: 16)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(SayCatalog.categories.sorted { $0.sortOrder < $1.sortOrder }) { category in
                    categoryTile(category)
                }
            }
            .padding(20)
        }
    }

    @ViewBuilder
    private func categoryTile(_ category: SayCategory) -> some View {
        let playable = store.isCategoryPlayable(categoryID: category.id, language: languageCode)
        let title = i18n.t(category.titleKey)
        Button {
            guard playable else { return }
            onSelect(category)
        } label: {
            VStack(spacing: 10) {
                ZStack {
                    if let thumbnail = store.categoryThumbnails[category.id] {
                        TikoCachedRemoteImage(url: thumbnail) {
                            Text(category.emoji).font(.system(size: 54))
                        }
                    } else {
                        Text(category.emoji)
                            .font(.system(size: 54))
                    }
                }
                .frame(width: 84, height: 84)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .accessibilityHidden(true)
                Text(title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.primary)
                if !playable {
                    Image(systemName: "eye.slash")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 150)
            .padding(.vertical, 14)
            .background(SayAppConfig.app.appColor.palette.primary.opacity(playable ? 0.16 : 0.06))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .opacity(playable ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!playable)
        .accessibilityIdentifier("say.category.\(category.id)")
        .accessibilityLabel(playable ? title : "\(title). \(i18n.t("say.categories.empty"))")
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.6).onEnded { _ in
                // Parent-only shortcut into the card editor; Child Mode never
                // exposes editing.
                let isChild = TikoParentGate.isChildModeActive
                guard !isChild else { return }
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onEdit(category)
            }
        )
    }
}
