import SwiftUI
import TikoKit

/// Parent Mode routine management on the shared Tiko popup sheets. The bundled
/// routines are defaults, not fixed content: edit, reorder, duplicate, hide,
/// reset, add, delete — per language, per account. Child Mode never gets here.
struct FirstRoutineManagerSheet: View {
    @ObservedObject var store: FirstStore
    @ObservedObject var progressStore: FirstProgressStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let initialRoutine: Routine?
    let onClose: () -> Void

    @State private var editingRoutine: Routine?
    @State private var addingRoutine = false
    @State private var didOpenInitial = false

    var body: some View {
        TikoPopupCard(
            title: i18n.t("first.edit.routinesTitle"),
            icon: "pencil",
            appColor: .first,
            onClose: onClose
        ) {
            VStack(spacing: 10) {
                ScrollView {
                    VStack(spacing: 8) {
                        let routines = store.allRoutines(language: languageCode)
                        ForEach(Array(routines.enumerated()), id: \.element.id) { index, routine in
                            routineRow(routine, index: index, total: routines.count)
                        }
                    }
                }
                .frame(maxHeight: 380)

                TikoActionButton(label: i18n.t("first.edit.addRoutine"), appColor: .first) {
                    addingRoutine = true
                }
            }
        }
        .tikoPopup(isPresented: $addingRoutine) {
            FirstRoutineEditSheet(
                store: store,
                progressStore: progressStore,
                i18n: i18n,
                languageCode: languageCode,
                routine: nil
            ) {
                addingRoutine = false
            }
        }
        .tikoPopup(isPresented: Binding(get: { editingRoutine != nil }, set: { if !$0 { editingRoutine = nil } })) {
            if let routine = editingRoutine {
                FirstRoutineEditSheet(
                    store: store,
                    progressStore: progressStore,
                    i18n: i18n,
                    languageCode: languageCode,
                    routine: routine
                ) {
                    editingRoutine = nil
                }
            }
        }
        .onAppear {
            // Long-pressing a tile on the home grid opens straight into it.
            guard !didOpenInitial, let initialRoutine else { return }
            didOpenInitial = true
            editingRoutine = initialRoutine
        }
    }

    private func routineRow(_ routine: Routine, index: Int, total: Int) -> some View {
        HStack(spacing: 10) {
            Button {
                editingRoutine = routine
            } label: {
                HStack(spacing: 12) {
                    ZStack {
                        if let url = store.image(for: routine.id) {
                            TikoCachedRemoteImage(url: url) {
                                Text(routine.emoji).font(.system(size: 26))
                            }
                        } else {
                            Text(routine.emoji).font(.system(size: 26))
                        }
                    }
                    .frame(width: 34, height: 34)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(routine.title)
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundStyle(routine.isHidden ? .secondary : .primary)
                        Text(routine.orderedSteps.map(\.title).joined(separator: " → "))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    if progressStore.wasCompletedToday(routine) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(TikoAppColor.first.palette.primary)
                            .accessibilityLabel(i18n.t("first.edit.doneToday"))
                    }
                    if routine.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                            .accessibilityLabel(i18n.t("first.settings.pinned"))
                    }
                    if routine.isCustom { tag(i18n.t("first.edit.customTag")) }
                    if routine.isHidden {
                        Image(systemName: "eye.slash")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                            .accessibilityLabel(i18n.t("first.edit.hiddenTag"))
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(routine.title)
            .accessibilityHint(i18n.t("first.edit.editRoutine"))

            VStack(spacing: 2) {
                reorderButton("chevron.up", disabled: index == 0) {
                    store.moveRoutine(language: languageCode, fromOffsets: IndexSet(integer: index), toOffset: index - 1)
                }
                reorderButton("chevron.down", disabled: index >= total - 1) {
                    store.moveRoutine(language: languageCode, fromOffsets: IndexSet(integer: index), toOffset: index + 2)
                }
            }
        }
        .padding(10)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .opacity(routine.isHidden ? 0.62 : 1)
    }

    private func reorderButton(_ systemImage: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 12, weight: .heavy))
                .foregroundStyle(disabled ? Color.secondary.opacity(0.3) : Color.secondary)
                .frame(width: 28, height: 22)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    private func tag(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .heavy, design: .rounded))
            .padding(.vertical, 3)
            .padding(.horizontal, 7)
            .background(Color.secondary.opacity(0.14))
            .clipShape(Capsule())
            .foregroundStyle(.secondary)
    }
}

// MARK: - Routine editor

struct FirstRoutineEditSheet: View {
    @ObservedObject var store: FirstStore
    @ObservedObject var progressStore: FirstProgressStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    /// nil → creating a new custom routine.
    let routine: Routine?
    let onClose: () -> Void

