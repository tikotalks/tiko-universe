import SwiftUI
import TikoKit

/// Parent Mode path management on the shared Tiko popup sheets. Paths are
/// defaults, not fixed content: edit, hide, reset, reorder, add, delete —
/// per language, per account. Child Mode never reaches these.
struct SumPathManagerSheet: View {
    @ObservedObject var store: SumPathStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let onClose: () -> Void

    @State private var editingPath: SumPath?
    @State private var addingPath = false

    var body: some View {
        TikoPopupCard(
            title: i18n.t("sum.edit.pathsTitle"),
            icon: "pencil",
            appColor: .sum,
            onClose: onClose
        ) {
            VStack(spacing: 10) {
                ScrollView {
                    VStack(spacing: 8) {
                        let paths = store.allPaths(language: languageCode, i18n: i18n)
                        ForEach(Array(paths.enumerated()), id: \.element.id) { index, path in
                            pathRow(path, index: index, total: paths.count)
                        }
                    }
                }
                .frame(maxHeight: 380)

                TikoActionButton(label: i18n.t("sum.edit.addPath"), appColor: .sum) {
                    addingPath = true
                }
            }
        }
        .tikoPopup(isPresented: $addingPath) {
            SumPathEditSheet(store: store, i18n: i18n, languageCode: languageCode, path: nil) {
                addingPath = false
            }
        }
        .tikoPopup(isPresented: Binding(get: { editingPath != nil }, set: { if !$0 { editingPath = nil } })) {
            if let path = editingPath {
                SumPathEditSheet(store: store, i18n: i18n, languageCode: languageCode, path: path) {
                    editingPath = nil
                }
            }
        }
    }

