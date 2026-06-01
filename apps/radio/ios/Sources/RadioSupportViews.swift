import SwiftUI
import WebKit

struct HiddenWebView: UIViewRepresentable {
    let controller: YouTubePlaybackBridge

    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct AddTrackSheet: View {
    let categories: [RadioCategory]
    let initialCategoryID: String?
    let onAddTrack: (RadioTrack) -> Void
    let onAddCategory: (String) -> RadioCategory

    @Environment(\.dismiss) private var dismiss
    @State private var urlOrVideoId = ""
    @State private var title = ""
    @State private var artist = "YouTube"
    @State private var selectedCategoryID: String
    @State private var newCollectionName = ""

    init(
        categories: [RadioCategory],
        initialCategoryID: String?,
        onAddTrack: @escaping (RadioTrack) -> Void,
        onAddCategory: @escaping (String) -> RadioCategory
    ) {
        self.categories = categories
        self.initialCategoryID = initialCategoryID
        self.onAddTrack = onAddTrack
        self.onAddCategory = onAddCategory
        _selectedCategoryID = State(initialValue: initialCategoryID ?? categories.first?.id ?? defaultUncategorizedCategoryID)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("YouTube") {
                    TextField("YouTube URL or video ID", text: $urlOrVideoId)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("Song title", text: $title)
                    TextField("Artist", text: $artist)
                }

                Section("Collection") {
                    Picker("Collection", selection: $selectedCategoryID) {
                        ForEach(categories) { category in
                            Text(category.title).tag(category.id)
                        }
                    }

                    HStack {
                        TextField("New collection", text: $newCollectionName)
                        Button("Add") {
                            let cleaned = newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !cleaned.isEmpty else { return }
                            let category = onAddCategory(cleaned)
                            selectedCategoryID = category.id
                            newCollectionName = ""
                        }
                    }
                }
            }
            .navigationTitle("Add song")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { addTrack() }
                        .disabled(!canAdd)
                }
            }
            .onChange(of: urlOrVideoId) { _, newValue in
                if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    title = YouTubeVideoIDParser.parse(newValue)
                }
            }
        }
    }

    private var canAdd: Bool {
        !YouTubeVideoIDParser.parse(urlOrVideoId).isEmpty && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func addTrack() {
        let videoId = YouTubeVideoIDParser.parse(urlOrVideoId)
        let cleanedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !videoId.isEmpty, !cleanedTitle.isEmpty else { return }

        let cleanedArtist = artist.trimmingCharacters(in: .whitespacesAndNewlines)
        onAddTrack(
            RadioTrack(
                title: cleanedTitle,
                artist: cleanedArtist.isEmpty ? nil : cleanedArtist,
                source: .youtube,
                youtubeVideoId: videoId,
                thumbnailUrl: "https://img.youtube.com/vi/\(videoId)/hqdefault.jpg",
                categoryId: selectedCategoryID
            )
        )
        dismiss()
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
