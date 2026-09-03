import SwiftUI
import TikoKit

/// Tiko Media artwork for a collection, falling back to its symbol while the
/// picture loads or when a family-made collection has none.
struct RadioCollectionArtwork: View {
    let category: RadioCategory
    var symbolSize: CGFloat = 52

    var body: some View {
        if let url = category.imageURL {
            TikoCachedRemoteImage(url: TikoImageURL.resized(url, size: .medium), contentMode: .fit) {
                symbol
            }
            .padding(14)
        } else {
            symbol
        }
    }

    private var symbol: some View {
        Image(systemName: category.symbol)
            .font(.system(size: symbolSize, weight: .heavy))
            .foregroundStyle(.white)
    }
}

// ────────────────────────────────────────────────────────────────
// Share: hand a collection to another family.
// ────────────────────────────────────────────────────────────────

struct RadioSharePopup: View {
    let category: RadioCategory
    let tracks: [RadioTrack]
    let sessionToken: String
    let existingCode: String?
    let onPublished: (String) -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    @State private var published: RadioSharedCollection?
    @State private var skipped = 0
    @State private var failure: String?
    @State private var isPublishing = true

    var body: some View {
        TikoPopupCard(
            title: i18n.t("radio.share.title"),
            subtitle: published == nil ? nil : i18n.t("radio.share.subtitle"),
            icon: "qrcode",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(spacing: 16) {
                if isPublishing {
                    ProgressView()
                        .padding(.vertical, 30)
                    Text(i18n.t("radio.share.publishing"))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                } else if let published {
                    qrCard(for: published)

                    VStack(spacing: 3) {
                        Text(i18n.t("radio.share.codeLabel").uppercased())
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundStyle(.secondary)
                            .kerning(1.2)
                        Text(RadioShareCode.formatted(published.code))
                            .font(.system(size: 30, weight: .black, design: .rounded))
                            .kerning(2)
                            .accessibilityIdentifier("ShareCode")
                    }

                    ShareLink(item: URL(string: published.shareUrl) ?? URL(string: "https://tiko.mt")!) {
                        Text(i18n.t("radio.share.copyLink"))
                            .font(.system(.body, design: .rounded).weight(.bold))
                            .foregroundStyle(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Color.primary.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }

                    if skipped > 0 {
                        Text(i18n.t("radio.share.skipped", ["count": skipped]))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                } else {
                    Text(failure ?? i18n.t("radio.share.failed"))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 20)
                        .accessibilityIdentifier("ShareFailed")
                }
            }
        }
        .task { await publish() }
    }

    /// White plate behind the code so it scans in dark mode too.
    @ViewBuilder
    private func qrCard(for collection: RadioSharedCollection) -> some View {
        if let image = RadioQRCode.image(for: collection.shareUrl, size: 440) {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .frame(width: 210, height: 210)
                .padding(14)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
    }

    @MainActor
    private func publish() async {
        let payload = RadioShareConversion.sharedSongs(from: tracks)
        guard !payload.songs.isEmpty else {
            isPublishing = false
            failure = i18n.t("radio.share.nothingToShare")
            return
        }

        do {
            let result = try await RadioAPI.shared.publish(
                name: category.title,
                color: category.color,
                imageUrl: category.imageURL?.absoluteString,
                songs: payload.songs,
                existingCode: existingCode,
                sessionToken: sessionToken
            )
            published = result.collection
            skipped = result.skippedSongs + payload.skipped
            isPublishing = false
            onPublished(result.collection.code)
        } catch {
            failure = (error as? RadioAPIError)?.errorDescription
            isPublishing = false
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Import: scan a code, type one, or take a ready-made set.
// ────────────────────────────────────────────────────────────────

struct RadioImportPopup: View {
    let preloaded: RadioSharedCollection?
    let onImport: (RadioSharedCollection) -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    @State private var found: RadioSharedCollection?
    @State private var featured: [RadioSharedCollection] = []
    @State private var code = ""
    @State private var isScanning = false
    @State private var cameraBlocked = false
    @State private var notFound = false
    @State private var isLooking = false

    init(
        preloaded: RadioSharedCollection? = nil,
        onImport: @escaping (RadioSharedCollection) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.preloaded = preloaded
        self.onImport = onImport
        self.onDismiss = onDismiss
        _found = State(initialValue: preloaded)
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("radio.import.title"),
            subtitle: found == nil ? i18n.t("radio.import.subtitle") : nil,
            icon: "qrcode.viewfinder",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(alignment: .leading, spacing: 14) {
                if let found {
                    foundCard(found)
                } else {
                    scanner
                    codeEntry
                    featuredList
                }
            }
        }
        .task {
            guard preloaded == nil else { return }
            featured = (try? await RadioAPI.shared.featuredCollections()) ?? []
        }
    }

    private func foundCard(_ collection: RadioSharedCollection) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 14) {
                collectionArtwork(collection)
                    .frame(width: 66, height: 66)
                    .background(TikoColors.color(named: collection.color) ?? TikoColors.color(named: "gray")!)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(collection.name)
                        .font(.system(size: 19, weight: .heavy, design: .rounded))
                    Text(i18n.t("radio.collections.songs", ["count": collection.songCount]))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("ImportPreview")

            Button(action: {
                onImport(collection)
                onDismiss()
            }) {
                Text(i18n.t("radio.import.addCollection"))
                    .font(.system(.body, design: .rounded).weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(TikoAppColor.radio.palette.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .accessibilityIdentifier("ImportConfirm")
        }
    }

    @ViewBuilder
    private var scanner: some View {
        if isScanning {
            RadioScannerView(
                onCode: { value in
                    isScanning = false
                    guard let scanned = RadioShareCode.fromScan(value) else {
                        notFound = true
                        return
                    }
                    Task { await lookUp(scanned) }
                },
                onFailure: {
                    isScanning = false
                    cameraBlocked = true
                }
            )
            .frame(height: 210)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            Text(i18n.t("radio.import.scanHint"))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
        } else {
            Button(action: startScanning) {
                HStack(spacing: 10) {
                    Image(systemName: "qrcode.viewfinder")
                        .font(.system(size: 17, weight: .bold))
                    Text(i18n.t("radio.import.scan"))
                        .font(.system(.body, design: .rounded).weight(.bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(TikoAppColor.radio.palette.primary)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .accessibilityIdentifier("ScanCode")

            if cameraBlocked {
                Text(i18n.t("radio.import.cameraBlocked"))
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var codeEntry: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(i18n.t("radio.import.codeLabel"))
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                TextField(i18n.t("radio.import.codePlaceholder"), text: $code)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .accessibilityIdentifier("ShareCodeField")

                Button(action: { Task { await lookUp(code) } }) {
                    if isLooking {
                        ProgressView()
                    } else {
                        Text(i18n.t("radio.import.find"))
                            .font(.system(.body, design: .rounded).weight(.bold))
                    }
                }
                .disabled(RadioShareCode.normalize(code) == nil || isLooking)
                .accessibilityIdentifier("FindCode")
            }

            if notFound {
                Text(i18n.t("radio.import.notFound"))
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .accessibilityIdentifier("CodeNotFound")
            }
        }
    }

    @ViewBuilder
    private var featuredList: some View {
        if !featured.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(i18n.t("radio.import.featured").uppercased())
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)
                    .kerning(1)

                ForEach(featured) { collection in
                    Button(action: { found = collection }) {
                        HStack(spacing: 12) {
                            collectionArtwork(collection)
                                .frame(width: 44, height: 44)
                                .background(TikoColors.color(named: collection.color) ?? TikoColors.color(named: "gray")!)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(collection.name)
                                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                                    .foregroundStyle(.primary)
                                Text(i18n.t("radio.collections.songs", ["count": collection.songCount]))
                                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(8)
                        .background(Color.primary.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("Featured-\(collection.name)")
                }
            }
        }
    }

    @ViewBuilder
    private func collectionArtwork(_ collection: RadioSharedCollection) -> some View {
        if let url = collection.imageURL {
            TikoCachedRemoteImage(url: TikoImageURL.resized(url, size: .small), contentMode: .fit) {
                Image(systemName: "music.note")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(.white)
            }
            .padding(8)
        } else {
            Image(systemName: "music.note")
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(.white)
        }
    }

    private func startScanning() {
        notFound = false
        Task {
            let granted = await RadioCameraAccess.request()
            await MainActor.run {
                cameraBlocked = !granted
                isScanning = granted
            }
        }
    }

    @MainActor
    private func lookUp(_ rawCode: String) async {
        guard RadioShareCode.normalize(rawCode) != nil else {
            notFound = true
            return
        }
        isLooking = true
        notFound = false
        defer { isLooking = false }
        do {
            found = try await RadioAPI.shared.sharedCollection(code: rawCode)
        } catch {
            notFound = true
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Music services.
// ────────────────────────────────────────────────────────────────

struct RadioServicesPopup: View {
    let subscriptions: [RadioSubscription]
    let onLink: (RadioServiceProvider) -> Void
    let onUnlink: (RadioServiceProvider) -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    private func isLinked(_ provider: RadioServiceProvider) -> Bool {
        subscriptions.contains { $0.provider == provider }
    }

    private func serviceRow(_ provider: RadioServiceProvider) -> some View {
        let linked = isLinked(provider)
        return HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(provider.name)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                Text(i18n.t(provider.hintKey))
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)

            Button(action: { linked ? onUnlink(provider) : onLink(provider) }) {
                Text(linked ? i18n.t("radio.services.unlink") : i18n.t("radio.services.link"))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(linked ? Color.primary : .white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(linked ? Color.primary.opacity(0.08) : TikoAppColor.radio.palette.primary)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("\(linked ? "Unlink" : "Link")-\(provider.name)")
        }
        .padding(12)
        .background(Color.primary.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("radio.services.title"),
            subtitle: i18n.t("radio.services.subtitle"),
            icon: "link",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(spacing: 10) {
                ForEach(RadioServiceProvider.allCases) { provider in
                    serviceRow(provider)
                }
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// New / edit collection.
// ────────────────────────────────────────────────────────────────

struct RadioCollectionFormPopup: View {
    let existing: RadioCategory?
    let onSave: (String, String, URL?) -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    @State private var title: String
    @State private var color: String
    @State private var imageURL: URL?
    @State private var showPicker = false

    private static let palette = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "cyan", "teal", "lime"]

    init(existing: RadioCategory?, onSave: @escaping (String, String, URL?) -> Void, onDismiss: @escaping () -> Void) {
        self.existing = existing
        self.onSave = onSave
        self.onDismiss = onDismiss
        _title = State(initialValue: existing?.title ?? "")
        _color = State(initialValue: existing?.color ?? "purple")
        _imageURL = State(initialValue: existing?.imageURL)
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        TikoPopupCard(
            title: existing == nil ? i18n.t("radio.add.collection") : i18n.t("radio.management.editCollection"),
            icon: "folder.fill",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(alignment: .leading, spacing: 14) {
                TextField(i18n.t("radio.collections.name"), text: $title)
                    .textFieldStyle(.roundedBorder)
                    .accessibilityIdentifier("CollectionName")

                Text(i18n.t("radio.collections.color"))
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    ForEach(Self.palette, id: \.self) { name in
                        Button(action: { color = name }) {
                            Circle()
                                .fill(TikoColors.color(named: name) ?? .gray)
                                .frame(width: 28, height: 28)
                                .overlay {
                                    Circle().stroke(Color.primary, lineWidth: color == name ? 3 : 0)
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("Color-\(name)")
                    }
                }

                Text(i18n.t("radio.collections.artwork"))
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(.secondary)

                Button(action: { showPicker = true }) {
                    HStack(spacing: 14) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(TikoColors.color(named: color) ?? .gray)
                            if let imageURL {
                                TikoCachedRemoteImage(url: TikoImageURL.resized(imageURL, size: .small), contentMode: .fit) {
                                    Image(systemName: "music.note").foregroundStyle(.white)
                                }
                                .padding(12)
                            } else {
                                Image(systemName: "music.note")
                                    .font(.system(size: 26, weight: .heavy))
                                    .foregroundStyle(.white)
                            }
                        }
                        .frame(width: 76, height: 76)

                        Text(i18n.t("radio.collections.artworkSearch"))
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer(minLength: 0)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("PickArtwork")

                Button(action: {
                    onSave(title.trimmingCharacters(in: .whitespacesAndNewlines), color, imageURL)
                    onDismiss()
                }) {
                    Text(existing == nil ? i18n.t("common.add") : i18n.t("common.save"))
                        .font(.system(.body, design: .rounded).weight(.bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canSave ? TikoAppColor.radio.palette.primary : Color.primary.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(!canSave)
                .accessibilityIdentifier("SaveCollection")
            }
        }
        .sheet(isPresented: $showPicker) {
            TikoMediaPickerSheet(
                appColor: .radio,
                title: i18n.t("radio.collections.artworkSearch"),
                onSelect: { url in
                    imageURL = url
                    showPicker = false
                },
                onClose: { showPicker = false }
            )
            .presentationDetents([.large])
        }
    }
}
