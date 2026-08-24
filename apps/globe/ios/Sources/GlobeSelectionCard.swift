import SwiftUI
import TikoKit

/// What the card says, built from whatever is selected — a country, a capital,
/// an animal or a landmark all land in the same shape.
struct GlobeCardModel: Equatable {
    struct Detail: Equatable, Identifiable {
        let label: String
        let value: String
        var id: String { label }
    }

    let title: String
    let glyph: String?
    let flag: String?
    let marker: GlobeMarker?
    let details: [Detail]
}

/// What the child gets back when they tap: the name, big, with a speaker that
/// says it again. Everything else is smaller and underneath.
struct GlobeSelectionCard: View {
    let model: GlobeCardModel
    @ObservedObject var i18n: TikoI18n
    let appColor: TikoAppColor
    let onSpeak: () -> Void
    let onClose: () -> Void

    @Environment(\.colorScheme) private var colorScheme
    @ScaledMetric(relativeTo: .largeTitle) private var glyphSize: CGFloat = 56

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 16) {
                if let marker = model.marker {
                    GlobeMarkerImage(marker: marker, size: glyphSize * 1.5)
                } else if let glyph = model.glyph ?? model.flag {
                    Text(glyph)
                        .font(.system(size: glyphSize))
                        .accessibilityHidden(true)
                }
                Text(model.title)
                    .font(.largeTitle.weight(.semibold))
                    .minimumScaleFactor(0.6)
                    .lineLimit(2)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 8)
                Button(action: onSpeak) {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.title2)
                        .frame(width: 56, height: 56)
                        .background(appColor.palette.primary.opacity(0.18), in: Circle())
                }
                .accessibilityLabel(i18n.t("globe.action.sayAgain"))
                .accessibilityIdentifier("globe-speak")
            }

            if !model.details.isEmpty {
                HStack(alignment: .top, spacing: 20) {
                    ForEach(model.details) { detail in
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
                    Spacer(minLength: 0)
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(colorScheme == .dark ? Color(white: 0.14) : Color.white)
                .shadow(color: .black.opacity(0.18), radius: 18, y: 6)
        )
        .overlay(alignment: .topTrailing) {
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.bold))
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(i18n.t("common.close"))
            .accessibilityIdentifier("globe-close-card")
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("globe-selection-card")
    }
}
