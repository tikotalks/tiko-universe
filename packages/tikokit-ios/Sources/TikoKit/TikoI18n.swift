import Foundation
import Combine

// MARK: - App Key

public enum TikoAppKey: String, Sendable {
    case yesNo = "yes-no"
    case type = "type"
    case timer = "timer"
    case radio = "radio"
    case cards = "cards"
    case sequence = "sequence"
    case todo = "todo"
}

// MARK: - TikoI18n

@MainActor
public final class TikoI18n: ObservableObject {
    public let app: TikoAppKey
    @Published public private(set) var languageCode: String

    private let fallback = "en"
    private var bundles: [String: [String: String]] = [:]
    private var fetchedLanguages: Set<String> = []

    /// Base URL of the Tiko translations-api Worker.
    /// Set once at app startup: `TikoI18n.translationsBaseURL = "https://translations.tikoapi.org"`
    public static var translationsBaseURL: String? = nil

    public init(app: TikoAppKey, languageCode: String = "en") {
        self.app = app
        self.languageCode = languageCode
        loadLocalBundles()
        if TikoI18n.translationsBaseURL != nil {
            Task { await self.fetchTranslations() }
        }
    }

    // MARK: - Public API

    public func t(_ key: String, _ params: [String: Any] = [:]) -> String {
        let text = resolve(key) ?? key
        return params.isEmpty ? text : interpolate(text, params: params)
    }

    public func setLanguage(_ code: String) {
        languageCode = code
        // Fetch new language from worker if not already loaded remotely
        if TikoI18n.translationsBaseURL != nil, !fetchedLanguages.contains(code) {
            Task { await self.fetchRemoteBundle(language: code) }
        }
    }

    public func addBundle(languageCode: String, translations: [String: String]) {
        let k = bundleKey(app.rawValue, languageCode)
        if bundles[k] != nil {
            for (key, val) in translations { bundles[k]![key] = val }
        } else {
            bundles[k] = translations
        }
    }

    /// Fetch remote translations from the Tiko translations-api Worker.
    /// Called automatically on init; call again to force a refresh.
    public func fetchTranslations() async {
        guard TikoI18n.translationsBaseURL != nil else { return }
        let langs = Set([languageCode, "en"])
        for lang in langs {
            await fetchRemoteBundle(language: lang)
        }
    }

    // MARK: - Private

    private func resolve(_ key: String) -> String? {
        bundles[bundleKey(app.rawValue, languageCode)]?[key]
            ?? bundles[bundleKey(app.rawValue, fallback)]?[key]
    }

    private func loadLocalBundles() {
        for (code, translations) in TikoLocalTranslations.bundles(for: app) {
            bundles[bundleKey(app.rawValue, code)] = translations
        }
    }

    private func interpolate(_ text: String, params: [String: Any]) -> String {
        var result = text
        for (key, value) in params {
            result = result.replacingOccurrences(of: "{\(key)}", with: "\(value)")
        }
        return result
    }

    private func bundleKey(_ app: String, _ lang: String) -> String { "\(app):\(lang)" }

    private struct TranslationsResponse: Decodable {
        let translations: [String: String]
    }

    private func fetchRemoteBundle(language: String) async {
        guard let base = TikoI18n.translationsBaseURL else { return }
        let urlString = "\(base)/v1/\(app.rawValue)/\(language)"
        guard let url = URL(string: urlString),
              let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let result = try? JSONDecoder().decode(TranslationsResponse.self, from: data)
        else { return }
        fetchedLanguages.insert(language)
        addBundle(languageCode: language, translations: result.translations)
    }
}

// MARK: - Local Translation Bundles

enum TikoLocalTranslations {
    static func bundles(for app: TikoAppKey) -> [(String, [String: String])] {
        switch app {
        case .radio:    return radioBundles
        case .yesNo:    return yesNoBundles
        case .cards:    return cardsBundles
        case .timer:    return timerBundles
        case .type:     return typeBundles
        case .sequence: return sequenceBundles
        case .todo:     return todoBundles
        }
    }

    // MARK: Radio

    private static let radioEN: [String: String] = [
        "radio.appName": "Radio",
        "radio.collections.title": "Collections",
        "radio.collections.songs": "{count} songs",
        "radio.collections.empty": "No songs yet",
        "radio.collections.addHint": "Use the + button in the header to add YouTube songs to this collection.",
        "radio.collections.moreInCollection": "More in this collection",
        "radio.player.play": "Play",
        "radio.player.pause": "Pause",
        "radio.player.next": "Next",
        "radio.player.previous": "Previous",
        "radio.player.shuffle": "Shuffle",
        "radio.player.repeat": "Repeat",
        "radio.library.addSong": "Add song",
        "radio.library.songTitle": "Song title",
        "radio.library.artist": "Artist",
        "radio.library.collection": "Collection",
        "radio.library.newCollectionName": "New collection name",
        "radio.library.fetchingInfo": "Fetching info…",
        "radio.library.addFromYouTube": "YouTube URL or video ID",
        "radio.management.renameCollection": "Rename collection",
        "radio.management.deleteCollection": "Delete collection",
        "radio.management.renameSong": "Rename song",
        "radio.management.deleteSong": "Delete song",
        "radio.management.moveTo": "Move to",
        "radio.renameCollection.title": "Rename collection",
        "radio.renameCollection.label": "Collection name",
        "radio.renameSong.title": "Rename song",
        "radio.renameSong.label": "Song title",
        "radio.settings.title": "Radio",
        "radio.settings.parentMode": "Parent mode",
        "radio.settings.shuffle": "Shuffle",
        "radio.settings.repeat": "Repeat",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.add": "Add",
        "common.settings": "Settings",
    ]

    private static let radioNL: [String: String] = [
        "radio.appName": "Radio",
        "radio.collections.title": "Collecties",
        "radio.collections.songs": "{count} nummers",
        "radio.collections.empty": "Nog geen nummers",
        "radio.collections.addHint": "Gebruik de + knop in de header om YouTube-nummers toe te voegen aan deze collectie.",
        "radio.collections.moreInCollection": "Meer in deze collectie",
        "radio.player.play": "Afspelen",
        "radio.player.pause": "Pauzeren",
        "radio.player.next": "Volgende",
        "radio.player.previous": "Vorige",
        "radio.player.shuffle": "Willekeurig",
        "radio.player.repeat": "Herhalen",
        "radio.library.addSong": "Nummer toevoegen",
        "radio.library.songTitle": "Titel",
        "radio.library.artist": "Artiest",
        "radio.library.collection": "Collectie",
        "radio.library.newCollectionName": "Naam nieuwe collectie",
        "radio.library.fetchingInfo": "Info ophalen…",
        "radio.library.addFromYouTube": "YouTube URL of video-ID",
        "radio.management.renameCollection": "Collectie hernoemen",
        "radio.management.deleteCollection": "Collectie verwijderen",
        "radio.management.renameSong": "Nummer hernoemen",
        "radio.management.deleteSong": "Nummer verwijderen",
        "radio.management.moveTo": "Verplaatsen naar",
        "radio.renameCollection.title": "Collectie hernoemen",
        "radio.renameCollection.label": "Collectienaam",
        "radio.renameSong.title": "Nummer hernoemen",
        "radio.renameSong.label": "Titel",
        "radio.settings.title": "Radio",
        "radio.settings.parentMode": "Oudermodus",
        "radio.settings.shuffle": "Willekeurig",
        "radio.settings.repeat": "Herhalen",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.add": "Toevoegen",
        "common.settings": "Instellingen",
    ]

