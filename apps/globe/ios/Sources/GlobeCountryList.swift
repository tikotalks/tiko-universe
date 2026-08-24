import SwiftUI
import TikoKit

/// The way to every country that does not need a fingertip on a spinning
/// sphere: an ordered, searchable list. Picking one selects it, says it, and
/// moves the globe there — so a VoiceOver user and a child with a fingertip end
/// up in exactly the same place.
struct GlobeCountryList: View {
    let countries: [GlobeCountry]
    /// Whatever the current mode can show — capitals, animals, landmarks — one
    /// row per thing, so the list reaches everything a fingertip can.
    let entities: [GlobeEntity]
    let languageCode: String
    @ObservedObject var i18n: TikoI18n
    let onSelect: (GlobeCountry) -> Void
    let onSelectEntity: (GlobeEntity) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var sorted: [GlobeCountry] {
        countries
            .map { (country: $0, name: GlobeCountryNaming.name(for: $0, languageCode: languageCode)) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }
            .map(\.country)
    }

    private var sortedEntities: [(entity: GlobeEntity, name: String)] {
        entities
            .map { (entity: $0, name: GlobeNaming.displayName(for: $0, i18n: i18n)) }
            .filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    var body: some View {
        NavigationStack {
            List {
                if !sortedEntities.isEmpty {
                    Section(i18n.t("globe.list.onTheGlobe")) {
                        ForEach(sortedEntities, id: \.entity.id) { row in
                            Button {
                                onSelectEntity(row.entity)
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    GlobeMarkerImage(entity: row.entity, size: 32)
                                    Text(row.name)
                                    Spacer()
                                }
                                .frame(minHeight: 44)
                                .contentShape(Rectangle())
                            }
                            .accessibilityIdentifier("globe-list-\(row.entity.kind.rawValue).\(row.entity.id)")
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
                if sorted.isEmpty && sortedEntities.isEmpty {
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
