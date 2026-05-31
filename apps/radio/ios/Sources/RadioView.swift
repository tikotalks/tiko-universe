import SwiftUI
import TikoKit
import WebKit

// MARK: - WebViewRepresentable

private struct HiddenWebView: UIViewRepresentable {
    let controller: YouTubePlaybackBridge

    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - YouTube metadata

private struct NoembedResponse: Decodable {
    let title: String?
    let error: String?
}

@MainActor
private final class YouTubeMetadataLoader: ObservableObject {
    @Published var loading = false
    @Published var title = ""
    @Published var thumbnailUrl: String?
    @Published var error: String?

    func reset() {
        loading = false
        title = ""
        thumbnailUrl = nil
        error = nil
    }

    func load(videoId: String) async {
        guard videoId.count == 11 else {
            reset()
            return
        }
        loading = true
        error = nil
        thumbnailUrl = "https://img.youtube.com/vi/\(videoId)/mqdefault.jpg"
        defer { loading = false }

        guard let url = URL(string: "https://noembed.com/embed?url=https://www.youtube.com/watch?v=\(videoId)") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            let body = try JSONDecoder().decode(NoembedResponse.self, from: data)
            if let error = body.error {
                self.error = error
            } else if let title = body.title, !title.isEmpty {
                self.title = title
            }
        } catch {
            self.error = "Could not fetch YouTube title"
        }
    }
}

// MARK: - AddTrackSheet

private struct AddTrackSheet: View {
    let categories: [RadioCategory]
    let initialCategoryID: String?
    var onAddTrack: (RadioTrack) -> Void
    var onAddCategory: (String) -> RadioCategory

    @State private var sheetCategories: [RadioCategory] = []
    @StateObject private var metadata = YouTubeMetadataLoader()
    @State private var youtubeUrl = ""
    @State private var customTitle = ""
    @State private var trackArtist = ""
    @State private var selectedCategoryID: String?
    @State private var newCollectionName = ""
    @Environment(\.dismiss) private var dismiss

    private var videoId: String {
        YouTubeVideoIDParser.parse(youtubeUrl)
    }

    private var resolvedTitle: String {
        let custom = customTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !custom.isEmpty { return custom }
        if !metadata.title.isEmpty { return metadata.title }
        return videoId.count == 11 ? "YouTube Track (\(videoId.prefix(8)))" : ""
    }

    private var canAdd: Bool {
        videoId.count == 11 && !resolvedTitle.isEmpty && selectedCategoryID != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Collection") {
                    Picker("Add to", selection: $selectedCategoryID) {
                        Text("Choose collection").tag(String?.none)
                        ForEach(sheetCategories) { category in
                            Label(category.title, systemImage: category.symbol).tag(String?.some(category.id))
                        }
                    }

                    HStack {
                        TextField("New collection", text: $newCollectionName)
                        Button("Create") {
                            let name = newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !name.isEmpty else { return }
                            let category = onAddCategory(name)
                            sheetCategories.append(category)
                            selectedCategoryID = category.id
                            newCollectionName = ""
                        }
                        .disabled(newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }

                Section("YouTube") {
                    TextField("Paste YouTube URL", text: $youtubeUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    if metadata.loading {
                        ProgressView("Fetching video info…")
                    }

                    if let thumbnailUrl = metadata.thumbnailUrl, let url = URL(string: thumbnailUrl) {
                        HStack(spacing: 12) {
                            AsyncImage(url: url) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Color.gray.opacity(0.16)
                            }
                            .frame(width: 96, height: 64)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                            VStack(alignment: .leading, spacing: 4) {
                                Text(resolvedTitle.isEmpty ? "YouTube video" : resolvedTitle)
                                    .font(.headline)
                                    .lineLimit(2)
                                Text(videoId)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    TextField("Title override", text: $customTitle)
                    TextField("Artist / channel", text: $trackArtist)
                }
            }
            .navigationTitle("Add to Radio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { addYouTubeTrack() }
                        .disabled(!canAdd)
                }
            }
        }
        .onAppear {
            sheetCategories = categories
            selectedCategoryID = initialCategoryID ?? categories.first?.id
        }
        .task(id: youtubeUrl) {
            let id = videoId
            guard id.count == 11 else {
                metadata.reset()
                return
            }
            try? await Task.sleep(nanoseconds: 350_000_000)
            if id == videoId { await metadata.load(videoId: id) }
        }
    }

    private func addYouTubeTrack() {
        guard canAdd else { return }
        let artist = trackArtist.trimmingCharacters(in: .whitespacesAndNewlines)
        let track = RadioTrack(
            title: resolvedTitle,
            artist: artist.isEmpty ? nil : artist,
            source: .youtube,
            youtubeVideoId: videoId,
            thumbnailUrl: metadata.thumbnailUrl ?? "https://img.youtube.com/vi/\(videoId)/mqdefault.jpg",
            categoryId: selectedCategoryID
        )
        onAddTrack(track)
        dismiss()
    }
}

// MARK: - RadioView

private enum RadioEditTarget: Identifiable {
    case category(String)
    case track(String)

