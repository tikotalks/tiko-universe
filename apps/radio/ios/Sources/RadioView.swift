import SwiftUI
import TikoKit

struct RadioView: View {
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage("tiko.colorMode") private var colorModeRawValue = TikoColorMode.light.rawValue
    @AppStorage("tiko.language") private var languageCode = "en"

    @AppStorage("radio.currentTrackIndex") private var currentTrackIndex = 0
    @AppStorage("radio.shuffleEnabled") private var shuffleEnabled = false
    @AppStorage("radio.repeatEnabled") private var repeatEnabled = false

    @StateObject private var i18n = TikoI18n(app: .radio)

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

    private var headerTitle: String {
        if selectedTrack != nil {
            return library.selectedCategory?.title ?? i18n.t("radio.appName")
        } else if library.selectedCategoryID != nil {
            return i18n.t("radio.collections.title")
        }
        return i18n.t("radio.appName")
    }

    private var headerIcon: String {
        selectedTrack != nil || library.selectedCategoryID != nil ? "chevron.left" : "antenna.radiowaves.left.and.right"
    }

    private var headerIconAction: (() -> Void)? {
        if selectedTrack != nil {
            return { selectedTrackID = nil }
        } else if library.selectedCategoryID != nil {
            return { library.selectedCategoryID = nil; selectedTrackID = nil }
        }
        return nil
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
            appConfig: RadioAppConfig.app,
            appName: headerTitle,
            onIconTap: headerIconAction,
            backgroundColor: shellBackground,
            actions: [
                TikoHeaderAction(id: "add", label: "Add", systemImage: "plus")
            ],
            onAction: { action in
                if action == "add" { showAddSheet = true }
            },
            settingsContent: {
                TikoSettingsSection(title: i18n.t("radio.settings.title")) {
                    TikoSettingsToggleRow(title: i18n.t("radio.settings.shuffle"), icon: "shuffle", appColor: .radio, isOn: $shuffleEnabled)
                    TikoSettingsToggleRow(title: i18n.t("radio.settings.repeat"), icon: "repeat", appColor: .radio, isOn: $repeatEnabled)
                }
            }
        ) {
            content
                .background(
                    WebViewWindowAttacher(webView: playback.youtubeBridge.webView)
                )
        }
        .tikoPopup(isPresented: $showAddSheet) {
            AddTrackPopup(
                categories: library.categories,
                initialCategoryID: library.selectedCategoryID,
                onAddTrack: addTrack,
                onAddCategory: { name in library.addCategory(title: name) },
                onDismiss: { showAddSheet = false }
            )
        }
        .sheet(item: $editTarget) { target in
            renameSheet(for: target)
        }
        .environmentObject(i18n)
        .onAppear {
            i18n.setLanguage(languageCode)
            library.load()
        }
        .onChange(of: languageCode) { _, code in
            i18n.setLanguage(code)
        }
        .onDisappear {
            playback.youtubeBridge.webView.removeFromSuperview()
            playback.stop()
        }
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
                Text(i18n.t("radio.collections.title"))
                    .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                    .foregroundStyle(radioDark)
                    .padding(.horizontal, 20)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 14)], spacing: 14) {
                    ForEach(library.collectionsWithTracks) { category in
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
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(library.selectedCategory?.title ?? i18n.t("radio.collections.title"))
                            .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                        Text(i18n.t("radio.collections.songs", ["count": visibleTracks.count]))
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
        return Button(action: {
            library.selectedCategoryID = category.id
            selectedTrackID = nil
        }) {
            TikoSquareTile(
                title: category.title,
                subtitle: "\(count) songs",
                background: Color(hex: category.colorHex)
            ) {
                Image(systemName: category.symbol)
                    .font(.system(size: 52, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button { editTarget = .category(category.id) } label: {
                Label(i18n.t("radio.management.renameCollection"), systemImage: "pencil")
            }
            Button(role: .destructive) { library.removeCategory(id: category.id) } label: {
                Label(i18n.t("radio.management.deleteCollection"), systemImage: "trash")
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
            Button { editTarget = .track(track.id) } label: {
                Label(i18n.t("radio.management.renameSong"), systemImage: "pencil")
            }
            Menu(i18n.t("radio.management.moveTo")) {
                ForEach(library.categories) { category in
                    Button(category.title) { library.moveTrack(track, to: category.id) }
                }
            }
            Button(role: .destructive) { library.removeTrack(id: track.id) } label: {
                Label(i18n.t("radio.management.deleteSong"), systemImage: "trash")
            }
        }
    }

    private func playerDetail(track: RadioTrack) -> some View {
        ScrollView {
            VStack(spacing: 18) {
                Color.clear
                    .aspectRatio(1, contentMode: .fit)
                    .frame(maxHeight: 280)
                    .overlay { artwork(track: track) }
                    .clipped()
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
                        Text(i18n.t("radio.collections.moreInCollection"))
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
                    Capsule().fill(radioPrimary.opacity(effectiveColorScheme == .dark ? 0.26 : 0.18))
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
            Text(i18n.t("radio.collections.empty"))
                .font(.system(.title3, design: .rounded).weight(.heavy))
                .foregroundStyle(radioDark)
            Text(i18n.t("radio.collections.addHint"))
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
            RenameSheet(
                title: i18n.t("radio.renameCollection.title"),
                label: i18n.t("radio.renameCollection.label"),
                value: category?.title ?? ""
            ) { newName in
                library.renameCategory(id: id, title: newName)
            }
        case .track(let id):
            let track = tracks.first { $0.id == id }
            RenameSheet(
                title: i18n.t("radio.renameSong.title"),
                label: i18n.t("radio.renameSong.label"),
                value: track?.title ?? ""
            ) { newTitle in
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

private enum RadioEditTarget: Identifiable {
    case category(String)
    case track(String)

    var id: String {
        switch self {
        case .category(let id):
            return "category:\(id)"
        case .track(let id):
            return "track:\(id)"
        }
    }
}


struct RadioView_Previews: PreviewProvider {
    static var previews: some View {
        RadioView()
    }
}

