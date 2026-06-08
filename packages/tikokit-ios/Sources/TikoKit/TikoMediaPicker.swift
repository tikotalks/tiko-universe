import SwiftUI
import PhotosUI

/// Reusable media picker sheet — search the Tiko media library or upload from device.
public struct TikoMediaPickerSheet: View {
    private let appColor: TikoAppColor
    private let title: String
    private let onSelect: (URL) -> Void
    private let onClose: () -> Void

    @State private var query = ""
    @State private var results: [PickerItem] = []
    @State private var isSearching = false
    @State private var searchError: String? = nil
    @State private var photoItem: PhotosPickerItem? = nil
    @State private var isProcessingPhoto = false
    @State private var searchTask: Task<Void, Never>?
    @State private var loadedQuery = ""

    public init(
        appColor: TikoAppColor,
        title: String = "Choose image",
        onSelect: @escaping (URL) -> Void,
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.title = title
        self.onSelect = onSelect
        self.onClose = onClose
    }

    public var body: some View {
        TikoPopupCard(title: title, icon: "photo.fill", appColor: appColor, onClose: onClose) {
            VStack(spacing: 12) {
                // Search bar
                HStack(spacing: 8) {
                    TextField("Search images (e.g. banana, elephant)…", text: $query)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .padding(12)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onSubmit { Task { await search() } }
                        .onChange(of: query) { _, value in
                            scheduleSearch(for: value)
                        }

                    Button { Task { await search() } } label: {
                        Image(systemName: isSearching ? "clock" : "magnifyingglass")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(appColor.palette.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty || isSearching)
                }

                // Upload from device
                PhotosPicker(selection: $photoItem, matching: .images) {
                    HStack(spacing: 12) {
                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(appColor.palette.primary)
                            .frame(width: 36, height: 36)
                            .background(appColor.palette.primary.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        Text(isProcessingPhoto ? "Processing…" : "Upload from device")
                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .background(Color(.systemBackground))
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .onChange(of: photoItem) { _, item in
                    guard let item else { return }
                    Task { await processPhoto(item) }
                }

                // Results
                if isSearching && results.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                } else if let error = searchError, results.isEmpty {
                    Text(error)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 20)
                } else if !results.isEmpty {
                    ScrollView {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3),
                            spacing: 8
                        ) {
                            ForEach(results) { item in
                                Button {
                                    onSelect(item.url)
                                    onClose()
                                } label: {
                                    TikoCachedRemoteImage(url: thumbnailURL(item.url)) {
                                        Color(.systemFill)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .aspectRatio(1, contentMode: .fit)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .frame(maxHeight: 280)
                    .overlay(alignment: .topTrailing) {
                        if isSearching && loadedQuery != query.trimmingCharacters(in: .whitespaces) {
                            ProgressView()
                                .scaleEffect(0.8)
                                .padding(10)
                                .background(.regularMaterial, in: Circle())
                                .padding(8)
                        }
                    }
                }
            }
        }
        .onDisappear {
            searchTask?.cancel()
        }
    }

    // MARK: - Helpers

    private func scheduleSearch(for value: String) {
        searchTask?.cancel()
        let q = value.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 650_000_000)
            guard !Task.isCancelled else { return }
            await search(queryOverride: q, cancelPendingSearch: false)
        }
    }

    private func search(queryOverride: String? = nil, cancelPendingSearch: Bool = true) async {
        if cancelPendingSearch {
            searchTask?.cancel()
        }
        let q = queryOverride ?? query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        isSearching = true
        searchError = nil
        defer { isSearching = false }

        let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q
        let urlString = "https://media.tikoapi.org/v1/media?type=image&search=\(encoded)&limit=30"
        guard let url = URL(string: urlString),
              let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["data"] as? [[String: Any]], !items.isEmpty else {
            searchError = results.isEmpty ? "No results found." : nil
            return
        }

        guard !Task.isCancelled else { return }
        let nextResults = items.compactMap { dict -> PickerItem? in
            guard let id = dict["id"] as? String,
                  let urlStr = dict["original_url"] as? String,
                  let url = URL(string: urlStr) else { return nil }
            return PickerItem(id: id, url: url)
        }
        if !nextResults.isEmpty {
            results = nextResults
            loadedQuery = q
            Task { await TikoRemoteImageCache.shared.prefetch(nextResults.map { thumbnailURL($0.url) }) }
        }
    }

    private func processPhoto(_ item: PhotosPickerItem) async {
        isProcessingPhoto = true
        defer { isProcessingPhoto = false }

        guard let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data),
              let jpeg = uiImage.jpegData(compressionQuality: 0.8) else { return }

        let filename = "tiko_avatar_\(Int(Date.now.timeIntervalSince1970)).jpg"
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let fileURL = cacheDir.appendingPathComponent(filename)

        guard (try? jpeg.write(to: fileURL)) != nil else { return }
        onSelect(fileURL)
        onClose()
    }

    private func thumbnailURL(_ url: URL) -> URL {
        guard url.host == "data.tikocdn.org", url.path.hasPrefix("/uploads/") else { return url }
        return URL(string: "https://data.tikocdn.org/cdn-cgi/image/width=150,quality=80,f=auto\(url.path)") ?? url
    }

    private struct PickerItem: Identifiable {
        let id: String
        let url: URL
    }
}

public extension View {
    func tikoMediaPickerPopup(
        isPresented: Binding<Bool>,
        appColor: TikoAppColor,
        title: String = "Choose image",
        onSelect: @escaping (URL) -> Void
    ) -> some View {
        tikoPopup(isPresented: isPresented) {
            TikoMediaPickerSheet(
                appColor: appColor,
                title: title,
                onSelect: onSelect,
                onClose: { isPresented.wrappedValue = false }
            )
        }
    }
}
