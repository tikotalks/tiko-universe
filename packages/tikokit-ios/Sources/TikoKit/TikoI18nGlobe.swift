import Foundation

// Local translation bundles for Tiko Globe. Remote translations from the
// translations worker override these at runtime, exactly like the other apps.
// Country names are not here: the system already knows them in every language
// iOS ships, and the bundled geography carries the rest.
extension TikoLocalTranslations {
    private static let globeEN: [String: String] = [
        "globe.appName": "Globe",
        "globe.earth": "Earth",
        "globe.hint.explore": "Spin the Earth. Tap a country.",
        "globe.mode.countries": "Countries",
        "globe.mode.capitals": "Capitals",
        "globe.mode.animals": "Animals",
        "globe.mode.landmarks": "Landmarks",
        "globe.mode.picker": "What to look for",
        "globe.card.country": "Country",
        "globe.card.livesIn": "Lives in",
        "globe.card.where": "Where",
        "globe.card.about": "About",
        "globe.card.animalsHere": "Animals here",
        "globe.card.landmarksHere": "Places to see",
        "globe.card.capitalCity": "Capital city",
        "globe.card.animal": "Animal",
        "globe.card.landmark": "Landmark",
        "globe.card.whereIsIt": "Where it is",
        "globe.card.whereItLives": "Where it lives",
        "globe.card.position": "On the map",
        "globe.card.mappedAs": "Mapped as",
        "globe.card.draft": "This entry is still being checked, so Globe only says its name and where it is.",
        "globe.action.wholeEarth": "Whole Earth",
        "globe.action.countryList": "All countries",
        "globe.action.sayAgain": "Say it again",
        "globe.action.zoomIn": "Zoom in",
        "globe.action.zoomOut": "Zoom out",
        "globe.action.zoomTo": "Show me",
        "globe.card.capital": "Capital",
        "globe.card.continent": "Continent",
        "globe.list.title": "Countries",
        "globe.list.onTheGlobe": "On the globe",
        "globe.list.search": "Search",
        "globe.list.empty": "Nothing with that name",
        "globe.settings.sayNames": "Say names out loud",
        "globe.settings.sayNamesHint": "Globe speaks the name of whatever your child taps.",
        "globe.error.title": "The Earth could not be loaded",
        "globe.error.hint": "Reinstalling the app restores the map data.",
        "common.close": "Close",
        "common.done": "Done",
        "common.settings": "Settings",
    ]

    static var globeBundles: [(String, [String: String])] {
        [("en", globeEN)]
    }
}
