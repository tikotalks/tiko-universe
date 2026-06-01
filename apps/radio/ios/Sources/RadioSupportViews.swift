import SwiftUI
import WebKit
import TikoKit

struct HiddenWebView: UIViewRepresentable {
    let controller: YouTubePlaybackBridge

    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct AddTrackPopup: View {
    let categories: [RadioCategory]
    let initialCategoryID: String?
    let onAddTrack: (RadioTrack) -> Void
    let onAddCategory: (String) -> RadioCategory
    let onDismiss: () -> Void

    @State private var urlOrVideoId = ""
    @State private var title = ""
    @State private var artist = ""
    @State private var selectedCategoryID: String
    @State private var newCollectionName = ""
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
        TikoPopupCard(title: "Add song", icon: "music.note.list", appColor: .radio, onClose: onDismiss) {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    TextField("YouTube URL or video ID", text: $urlOrVideoId)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    if isFetchingMeta {
                        HStack { ProgressView(); Text("Fetching info…").font(.caption).foregroundStyle(.secondary) }
                    } else {
                        TextField("Song title", text: $title)
                            .textFieldStyle(.roundedBorder)
                        TextField("Artist", text: $artist)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                Text("Collection")
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 78), spacing: 10)], spacing: 10) {
                    ForEach(categories) { category in
                        Button(action: { selectedCategoryID = category.id }) {
                            TikoSquareTile(
                                title: category.title,
                                background: Color(hex: category.colorHex),
                                isActive: selectedCategoryID == category.id
                            ) {
                                Image(systemName: category.symbol)
                                    .font(.system(size: 26, weight: .heavy))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                            }
                        }
                        .buttonStyle(.plain)
                    }

                    if !newCollectionName.isEmpty || categories.count < 6 {
                        HStack(spacing: 6) {
                            TextField("New…", text: $newCollectionName)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.caption, design: .rounded))
                            Button(action: addCollection) {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(Color(hex: 0xe84057))
                            }
                            .disabled(newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                }

                Button(action: addTrack) {
                    Text("Add song")
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
