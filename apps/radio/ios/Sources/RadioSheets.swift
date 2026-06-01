import SwiftUI
import WebKit

struct HiddenWebView: UIViewRepresentable {
    let controller: YouTubePlaybackBridge

    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        uiView.isHidden = true
    }
}

struct AddTrackSheet: View {
    let categories: [RadioCategory]
    let initialCategoryID: RadioCategory.ID?
    let onAddTrack: (RadioTrack) -> Void
    let onAddCategory: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var artist = ""
    @State private var youtubeInput = ""
    @State private var selectedCategoryID: RadioCategory.ID?
    @State private var newCollectionName = ""

    private var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedArtist: String { artist.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedYouTubeInput: String { youtubeInput.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedNewCollectionName: String { newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canAddTrack: Bool { !trimmedTitle.isEmpty && !trimmedYouTubeInput.isEmpty }
    private var canAddCollection: Bool { !trimmedNewCollectionName.isEmpty }

    init(
        categories: [RadioCategory],
        initialCategoryID: RadioCategory.ID?,
        onAddTrack: @escaping (RadioTrack) -> Void,
        onAddCategory: @escaping (String) -> Void
    ) {
        self.categories = categories
        self.initialCategoryID = initialCategoryID
        self.onAddTrack = onAddTrack
        self.onAddCategory = onAddCategory
        _selectedCategoryID = State(initialValue: initialCategoryID ?? categories.first?.id)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Song") {
                    TextField("Title", text: $title)
                    TextField("Artist", text: $artist)
                    TextField("YouTube link or video ID", text: $youtubeInput)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }

                Section("Collection") {
                    Picker("Save to", selection: $selectedCategoryID) {
                        ForEach(categories) { category in
                            Text(category.title).tag(Optional(category.id))
                        }
                    }

                    HStack {
                        TextField("New collection", text: $newCollectionName)
                        Button("Add") {
                            onAddCategory(trimmedNewCollectionName)
                            selectedCategoryID = normalizedCategoryID(from: trimmedNewCollectionName)
                            newCollectionName = ""
                        }
                        .disabled(!canAddCollection)
                    }
                }
            }
            .navigationTitle("Add song")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { addTrack() }
                        .disabled(!canAddTrack)
                }
            }
        }
    }

    private func addTrack() {
        let videoID = YouTubeVideoIDParser.parse(trimmedYouTubeInput)
        let thumbnailURL = "https://img.youtube.com/vi/\(videoID)/hqdefault.jpg"
        onAddTrack(
            RadioTrack(
                title: trimmedTitle,
                artist: trimmedArtist.isEmpty ? nil : trimmedArtist,
                source: .youtube,
                youtubeVideoId: videoID,
                thumbnailUrl: thumbnailURL,
                categoryId: selectedCategoryID
            )
        )
        dismiss()
    }

    private func normalizedCategoryID(from title: String) -> String {
        let normalized = title
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
        return normalized.isEmpty ? defaultUncategorizedCategoryID : normalized
    }
}

struct RenameSheet: View {
    let title: String
    let label: String
    let value: String
    let onSave: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var draft: String

    private var cleanedDraft: String { draft.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canSave: Bool { !cleanedDraft.isEmpty }

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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(cleanedDraft)
                        dismiss()
                    }
                    .disabled(!canSave)
                }
            }
        }
    }
}