    /// An in-progress step: identity survives editing so rows keep focus.
    private struct EditableStep: Identifiable {
        let id: String
        var title: String
        var speakText: String
        var emoji: String
        var imageURL: URL?

        var isBlank: Bool { title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    @State private var title = ""
    @State private var emoji = "⭐️"
    @State private var steps: [EditableStep] = []
    @State private var dailyReset = false
    @State private var allowSkip = false
    @State private var isPinned = false
    @State private var confirmingDelete = false
    @State private var pickingImageForStepID: String?
    @State private var pickingRoutineImage = false

    private var isNew: Bool { routine == nil }

    private var filledSteps: [EditableStep] { steps.filter { !$0.isBlank } }

    var body: some View {
        TikoFormSheet(
            title: i18n.t(isNew ? "first.edit.newRoutine" : "first.edit.editRoutine"),
            icon: "pencil",
            appColor: .first,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    TikoFormField(label: i18n.t("first.edit.emoji")) {
                        TextField("⭐️", text: $emoji)
                            .font(.system(size: 26))
                            .frame(width: 52)
                            .multilineTextAlignment(.center)
                    }
                    TikoFormField(label: i18n.t("first.edit.routineTitle")) {
                        TextField(i18n.t("first.edit.routineTitlePlaceholder"), text: $title)
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                    }
                    .frame(maxWidth: .infinity)
                }

                stepsEditor

                routineSettings

                if let routine {
                    existingRoutineActions(routine)
                }

                TikoActionButton(
                    label: i18n.t(isNew ? "common.add" : "common.save"),
                    appColor: .first,
                    disabled: title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || filledSteps.isEmpty
                ) {
                    save()
                    onClose()
                }
            }
        }
        .tikoMediaPickerSheet(
            isPresented: Binding(
                get: { pickingImageForStepID != nil },
                set: { if !$0 { pickingImageForStepID = nil } }
            ),
            appColor: .first,
            title: i18n.t("first.edit.image")
        ) { selection in
            if let stepID = pickingImageForStepID,
               let index = steps.firstIndex(where: { $0.id == stepID }) {
                steps[index].imageURL = selection.url
            }
            pickingImageForStepID = nil
        }
        .tikoMediaPickerSheet(
            isPresented: $pickingRoutineImage,
            appColor: .first,
            title: i18n.t("first.edit.image")
        ) { _ in
            // Routine tiles resolve their own art from the library; a picked
            // image is stored per step, which is where it actually helps.
            pickingRoutineImage = false
        }
        .confirmationDialog(i18n.t("first.edit.deleteConfirm"), isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button(i18n.t("first.edit.delete"), role: .destructive) {
                if let routine {
                    store.deleteCustomRoutine(id: routine.id, language: languageCode)
                    progressStore.reset(routineID: routine.id)
                }
                onClose()
            }
            Button(i18n.t("common.cancel"), role: .cancel) {}
        }
        .onAppear(perform: populate)
    }

    // MARK: - Steps

