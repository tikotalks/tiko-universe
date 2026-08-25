import Foundation

/// What a country is called, and what its flag looks like.
///
/// The system knows every ISO country in every language iOS ships — including
/// Maltese and Armenian, which the source data does not carry — so it names the
/// units that *are* ISO countries. Territories and unrecognized units fall back
/// to the source's own localized names, then to English. Nothing here needs the
/// network.
enum GlobeCountryNaming {
    static func name(for country: GlobeCountry, languageCode: String) -> String {
        if country.isoRole == .country, let iso2 = country.iso2,
           let localized = Locale(identifier: languageCode).localizedString(forRegionCode: iso2),
           !localized.isEmpty, localized != iso2 {
            if let plain = withoutDisambiguation(localized) { return plain }
            // A name the system disambiguates with a dash — "Congo - Kinshasa"
            // — has no honest short form, so the source's own name wins.
            if !localized.contains(" - ") { return localized }
        }
        if let sourceName = country.names[languageCode] { return sourceName }
        return country.name
    }

    /// The system labels regions the way a settings screen needs them: "China
    /// mainland", "Hong Kong SAR China". On a globe a child is reading, the
    /// qualifier is noise. Returns nil when there is nothing to strip.
    private static func withoutDisambiguation(_ name: String) -> String? {
        for suffix in [" mainland"] where name.hasSuffix(suffix) {
            return String(name.dropLast(suffix.count))
        }
        if let range = name.range(of: " SAR ") {
            return String(name[name.startIndex..<range.lowerBound])
        }
        return nil
    }

    /// The regional-indicator flag, for units that own one. A territory mapped
    /// separately from its country does not fly the country's flag here: it
    /// would tell a child the wrong thing about the shape they just tapped.
    static func flag(for country: GlobeCountry) -> String? {
        guard country.isoRole == .country, let iso2 = country.iso2, iso2.count == 2 else { return nil }
        var flag = ""
        for scalar in iso2.uppercased().unicodeScalars {
            guard let indicator = UnicodeScalar(127397 + scalar.value) else { return nil }
            flag.unicodeScalars.append(indicator)
        }
        return flag
    }

    /// What the app says out loud when a country is selected: its name, nothing
    /// else. The card carries the detail; the voice carries the name.
    static func spokenName(for country: GlobeCountry, languageCode: String) -> String {
        name(for: country, languageCode: languageCode)
    }
}