    private static let radioFR: [String: String] = [
        "radio.appName": "Radio",
        "radio.collections.title": "Collections",
        "radio.collections.songs": "{count} chansons",
        "radio.collections.empty": "Pas encore de chansons",
        "radio.collections.addHint": "Utilisez le bouton + dans l'en-tête pour ajouter des chansons YouTube à cette collection.",
        "radio.collections.moreInCollection": "Plus dans cette collection",
        "radio.player.play": "Jouer",
        "radio.player.pause": "Pause",
        "radio.player.next": "Suivant",
        "radio.player.previous": "Précédent",
        "radio.player.shuffle": "Aléatoire",
        "radio.player.repeat": "Répéter",
        "radio.library.addSong": "Ajouter une chanson",
        "radio.library.songTitle": "Titre de la chanson",
        "radio.library.artist": "Artiste",
        "radio.library.collection": "Collection",
        "radio.library.newCollectionName": "Nom de la nouvelle collection",
        "radio.library.fetchingInfo": "Récupération des infos…",
        "radio.library.addFromYouTube": "URL YouTube ou identifiant de la vidéo",
        "radio.management.renameCollection": "Renommer la collection",
        "radio.management.deleteCollection": "Supprimer la collection",
        "radio.management.renameSong": "Renommer la chanson",
        "radio.management.deleteSong": "Supprimer la chanson",
        "radio.management.moveTo": "Déplacer vers",
        "radio.renameCollection.title": "Renommer la collection",
        "radio.renameCollection.label": "Nom de la collection",
        "radio.renameSong.title": "Renommer la chanson",
        "radio.renameSong.label": "Titre de la chanson",
        "radio.settings.title": "Radio",
        "radio.settings.parentMode": "Mode parent",
        "radio.settings.shuffle": "Aléatoire",
        "radio.settings.repeat": "Répéter",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.add": "Ajouter",
        "common.settings": "Paramètres",
    ]

    private static let radioES: [String: String] = [
        "radio.appName": "Radio",
        "radio.collections.title": "Colecciones",
        "radio.collections.songs": "{count} canciones",
        "radio.collections.empty": "Aún no hay canciones",
        "radio.collections.addHint": "Usa el botón + del encabezado para añadir canciones de YouTube a esta colección.",
        "radio.collections.moreInCollection": "Más en esta colección",
        "radio.player.play": "Reproducir",
        "radio.player.pause": "Pausar",
        "radio.player.next": "Siguiente",
        "radio.player.previous": "Anterior",
        "radio.player.shuffle": "Aleatorio",
        "radio.player.repeat": "Repetir",
        "radio.library.addSong": "Añadir canción",
        "radio.library.songTitle": "Título de la canción",
        "radio.library.artist": "Artista",
        "radio.library.collection": "Colección",
        "radio.library.newCollectionName": "Nombre de nueva colección",
        "radio.library.fetchingInfo": "Obteniendo información…",
        "radio.library.addFromYouTube": "URL de YouTube o ID de vídeo",
        "radio.management.renameCollection": "Renombrar colección",
        "radio.management.deleteCollection": "Eliminar colección",
        "radio.management.renameSong": "Renombrar canción",
        "radio.management.deleteSong": "Eliminar canción",
        "radio.management.moveTo": "Mover a",
        "radio.renameCollection.title": "Renombrar colección",
        "radio.renameCollection.label": "Nombre de la colección",
        "radio.renameSong.title": "Renombrar canción",
        "radio.renameSong.label": "Título de la canción",
        "radio.settings.title": "Radio",
        "radio.settings.parentMode": "Modo padre",
        "radio.settings.shuffle": "Aleatorio",
        "radio.settings.repeat": "Repetir",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.add": "Añadir",
        "common.settings": "Ajustes",
    ]

    private static let radioDE: [String: String] = [
        "radio.appName": "Radio",
        "radio.collections.title": "Sammlungen",
        "radio.collections.songs": "{count} Lieder",
        "radio.collections.empty": "Noch keine Lieder",
        "radio.collections.addHint": "Verwende die +-Schaltfläche in der Kopfzeile, um YouTube-Songs zu dieser Sammlung hinzuzufügen.",
        "radio.collections.moreInCollection": "Mehr in dieser Sammlung",
        "radio.player.play": "Abspielen",
        "radio.player.pause": "Pausieren",
        "radio.player.next": "Weiter",
        "radio.player.previous": "Zurück",
        "radio.player.shuffle": "Zufällig",
        "radio.player.repeat": "Wiederholen",
        "radio.library.addSong": "Song hinzufügen",
        "radio.library.songTitle": "Songtitel",
        "radio.library.artist": "Künstler",
        "radio.library.collection": "Sammlung",
        "radio.library.newCollectionName": "Name der neuen Sammlung",
        "radio.library.fetchingInfo": "Infos werden abgerufen…",
        "radio.library.addFromYouTube": "YouTube-URL oder Video-ID",
        "radio.management.renameCollection": "Sammlung umbenennen",
        "radio.management.deleteCollection": "Sammlung löschen",
        "radio.management.renameSong": "Song umbenennen",
        "radio.management.deleteSong": "Song löschen",
        "radio.management.moveTo": "Verschieben nach",
        "radio.renameCollection.title": "Sammlung umbenennen",
        "radio.renameCollection.label": "Sammlungsname",
        "radio.renameSong.title": "Song umbenennen",
        "radio.renameSong.label": "Songtitel",
        "radio.settings.title": "Radio",
        "radio.settings.parentMode": "Elternmodus",
        "radio.settings.shuffle": "Zufällig",
        "radio.settings.repeat": "Wiederholen",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.add": "Hinzufügen",
        "common.settings": "Einstellungen",
    ]