    var id: String {
        switch self {
        case .category(let id):
            return "category-\(id)"
        case .track(let id):
            return "track-\(id)"
        }
    }
}

private struct RenameSheet: View {
    let title: String
    let label: String
    @State var value: String
    var onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section(label) {
                    TextField(label, text: $value)
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
                        onSave(value)
                        dismiss()
                    }
                    .disabled(value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct RadioView: View {
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue

    @AppStorage("radio.currentTrackIndex") private var currentTrackIndex = 0
    @AppStorage("radio.shuffleEnabled") private var shuffleEnabled = false
    @AppStorage("radio.repeatEnabled") private var repeatEnabled = false
    @AppStorage("radio.parentMode") private var parentMode = true

    @State private var library = RadioLibraryStore()
    @State private var playback = RadioPlaybackService()
    @State private var showAddSheet = false
    @State private var selectedTrackID: RadioTrack.ID?
    @State private var editTarget: RadioEditTarget?

    private var tracks: [RadioTrack] { library.tracks }
    private var selectedCategoryTracks: [RadioTrack] { library.tracks(in: library.selectedCategoryID) }
    private var visibleTracks: [RadioTrack] { library.selectedCategoryID == nil ? tracks : selectedCategoryTracks }

    private var currentTrack: RadioTrack? {
        guard !tracks.isEmpty else { return nil }
        let index = min(max(currentTrackIndex, 0), tracks.count - 1)
        return tracks[index]
    }

    private var selectedTrack: RadioTrack? {
        guard let selectedTrackID else { return nil }
        return tracks.first { $0.id == selectedTrackID }
    }

    private var relatedTracks: [RadioTrack] {
        guard let track = selectedTrack else { return [] }
        return tracks.filter { $0.categoryId == track.categoryId && $0.id != track.id }
    }

    private var effectiveColorScheme: ColorScheme {
        (TikoColorMode(rawValue: colorModeRawValue) ?? .light) == .dark ? .dark : .light
    }

    private var shellBackground: Color {
        effectiveColorScheme == .dark ? Color(red: 0.08, green: 0.055, blue: 0.095) : Color(red: 0.973, green: 0.965, blue: 0.945)
    }

    private var radioPrimary: Color { TikoAppColor.radio.palette.primary }
    private var radioDark: Color { effectiveColorScheme == .dark ? .white : TikoAppColor.radio.palette.dark }
    private var cardBackground: Color { effectiveColorScheme == .dark ? .white.opacity(0.10) : .white.opacity(0.78) }
    private var subtleBackground: Color { effectiveColorScheme == .dark ? .white.opacity(0.08) : radioPrimary.opacity(0.12) }

    var body: some View {
        TikoAppShell(
            appName: "Radio",
            appIcon: "antenna.radiowaves.left.and.right",
            appColor: .radio,
            backgroundColor: shellBackground,
            actions: parentMode ? [
                TikoHeaderAction(id: "add", label: "Add", systemImage: "plus")
            ] : [],
            onAction: { action in
                if action == "add" { showAddSheet = true }
            },
            settingsContent: {
                TikoSettingsSection(title: "Radio") {
                    TikoSettingsToggleRow(title: "Parent mode", icon: "lock.open.fill", appColor: .radio, isOn: $parentMode)
                    TikoSettingsToggleRow(title: "Shuffle", icon: "shuffle", appColor: .radio, isOn: $shuffleEnabled)
                    TikoSettingsToggleRow(title: "Repeat", icon: "repeat", appColor: .radio, isOn: $repeatEnabled)
                }
            }
        ) {
            ZStack {
                content
                HiddenWebView(controller: playback.youtubeBridge)
                    .frame(width: 1, height: 1)
                    .hidden()
            }
        }
        .sheet(isPresented: $showAddSheet) {
            AddTrackSheet(
                categories: library.categories,
                initialCategoryID: library.selectedCategoryID,
                onAddTrack: addTrack,
                onAddCategory: { name in library.addCategory(title: name) }
            )
        }
        .sheet(item: $editTarget) { target in
            renameSheet(for: target)
        }
        .onAppear { library.load() }
        .onDisappear { playback.stop() }
    }

    @ViewBuilder
    private var content: some View {
        if let selectedTrack {
            playerDetail(track: selectedTrack)
        } else if library.selectedCategoryID != nil {
            collectionDetail
        } else {
            collectionsHome
        }
    }

    private var collectionsHome: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Collections")
                    .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                    .foregroundStyle(radioDark)
                    .padding(.horizontal, 20)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 14)], spacing: 14) {
                    ForEach(library.categories) { category in
                        collectionTile(category)
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 20)
        }
    }

    private var collectionDetail: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Button(action: { library.selectedCategoryID = nil }) {
                    Label("Collections", systemImage: "chevron.left")
                        .font(.system(.body, design: .rounded).weight(.bold))
                }
                .foregroundStyle(radioDark)
                .padding(.horizontal, 20)

                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(library.selectedCategory?.title ?? "Collection")
                            .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                        Text("\(visibleTracks.count) songs")
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .foregroundStyle(radioDark.opacity(0.64))
                    }
                    Spacer()
                }
                .foregroundStyle(radioDark)
                .padding(.horizontal, 20)

                if visibleTracks.isEmpty {
                    emptyState
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 142), spacing: 14)], spacing: 14) {
                        ForEach(visibleTracks) { track in
                            trackTile(track)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            .padding(.vertical, 20)
        }
    }

    private func collectionTile(_ category: RadioCategory) -> some View {
        let count = library.tracks(in: category.id).count
        return TikoTile(
            title: category.title,
            subtitle: "\(count) songs",
            minHeight: 150,
            background: cardBackground,
            titleColor: radioDark,
            subtitleColor: radioDark.opacity(0.58),
            action: {
                library.selectedCategoryID = category.id
                selectedTrackID = nil
            }
        ) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: category.symbol)
                    .font(.system(size: 30, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(Color(hex: category.colorHex))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                Spacer(minLength: 6)
            }
        }
        .contextMenu {
            if parentMode {
                Button { editTarget = .category(category.id) } label: {
                    Label("Rename collection", systemImage: "pencil")
                }
                Button(role: .destructive) { library.removeCategory(id: category.id) } label: {
                    Label("Delete collection", systemImage: "trash")
                }
            }
        }
    }

    private func trackTile(_ track: RadioTrack) -> some View {
        TikoTile(
            title: track.title,
            subtitle: track.artist,
            minHeight: 170,
            background: cardBackground,
            titleColor: radioDark,
            subtitleColor: radioDark.opacity(0.62),
            action: {
                selectedTrackID = track.id
                selectTrack(track)
            }
        ) {
            artwork(track: track)
                .frame(height: 112)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .contextMenu {
            if parentMode {
                Button { editTarget = .track(track.id) } label: {
                    Label("Rename song", systemImage: "pencil")
                }
                Menu("Move to") {
                    ForEach(library.categories) { category in
                        Button(category.title) { library.moveTrack(track, to: category.id) }
                    }
                }
                Button(role: .destructive) { library.removeTrack(id: track.id) } label: {
                    Label("Delete song", systemImage: "trash")
                }
            }
        }
    }

    private func playerDetail(track: RadioTrack) -> some View {
        ScrollView {
            VStack(spacing: 18) {
                HStack {
                    Button(action: { selectedTrackID = nil }) {
                        Label(library.selectedCategory?.title ?? "Back", systemImage: "chevron.left")
                            .font(.system(.body, design: .rounded).weight(.bold))
                    }
                    Spacer()
                }
                .foregroundStyle(radioDark)

                artwork(track: track)
                    .frame(maxWidth: .infinity)
                    .aspectRatio(1, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                    .shadow(color: .black.opacity(effectiveColorScheme == .dark ? 0.35 : 0.12), radius: 18, y: 10)

                VStack(spacing: 6) {
                    Text(track.title)
                        .font(.system(.title2, design: .rounded).weight(.heavy))
                        .foregroundStyle(radioDark)
                        .multilineTextAlignment(.center)
                    if let artist = track.artist, !artist.isEmpty {
                        Text(artist)
                            .font(.system(.headline, design: .rounded).weight(.semibold))
                            .foregroundStyle(radioDark.opacity(0.68))
                    }
                }

                progressAndControls

                if !relatedTracks.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("More in this collection")
                            .font(.system(.headline, design: .rounded).weight(.heavy))
                            .foregroundStyle(radioDark)
                        ForEach(relatedTracks) { related in
                            Button(action: {
                                selectedTrackID = related.id
                                selectTrack(related)
                            }) {
                                HStack(spacing: 12) {
                                    artwork(track: related)
                                        .frame(width: 54, height: 54)
                                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                    Text(related.title)
                                        .font(.system(.body, design: .rounded).weight(.bold))
                                        .foregroundStyle(radioDark)
                                        .lineLimit(1)
                                    Spacer()
                                }
                                .padding(10)
                                .background(cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(20)
        }
    }

    private var progressAndControls: some View {
        VStack(spacing: 14) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(radioPrimary.opacity(colorScheme == .dark ? 0.26 : 0.18))
                    Capsule().fill(radioPrimary).frame(width: geo.size.width * playback.progress)
                }
            }
            .frame(height: 7)

            HStack(spacing: 20) {
                controlButton("backward.fill", size: 50, action: previousTrack)
                controlButton(playback.isPlaying ? "pause.fill" : "play.fill", size: 66, action: togglePlay)
                controlButton("forward.fill", size: 50, action: nextTrack)
            }

            HStack(spacing: 14) {
                togglePill("shuffle", active: shuffleEnabled) { shuffleEnabled.toggle() }
                togglePill("repeat", active: repeatEnabled) { repeatEnabled.toggle() }
            }
        }
    }

    private func controlButton(_ symbol: String, size: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size > 60 ? 28 : 21, weight: .heavy))
                .foregroundStyle(radioDark)
                .frame(width: size, height: size)
                .background(subtleBackground)
                .clipShape(Circle())
        }
    }

    private func togglePill(_ symbol: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.body.weight(.bold))
                .foregroundStyle(active ? radioDark : radioDark.opacity(0.48))
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(active ? radioPrimary.opacity(0.22) : subtleBackground)
                .clipShape(Capsule())
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "music.note.list")
                .font(.system(size: 42, weight: .bold))
                .foregroundStyle(radioDark.opacity(0.55))
            Text("No songs yet")
                .font(.system(.title3, design: .rounded).weight(.heavy))
                .foregroundStyle(radioDark)
            Text("Use the + button in the header to add YouTube songs to this collection.")
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundStyle(radioDark.opacity(0.62))
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .padding(.horizontal, 20)
    }

    @ViewBuilder
    private func artwork(track: RadioTrack) -> some View {
        if let thumbnailUrl = track.thumbnailUrl, let url = URL(string: thumbnailUrl) {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                ZStack { subtleBackground; ProgressView() }
            }
        } else {
            ZStack {
                LinearGradient(colors: [radioPrimary.opacity(0.85), radioPrimary.opacity(0.35)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Image(systemName: "music.note")
                    .font(.system(size: 40, weight: .heavy))
                    .foregroundStyle(.white)
            }
        }
    }

    @ViewBuilder
    private func renameSheet(for target: RadioEditTarget) -> some View {
        switch target {
        case .category(let id):
            let category = library.categories.first { $0.id == id }
            RenameSheet(title: "Rename collection", label: "Collection name", value: category?.title ?? "") { newName in
                library.renameCategory(id: id, title: newName)
            }
        case .track(let id):
            let track = tracks.first { $0.id == id }
            RenameSheet(title: "Rename song", label: "Song title", value: track?.title ?? "") { newTitle in
                library.renameTrack(id: id, title: newTitle)
            }
        }
    }

    private func addTrack(_ track: RadioTrack) {
        let wasEmpty = tracks.isEmpty
        library.addTrack(track)
        if wasEmpty { selectTrack(track) }
    }

    private func selectTrack(_ track: RadioTrack) {
        guard let index = tracks.firstIndex(where: { $0.id == track.id }) else { return }
        currentTrackIndex = index
        playCurrentTrack()
    }

    private func playCurrentTrack() {
        guard let track = currentTrack else { return }
        playback.play(track)
    }

    private func togglePlay() {
        if playback.isPlaying {
            playback.pause()
        } else if playback.currentTrack != nil {
            playback.resume()
        } else {
            playCurrentTrack()
        }
    }

    private func nextTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            currentTrackIndex = Int.random(in: 0..<tracks.count)
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % tracks.count
        }
        selectedTrackID = currentTrack?.id
        playCurrentTrack()
    }

    private func previousTrack() {
        guard !tracks.isEmpty else { return }
        if shuffleEnabled {
            currentTrackIndex = Int.random(in: 0..<tracks.count)
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + tracks.count) % tracks.count
        }
        selectedTrackID = currentTrack?.id
        playCurrentTrack()
    }
}

private extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    RadioView()
}
