import SwiftUI
import TikoKit

/// Adding a song: search YouTube, paste a link, or take one from a linked
/// subscription. The button always names the collection the song lands in.
struct RadioAddSongPopup: View {
    let categories: [RadioCategory]
    let initialCategoryID: String?
    let linkedProviders: [RadioServiceProvider]
    let onAdd: (RadioTrack) -> Void
    let onOpenServices: () -> Void
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    private enum Step: Equatable {
        case source
        case youtube
        case service(RadioServiceProvider)
    }

    @State private var step: Step = .source
    @State private var query = ""
    @State private var results: [RadioYouTubeResult] = []
    @State private var picked: RadioYouTubeResult?
    @State private var serviceLink = ""
    @State private var resolved: RadioResolvedLink?
    @State private var searchFailed = false
    @State private var searchUnavailable = false
    @State private var linkFailed = false
    @State private var isSearching = false
    @State private var selectedCategoryID: String
    @State private var searchTask: Task<Void, Never>?

    init(
        categories: [RadioCategory],
        initialCategoryID: String?,
        linkedProviders: [RadioServiceProvider],
        onAdd: @escaping (RadioTrack) -> Void,
        onOpenServices: @escaping () -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.categories = categories
        self.initialCategoryID = initialCategoryID
        self.linkedProviders = linkedProviders
        self.onAdd = onAdd
        self.onOpenServices = onOpenServices
        self.onDismiss = onDismiss
        _selectedCategoryID = State(initialValue: initialCategoryID ?? categories.first?.id ?? defaultUncategorizedCategoryID)
    }

    private var selectedCategory: RadioCategory? {
        categories.first { $0.id == selectedCategoryID }
    }

    /// Never "add to this collection" on a screen that is not one: the button
    /// names the collection by name.
    private var submitLabel: String {
        guard let selectedCategory else { return i18n.t("radio.add.song") }
        return i18n.t("radio.add.toCollection", ["collection": selectedCategory.title])
    }

    private var title: String {
        switch step {
        case .source: return i18n.t("radio.add.song")
        case .youtube: return "YouTube"
        case .service(let provider): return i18n.t("radio.services.addFrom", ["service": provider.name])
        }
    }

    var body: some View {
        TikoPopupCard(
            title: title,
            icon: step == .source ? "music.note.list" : "magnifyingglass",
            appColor: .radio,
            onClose: onDismiss
        ) {
            VStack(alignment: .leading, spacing: 14) {
                switch step {
                case .source: sourceStep
                case .youtube: youtubeStep
                case .service(let provider): serviceStep(provider)
                }
            }
        }
        .onDisappear { searchTask?.cancel() }
    }

    // ── Where the song comes from ───────────────────────────────

    private var sourceStep: some View {
        VStack(spacing: 10) {
            sourceRow(
                title: "YouTube",
                subtitle: i18n.t("radio.add.searchYouTube"),
                symbol: "play.rectangle.fill",
                tint: Color(hex: 0xFF0000)
            ) { step = .youtube }

            ForEach(linkedProviders) { provider in
                sourceRow(
                    title: provider.name,
                    subtitle: provider.linkExample,
                    symbol: provider.symbol,
                    tint: provider == .spotify ? Color(hex: 0x1DB954) : Color(hex: 0xFA243C)
                ) { step = .service(provider) }
            }

            sourceRow(
                title: i18n.t("radio.services.title"),
                subtitle: i18n.t("radio.services.subtitle"),
                symbol: "link",
                tint: .secondary
            ) { onOpenServices() }
        }
    }

