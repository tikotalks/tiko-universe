import SwiftUI
import TikoKit

/// Parent Mode card management, built on the shared Tiko popup sheets used by
/// every app. Per category: edit what is shown (title), said (speak text) and
/// heard (listen-for); hide/show, reset defaults, reorder, add and delete
/// custom cards. Child Mode never reaches these — they are presented only
/// from parent-gated surfaces.
struct SayCardManagerSheet: View {
    @ObservedObject var store: SayCardStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    @Binding var selectedCategory: SayCategory?
    let onEditCard: (SayCard, SayCategory) -> Void
    let onAddCard: (SayCategory) -> Void
    let onClose: () -> Void

    var body: some View {
        TikoPopupCard(
            title: selectedCategory.map { i18n.t($0.titleKey) } ?? i18n.t("say.edit.cardsTitle"),
            icon: "pencil",
            appColor: .say,
            onClose: onClose
        ) {
            if let category = selectedCategory {
                cardList(category)
            } else {
                categoryList
            }
        }
    }

    // MARK: - Categories

    private var categoryList: some View {
        VStack(spacing: 10) {
            ForEach(SayCatalog.categories.sorted { $0.sortOrder < $1.sortOrder }) { category in
                Button {
                    selectedCategory = category
                } label: {
                    HStack(spacing: 12) {
                        Text(category.emoji)
                            .font(.system(size: 30))
                            .accessibilityHidden(true)
                        Text(i18n.t(category.titleKey))
                            .font(.system(size: 17, weight: .heavy, design: .rounded))
                            .foregroundStyle(.primary)
                        Spacer()
                        Text("\(store.visibleCards(categoryID: category.id, language: languageCode).count)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t(category.titleKey))
            }
        }
    }

    // MARK: - Cards in a category

    private func cardList(_ category: SayCategory) -> some View {
        VStack(spacing: 10) {
            Button {
                selectedCategory = nil
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .heavy))
                    Text(i18n.t("say.edit.cardsTitle"))
                        .font(.system(size: 15, weight: .heavy, design: .rounded))
                    Spacer()
                }
                .foregroundStyle(TikoAppColor.say.palette.primary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(i18n.t("say.practice.back"))

            ScrollView {
                VStack(spacing: 8) {
                    let cards = store.allCards(categoryID: category.id, language: languageCode)
                    ForEach(Array(cards.enumerated()), id: \.element.id) { index, card in
                        cardRow(card, index: index, total: cards.count, category: category)
                    }
                }
            }
            .frame(maxHeight: 380)

            TikoActionButton(label: i18n.t("say.edit.addCard"), appColor: .say) {
                onAddCard(category)
            }
        }
    }

    private func cardRow(_ card: SayCard, index: Int, total: Int, category: SayCategory) -> some View {
        HStack(spacing: 10) {
            Button {
                onEditCard(card, category)
            } label: {
                HStack(spacing: 12) {
                    cardThumbnail(card)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(card.title)
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundStyle(card.isHidden ? .secondary : .primary)
                        Text(card.listenFor.joined(separator: ", "))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    if card.isCustom {
                        tag(i18n.t("say.edit.customTag"))
                    }
                    if card.isHidden {
                        Image(systemName: "eye.slash")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                            .accessibilityLabel(i18n.t("say.edit.hiddenTag"))
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(card.title)
            .accessibilityHint(i18n.t("say.edit.editCard"))

            VStack(spacing: 2) {
                reorderButton(systemImage: "chevron.up", disabled: index == 0) {
                    store.moveCard(categoryID: category.id, language: languageCode,
                                   fromOffsets: IndexSet(integer: index), toOffset: index - 1)
                }
                reorderButton(systemImage: "chevron.down", disabled: index >= total - 1) {
                    store.moveCard(categoryID: category.id, language: languageCode,
                                   fromOffsets: IndexSet(integer: index), toOffset: index + 2)
                }
            }
        }
        .padding(10)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .opacity(card.isHidden ? 0.62 : 1)
    }

    @ViewBuilder
    private func cardThumbnail(_ card: SayCard) -> some View {
        ZStack {
            TikoAppColor.say.palette.primary.opacity(0.12)
            if let url = store.imageURL(for: card) {
                TikoCachedRemoteImage(url: url) {
                    Text(card.emoji).font(.system(size: 22))
                }
            } else {
                Text(card.emoji).font(.system(size: 24))
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityHidden(true)
    }

    private func reorderButton(systemImage: String, disabled: Bool, action: @escaping () -> Void) -> some View {
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

// MARK: - Card editor

struct SayCardEditSheet: View {
    @ObservedObject var store: SayCardStore
    @ObservedObject var i18n: TikoI18n
    let languageCode: String
    let category: SayCategory
    /// nil → creating a new custom card.
    let card: SayCard?
    let onClose: () -> Void

    @State private var title = ""
    @State private var speakText = ""
    @State private var listenFor: [String] = [""]
    @State private var emoji = ""
    @State private var imageURL: URL?
    @State private var showingImagePicker = false
    @State private var confirmingDelete = false

    private var isNew: Bool { card == nil }

    /// Warn — never block — on entries too short for fuzzy matching.
    private var hasShortListenEntries: Bool {
        listenFor.contains { entry in
            let trimmed = entry.trimmingCharacters(in: .whitespacesAndNewlines)
            return !trimmed.isEmpty && trimmed.count < 4
        }
    }

    var body: some View {
        TikoFormSheet(
            title: i18n.t(isNew ? "say.edit.newCard" : "say.edit.editCard"),
            icon: "pencil",
            appColor: .say,
            onClose: onClose
        ) {
            VStack(spacing: 14) {
                TikoFormField(label: i18n.t("say.edit.cardTitle")) {
                    TextField(i18n.t("say.edit.cardTitlePlaceholder"), text: $title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .accessibilityIdentifier("say.edit.titleField")
                }

                TikoFormField(label: i18n.t("say.edit.speakText")) {
                    TextField(speakPlaceholder, text: $speakText)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .accessibilityIdentifier("say.edit.speakField")
                }

                listenForField

                HStack(alignment: .top, spacing: 12) {
                    TikoFormField(label: i18n.t("say.edit.emoji")) {
                        TextField("⭐️", text: $emoji)
                            .font(.system(size: 26))
                            .frame(width: 52)
                            .multilineTextAlignment(.center)
                    }
                    VStack(alignment: .leading, spacing: 7) {
                        TikoFieldLabel(i18n.t("say.edit.image"))
                        TikoImagePickerButton(
                            selectedURL: imageURL ?? card.flatMap { store.cardImages[$0.id] },
                            appColor: .say,
                            addLabel: i18n.t("say.edit.addImage"),
                            changeLabel: i18n.t("say.edit.changeImage")
                        ) {
                            showingImagePicker = true
                        }
                    }
                    .frame(maxWidth: .infinity)
                }

                if let card {
                    existingCardActions(card)
                }

                TikoActionButton(
                    label: i18n.t(isNew ? "common.add" : "common.save"),
                    appColor: .say,
                    disabled: title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ) {
                    save()
                    onClose()
                }
            }
        }
        .tikoMediaPickerPopup(isPresented: $showingImagePicker, appColor: .say, title: i18n.t("say.edit.image")) { url in
            imageURL = url
        }
        .confirmationDialog(i18n.t("say.edit.deleteConfirm"), isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button(i18n.t("say.edit.delete"), role: .destructive) {
                if let card {
                    store.deleteCustomCard(id: card.id, language: languageCode)
                }
                onClose()
            }
            Button(i18n.t("common.cancel"), role: .cancel) {}
        }
        .onAppear(perform: populate)
    }

    private var listenForField: some View {
        VStack(alignment: .leading, spacing: 7) {
            TikoFieldLabel(i18n.t("say.edit.listenFor"))
            VStack(spacing: 8) {
                ForEach(listenFor.indices, id: \.self) { index in
                    HStack(spacing: 8) {
                        TextField(listenPlaceholder, text: $listenFor[index])
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                        if listenFor.count > 1 {
                            Button {
                                listenFor.remove(at: index)
                            } label: {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(i18n.t("say.edit.delete"))
                        }
                    }
                    .padding(12)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                Button {
                    listenFor.append("")
                } label: {
                    Label(i18n.t("say.edit.listenForAdd"), systemImage: "plus")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(TikoAppColor.say.palette.primary)
                }
                .buttonStyle(.plain)
            }
            if hasShortListenEntries {
                Label(i18n.t("say.edit.shortWordWarning"), systemImage: "info.circle")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func existingCardActions(_ card: SayCard) -> some View {
        VStack(spacing: 8) {
            Toggle(isOn: hiddenBinding(card)) {
                Label(i18n.t("say.edit.hide"), systemImage: "eye.slash")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
            }
            .tint(TikoAppColor.say.palette.primary)
            .padding(.vertical, 4)

            if !card.isCustom, store.isEdited(cardID: card.id, language: languageCode) {
                Button {
                    store.resetToDefault(cardID: card.id, language: languageCode)
                    onClose()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.uturn.backward")
                            .font(.system(size: 15, weight: .bold))
                        Text(i18n.t("say.edit.reset"))
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                        Spacer()
                    }
                    .foregroundStyle(TikoAppColor.say.palette.primary)
                    .padding(12)
                    .background(TikoAppColor.say.palette.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            if card.isCustom {
                Button(role: .destructive) {
                    confirmingDelete = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                            .font(.system(size: 15, weight: .bold))
                        Text(i18n.t("say.edit.delete"))
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

    private func hiddenBinding(_ card: SayCard) -> Binding<Bool> {
        Binding(
            get: { store.allCards(categoryID: category.id, language: languageCode).first { $0.id == card.id }?.isHidden ?? false },
            set: { store.setHidden($0, cardID: card.id, language: languageCode) }
        )
    }

    private var speakPlaceholder: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? i18n.t("say.edit.speakTextPlaceholder") : trimmed
    }

    private var listenPlaceholder: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? i18n.t("say.edit.listenFor") : trimmed.lowercased()
    }

    private func populate() {
        guard let card else { return }
        title = card.title
        speakText = card.speakText
        listenFor = card.listenFor.isEmpty ? [""] : card.listenFor
        emoji = card.emoji
        imageURL = card.imageURL
    }

    private func save() {
        if let card {
            store.updateCard(
                id: card.id,
                language: languageCode,
                title: title,
                speakText: speakText,
                listenFor: listenFor,
                emoji: emoji.isEmpty ? card.emoji : emoji,
                imageURL: imageURL ?? card.imageURL
            )
        } else {
            store.addCustomCard(
                categoryID: category.id,
                language: languageCode,
                title: title,
                speakText: speakText,
                listenFor: listenFor,
                emoji: emoji,
                imageURL: imageURL
            )
        }
    }
}
