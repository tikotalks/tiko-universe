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
    let appColor: TikoAppColor

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
        TikoPopupCard(
            title: i18n.t("globe.list.title"),
            icon: "list.bullet",
            appColor: appColor,
            onClose: { dismiss() }
        ) {
            VStack(spacing: 0) {
                searchField
                list.frame(height: 460)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("globe-country-list")
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField(i18n.t("globe.list.search"), text: $search)
                .textFieldStyle(.plain)
                .autocorrectionDisabled()
                .accessibilityIdentifier("globe-list-search")
            if !search.isEmpty {
                Button { search = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("common.close"))
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.bottom, 10)
    }

    private var list: some View {
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
                            GlobeFlagImage(country: country, size: 28)
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
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .overlay {
            if sorted.isEmpty && sortedEntities.isEmpty {
                Text(i18n.t("globe.list.empty")).foregroundStyle(.secondary)
            }
        }
    }
}