    private func pathRow(_ path: SumPath, index: Int, total: Int) -> some View {
        HStack(spacing: 10) {
            Button {
                editingPath = path
            } label: {
                HStack(spacing: 12) {
                    Text(path.emoji)
                        .font(.system(size: 28))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(path.title)
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundStyle(path.isHidden ? .secondary : .primary)
                        Text(path.formulas.map { "\($0.a) \($0.op.symbol) \($0.b)" }.joined(separator: "   "))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    if path.isCustom { tag(i18n.t("sum.edit.customTag")) }
                    if path.isHidden {
                        Image(systemName: "eye.slash")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                            .accessibilityLabel(i18n.t("sum.edit.hiddenTag"))
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(path.title)
            .accessibilityHint(i18n.t("sum.edit.editPath"))

            VStack(spacing: 2) {
                reorderButton("chevron.up", disabled: index == 0) {
                    store.movePath(language: languageCode, i18n: i18n, fromOffsets: IndexSet(integer: index), toOffset: index - 1)
                }
                reorderButton("chevron.down", disabled: index >= total - 1) {
                    store.movePath(language: languageCode, i18n: i18n, fromOffsets: IndexSet(integer: index), toOffset: index + 2)
                }
            }
        }
        .padding(10)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .opacity(path.isHidden ? 0.62 : 1)
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

// MARK: - Path editor

struct SumPathEditSheet: View {
    @ObservedObject var store: SumPathStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    /// nil → creating a new custom path.
    let path: SumPath?
    let onClose: () -> Void

    private struct EditableFormula: Identifiable {
        let id = UUID()
        var aText: String
        var op: SumOperator
        var bText: String

        var formula: Formula? {
            guard let a = Int(aText), let b = Int(bText) else { return nil }
            let formula = Formula(a: a, op: op, b: b)
            return formula.isValid ? formula : nil
        }
    }

    @State private var title = ""
    @State private var emoji = "⭐️"
    @State private var formulas: [EditableFormula] = []
    @State private var confirmingDelete = false

    private var isNew: Bool { path == nil }

    private var validFormulas: [Formula] {
        formulas.compactMap(\.formula)
    }

    var body: some View {
        TikoFormSheet(
            title: i18n.t(isNew ? "sum.edit.newPath" : "sum.edit.editPath"),
            icon: "pencil",
            appColor: .sum,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    TikoFormField(label: i18n.t("sum.edit.emoji")) {
                        TextField("⭐️", text: $emoji)
                            .font(.system(size: 26))
                            .frame(width: 52)
                            .multilineTextAlignment(.center)
                    }
                    TikoFormField(label: i18n.t("sum.edit.pathTitle")) {
                        TextField(i18n.t("sum.edit.pathTitlePlaceholder"), text: $title)
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                    }
                    .frame(maxWidth: .infinity)
                }

                formulasEditor

                if let path {
                    existingActions(path)
                }

                TikoActionButton(
                    label: i18n.t(isNew ? "common.add" : "common.save"),
                    appColor: .sum,
                    disabled: title.trimmingCharacters(in: .whitespaces).isEmpty || validFormulas.isEmpty
                ) {
                    save()
                    onClose()
                }
            }
        }
        .confirmationDialog(i18n.t("sum.edit.deleteConfirm"), isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button(i18n.t("sum.edit.delete"), role: .destructive) {
                if let path {
                    store.deleteCustomPath(id: path.id, language: languageCode)
                }
                onClose()
            }
            Button(i18n.t("common.cancel"), role: .cancel) {}
        }
        .onAppear(perform: populate)
    }

    private var formulasEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            TikoFieldLabel(i18n.t("sum.edit.formulas"))
            ForEach($formulas) { $formula in
                HStack(spacing: 8) {
                    numberField($formula.aText)
                    Picker("", selection: $formula.op) {
                        ForEach(SumOperator.allCases, id: \.self) { op in
                            Text(op.symbol).tag(op)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(TikoAppColor.sum.palette.primary)
                    numberField($formula.bText)
                    Image(systemName: formula.formula != nil ? "checkmark.circle.fill" : "circle.dotted")
                        .foregroundStyle(formula.formula != nil ? TikoAppColor.sum.palette.primary : Color.secondary)
                        .accessibilityHidden(true)
                    Button {
                        formulas.removeAll { $0.id == formula.id }
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(i18n.t("sum.edit.delete"))
                }
                .padding(10)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            Button {
                formulas.append(EditableFormula(aText: "", op: .plus, bText: ""))
            } label: {
                Label(i18n.t("sum.edit.addFormula"), systemImage: "plus")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(TikoAppColor.sum.palette.primary)
            }
            .buttonStyle(.plain)
        }
    }

    private func numberField(_ text: Binding<String>) -> some View {
        TextField("0", text: text)
            .keyboardType(.numberPad)
            .font(.system(size: 16, weight: .heavy, design: .rounded))
            .multilineTextAlignment(.center)
            .frame(width: 56)
            .padding(.vertical, 8)
            .background(TikoAppColor.sum.palette.primary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    @ViewBuilder
    private func existingActions(_ path: SumPath) -> some View {
        VStack(spacing: 8) {
            Toggle(isOn: hiddenBinding(path)) {
                Label(i18n.t("sum.edit.hide"), systemImage: "eye.slash")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
            }
            .tint(TikoAppColor.sum.palette.primary)
            .padding(.vertical, 4)

            if !path.isCustom, store.isEdited(pathID: path.id, language: languageCode) {
                Button {
                    store.resetToDefault(pathID: path.id, language: languageCode)
                    onClose()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.uturn.backward")
                            .font(.system(size: 15, weight: .bold))
                        Text(i18n.t("sum.edit.reset"))
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                        Spacer()
                    }
                    .foregroundStyle(TikoAppColor.sum.palette.primary)
                    .padding(12)
                    .background(TikoAppColor.sum.palette.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            if path.isCustom {
                Button(role: .destructive) {
                    confirmingDelete = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                            .font(.system(size: 15, weight: .bold))
                        Text(i18n.t("sum.edit.delete"))
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                        Spacer()
                    }
                    .foregroundStyle(.red)
                    .padding(12)
                    .background(Color.red.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func hiddenBinding(_ path: SumPath) -> Binding<Bool> {
        Binding(
            get: {
                store.allPaths(language: languageCode, i18n: i18n)
                    .first { $0.id == path.id }?.isHidden ?? false
            },
            set: { store.setHidden($0, pathID: path.id, language: languageCode) }
        )
    }

    private func populate() {
        guard let path else {
            formulas = [EditableFormula(aText: "", op: .plus, bText: "")]
            return
        }
        title = path.title
        emoji = path.emoji
        formulas = path.formulas.map {
            EditableFormula(aText: String($0.a), op: $0.op, bText: String($0.b))
        }
    }

    private func save() {
        if let path {
            store.updatePath(
                id: path.id,
                language: languageCode,
                i18n: i18n,
                title: title,
                emoji: emoji,
                formulas: validFormulas
            )
        } else {
            store.addCustomPath(
                language: languageCode,
                title: title,
                emoji: emoji,
                formulas: validFormulas,
                i18n: i18n
            )
        }
    }
}
