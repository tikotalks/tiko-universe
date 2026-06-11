import SwiftUI
import WebKit
import TikoKit

// Attaches the WKWebView directly to the UIWindow at an off-screen position.
// WKWebView renders through a separate GPU compositor layer that bypasses
// UIKit's clipsToBounds — the only reliable fix is to keep it out of the
// SwiftUI layout tree entirely.
struct WebViewWindowAttacher: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.isHidden = true
        v.backgroundColor = .clear
        return v
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        guard webView.superview == nil, let window = uiView.window else { return }
        webView.frame = CGRect(x: -1000, y: -1000, width: 1, height: 1)
        window.addSubview(webView)
        window.sendSubviewToBack(webView)
    }
}

struct AddTrackPopup: View {
    let categories: [RadioCategory]
    let initialCategoryID: String?
    let onAddTrack: (RadioTrack) -> Void
    let onAddCategory: (String) -> RadioCategory
    let onDismiss: () -> Void

    @EnvironmentObject private var i18n: TikoI18n

    @State private var urlOrVideoId = ""
    @State private var title = ""
    @State private var artist = ""
    @State private var selectedCategoryID: String
    @State private var newCollectionName = ""
    @State private var showNewCollection = false
    @State private var isFetchingMeta = false
    @State private var lastFetchedVideoId = ""

    init(
        categories: [RadioCategory],
        initialCategoryID: String?,
        onAddTrack: @escaping (RadioTrack) -> Void,
        onAddCategory: @escaping (String) -> RadioCategory,
        onDismiss: @escaping () -> Void
    ) {
        self.categories = categories
        self.initialCategoryID = initialCategoryID
        self.onAddTrack = onAddTrack
        self.onAddCategory = onAddCategory
        self.onDismiss = onDismiss
        _selectedCategoryID = State(initialValue: initialCategoryID ?? categories.first?.id ?? defaultUncategorizedCategoryID)
    }

    var body: some View {
        TikoPopupCard(title: i18n.t("radio.library.addSong"), icon: "music.note.list", appColor: .radio, onClose: onDismiss) {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    TextField(i18n.t("radio.library.addFromYouTube"), text: $urlOrVideoId)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    if isFetchingMeta {
                        HStack { ProgressView(); Text(i18n.t("radio.library.fetchingInfo")).font(.caption).foregroundStyle(.secondary) }
                    } else {
                        TextField(i18n.t("radio.library.songTitle"), text: $title)
                            .textFieldStyle(.roundedBorder)
                        TextField(i18n.t("radio.library.artist"), text: $artist)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                Text(i18n.t("radio.library.collection"))
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(sortedCategories) { category in
                            Button(action: { selectedCategoryID = category.id }) {
                                TikoSquareTile(
                                    title: category.title,
                                    background: TikoColors.color(named: category.color) ?? TikoColors.color(named: "gray")!,
                                    isActive: selectedCategoryID == category.id
                                ) {
                                    Image(systemName: category.symbol)
                                        .font(.system(size: 30, weight: .heavy))
                                        .foregroundStyle(.white)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                }
                                .frame(width: 100, height: 100)
                            }
                            .buttonStyle(.plain)
                        }

                        Button(action: { showNewCollection = true }) {
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(Color.primary.opacity(0.07))
                                .overlay {
                                    Image(systemName: "plus")
                                        .font(.system(size: 26, weight: .heavy))
                                        .foregroundStyle(Color.primary.opacity(0.35))
                                }
                                .frame(width: 100, height: 100)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 2)
                }
                .padding(.horizontal, -20)
                .padding(.leading, 20)

                if showNewCollection {
                    HStack(spacing: 8) {
                        TextField(i18n.t("radio.library.newCollectionName"), text: $newCollectionName)
                            .textFieldStyle(.roundedBorder)
                        Button(action: addCollection) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(Color(hex: 0xe84057))
                        }
                        .disabled(newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }

                Button(action: addTrack) {
                    Text(i18n.t("radio.library.addSong"))
                        .font(.system(.body, design: .rounded).weight(.bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canAdd ? Color(hex: 0xe84057) : Color.primary.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(!canAdd)
            }
        }
        .onChange(of: urlOrVideoId) { _, newValue in
            fetchMeta(for: newValue)
        }
    }

    private var sortedCategories: [RadioCategory] {
        var sorted = categories
        if let idx = sorted.firstIndex(where: { $0.id == selectedCategoryID }), idx != 0 {
            let item = sorted.remove(at: idx)
            sorted.insert(item, at: 0)
        }
        return sorted
    }

    private var canAdd: Bool {
        !YouTubeVideoIDParser.parse(urlOrVideoId).isEmpty &&
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !isFetchingMeta
    }

    private func fetchMeta(for input: String) {
        let videoId = YouTubeVideoIDParser.parse(input)
        guard !videoId.isEmpty, videoId != lastFetchedVideoId else { return }
        lastFetchedVideoId = videoId
        isFetchingMeta = true
        title = ""
        artist = ""
        Task {
            let urlStr = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=\(videoId)&format=json"
            guard let url = URL(string: urlStr),
                  let (data, _) = try? await URLSession.shared.data(from: url),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                await MainActor.run { isFetchingMeta = false }
                return
            }
            await MainActor.run {
                if let fetched = json["title"] as? String { title = fetched }
                if let fetched = json["author_name"] as? String { artist = fetched }
                isFetchingMeta = false
            }
        }
    }

    private func addCollection() {
        let cleaned = newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        let category = onAddCategory(cleaned)
        selectedCategoryID = category.id
        newCollectionName = ""
        showNewCollection = false
    }

    private func addTrack() {
        let videoId = YouTubeVideoIDParser.parse(urlOrVideoId)
        let cleanedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !videoId.isEmpty, !cleanedTitle.isEmpty else { return }
        let cleanedArtist = artist.trimmingCharacters(in: .whitespacesAndNewlines)
        onAddTrack(RadioTrack(
            title: cleanedTitle,
            artist: cleanedArtist.isEmpty ? nil : cleanedArtist,
            source: .youtube,
            youtubeVideoId: videoId,
            thumbnailUrl: "https://img.youtube.com/vi/\(videoId)/hqdefault.jpg",
            categoryId: selectedCategoryID
        ))
        onDismiss()
    }
}

struct RenameSheet: View {
    let title: String
    let label: String
    let value: String
    let onSave: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var draft: String

    init(title: String, label: String, value: String, onSave: @escaping (String) -> Void) {
        self.title = title
        self.label = label
        self.value = value
        self.onSave = onSave
        _draft = State(initialValue: value)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(label, text: $draft)
                }
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(draft)
                        dismiss()
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