    private static let radioPT: [String: String] = [
        "radio.appName": "Rádio",
        "radio.collections.title": "Coleções",
        "radio.collections.songs": "{count} músicas",
        "radio.collections.empty": "Ainda sem músicas",
        "radio.collections.addHint": "Use o botão + no cabeçalho para adicionar músicas do YouTube a esta coleção.",
        "radio.collections.moreInCollection": "Mais nesta coleção",
        "radio.player.play": "Tocar",
        "radio.player.pause": "Pausar",
        "radio.player.next": "Próximo",
        "radio.player.previous": "Anterior",
        "radio.player.shuffle": "Aleatório",
        "radio.player.repeat": "Repetir",
        "radio.library.addSong": "Adicionar música",
        "radio.library.songTitle": "Título da música",
        "radio.library.artist": "Artista",
        "radio.library.collection": "Coleção",
        "radio.library.newCollectionName": "Nome da nova coleção",
        "radio.library.fetchingInfo": "A obter informações…",
        "radio.library.addFromYouTube": "URL do YouTube ou ID do vídeo",
        "radio.management.renameCollection": "Renomear coleção",
        "radio.management.deleteCollection": "Eliminar coleção",
        "radio.management.renameSong": "Renomear música",
        "radio.management.deleteSong": "Eliminar música",
        "radio.management.moveTo": "Mover para",
        "radio.renameCollection.title": "Renomear coleção",
        "radio.renameCollection.label": "Nome da coleção",
        "radio.renameSong.title": "Renomear música",
        "radio.renameSong.label": "Título da música",
        "radio.settings.title": "Rádio",
        "radio.settings.parentMode": "Modo parental",
        "radio.settings.shuffle": "Aleatório",
        "radio.settings.repeat": "Repetir",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.add": "Adicionar",
        "common.settings": "Definições",
    ]

    private static var radioBundles: [(String, [String: String])] {
        [("en", radioEN), ("nl", radioNL), ("fr", radioFR), ("es", radioES), ("de", radioDE), ("pt", radioPT)]
    }

    // MARK: Yes No