    private func sourceRow(
        title: String,
        subtitle: String,
        symbol: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(tint)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .background(Color.primary.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("AddSource-\(title)")
    }

    // ── YouTube ─────────────────────────────────────────────────

    private var youtubeStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.secondary)
                TextField(i18n.t("radio.add.searchPlaceholder"), text: $query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .accessibilityIdentifier("YouTubeSearchField")
                if isSearching { ProgressView() }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.primary.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            if !results.isEmpty {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(results) { result in
                            resultRow(result)
                        }
                    }
                }
                .frame(maxHeight: 260)
            } else if searchUnavailable {
                note(i18n.t("radio.add.searchUnavailable"))
            } else if searchFailed {
                note(i18n.t("radio.add.searchEmpty"))
            }

            collectionPicker

            submitButton(enabled: picked != nil) {
                guard let picked else { return }
                onAdd(picked.track(categoryID: selectedCategoryID))
                onDismiss()
            }

            Text(i18n.t("radio.add.audioOnly"))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
        }
        .onChange(of: query) { _, value in scheduleSearch(value) }
    }

    private func resultRow(_ result: RadioYouTubeResult) -> some View {
        Button(action: { picked = picked?.videoId == result.videoId ? nil : result }) {
            HStack(spacing: 12) {
                artwork(url: result.artworkURL)
                    .frame(width: 86, height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(result.title)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                    Text([result.channelTitle, result.durationLabel].compactMap { $0 }.joined(separator: " · "))
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)
            }
            .padding(8)
            .background(picked?.videoId == result.videoId ? TikoAppColor.radio.palette.primary.opacity(0.16) : Color.clear)
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(picked?.videoId == result.videoId ? TikoAppColor.radio.palette.primary : .clear, lineWidth: 2)
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(result.title)
    }

    private func scheduleSearch(_ value: String) {
        searchTask?.cancel()
        picked = nil
        let cleaned = value.trimmingCharacters(in: .whitespacesAndNewlines)

        // A pasted link is a search that already knows its answer.
        let videoId = YouTubeVideoIDParser.parse(cleaned)
        if cleaned.contains("://"), !videoId.isEmpty, videoId != cleaned {
            results = []
            searchFailed = false
            searchUnavailable = false
            picked = RadioYouTubeResult(videoId: videoId, title: cleaned, channelTitle: nil, thumbnailUrl: nil, durationSeconds: nil)
            return
        }

        guard cleaned.count >= 2 else {
            results = []
            searchFailed = false
            isSearching = false
            return
        }

        isSearching = true
        searchTask = Task {
            // Search as the parent types, without a request per keystroke.
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled else { return }
            do {
                let found = try await RadioAPI.shared.searchYouTube(query: cleaned)
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    results = found
                    searchFailed = found.isEmpty
                    searchUnavailable = false
                    isSearching = false
                }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    results = []
                    searchUnavailable = (error as? RadioAPIError) == .notConfigured
                    searchFailed = !searchUnavailable
                    isSearching = false
                }
            }
        }
    }

    // ── Spotify / Apple Music ───────────────────────────────────

    private func serviceStep(_ provider: RadioServiceProvider) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(i18n.t("radio.add.pasteServiceLink"))
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.secondary)

            TextField(provider.linkExample, text: $serviceLink)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .accessibilityIdentifier("ServiceLinkField")

            if let resolved {
                HStack(spacing: 12) {
                    artwork(url: resolved.thumbnailUrl.flatMap(URL.init(string:)))
                        .frame(width: 54, height: 54)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    VStack(alignment: .leading, spacing: 3) {
                        Text(resolved.title)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                        if let artist = resolved.artist {
                            Text(artist)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 0)
                }
            } else if linkFailed {
                note(i18n.t("radio.add.linkNotRecognised"))
            }

            Text(i18n.t(provider.hintKey))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)

            collectionPicker

            submitButton(enabled: resolved != nil) {
                guard let resolved else { return }
                onAdd(resolved.track(categoryID: selectedCategoryID))
                onDismiss()
            }
        }
        .onChange(of: serviceLink) { _, value in resolveLink(value) }
    }

    private func resolveLink(_ value: String) {
        searchTask?.cancel()
        resolved = nil
        linkFailed = false
        let cleaned = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleaned.contains("://") else { return }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            do {
                let link = try await RadioAPI.shared.resolveMusicLink(cleaned)
                guard !Task.isCancelled else { return }
                await MainActor.run { resolved = link }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run { linkFailed = true }
            }
        }
    }

    // ── Shared pieces ───────────────────────────────────────────

    private var collectionPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(i18n.t("radio.collections.title"))
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(categories) { category in
                        Button(action: { selectedCategoryID = category.id }) {
                            TikoSquareTile(
                                title: category.title,
                                background: TikoColors.color(named: category.color) ?? TikoColors.color(named: "gray")!,
                                isActive: selectedCategoryID == category.id
                            ) {
                                RadioCollectionArtwork(category: category, symbolSize: 26)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                            }
                            .frame(width: 92, height: 92)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("PickCollection-\(category.title)")
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func submitButton(enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(submitLabel)
                .font(.system(.body, design: .rounded).weight(.bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(enabled ? TikoAppColor.radio.palette.primary : Color.primary.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .disabled(!enabled)
        .accessibilityIdentifier("AddSongSubmit")
    }

    private func note(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func artwork(url: URL?) -> some View {
        if let url {
            TikoCachedRemoteImage(url: url, contentMode: .fill) {
                Color.primary.opacity(0.08)
            }
        } else {
            ZStack {
                Color.primary.opacity(0.08)
                Image(systemName: "music.note")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