    private var stepsEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            TikoFieldLabel(i18n.t("first.edit.steps"))
            ForEach($steps) { $step in
                stepRow($step)
            }
            Button {
                steps.append(EditableStep(
                    id: "step_\(UUID().uuidString.lowercased())",
                    title: "",
                    speakText: "",
                    emoji: "⭐️",
                    imageURL: nil
                ))
            } label: {
                Label(i18n.t("first.edit.addStep"), systemImage: "plus")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(TikoAppColor.first.palette.primary)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("first.edit.addStep")
        }
    }

    private func stepRow(_ step: Binding<EditableStep>) -> some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                TextField("⭐️", text: step.emoji)
                    .font(.system(size: 22))
                    .frame(width: 42)
                    .multilineTextAlignment(.center)

                TextField(i18n.t("first.edit.stepTitlePlaceholder"), text: step.title)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))

                Button {
                    pickingImageForStepID = step.wrappedValue.id
                } label: {
                    ZStack {
                        if let url = step.wrappedValue.imageURL ?? store.image(for: step.wrappedValue.id) {
                            TikoCachedRemoteImage(url: url) {
                                Image(systemName: "photo")
                                    .foregroundStyle(.secondary)
                            }
                        } else {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(TikoAppColor.first.palette.primary)
                        }
                    }
                    .frame(width: 34, height: 34)
                    .background(TikoAppColor.first.palette.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("first.edit.image"))

                Button {
                    let id = step.wrappedValue.id
                    steps.removeAll { $0.id == id }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("first.edit.delete"))
            }

            // What the voice says, when it should differ from the title.
            TextField(i18n.t("first.edit.speakTextPlaceholder"), text: step.speakText)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .accessibilityLabel(i18n.t("first.edit.speakText"))
        }
        .padding(10)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    // MARK: - Per-routine settings

    private var routineSettings: some View {
        VStack(alignment: .leading, spacing: 8) {
            TikoFieldLabel(i18n.t("first.settings.routineSettings"))
            settingToggle(i18n.t("first.settings.dailyReset"), systemImage: "sunrise", isOn: $dailyReset)
            settingToggle(i18n.t("first.settings.allowSkip"), systemImage: "arrow.forward", isOn: $allowSkip)
            settingToggle(i18n.t("first.settings.pinned"), systemImage: "pin", isOn: $isPinned)
        }
    }

    private func settingToggle(_ label: String, systemImage: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Label(label, systemImage: systemImage)
                .font(.system(size: 15, weight: .heavy, design: .rounded))
        }
        .tint(TikoAppColor.first.palette.primary)
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func existingRoutineActions(_ routine: Routine) -> some View {
        VStack(spacing: 8) {
            Toggle(isOn: hiddenBinding(routine)) {
                Label(i18n.t("first.edit.hide"), systemImage: "eye.slash")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
            }
            .tint(TikoAppColor.first.palette.primary)
            .padding(.vertical, 4)

            Button {
                store.duplicateRoutine(id: routine.id, language: languageCode)
                onClose()
            } label: {
                Label(i18n.t("first.edit.duplicate"), systemImage: "plus.square.on.square")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(TikoAppColor.first.palette.primary)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("first.edit.duplicate")

            if progressStore.resolvedCount(of: routine) > 0 {
                Button {
                    progressStore.reset(routineID: routine.id)
                } label: {
                    Label(i18n.t("first.edit.resetProgress"), systemImage: "arrow.counterclockwise")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(TikoAppColor.first.palette.primary)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("first.edit.resetProgress")
            }

            if !routine.isCustom, store.isEdited(routineID: routine.id, language: languageCode) {
                Button {
                    store.resetToDefault(routineID: routine.id, language: languageCode)
                    onClose()
                } label: {
                    Label(i18n.t("first.edit.reset"), systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            if routine.isCustom {
                Button {
                    confirmingDelete = true
                } label: {
                    Label(i18n.t("first.edit.delete"), systemImage: "trash")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func hiddenBinding(_ routine: Routine) -> Binding<Bool> {
        Binding(
            get: { store.routine(id: routine.id, language: languageCode)?.isHidden ?? routine.isHidden },
            set: { store.setHidden($0, routineID: routine.id, language: languageCode) }
        )
    }

    // MARK: - Load / save

    private func populate() {
        guard let routine else {
            if steps.isEmpty {
                steps = (0..<2).map { index in
                    EditableStep(
                        id: "step_\(UUID().uuidString.lowercased())",
                        title: "",
                        speakText: "",
                        emoji: index == 0 ? "1️⃣" : "2️⃣",
                        imageURL: nil
                    )
                }
            }
            return
        }
        title = routine.title
        emoji = routine.emoji
        dailyReset = routine.dailyReset
        allowSkip = routine.allowSkip
        isPinned = routine.isPinned
        steps = routine.orderedSteps.map { step in
            EditableStep(
                id: step.id,
                // An unchanged speak text stays empty in the form, so it keeps
                // following the title as the parent renames the step.
                title: step.title,
                speakText: step.speakText == step.title ? "" : step.speakText,
                emoji: step.emoji,
                imageURL: step.imageURL
            )
        }
    }

    private func save() {
        let resolvedSteps = filledSteps.enumerated().map { index, step in
            RoutineStep(
                id: step.id,
                title: step.title.trimmingCharacters(in: .whitespacesAndNewlines),
                speakText: step.speakText.trimmingCharacters(in: .whitespacesAndNewlines),
                emoji: step.emoji.isEmpty ? "⭐️" : step.emoji,
                imageURL: step.imageURL,
                sortOrder: index
            )
        }

        if let routine {
            store.updateRoutine(
                id: routine.id,
                language: languageCode,
                title: title,
                emoji: emoji,
                steps: resolvedSteps
            )
            store.setRoutineSettings(
                id: routine.id,
                language: languageCode,
                dailyReset: dailyReset,
                allowSkip: allowSkip,
                isPinned: isPinned
            )
        } else if let created = store.addCustomRoutine(
            language: languageCode,
            title: title,
            emoji: emoji,
            steps: resolvedSteps
        ) {
            store.setRoutineSettings(
                id: created.id,
                language: languageCode,
                dailyReset: dailyReset,
                allowSkip: allowSkip,
                isPinned: isPinned
            )
        }
    }
}