    private static let yesNoEN: [String: String] = [
        "yesNo.appName": "Yes No",
        "yesNo.sentence.label": "Sentence to speak",
        "yesNo.sentence.default": "Do you want to go eat?",
        "yesNo.sentence.reset": "Reset",
        "yesNo.sentence.speak": "Speak sentence",
        "yesNo.answers.yes": "Yes",
        "yesNo.answers.no": "No",
        "yesNo.history.label": "Answer history",
        "yesNo.history.title": "History",
        "yesNo.history.empty": "No answers yet.",
        "yesNo.latestAnswer": "Latest answer",
        "yesNo.status.answerCount": "{count} answers",
        "yesNo.settings.title": "Yes No",
        "yesNo.settings.speakAnswers": "Speak answers",
        "yesNo.settings.answerStyle": "Answer style",
        "yesNo.settings.answerTiles": "Answer tiles",
        "yesNo.settings.answerTilesDefault": "Default",
        "yesNo.question.empty": "No questions yet",
        "yesNo.question.hint": "Questions appear here after you ask them with Yes or No.",
        "yesNo.history.popup.title": "Question history",
        "yesNo.history.popup.subtitle": "Recently typed questions.",
        "yesNo.answerStyle.popup.title": "Answer style",
        "yesNo.answerStyle.popup.subtitle": "Choose how the Yes and No buttons appear.",
        "yesNo.tileEditor.title": "Answer tiles",
        "yesNo.tileEditor.subtitle": "Choose the answers shown to the child.",
        "yesNo.tileEditor.empty": "Using the default Yes and No answers.",
        "yesNo.tileEditor.addTile": "Add tile",
        "yesNo.tileEditor.reset": "Reset",
        "yesNo.tileEditor.save": "Save",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static let yesNoNL: [String: String] = [
        "yesNo.answers.yes": "Ja",
        "yesNo.answers.no": "Nee",
        "yesNo.latestAnswer": "Laatste antwoord",
        "yesNo.status.answerCount": "{count} antwoorden",
        "yesNo.settings.title": "Ja Nee",
        "yesNo.settings.speakAnswers": "Antwoorden uitspreken",
        "yesNo.settings.answerStyle": "Antwoordstijl",
        "yesNo.settings.answerTiles": "Antwoordtegels",
        "yesNo.settings.answerTilesDefault": "Standaard",
        "yesNo.question.empty": "Nog geen vragen",
        "yesNo.question.hint": "Vragen verschijnen hier nadat je ze stelt.",
        "yesNo.history.popup.title": "Vraaggeschiedenis",
        "yesNo.history.popup.subtitle": "Recente vragen.",
        "yesNo.answerStyle.popup.title": "Antwoordstijl",
        "yesNo.answerStyle.popup.subtitle": "Kies hoe de Ja- en Nee-knoppen eruitzien.",
        "yesNo.tileEditor.title": "Antwoordtegels",
        "yesNo.tileEditor.subtitle": "Kies welke antwoorden het kind ziet.",
        "yesNo.tileEditor.empty": "De standaardantwoorden Ja en Nee worden gebruikt.",
        "yesNo.tileEditor.addTile": "Tegel toevoegen",
        "yesNo.tileEditor.reset": "Herstellen",
        "yesNo.tileEditor.save": "Opslaan",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.settings": "Instellingen",
    ]

    private static let yesNoFR: [String: String] = [
        "yesNo.answers.yes": "Oui",
        "yesNo.answers.no": "Non",
        "yesNo.latestAnswer": "Dernière réponse",
        "yesNo.status.answerCount": "{count} réponses",
        "yesNo.settings.title": "Oui Non",
        "yesNo.settings.speakAnswers": "Énoncer les réponses",
        "yesNo.settings.answerStyle": "Style de réponse",
        "yesNo.settings.answerTiles": "Tuiles de réponse",
        "yesNo.settings.answerTilesDefault": "Par défaut",
        "yesNo.question.empty": "Pas encore de questions",
        "yesNo.question.hint": "Les questions apparaissent ici après avoir répondu.",
        "yesNo.history.popup.title": "Historique des questions",
        "yesNo.history.popup.subtitle": "Questions récentes.",
        "yesNo.answerStyle.popup.title": "Style de réponse",
        "yesNo.answerStyle.popup.subtitle": "Choisissez l'apparence des boutons Oui et Non.",
        "yesNo.tileEditor.title": "Tuiles de réponse",
        "yesNo.tileEditor.subtitle": "Choisissez les réponses affichées à l'enfant.",
        "yesNo.tileEditor.empty": "Les réponses Oui et Non par défaut sont utilisées.",
        "yesNo.tileEditor.addTile": "Ajouter une tuile",
        "yesNo.tileEditor.reset": "Réinitialiser",
        "yesNo.tileEditor.save": "Enregistrer",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.settings": "Paramètres",
    ]

    private static let yesNoES: [String: String] = [
        "yesNo.answers.yes": "Sí",
        "yesNo.answers.no": "No",
        "yesNo.latestAnswer": "Última respuesta",
        "yesNo.status.answerCount": "{count} respuestas",
        "yesNo.settings.title": "Sí No",
        "yesNo.settings.speakAnswers": "Pronunciar respuestas",
        "yesNo.settings.answerStyle": "Estilo de respuesta",
        "yesNo.settings.answerTiles": "Tarjetas de respuesta",
        "yesNo.settings.answerTilesDefault": "Predeterminado",
        "yesNo.question.empty": "Aún no hay preguntas",
        "yesNo.question.hint": "Las preguntas aparecerán aquí después de responder.",
        "yesNo.history.popup.title": "Historial de preguntas",
        "yesNo.history.popup.subtitle": "Preguntas recientes.",
        "yesNo.answerStyle.popup.title": "Estilo de respuesta",
        "yesNo.answerStyle.popup.subtitle": "Elige cómo aparecen los botones Sí y No.",
        "yesNo.tileEditor.title": "Tarjetas de respuesta",
        "yesNo.tileEditor.subtitle": "Elige las respuestas que verá el niño.",
        "yesNo.tileEditor.empty": "Se usan las respuestas predeterminadas Sí y No.",
        "yesNo.tileEditor.addTile": "Añadir tarjeta",
        "yesNo.tileEditor.reset": "Restablecer",
        "yesNo.tileEditor.save": "Guardar",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.settings": "Ajustes",
    ]

    private static let yesNoDE: [String: String] = [
        "yesNo.answers.yes": "Ja",
        "yesNo.answers.no": "Nein",
        "yesNo.latestAnswer": "Letzte Antwort",
        "yesNo.status.answerCount": "{count} Antworten",
        "yesNo.settings.title": "Ja Nein",
        "yesNo.settings.speakAnswers": "Antworten vorlesen",
        "yesNo.settings.answerStyle": "Antwortstil",
        "yesNo.settings.answerTiles": "Antwortkacheln",
        "yesNo.settings.answerTilesDefault": "Standard",
        "yesNo.question.empty": "Noch keine Fragen",
        "yesNo.question.hint": "Fragen erscheinen hier nach dem Antworten.",
        "yesNo.history.popup.title": "Fragenverlauf",
        "yesNo.history.popup.subtitle": "Aktuelle Fragen.",
        "yesNo.answerStyle.popup.title": "Antwortstil",
        "yesNo.answerStyle.popup.subtitle": "Wähle, wie die Ja- und Nein-Schaltflächen aussehen.",
        "yesNo.tileEditor.title": "Antwortkacheln",
        "yesNo.tileEditor.subtitle": "Wähle die Antworten, die dem Kind angezeigt werden.",
        "yesNo.tileEditor.empty": "Die Standardantworten Ja und Nein werden verwendet.",
        "yesNo.tileEditor.addTile": "Kachel hinzufügen",
        "yesNo.tileEditor.reset": "Zurücksetzen",
        "yesNo.tileEditor.save": "Speichern",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.settings": "Einstellungen",
    ]

    private static let yesNoMT: [String: String] = [
        "yesNo.appName": "Iva Le",
        "yesNo.answers.yes": "Iva",
        "yesNo.answers.no": "Le",
        "yesNo.latestAnswer": "L-aħħar risposta",
        "yesNo.status.answerCount": "{count} risposti",
        "yesNo.settings.title": "Iva Le",
        "yesNo.settings.speakAnswers": "Aqra r-risposti",
        "yesNo.settings.answerStyle": "Stil tar-risposti",
        "yesNo.settings.answerTiles": "Madum tar-risposti",
        "yesNo.settings.answerTilesDefault": "Default",
        "yesNo.tileEditor.title": "Madum tar-risposti",
        "yesNo.tileEditor.subtitle": "Agħżel ir-risposti murija lit-tifel jew tifla.",
        "yesNo.tileEditor.empty": "Qed jintużaw ir-risposti default Iva u Le.",
        "yesNo.tileEditor.addTile": "Żid maduma",
        "yesNo.tileEditor.reset": "Irrisettja",
        "yesNo.tileEditor.save": "Issejvja",
        "common.cancel": "Ikkanċella",
        "common.save": "Issejvja",
        "common.settings": "Settings",
    ]

    private static var yesNoBundles: [(String, [String: String])] {
        [("en", yesNoEN), ("nl", yesNoNL), ("fr", yesNoFR), ("es", yesNoES), ("de", yesNoDE), ("mt", yesNoMT)]
    }

    // MARK: Cards

    private static let cardsEN: [String: String] = [
        "cards.appName": "Cards",
        "cards.collections.empty": "No collections yet.",
        "cards.collections.addNew": "Add collection",
        "cards.collections.newName": "New collection name",
        "cards.collections.create": "Create",
        "cards.tiles.empty": "No tiles yet.",
        "cards.tiles.addNew": "Add tile",
        "cards.tiles.newName": "New tile name",
        "cards.settings.restoreDefaults": "Restore defaults",
        "cards.settings.restoreConfirm": "This will show all default collections again.",
        "cards.settings.title": "Cards",
        "cards.settings.parentMode": "Parent mode",
        "cards.settings.collections": "Collections",
        "cards.settings.hideDefaultSets": "Hide default sets",
        "cards.settings.display": "Display",
        "cards.settings.showAnimations": "Show animations",
        "cards.settings.accessibility": "Accessibility",
        "cards.settings.cardSize": "Card size",
        "cards.settings.labelSize": "Label size",
        "cards.add.newCategory": "New category",
        "cards.add.editCategory": "Edit category",
        "cards.add.newCard": "New card",
        "cards.add.editCard": "Edit card",
        "cards.add.name": "Name",
        "cards.add.color": "Color",
        "cards.add.image": "Image",
        "cards.add.spokenText": "Spoken text",
        "cards.add.whatShouldBeSpoken": "What should be spoken",
        "cards.add.addCategory": "Add category",
        "cards.add.addCard": "Add card",
        "cards.add.saveChanges": "Save changes",
        "cards.add.suggestionsFromTiko": "Suggestions from Tiko",
        "cards.add.addImage": "Add image",
        "cards.add.changeImage": "Change image",
        "cards.add.tapToChooseDifferent": "Tap to choose a different one",
        "cards.add.namePlaceholderCategory": "e.g. Food",
        "cards.add.namePlaceholderCard": "e.g. Apple",
        // Default collection names
        "cards.default.__default_animals": "Animals",
        "cards.default.__default_colors": "Colors",
        "cards.default.__default_food": "Food & Drinks",
        "cards.default.__default_body": "Body Parts",
        "cards.default.__default_shapes": "Shapes",
        "cards.default.__default_emotions": "Emotions",
        "cards.default.__default_transport": "Transport",
        "cards.default.__default_numbers": "Numbers",
        "cards.default.__default_letters": "Letters",
        // Animals
        "cards.default.animal_dog": "Dog",
        "cards.default.animal_cat": "Cat",
        "cards.default.animal_bird": "Bird",
        "cards.default.animal_fish": "Fish",
        "cards.default.animal_horse": "Horse",
        "cards.default.animal_cow": "Cow",
        "cards.default.animal_pig": "Pig",
        "cards.default.animal_chicken": "Chicken",
        "cards.default.animal_duck": "Duck",
        "cards.default.animal_sheep": "Sheep",
        "cards.default.animal_rabbit": "Rabbit",
        "cards.default.animal_mouse": "Mouse",
        "cards.default.animal_frog": "Frog",
        "cards.default.animal_butterfly": "Butterfly",
        "cards.default.animal_snake": "Snake",
        "cards.default.animal_turtle": "Turtle",
        "cards.default.animal_lion": "Lion",
        "cards.default.animal_elephant": "Elephant",
        "cards.default.animal_giraffe": "Giraffe",
        "cards.default.animal_monkey": "Monkey",
        "cards.default.animal_penguin": "Penguin",
        "cards.default.animal_bear": "Bear",
        "cards.default.animal_zebra": "Zebra",
        "cards.default.animal_owl": "Owl",
        "cards.default.animal_bee": "Bee",
        "cards.default.animal_ant": "Ant",
        "cards.default.animal_spider": "Spider",
        "cards.default.animal_dolphin": "Dolphin",
        "cards.default.animal_shark": "Shark",
        "cards.default.animal_whale": "Whale",
        "cards.default.animal_crab": "Crab",
        "cards.default.animal_octopus": "Octopus",
        "cards.default.animal_parrot": "Parrot",
        "cards.default.animal_eagle": "Eagle",
        "cards.default.animal_flamingo": "Flamingo",
        "cards.default.animal_fox": "Fox",
        "cards.default.animal_deer": "Deer",
        "cards.default.animal_wolf": "Wolf",
        "cards.default.animal_crocodile": "Crocodile",
        // Colors
        "cards.default.color_red": "Red",
        "cards.default.color_orange": "Orange",
        "cards.default.color_yellow": "Yellow",
        "cards.default.color_green": "Green",
        "cards.default.color_blue": "Blue",
        "cards.default.color_purple": "Purple",
        "cards.default.color_pink": "Pink",
        "cards.default.color_brown": "Brown",
        "cards.default.color_black": "Black",
        "cards.default.color_white": "White",
        "cards.default.color_gray": "Gray",
        "cards.default.color_gold": "Gold",
        "cards.default.color_silver": "Silver",
        "cards.default.color_beige": "Beige",
        "cards.default.color_maroon": "Maroon",
        "cards.default.color_navy": "Navy",
        "cards.default.color_teal": "Teal",
        "cards.default.color_coral": "Coral",
        "cards.default.color_lime": "Lime",
        "cards.default.color_lavender": "Lavender",
        "cards.default.color_cyan": "Cyan",
        "cards.default.color_magenta": "Magenta",
        "cards.default.color_olive": "Olive",
        "cards.default.color_peach": "Peach",
        // Food & Drinks
        "cards.default.food_apple": "Apple",
        "cards.default.food_banana": "Banana",
        "cards.default.food_bread": "Bread",
        "cards.default.food_milk": "Milk",
        "cards.default.food_water": "Water",
        "cards.default.food_juice": "Juice",
        "cards.default.food_cheese": "Cheese",
        "cards.default.food_rice": "Rice",
        "cards.default.food_pizza": "Pizza",
        "cards.default.food_cake": "Cake",
        "cards.default.food_egg": "Egg",
        "cards.default.food_grape": "Grape",
        "cards.default.food_strawberry": "Strawberry",
        "cards.default.food_carrot": "Carrot",
        "cards.default.food_tomato": "Tomato",
        "cards.default.food_potato": "Potato",
        "cards.default.food_corn": "Corn",
        "cards.default.food_onion": "Onion",
        "cards.default.food_mushroom": "Mushroom",
        "cards.default.food_broccoli": "Broccoli",
        "cards.default.food_soup": "Soup",
        "cards.default.food_pasta": "Pasta",
        "cards.default.food_burger": "Burger",
        "cards.default.food_hotdog": "Hot Dog",
        "cards.default.food_icecream": "Ice Cream",
        "cards.default.food_cookie": "Cookie",
        "cards.default.food_chocolate": "Chocolate",
        "cards.default.food_donut": "Donut",
        "cards.default.food_pancake": "Pancake",
        "cards.default.food_cereal": "Cereal",
        "cards.default.food_popcorn": "Popcorn",
        "cards.default.food_watermelon": "Watermelon",
        "cards.default.food_lemon": "Lemon",
        "cards.default.food_pineapple": "Pineapple",
        "cards.default.food_mango": "Mango",
        "cards.default.food_cherry": "Cherry",
        "cards.default.food_pear": "Pear",
        "cards.default.food_orange_fruit": "Orange",
        "cards.default.food_grapefruit": "Grapefruit",
        "cards.default.food_kiwi": "Kiwi",
        "cards.default.food_peach_fruit": "Peach",
        "cards.default.food_plum": "Plum",
        "cards.default.food_cucumber": "Cucumber",
        "cards.default.food_pepper": "Pepper",
        "cards.default.food_avocado": "Avocado",
        "cards.default.food_sandwich": "Sandwich",
        "cards.default.food_taco": "Taco",
        "cards.default.food_sushi": "Sushi",
        "cards.default.food_noodles": "Noodles",
        "cards.default.food_sausage": "Sausage",
        "cards.default.food_tea": "Tea",
        "cards.default.food_coffee": "Coffee",
        "cards.default.food_smoothie": "Smoothie",
        // Body Parts
        "cards.default.body_head": "Head",
        "cards.default.body_hair": "Hair",
        "cards.default.body_face": "Face",
        "cards.default.body_eyes": "Eyes",
        "cards.default.body_nose": "Nose",
        "cards.default.body_mouth": "Mouth",
        "cards.default.body_ears": "Ears",
        "cards.default.body_teeth": "Teeth",
        "cards.default.body_tongue": "Tongue",
        "cards.default.body_chin": "Chin",
        "cards.default.body_neck": "Neck",
        "cards.default.body_shoulders": "Shoulders",
        "cards.default.body_chest": "Chest",
        "cards.default.body_back": "Back",
        "cards.default.body_stomach": "Stomach",
        "cards.default.body_hands": "Hands",
        "cards.default.body_fingers": "Fingers",
        "cards.default.body_thumb": "Thumb",
        "cards.default.body_wrist": "Wrist",
        "cards.default.body_arms": "Arms",
        "cards.default.body_elbow": "Elbow",
        "cards.default.body_legs": "Legs",
        "cards.default.body_knees": "Knees",
        "cards.default.body_feet": "Feet",
        "cards.default.body_toes": "Toes",
        "cards.default.body_ankle": "Ankle",
        "cards.default.body_heel": "Heel",
        // Shapes
        "cards.default.shape_circle": "Circle",
        "cards.default.shape_square": "Square",
        "cards.default.shape_triangle": "Triangle",
        "cards.default.shape_rectangle": "Rectangle",
        "cards.default.shape_oval": "Oval",
        "cards.default.shape_star": "Star",
        "cards.default.shape_heart": "Heart",
        "cards.default.shape_diamond": "Diamond",
        "cards.default.shape_hexagon": "Hexagon",
        "cards.default.shape_pentagon": "Pentagon",
        "cards.default.shape_crescent": "Crescent",
        "cards.default.shape_cross": "Cross",
        "cards.default.shape_arrow": "Arrow",
        "cards.default.shape_sphere": "Sphere",
        "cards.default.shape_cube": "Cube",
        "cards.default.shape_pyramid": "Pyramid",
        "cards.default.shape_cylinder": "Cylinder",
        "cards.default.shape_cone": "Cone",
        // Emotions
        "cards.default.emotion_happy": "Happy",
        "cards.default.emotion_sad": "Sad",
        "cards.default.emotion_angry": "Angry",
        "cards.default.emotion_scared": "Scared",
        "cards.default.emotion_surprised": "Surprised",
        "cards.default.emotion_tired": "Tired",
        "cards.default.emotion_excited": "Excited",
        "cards.default.emotion_calm": "Calm",
        "cards.default.emotion_confused": "Confused",
        "cards.default.emotion_shy": "Shy",
        "cards.default.emotion_proud": "Proud",
        "cards.default.emotion_grumpy": "Grumpy",
        "cards.default.emotion_brave": "Brave",
        "cards.default.emotion_curious": "Curious",
        "cards.default.emotion_lonely": "Lonely",
        "cards.default.emotion_grateful": "Grateful",
        "cards.default.emotion_nervous": "Nervous",
        "cards.default.emotion_silly": "Silly",
        "cards.default.emotion_love": "Love",
        "cards.default.emotion_bored": "Bored",
        // Transport
        "cards.default.transport_car": "Car",
        "cards.default.transport_bus": "Bus",
        "cards.default.transport_train": "Train",
        "cards.default.transport_truck": "Truck",
        "cards.default.transport_airplane": "Airplane",
        "cards.default.transport_helicopter": "Helicopter",
        "cards.default.transport_boat": "Boat",
        "cards.default.transport_ship": "Ship",
        "cards.default.transport_bicycle": "Bicycle",
        "cards.default.transport_motorcycle": "Motorcycle",
        "cards.default.transport_scooter": "Scooter",
        "cards.default.transport_taxi": "Taxi",
        "cards.default.transport_ambulance": "Ambulance",
        "cards.default.transport_firetruck": "Fire Truck",
        "cards.default.transport_policecar": "Police Car",
        "cards.default.transport_tractor": "Tractor",
        "cards.default.transport_rocket": "Rocket",
        "cards.default.transport_submarine": "Submarine",
        "cards.default.transport_balloon": "Hot Air Balloon",
        "cards.default.transport_skateboard": "Skateboard",
        "cards.default.transport_roller_coaster": "Roller Coaster",
        "cards.default.transport_jeep": "Jeep",
        "cards.default.transport_van": "Van",
        "cards.default.transport_canoe": "Canoe",
        // Numbers
        "cards.default.num_1": "One",
        "cards.default.num_2": "Two",
        "cards.default.num_3": "Three",
        "cards.default.num_4": "Four",
        "cards.default.num_5": "Five",
        "cards.default.num_6": "Six",
        "cards.default.num_7": "Seven",
        "cards.default.num_8": "Eight",
        "cards.default.num_9": "Nine",
        "cards.default.num_10": "Ten",
        "cards.default.num_11": "Eleven",
        "cards.default.num_12": "Twelve",
        "cards.default.num_13": "Thirteen",
        "cards.default.num_14": "Fourteen",
        "cards.default.num_15": "Fifteen",
        "cards.default.num_16": "Sixteen",
        "cards.default.num_17": "Seventeen",
        "cards.default.num_18": "Eighteen",
        "cards.default.num_19": "Nineteen",
        "cards.default.num_20": "Twenty",
        // Letters
        "cards.default.letter_a": "A",
        "cards.default.letter_b": "B",
        "cards.default.letter_c": "C",
        "cards.default.letter_d": "D",
        "cards.default.letter_e": "E",
        "cards.default.letter_f": "F",
        "cards.default.letter_g": "G",
        "cards.default.letter_h": "H",
        "cards.default.letter_i": "I",
        "cards.default.letter_j": "J",
        "cards.default.letter_k": "K",
        "cards.default.letter_l": "L",
        "cards.default.letter_m": "M",
        "cards.default.letter_n": "N",
        "cards.default.letter_o": "O",
        "cards.default.letter_p": "P",
        "cards.default.letter_q": "Q",
        "cards.default.letter_r": "R",
        "cards.default.letter_s": "S",
        "cards.default.letter_t": "T",
        "cards.default.letter_u": "U",
        "cards.default.letter_v": "V",
        "cards.default.letter_w": "W",
        "cards.default.letter_x": "X",
        "cards.default.letter_y": "Y",
        "cards.default.letter_z": "Z",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static let cardsNL: [String: String] = [
        "cards.appName": "Kaarten",
        "cards.collections.empty": "Nog geen collecties.",
        "cards.collections.addNew": "Collectie toevoegen",
        "cards.collections.newName": "Naam nieuwe collectie",
        "cards.collections.create": "Aanmaken",
        "cards.tiles.empty": "Nog geen kaarten.",
        "cards.tiles.addNew": "Kaart toevoegen",
        "cards.settings.restoreDefaults": "Standaard herstellen",
        "cards.settings.restoreConfirm": "Dit laat alle standaardcollecties weer zien.",
        "cards.settings.title": "Kaarten",
        "cards.settings.parentMode": "Oudermodus",
        "cards.settings.collections": "Collecties",
        "cards.settings.hideDefaultSets": "Standaardsets verbergen",
        "cards.settings.display": "Weergave",
        "cards.settings.showAnimations": "Animaties tonen",
        "cards.settings.accessibility": "Toegankelijkheid",
        "cards.settings.cardSize": "Kaartgrootte",
        "cards.settings.labelSize": "Labelgrootte",
        "cards.add.newCategory": "Nieuwe categorie",
        "cards.add.editCategory": "Categorie bewerken",
        "cards.add.newCard": "Nieuwe kaart",
        "cards.add.editCard": "Kaart bewerken",
        "cards.add.name": "Naam",
        "cards.add.color": "Kleur",
        "cards.add.image": "Afbeelding",
        "cards.add.spokenText": "Uitgesproken tekst",
        "cards.add.whatShouldBeSpoken": "Wat moet worden gezegd",
        "cards.add.addCategory": "Categorie toevoegen",
        "cards.add.addCard": "Kaart toevoegen",
        "cards.add.saveChanges": "Wijzigingen opslaan",
        "cards.add.suggestionsFromTiko": "Suggesties van Tiko",
        "cards.add.addImage": "Afbeelding toevoegen",
        "cards.add.changeImage": "Afbeelding wijzigen",
        "cards.add.tapToChooseDifferent": "Tik om een andere te kiezen",
        "cards.add.namePlaceholderCategory": "bijv. Eten",
        "cards.add.namePlaceholderCard": "bijv. Appel",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.settings": "Instellingen",
    ]

    private static let cardsFR: [String: String] = [
        "cards.appName": "Cartes",
        "cards.collections.empty": "Aucune collection pour l'instant.",
        "cards.collections.addNew": "Ajouter une collection",
        "cards.collections.newName": "Nom de la nouvelle collection",
        "cards.collections.create": "Créer",
        "cards.tiles.empty": "Aucune carte pour l'instant.",
        "cards.tiles.addNew": "Ajouter une carte",
        "cards.settings.restoreDefaults": "Restaurer les valeurs par défaut",
        "cards.settings.restoreConfirm": "Cela réaffichera toutes les collections par défaut.",
        "cards.settings.title": "Cartes",
        "cards.settings.parentMode": "Mode parent",
        "cards.settings.collections": "Collections",
        "cards.settings.hideDefaultSets": "Masquer les ensembles par défaut",
        "cards.settings.display": "Affichage",
        "cards.settings.showAnimations": "Afficher les animations",
        "cards.settings.accessibility": "Accessibilité",
        "cards.settings.cardSize": "Taille des cartes",
        "cards.settings.labelSize": "Taille des étiquettes",
        "cards.add.newCategory": "Nouvelle catégorie",
        "cards.add.editCategory": "Modifier la catégorie",
        "cards.add.newCard": "Nouvelle carte",
        "cards.add.editCard": "Modifier la carte",
        "cards.add.name": "Nom",
        "cards.add.color": "Couleur",
        "cards.add.image": "Image",
        "cards.add.spokenText": "Texte prononcé",
        "cards.add.whatShouldBeSpoken": "Ce qui doit être prononcé",
        "cards.add.addCategory": "Ajouter une catégorie",
        "cards.add.addCard": "Ajouter une carte",
        "cards.add.saveChanges": "Enregistrer les modifications",
        "cards.add.suggestionsFromTiko": "Suggestions de Tiko",
        "cards.add.addImage": "Ajouter une image",
        "cards.add.changeImage": "Changer l'image",
        "cards.add.tapToChooseDifferent": "Appuyez pour en choisir une autre",
        "cards.add.namePlaceholderCategory": "ex. Nourriture",
        "cards.add.namePlaceholderCard": "ex. Pomme",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.settings": "Paramètres",
    ]

    private static let cardsES: [String: String] = [
        "cards.appName": "Tarjetas",
        "cards.collections.empty": "Aún no hay colecciones.",
        "cards.collections.addNew": "Añadir colección",
        "cards.collections.newName": "Nombre de nueva colección",
        "cards.collections.create": "Crear",
        "cards.tiles.empty": "Aún no hay tarjetas.",
        "cards.tiles.addNew": "Añadir tarjeta",
        "cards.settings.restoreDefaults": "Restaurar por defecto",
        "cards.settings.restoreConfirm": "Esto mostrará de nuevo todas las colecciones predeterminadas.",
        "cards.settings.title": "Tarjetas",
        "cards.settings.parentMode": "Modo padre",
        "cards.settings.collections": "Colecciones",
        "cards.settings.hideDefaultSets": "Ocultar conjuntos predeterminados",
        "cards.settings.display": "Pantalla",
        "cards.settings.showAnimations": "Mostrar animaciones",
        "cards.settings.accessibility": "Accesibilidad",
        "cards.settings.cardSize": "Tamaño de tarjeta",
        "cards.settings.labelSize": "Tamaño de etiqueta",
        "cards.add.newCategory": "Nueva categoría",
        "cards.add.editCategory": "Editar categoría",
        "cards.add.newCard": "Nueva tarjeta",
        "cards.add.editCard": "Editar tarjeta",
        "cards.add.name": "Nombre",
        "cards.add.color": "Color",
        "cards.add.image": "Imagen",
        "cards.add.spokenText": "Texto hablado",
        "cards.add.whatShouldBeSpoken": "Lo que se debe decir",
        "cards.add.addCategory": "Añadir categoría",
        "cards.add.addCard": "Añadir tarjeta",
        "cards.add.saveChanges": "Guardar cambios",
        "cards.add.suggestionsFromTiko": "Sugerencias de Tiko",
        "cards.add.addImage": "Añadir imagen",
        "cards.add.changeImage": "Cambiar imagen",
        "cards.add.tapToChooseDifferent": "Toca para elegir una diferente",
        "cards.add.namePlaceholderCategory": "ej. Comida",
        "cards.add.namePlaceholderCard": "ej. Manzana",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.settings": "Ajustes",
    ]

    private static let cardsDE: [String: String] = [
        "cards.appName": "Karten",
        "cards.collections.empty": "Noch keine Sammlungen.",
        "cards.collections.addNew": "Sammlung hinzufügen",
        "cards.collections.newName": "Name der neuen Sammlung",
        "cards.collections.create": "Erstellen",
        "cards.tiles.empty": "Noch keine Karten.",
        "cards.tiles.addNew": "Karte hinzufügen",
        "cards.settings.restoreDefaults": "Standards zurücksetzen",
        "cards.settings.restoreConfirm": "Damit werden alle Standardsammlungen wieder angezeigt.",
        "cards.settings.title": "Karten",
        "cards.settings.parentMode": "Elternmodus",
        "cards.settings.collections": "Sammlungen",
        "cards.settings.hideDefaultSets": "Standard-Sets ausblenden",
        "cards.settings.display": "Anzeige",
        "cards.settings.showAnimations": "Animationen anzeigen",
        "cards.settings.accessibility": "Barrierefreiheit",
        "cards.settings.cardSize": "Kartengröße",
        "cards.settings.labelSize": "Beschriftungsgröße",
        "cards.add.newCategory": "Neue Kategorie",
        "cards.add.editCategory": "Kategorie bearbeiten",
        "cards.add.newCard": "Neue Karte",
        "cards.add.editCard": "Karte bearbeiten",
        "cards.add.name": "Name",
        "cards.add.color": "Farbe",
        "cards.add.image": "Bild",
        "cards.add.spokenText": "Gesprochener Text",
        "cards.add.whatShouldBeSpoken": "Was gesprochen werden soll",
        "cards.add.addCategory": "Kategorie hinzufügen",
        "cards.add.addCard": "Karte hinzufügen",
        "cards.add.saveChanges": "Änderungen speichern",
        "cards.add.suggestionsFromTiko": "Vorschläge von Tiko",
        "cards.add.addImage": "Bild hinzufügen",
        "cards.add.changeImage": "Bild ändern",
        "cards.add.tapToChooseDifferent": "Tippen zum Wechseln",
        "cards.add.namePlaceholderCategory": "z.B. Essen",
        "cards.add.namePlaceholderCard": "z.B. Apfel",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.settings": "Einstellungen",
    ]

    private static var cardsBundles: [(String, [String: String])] {
        [("en", cardsEN), ("nl", cardsNL), ("fr", cardsFR), ("es", cardsES), ("de", cardsDE)]
    }

    // MARK: Timer

    private static let timerEN: [String: String] = [
        "timer.appName": "Timer",
        "timer.display.expired": "Time is up!",
        "timer.controls.start": "Start",
        "timer.controls.pause": "Pause",
        "timer.controls.resume": "Resume",
        "timer.controls.reset": "Reset",
        "timer.presets.oneMin": "1 min",
        "timer.presets.threeMin": "3 min",
        "timer.presets.fiveMin": "5 min",
        "timer.presets.tenMin": "10 min",
        "timer.settings.title": "Timer",
        "timer.settings.sound": "Sound when done",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static let timerNL: [String: String] = [
        "timer.appName": "Timer",
        "timer.display.expired": "Tijd is om!",
        "timer.controls.start": "Starten",
        "timer.controls.pause": "Pauzeren",
        "timer.controls.resume": "Hervatten",
        "timer.controls.reset": "Herstellen",
        "timer.settings.title": "Timer",
        "timer.settings.sound": "Geluid bij voltooiing",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.settings": "Instellingen",
    ]

    private static let timerFR: [String: String] = [
        "timer.appName": "Minuteur",
        "timer.display.expired": "Temps écoulé !",
        "timer.controls.start": "Démarrer",
        "timer.controls.pause": "Pause",
        "timer.controls.resume": "Reprendre",
        "timer.controls.reset": "Réinitialiser",
        "timer.settings.title": "Minuteur",
        "timer.settings.sound": "Son à la fin",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.settings": "Paramètres",
    ]

    private static let timerES: [String: String] = [
        "timer.appName": "Temporizador",
        "timer.display.expired": "¡Tiempo agotado!",
        "timer.controls.start": "Iniciar",
        "timer.controls.pause": "Pausar",
        "timer.controls.resume": "Reanudar",
        "timer.controls.reset": "Reiniciar",
        "timer.settings.title": "Temporizador",
        "timer.settings.sound": "Sonido al terminar",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.settings": "Ajustes",
    ]

    private static let timerDE: [String: String] = [
        "timer.appName": "Timer",
        "timer.display.expired": "Zeit abgelaufen!",
        "timer.controls.start": "Starten",
        "timer.controls.pause": "Pausieren",
        "timer.controls.resume": "Fortsetzen",
        "timer.controls.reset": "Zurücksetzen",
        "timer.settings.title": "Timer",
        "timer.settings.sound": "Ton bei Ablauf",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.settings": "Einstellungen",
    ]

    private static var timerBundles: [(String, [String: String])] {
        [("en", timerEN), ("nl", timerNL), ("fr", timerFR), ("es", timerES), ("de", timerDE)]
    }

    // MARK: Type

    private static let typeEN: [String: String] = [
        "type.appName": "Type",
        "type.compose.placeholder": "Type what you want to say",
        "type.compose.speak": "Speak",
        "type.compose.clear": "Clear",
        "type.phrases.title": "Saved phrases",
        "type.phrases.empty": "No saved phrases yet.",
        "type.settings.title": "Type",
        "type.settings.parentMode": "Parent mode",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static let typeNL: [String: String] = [
        "type.appName": "Typen",
        "type.compose.placeholder": "Typ wat je wilt zeggen",
        "type.compose.speak": "Spreek",
        "type.compose.clear": "Wissen",
        "type.phrases.title": "Opgeslagen zinnen",
        "type.phrases.empty": "Nog geen opgeslagen zinnen.",
        "type.settings.title": "Typen",
        "type.settings.parentMode": "Oudermodus",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.settings": "Instellingen",
    ]

    private static let typeFR: [String: String] = [
        "type.appName": "Taper",
        "type.compose.placeholder": "Tapez ce que vous voulez dire",
        "type.compose.speak": "Parler",
        "type.compose.clear": "Effacer",
        "type.phrases.title": "Phrases enregistrées",
        "type.phrases.empty": "Pas encore de phrases enregistrées.",
        "type.settings.title": "Taper",
        "type.settings.parentMode": "Mode parent",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.settings": "Paramètres",
    ]

    private static let typeES: [String: String] = [
        "type.appName": "Escribir",
        "type.compose.placeholder": "Escribe lo que quieres decir",
        "type.compose.speak": "Hablar",
        "type.compose.clear": "Borrar",
        "type.phrases.title": "Frases guardadas",
        "type.phrases.empty": "Aún no hay frases guardadas.",
        "type.settings.title": "Escribir",
        "type.settings.parentMode": "Modo padre",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.settings": "Ajustes",
    ]

    private static var typeBundles: [(String, [String: String])] {
        [("en", typeEN), ("nl", typeNL), ("fr", typeFR), ("es", typeES)]
    }

    // MARK: Sequence

    private static let sequenceEN: [String: String] = [
        "sequence.appName": "Sequence",
        "sequence.empty.title": "No sequences yet",
        "sequence.empty.description": "Create your first sequence to get started.",
        "sequence.empty.create": "Create sequence",
        "sequence.settings.title": "Sequence",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static var sequenceBundles: [(String, [String: String])] { [("en", sequenceEN)] }

    // MARK: Todo

    private static let todoEN: [String: String] = [
        "todo.appName": "Todo",
        "todo.empty.title": "No items yet",
        "todo.empty.description": "Add your first task to get started.",
        "todo.settings.title": "Todo",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static var todoBundles: [(String, [String: String])] { [("en", todoEN)] }
}
