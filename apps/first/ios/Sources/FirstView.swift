import SwiftUI
import TikoKit

struct FirstView: View {
    @AppStorage("tiko.language") private var languageCode = "en"
    @StateObject private var i18n = TikoI18n(app: .first)
    @StateObject private var store = FirstStore()
    @StateObject private var progressStore = FirstProgressStore()
    @State private var openRoutineID: String?
    @State private var showingRoutineManager = false
    @State private var editorInitialRoutine: Routine?

    private var openRoutine: Routine? {
        guard let openRoutineID else { return nil }
        return store.routine(id: openRoutineID, language: languageCode)
    }

    var body: some View {
        TikoAppShell(
            appConfig: FirstAppConfig.app,
            appName: i18n.t("first.appName"),
            onIconTap: openRoutineID == nil ? nil : { openRoutineID = nil },
            actions: [
                TikoHeaderAction(id: "edit-routines", label: i18n.t("first.settings.editRoutines"), systemImage: "pencil"),
            ],
            onAction: { actionID in
                guard actionID == "edit-routines" else { return }
                showingRoutineManager = true
            },
            settingsContent: {
                FirstSettingsContent(
                    i18n: i18n,
                    store: store,
                    progressStore: progressStore,
                    languageCode: languageCode
                ) {
                    showingRoutineManager = true
                }
            },
            content: {
                ZStack {
                    if let routine = openRoutine {
                        RoutineScreen(
                            routine: routine,
                            store: store,
                            progressStore: progressStore,
                            i18n: i18n,
                            languageCode: languageCode,
                            onClose: { openRoutineID = nil },
                            voice: TikoScreenshotMode.isActive ? FirstScreenshotVoice() : nil
                        )
                        .id("\(routine.id)-\(languageCode)-\(store.revision)")
                    } else {
                        FirstHomeView(
                            store: store,
                            progressStore: progressStore,
                            i18n: i18n,
                            languageCode: languageCode,
                            onSelect: { openRoutineID = $0.id },
                            onEdit: { routine in
                                editorInitialRoutine = routine
                                showingRoutineManager = true
                            }
                        )
                    }
                }
            }
        )
        .tikoPopup(isPresented: $showingRoutineManager) {
            FirstRoutineManagerSheet(
                store: store,
                progressStore: progressStore,
                i18n: i18n,
                languageCode: languageCode,
                initialRoutine: editorInitialRoutine,
                onClose: {
                    showingRoutineManager = false
                    editorInitialRoutine = nil
                }
            )
        }
        .onAppear {
            i18n.setLanguage(languageCode)
            if TikoScreenshotMode.isActive {
                switch TikoScreenshotMode.scene {
                case "routine", "celebrate":
                    openRoutineID = store.visibleRoutines(language: languageCode).first?.id
                default:
                    break
                }
            } else if let pinned = store.pinnedRoutine(language: languageCode) {
                // A parent pinned "the one we're doing now": land straight in it.
                openRoutineID = pinned.id
            }
        }
        .task {
            // Atlas voices need a session token; bootstrap a device identity on
            // first launch when none exists (same pattern as Say/Sum).
            if (try? TikoDeviceSessionStore().load())?.accessToken == nil,
               !TikoScreenshotMode.isActive {
                if let bundle = try? await TikoIdentityClient().bootstrapDevice(name: UIDevice.current.name, platform: "ios") {
                    try? TikoDeviceSessionStore().save(bundle)
                }
            }
            await store.hydrateMedia(language: languageCode)
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
    }
}

// MARK: - Home

struct FirstHomeView: View {
    @ObservedObject var store: FirstStore
    @ObservedObject var progressStore: FirstProgressStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let onSelect: (Routine) -> Void
    let onEdit: (Routine) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 240), spacing: 16)]
    private let appColor = FirstAppConfig.app.appColor

    var body: some View {
        let routines = store.visibleRoutines(language: languageCode)
        ScrollView {
            if routines.isEmpty {
                Text(i18n.t("first.home.empty"))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
            } else {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(routines) { routine in
                        routineTile(routine)
                    }
                }
                .padding(20)
            }
        }
    }

    private func routineTile(_ routine: Routine) -> some View {
        let done = progressStore.resolvedCount(of: routine)
        let total = routine.steps.count
        return Button {
            onSelect(routine)
        } label: {
            VStack(spacing: 10) {
                ZStack {
                    if let imageURL = store.image(for: routine.id) {
                        TikoCachedRemoteImage(url: imageURL) {
                            Text(routine.emoji).font(.system(size: 46))
                        }
                    } else {
                        Text(routine.emoji).font(.system(size: 46))
                    }
                }
                .frame(width: 76, height: 76)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityHidden(true)

                Text(routine.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)

                // Progress is dots, not numbers: readable before reading.
                StepDots(total: total, done: done, appColor: appColor)
            }
            .frame(maxWidth: .infinity, minHeight: 160)
            .padding(.horizontal, 8)
            .padding(.vertical, 12)
            .background(appColor.palette.primary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("first.routine.\(routine.id)")
        .accessibilityLabel(routine.title)
        .accessibilityValue(i18n.t("first.routine.progress", ["step": String(done), "total": String(total)]))
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.6).onEnded { _ in
                let isChild = TikoParentGate.isChildModeActive
                guard !isChild else { return }
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onEdit(routine)
            }
        )
    }
}

/// One dot per step, filled as the child works through them.
struct StepDots: View {
    let total: Int
    let done: Int
    let appColor: TikoAppColor

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<max(total, 1), id: \.self) { index in
                Circle()
                    .fill(index < done ? appColor.palette.primary : appColor.palette.primary.opacity(0.28))
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Settings content (parent-facing, inside the shell settings sheet)

struct FirstSettingsContent: View {
    @ObservedObject var i18n: TikoI18n
    @ObservedObject var store: FirstStore
    @ObservedObject var progressStore: FirstProgressStore
    let languageCode: String
    let onEditRoutines: () -> Void

    private let appColor = FirstAppConfig.app.appColor

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button(action: onEditRoutines) {
                HStack {
                    Image(systemName: "pencil")
                        .font(.system(size: 16, weight: .bold))
                    Text(i18n.t("first.settings.editRoutines"))
                        .font(.system(.body, design: .rounded).weight(.bold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 14)
                .background(appColor.palette.primary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("first.settings.editRoutines")
        }
    }
}
