import SwiftUI
import TikoKit

/// What the + button offers. A song, a collection, or someone else's collection.
struct RadioAddMenuPopup: View {
    let onAddSong: () -> Void
    let onAddCollection: () -> Void
    let onScanCode: () -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    var body: some View {
        TikoPopupCard(
            title: i18n.t("radio.add.menuTitle"),
            icon: "plus",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(spacing: 10) {
                row(title: i18n.t("radio.add.song"), symbol: "music.note", identifier: "AddSong", action: onAddSong)
                row(title: i18n.t("radio.add.collection"), symbol: "folder.fill", identifier: "AddCollection", action: onAddCollection)
                row(title: i18n.t("radio.import.title"), symbol: "qrcode.viewfinder", identifier: "ImportCollection", action: onScanCode)
            }
        }
    }

    private func row(title: String, symbol: String, identifier: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(TikoAppColor.radio.palette.primary)
                    .frame(width: 44, height: 44)
                    .background(TikoAppColor.radio.palette.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

                Text(title)
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.primary)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .background(Color.primary.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(identifier)
    }
}

/// Deleting a collection takes its songs with it, so the warning says so by
/// name and by count before anything goes.
struct RadioDeleteCollectionPopup: View {
    let category: RadioCategory
    let songCount: Int
    let onDelete: () -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    private var message: String {
        songCount > 0
            ? i18n.t("radio.management.deleteCollectionWarning", ["collection": category.title, "count": songCount])
            : i18n.t("radio.management.deleteCollectionWarningEmpty", ["collection": category.title])
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("radio.management.deleteCollection"),
            icon: "trash",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(spacing: 18) {
                Text(message)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("DeleteWarning")

                HStack(spacing: 10) {
                    Button(action: onDismiss) {
                        Text(i18n.t("common.cancel"))
                            .font(.system(.body, design: .rounded).weight(.bold))
                            .foregroundStyle(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.primary.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button(action: onDelete) {
                        Text(i18n.t("common.delete"))
                            .font(.system(.body, design: .rounded).weight(.bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("ConfirmDeleteCollection")
                }
            }
        }
    }
}
