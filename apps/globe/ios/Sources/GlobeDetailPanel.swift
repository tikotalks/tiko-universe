import SwiftUI
import TikoKit

/// The detail side panel: what the child tapped, at the height of the screen,
/// with its picture, its name, a little map of where it is, and the few facts
/// this app can stand behind.
struct GlobeDetailPanel: View {
    let selection: GlobeSelection
    let geography: GlobeGeography
    let languageCode: String
    @ObservedObject var i18n: TikoI18n
    let appColor: TikoAppColor
    let onSpeak: () -> Void
    let onClose: () -> Void
    let onSelectCountry: (GlobeCountry) -> Void

    @Environment(\.colorScheme) private var colorScheme
    @ScaledMetric(relativeTo: .largeTitle) private var artworkSize: CGFloat = 132

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    map
                    facts
                    if !countries.isEmpty { countryChips }
                    if let footnote { Text(footnote).font(.footnote).foregroundStyle(.secondary) }
                }
                .padding(20)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(colorScheme == .dark ? Color(white: 0.13) : Color.white)
                .shadow(color: .black.opacity(0.16), radius: 20, x: -4, y: 4)
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("globe-selection-card")
    }

    // MARK: - Pieces

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Text(kindLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(appColor.palette.primary)
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.bold))
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(i18n.t("common.close"))
                .accessibilityIdentifier("globe-close-card")
            }

            artwork

            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(title)
                    .font(.largeTitle.weight(.semibold))
                    .minimumScaleFactor(0.5)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                Button(action: onSpeak) {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.title2)
                        .frame(width: 56, height: 56)
                        .background(appColor.palette.primary.opacity(0.18), in: Circle())
                }
                .accessibilityLabel(i18n.t("globe.action.sayAgain"))
                .accessibilityIdentifier("globe-speak")
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    @ViewBuilder
    private var artwork: some View {
        switch selection {
        case .country(let country):
            if let flag = GlobeCountryNaming.flag(for: country) {
                Text(flag)
                    .font(.system(size: artworkSize * 0.7))
                    .accessibilityHidden(true)
            }
        case .entity(let entity, _):
            GlobeMarkerImage(entity: entity, size: artworkSize)
        }
    }

    private var map: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(mapCaption)
                .font(.caption)
                .foregroundStyle(.secondary)
            GlobeMiniMap(
                geography: geography,
                centre: centre,
                highlighted: Set(countryIDs),
                pins: pins
            )
            .frame(height: 190)
            .frame(maxWidth: .infinity)
        }
    }

    private var facts: some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(details, id: \.label) { detail in
                VStack(alignment: .leading, spacing: 2) {
                    Text(detail.label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(detail.value)
                        .font(.headline)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    /// The countries a subject covers, tappable — an animal's card is a way
    /// into the places it lives.
    private var countryChips: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(i18n.t(isAnimal ? "globe.card.livesIn" : "globe.card.country"))
                .font(.caption)
                .foregroundStyle(.secondary)
            FlowLayout(spacing: 6) {
                ForEach(countries) { country in
                    Button {
                        onSelectCountry(country)
                    } label: {
                        HStack(spacing: 4) {
                            if let flag = GlobeCountryNaming.flag(for: country) { Text(flag) }
                            Text(GlobeCountryNaming.name(for: country, languageCode: languageCode))
                                .font(.subheadline)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(appColor.palette.primary.opacity(0.14), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("globe-panel-country-\(country.id)")
                }
            }
        }
    }

    // MARK: - Content

    private struct Detail {
        let label: String
        let value: String
    }

    private var isAnimal: Bool {
        if case .entity(let entity, _) = selection { return entity.kind == .animal }
        return false
    }

    private var title: String {
        switch selection {
        case .country(let country): GlobeCountryNaming.name(for: country, languageCode: languageCode)
        case .entity(let entity, _): GlobeNaming.displayName(for: entity, i18n: i18n)
        }
    }

    private var kindLabel: String {
        switch selection {
        case .country: i18n.t("globe.mode.countries")
        case .entity(let entity, _):
            switch entity.kind {
            case .capital: i18n.t("globe.card.capitalCity")
            case .animal: i18n.t("globe.card.animal")
            case .landmark: i18n.t("globe.card.landmark")
            }
        }
    }

    private var mapCaption: String {
        switch selection {
        case .country: i18n.t("globe.card.whereIsIt")
        case .entity(let entity, _): entity.kind == .animal ? i18n.t("globe.card.whereItLives") : i18n.t("globe.card.whereIsIt")
        }
    }

    private var countryIDs: [String] {
        switch selection {
        case .country(let country): [country.id]
        case .entity(_, let occurrence): occurrence.countryIDs.isEmpty
            ? [occurrence.countryID].compactMap { $0 }
            : occurrence.countryIDs
        }
    }

    private var countries: [GlobeCountry] {
        guard case .entity = selection else { return [] }
        return countryIDs
            .compactMap { id in geography.countries.first { $0.id == id } }
            .sorted { $0.name < $1.name }
    }

    private var pins: [GeoPoint] {
        switch selection {
        case .country: []
        case .entity(_, let occurrence): [occurrence.point]
        }
    }

    private var centre: GeoPoint {
        switch selection {
        case .country(let country): country.labelPoint
        case .entity(_, let occurrence): occurrence.point
        }
    }

    private var details: [Detail] {
        switch selection {
        case .country(let country):
            var rows: [Detail] = []
            if let capital = country.capital {
                rows.append(Detail(label: i18n.t("globe.card.capital"), value: capital.name))
            }
            rows.append(Detail(label: i18n.t("globe.card.continent"), value: country.continent))
            if country.isoRole == .unrecognized {
                rows.append(Detail(label: i18n.t("globe.card.mappedAs"), value: country.name))
            }
            return rows
        case .entity(let entity, let occurrence):
            var rows: [Detail] = []
            if let note = occurrence.note {
                rows.append(Detail(label: i18n.t("globe.card.about"), value: note))
            }
            if let region = occurrence.region {
                rows.append(Detail(
                    label: i18n.t(entity.kind == .animal ? "globe.card.livesIn" : "globe.card.where"),
                    value: region
                ))
            }
            if let country = countryIDs.count == 1
                ? geography.countries.first(where: { $0.id == countryIDs[0] })
                : nil {
                rows.append(Detail(
                    label: i18n.t("globe.card.country"),
                    value: GlobeCountryNaming.name(for: country, languageCode: languageCode)
                ))
                rows.append(Detail(label: i18n.t("globe.card.continent"), value: country.continent))
            }
            rows.append(Detail(
                label: i18n.t("globe.card.position"),
                value: GlobeDetailPanel.coordinates(occurrence.point)
            ))
            return rows
        }
    }

    /// Nothing is claimed about a subject an editor has not been through yet.
    private var footnote: String? {
        guard case .entity(let entity, _) = selection, !entity.isReviewed else { return nil }
        return i18n.t("globe.card.draft")
    }

    static func coordinates(_ point: GeoPoint) -> String {
        let lat = String(format: "%.1f° %@", abs(point.lat), point.lat >= 0 ? "N" : "S")
        let lon = String(format: "%.1f° %@", abs(point.lon), point.lon >= 0 ? "E" : "W")
        return "\(lat), \(lon)"
    }
}

/// Wrapping row of chips — `LazyVGrid` cannot size to content the way a row of
/// country names needs to.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 320
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
