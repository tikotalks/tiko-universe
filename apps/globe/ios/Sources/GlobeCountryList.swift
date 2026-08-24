import SwiftUI
import TikoKit

/// The way to every country that does not need a fingertip on a spinning
/// sphere: an ordered, searchable list. Picking one selects it, says it, and
/// moves the globe there — so a VoiceOver user and a child with a fingertip end
/// up in exactly the same place.
struct GlobeCountryList: View {
    let countries: [GlobeCountry]
    /// Whatever the current mode has put on the globe — capitals, animals,
    /// landmarks — so the list reaches everything a fingertip can.
    let markers: [GlobeMarker]
    let languageCode: String
    @ObservedObject var i18n: TikoI18n
    let onSelect: (GlobeCountry) -> Void
    let onSelectMarker: (GlobeMarker) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var sorted: [GlobeCountry] {
        countries
            .map { (country: $0, name: GlobeCountryNaming.name(for: $0, languageCode: languageCode)) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }
            .map(\.country)
    }

    private var sortedMarkers: [GlobeMarker] {
        markers
            .filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    var body: some View {
        NavigationStack {
            List {
                if !sortedMarkers.isEmpty {
                    Section(i18n.t("globe.list.onTheGlobe")) {
                        ForEach(sortedMarkers) { marker in
                            Button {
                                onSelectMarker(marker)
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    GlobeMarkerImage(marker: marker, size: 32)
                                    Text(marker.name)
                                    Spacer()
                                }
                                .frame(minHeight: 44)
                                .contentShape(Rectangle())
                            }
                            .accessibilityIdentifier("globe-list-\(marker.id)")
                        }
                    }
                }
                Section(i18n.t("globe.list.title")) {
                    ForEach(sorted) { country in
                        Button {
                            onSelect(country)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                if let flag = GlobeCountryNaming.flag(for: country) {
                                    Text(flag).font(.title2).accessibilityHidden(true)
                                }
                                Text(GlobeCountryNaming.name(for: country, languageCode: languageCode))
                                    .font(.body)
                                Spacer()
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .accessibilityIdentifier("globe-country-\(country.id)")
                    }
                }
            }
            .listStyle(.plain)
            .overlay {
                if sorted.isEmpty && sortedMarkers.isEmpty {
                    Text(i18n.t("globe.list.empty")).foregroundStyle(.secondary)
                }
            }
            .searchable(text: $search, prompt: i18n.t("globe.list.search"))
            .navigationTitle(i18n.t("globe.list.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(i18n.t("common.done")) { dismiss() }
                }
            }
        }
        .accessibilityIdentifier("globe-country-list")
    }
}
