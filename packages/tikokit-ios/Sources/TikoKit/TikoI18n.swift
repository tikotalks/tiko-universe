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

public final class TikoI18n: ObservableObject {
    public let app: TikoAppKey
    @Published public private(set) var languageCode: String

    private let fallback = "en"
    private var bundles: [String: [String: String]] = [:]

    /// Set a Lezu project ID to enable remote translation fetching.
    public static var lezuProjectId: String? = nil

    public init(app: TikoAppKey, languageCode: String = "en") {
        self.app = app
        self.languageCode = languageCode
        loadLocalBundles()
    }

    // MARK: - Public API

    public func t(_ key: String, _ params: [String: Any] = [:]) -> String {
        let text = resolve(key) ?? key
        return params.isEmpty ? text : interpolate(text, params: params)
    }

    public func setLanguage(_ code: String) {
        languageCode = code
    }

    public func addBundle(languageCode: String, translations: [String: String]) {
        let k = bundleKey(app.rawValue, languageCode)
        if bundles[k] != nil {
            for (key, val) in translations { bundles[k]![key] = val }
        } else {
            bundles[k] = translations
        }
    }

    public func fetchLezuTranslations() async {
        guard let projectId = TikoI18n.lezuProjectId else { return }
        let langs = TikoLanguage.supportedLanguageCodes
        await withTaskGroup(of: Void.self) { group in
            for lang in langs {
                group.addTask { await self.fetchLezuBundle(projectId: projectId, languageCode: lang) }
            }
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

    private func fetchLezuBundle(projectId: String, languageCode: String) async {
        let urlString = "https://api.lezu.io/v1/projects/\(projectId)/translations/\(app.rawValue)/\(languageCode)"
        guard let url = URL(string: urlString),
              let (data, response) = try? await URLSession.shared.data(from: url),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: String]
        else { return }
        await MainActor.run { addBundle(languageCode: languageCode, translations: json) }
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
        "yesNo.question.empty": "No questions yet",
        "yesNo.question.hint": "Questions appear here after you ask them with Yes or No.",
        "yesNo.history.popup.title": "Question history",
        "yesNo.history.popup.subtitle": "Recently typed questions.",
        "yesNo.answerStyle.popup.title": "Answer style",
        "yesNo.answerStyle.popup.subtitle": "Choose how the Yes and No buttons appear.",
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
        "yesNo.question.empty": "Nog geen vragen",
        "yesNo.question.hint": "Vragen verschijnen hier nadat je ze stelt.",
        "yesNo.history.popup.title": "Vraaggeschiedenis",
        "yesNo.history.popup.subtitle": "Recente vragen.",
        "yesNo.answerStyle.popup.title": "Antwoordstijl",
        "yesNo.answerStyle.popup.subtitle": "Kies hoe de Ja- en Nee-knoppen eruitzien.",
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
        "yesNo.question.empty": "Pas encore de questions",
        "yesNo.question.hint": "Les questions apparaissent ici après avoir répondu.",
        "yesNo.history.popup.title": "Historique des questions",
        "yesNo.history.popup.subtitle": "Questions récentes.",
        "yesNo.answerStyle.popup.title": "Style de réponse",
        "yesNo.answerStyle.popup.subtitle": "Choisissez l'apparence des boutons Oui et Non.",
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
        "yesNo.question.empty": "Aún no hay preguntas",
        "yesNo.question.hint": "Las preguntas aparecerán aquí después de responder.",
        "yesNo.history.popup.title": "Historial de preguntas",
        "yesNo.history.popup.subtitle": "Preguntas recientes.",
        "yesNo.answerStyle.popup.title": "Estilo de respuesta",
        "yesNo.answerStyle.popup.subtitle": "Elige cómo aparecen los botones Sí y No.",
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
        "yesNo.question.empty": "Noch keine Fragen",
        "yesNo.question.hint": "Fragen erscheinen hier nach dem Antworten.",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.settings": "Einstellungen",
    ]

    private static var yesNoBundles: [(String, [String: String])] {
        [("en", yesNoEN), ("nl", yesNoNL), ("fr", yesNoFR), ("es", yesNoES), ("de", yesNoDE)]
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
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.settings": "Settings",
    ]

    private static let cardsNL: [String: String] = [
        "cards.appName": "Kaarten",
        "cards.settings.title": "Kaarten",
        "cards.settings.parentMode": "Oudermodus",
        "cards.settings.restoreDefaults": "Standaard herstellen",
        "cards.settings.restoreConfirm": "Dit laat alle standaardcollecties weer zien.",
        "common.cancel": "Annuleren",
        "common.save": "Opslaan",
        "common.settings": "Instellingen",
    ]

    private static let cardsFR: [String: String] = [
        "cards.appName": "Cartes",
        "cards.settings.title": "Cartes",
        "cards.settings.parentMode": "Mode parent",
        "cards.settings.restoreDefaults": "Restaurer les valeurs par défaut",
        "cards.settings.restoreConfirm": "Cela réaffichera toutes les collections par défaut.",
        "common.cancel": "Annuler",
        "common.save": "Enregistrer",
        "common.settings": "Paramètres",
    ]

    private static let cardsES: [String: String] = [
        "cards.appName": "Tarjetas",
        "cards.settings.title": "Tarjetas",
        "cards.settings.parentMode": "Modo padre",
        "cards.settings.restoreDefaults": "Restaurar por defecto",
        "cards.settings.restoreConfirm": "Esto mostrará de nuevo todas las colecciones predeterminadas.",
        "common.cancel": "Cancelar",
        "common.save": "Guardar",
        "common.settings": "Ajustes",
    ]

    private static var cardsBundles: [(String, [String: String])] {
        [("en", cardsEN), ("nl", cardsNL), ("fr", cardsFR), ("es", cardsES)]
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
