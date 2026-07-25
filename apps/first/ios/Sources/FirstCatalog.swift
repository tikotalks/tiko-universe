import Foundation
import TikoKit

/// The bundled routines. Structure (order, emoji, media keys, per-routine
/// defaults) lives in `defaultRoutines`; the words live in the localisation
/// tables below — data, not code branches, so a new language is a new column.
///
/// Everything here is a *default*: Parent Mode can rename, reorder, re-image,
/// add, remove and hide any of it, per language.
enum FirstCatalog {
    struct DefaultStep {
        let id: String
        let emoji: String
        /// English media-library key; unresolved keys simply keep the emoji.
        let mediaMatchKey: String?
    }

    struct DefaultRoutine {
        let id: String
        let emoji: String
        let mediaMatchKey: String?
        let dailyReset: Bool
        let sortOrder: Int
        let steps: [DefaultStep]
    }

    static let supportedLanguages = ["en", "nl", "fr", "es", "de", "mt"]

    // MARK: - Structure

    static let defaultRoutines: [DefaultRoutine] = [
        DefaultRoutine(id: "morning", emoji: "🌅", mediaMatchKey: "alarm clock", dailyReset: true, sortOrder: 0, steps: [
            DefaultStep(id: "morning.wake", emoji: "⏰", mediaMatchKey: "alarm clock"),
            DefaultStep(id: "morning.toilet", emoji: "🚽", mediaMatchKey: "toilet"),
            DefaultStep(id: "morning.teeth", emoji: "🪥", mediaMatchKey: "toothbrush"),
            DefaultStep(id: "morning.dress", emoji: "👕", mediaMatchKey: "t-shirt"),
            DefaultStep(id: "morning.breakfast", emoji: "🥣", mediaMatchKey: "cereal"),
        ]),
        DefaultRoutine(id: "bedtime", emoji: "🌙", mediaMatchKey: "moon", dailyReset: true, sortOrder: 1, steps: [
            DefaultStep(id: "bedtime.pyjamas", emoji: "🩳", mediaMatchKey: nil),
            DefaultStep(id: "bedtime.teeth", emoji: "🪥", mediaMatchKey: "toothbrush"),
            DefaultStep(id: "bedtime.toilet", emoji: "🚽", mediaMatchKey: "toilet"),
            DefaultStep(id: "bedtime.story", emoji: "📖", mediaMatchKey: "teddy bear with book"),
            DefaultStep(id: "bedtime.sleep", emoji: "😴", mediaMatchKey: nil),
        ]),
        DefaultRoutine(id: "leaving", emoji: "🚪", mediaMatchKey: "coat rack", dailyReset: false, sortOrder: 2, steps: [
            DefaultStep(id: "leaving.toilet", emoji: "🚽", mediaMatchKey: "toilet"),
            DefaultStep(id: "leaving.shoes", emoji: "👟", mediaMatchKey: "sneakers"),
            DefaultStep(id: "leaving.coat", emoji: "🧥", mediaMatchKey: "raincoat"),
            DefaultStep(id: "leaving.bag", emoji: "🎒", mediaMatchKey: "backpack"),
            DefaultStep(id: "leaving.go", emoji: "🚶", mediaMatchKey: nil),
        ]),
        DefaultRoutine(id: "mealtime", emoji: "🍽️", mediaMatchKey: "dinner", dailyReset: false, sortOrder: 3, steps: [
            DefaultStep(id: "mealtime.wash", emoji: "🧼", mediaMatchKey: "soap dish"),
            DefaultStep(id: "mealtime.sit", emoji: "🪑", mediaMatchKey: nil),
            DefaultStep(id: "mealtime.eat", emoji: "🍽️", mediaMatchKey: "dinner"),
            DefaultStep(id: "mealtime.plate", emoji: "🧽", mediaMatchKey: "dinner plate"),
        ]),
        DefaultRoutine(id: "bath", emoji: "🛁", mediaMatchKey: "bathtub", dailyReset: false, sortOrder: 4, steps: [
            DefaultStep(id: "bath.undress", emoji: "🧦", mediaMatchKey: "sweater"),
            DefaultStep(id: "bath.bath", emoji: "🛁", mediaMatchKey: "bathtub"),
            DefaultStep(id: "bath.dry", emoji: "🧺", mediaMatchKey: "bath towel"),
            DefaultStep(id: "bath.pyjamas", emoji: "🩳", mediaMatchKey: nil),
        ]),
        DefaultRoutine(id: "tidy", emoji: "🧺", mediaMatchKey: "laundry basket", dailyReset: false, sortOrder: 5, steps: [
            DefaultStep(id: "tidy.toys", emoji: "🧸", mediaMatchKey: "alphabet blocks"),
            DefaultStep(id: "tidy.books", emoji: "📚", mediaMatchKey: "shelf unit"),
            DefaultStep(id: "tidy.clothes", emoji: "🧺", mediaMatchKey: "laundry basket"),
        ]),
        DefaultRoutine(id: "school", emoji: "🎒", mediaMatchKey: "backpack", dailyReset: false, sortOrder: 6, steps: [
            DefaultStep(id: "school.bag", emoji: "🎒", mediaMatchKey: "backpack"),
            DefaultStep(id: "school.lunch", emoji: "🥪", mediaMatchKey: "lunch box"),
            DefaultStep(id: "school.shoes", emoji: "👟", mediaMatchKey: "boots"),
            DefaultStep(id: "school.coat", emoji: "🧥", mediaMatchKey: "hoodie"),
            DefaultStep(id: "school.bus", emoji: "🚌", mediaMatchKey: "bus stop"),
        ]),
        // The classic first-then board: two steps, meant to be duplicated.
        DefaultRoutine(id: "firstthen", emoji: "1️⃣", mediaMatchKey: nil, dailyReset: false, sortOrder: 7, steps: [
            DefaultStep(id: "firstthen.first", emoji: "1️⃣", mediaMatchKey: nil),
            DefaultStep(id: "firstthen.then", emoji: "2️⃣", mediaMatchKey: nil),
        ]),
    ]

    static var mediaMatchKeys: [(id: String, matchKey: String)] {
        var keys: [(id: String, matchKey: String)] = []
        for routine in defaultRoutines {
            if let key = routine.mediaMatchKey {
                keys.append((id: routine.id, matchKey: key))
            }
            for step in routine.steps {
                if let key = step.mediaMatchKey {
                    keys.append((id: step.id, matchKey: key))
                }
            }
        }
        return keys
    }

    // MARK: - Resolving

    /// A bundled routine in the given language, before any parent overrides.
    static func routine(_ definition: DefaultRoutine, language: String) -> Routine {
        let lang = normalized(language)
        return Routine(
            id: definition.id,
            title: routineTitle(definition.id, language: lang),
            emoji: definition.emoji,
            imageURL: nil,
            steps: definition.steps.enumerated().map { index, step in
                let title = stepTitle(step.id, language: lang)
                return RoutineStep(
                    id: step.id,
                    title: title,
                    speakText: title,
                    emoji: step.emoji,
                    sortOrder: index
                )
            },
            dailyReset: definition.dailyReset,
            allowSkip: false,
            isPinned: false,
            isCustom: false,
            isHidden: false,
            sortOrder: definition.sortOrder
        )
    }

    static func routines(language: String) -> [Routine] {
        defaultRoutines.map { routine($0, language: language) }
    }

    static func routineTitle(_ id: String, language: String) -> String {
        localized(routineTitles[id], language: language) ?? id
    }

    static func stepTitle(_ id: String, language: String) -> String {
        localized(stepTitles[id], language: language) ?? id
    }

    private static func localized(_ table: [String: String]?, language: String) -> String? {
        guard let table else { return nil }
        return table[normalized(language)] ?? table["en"]
    }

    private static func normalized(_ language: String) -> String {
        TikoLanguageCode.normalized(language)
    }

    // MARK: - Routine titles

    private static let routineTitles: [String: [String: String]] = [
        "morning": [
            "en": "Morning", "nl": "Ochtend", "fr": "Le matin",
            "es": "La mañana", "de": "Morgen", "mt": "Filgħodu",
        ],
        "bedtime": [
            "en": "Bedtime", "nl": "Naar bed", "fr": "Le dodo",
            "es": "A dormir", "de": "Schlafenszeit", "mt": "Ħin l-irqad",
        ],
        "leaving": [
            "en": "Going out", "nl": "Naar buiten", "fr": "On sort",
            "es": "Salimos", "de": "Rausgehen", "mt": "Noħorġu",
        ],
        "mealtime": [
            "en": "Mealtime", "nl": "Aan tafel", "fr": "À table",
            "es": "A la mesa", "de": "Essenszeit", "mt": "Ħin l-ikel",
        ],
        "bath": [
            "en": "Bath time", "nl": "In bad", "fr": "Le bain",
            "es": "El baño", "de": "Baden", "mt": "Ħin il-banju",
        ],
        "tidy": [
            "en": "Tidy up", "nl": "Opruimen", "fr": "On range",
            "es": "Ordenar", "de": "Aufräumen", "mt": "Nirranġaw",
        ],
        "school": [
            "en": "School day", "nl": "Naar school", "fr": "L'école",
            "es": "Al colegio", "de": "Schultag", "mt": "Lejn l-iskola",
        ],
        "firstthen": [
            "en": "First, then", "nl": "Eerst, dan", "fr": "D'abord, ensuite",
            "es": "Primero, después", "de": "Erst, dann", "mt": "L-ewwel, imbagħad",
        ],
    ]

    // MARK: - Step titles

    private static let stepTitles: [String: [String: String]] = [
        // Morning
        "morning.wake": [
            "en": "Wake up", "nl": "Wakker worden", "fr": "Se réveiller",
            "es": "Despertarse", "de": "Aufwachen", "mt": "Qum",
        ],
        "morning.toilet": [
            "en": "Toilet", "nl": "Naar de wc", "fr": "Les toilettes",
            "es": "Al baño", "de": "Auf die Toilette", "mt": "Tojlit",
        ],
        "morning.teeth": [
            "en": "Brush teeth", "nl": "Tanden poetsen", "fr": "Se brosser les dents",
            "es": "Lavarse los dientes", "de": "Zähne putzen", "mt": "Aħsel snienek",
        ],
        "morning.dress": [
            "en": "Get dressed", "nl": "Aankleden", "fr": "S'habiller",
            "es": "Vestirse", "de": "Anziehen", "mt": "Ilbes",
        ],
        "morning.breakfast": [
            "en": "Breakfast", "nl": "Ontbijten", "fr": "Le petit-déjeuner",
            "es": "Desayunar", "de": "Frühstücken", "mt": "Kolazzjon",
        ],
        // Bedtime
        "bedtime.pyjamas": [
            "en": "Pyjamas on", "nl": "Pyjama aan", "fr": "Mettre le pyjama",
            "es": "Ponerse el pijama", "de": "Pyjama anziehen", "mt": "Ilbes il-piġama",
        ],
        "bedtime.teeth": [
            "en": "Brush teeth", "nl": "Tanden poetsen", "fr": "Se brosser les dents",
            "es": "Lavarse los dientes", "de": "Zähne putzen", "mt": "Aħsel snienek",
        ],
        "bedtime.toilet": [
            "en": "Toilet", "nl": "Naar de wc", "fr": "Les toilettes",
            "es": "Al baño", "de": "Auf die Toilette", "mt": "Tojlit",
        ],
        "bedtime.story": [
            "en": "Story", "nl": "Voorlezen", "fr": "L'histoire",
            "es": "Un cuento", "de": "Geschichte", "mt": "Storja",
        ],
        "bedtime.sleep": [
            "en": "Sleep", "nl": "Slapen", "fr": "Dormir",
            "es": "Dormir", "de": "Schlafen", "mt": "Orqod",
        ],
        // Going out
        "leaving.toilet": [
            "en": "Toilet", "nl": "Naar de wc", "fr": "Les toilettes",
            "es": "Al baño", "de": "Auf die Toilette", "mt": "Tojlit",
        ],
        "leaving.shoes": [
            "en": "Shoes on", "nl": "Schoenen aan", "fr": "Mettre les chaussures",
            "es": "Ponerse los zapatos", "de": "Schuhe anziehen", "mt": "Ilbes iż-żraben",
        ],
        "leaving.coat": [
            "en": "Coat on", "nl": "Jas aan", "fr": "Mettre le manteau",
            "es": "Ponerse el abrigo", "de": "Jacke anziehen", "mt": "Ilbes il-kowt",
        ],
        "leaving.bag": [
            "en": "Take your bag", "nl": "Tas pakken", "fr": "Prendre le sac",
            "es": "Coger la mochila", "de": "Tasche nehmen", "mt": "Ħu l-basket",
        ],
        "leaving.go": [
            "en": "Off we go", "nl": "We gaan", "fr": "On y va",
            "es": "Nos vamos", "de": "Los geht's", "mt": "Immorru",
        ],
        // Mealtime
        "mealtime.wash": [
            "en": "Wash hands", "nl": "Handen wassen", "fr": "Se laver les mains",
            "es": "Lavarse las manos", "de": "Hände waschen", "mt": "Aħsel idejk",
        ],
        "mealtime.sit": [
            "en": "Sit down", "nl": "Zitten", "fr": "S'asseoir",
            "es": "Sentarse", "de": "Hinsetzen", "mt": "Oqgħod bilqiegħda",
        ],
        "mealtime.eat": [
            "en": "Eat", "nl": "Eten", "fr": "Manger",
            "es": "Comer", "de": "Essen", "mt": "Kul",
        ],
        "mealtime.plate": [
            "en": "Plate away", "nl": "Bord wegbrengen", "fr": "Ranger l'assiette",
            "es": "Llevar el plato", "de": "Teller wegbringen", "mt": "Ġib il-platt",
        ],
        // Bath time
        "bath.undress": [
            "en": "Get undressed", "nl": "Uitkleden", "fr": "Se déshabiller",
            "es": "Quitarse la ropa", "de": "Ausziehen", "mt": "Inża' l-ħwejjeġ",
        ],
        "bath.bath": [
            "en": "Into the bath", "nl": "In het bad", "fr": "Dans le bain",
            "es": "Al baño", "de": "In die Wanne", "mt": "Idħol fil-banju",
        ],
        "bath.dry": [
            "en": "Dry off", "nl": "Afdrogen", "fr": "Se sécher",
            "es": "Secarse", "de": "Abtrocknen", "mt": "Nixxef ruħek",
        ],
        "bath.pyjamas": [
            "en": "Pyjamas on", "nl": "Pyjama aan", "fr": "Mettre le pyjama",
            "es": "Ponerse el pijama", "de": "Pyjama anziehen", "mt": "Ilbes il-piġama",
        ],
        // Tidy up
        "tidy.toys": [
            "en": "Toys in the box", "nl": "Speelgoed in de bak", "fr": "Les jouets dans la caisse",
            "es": "Juguetes en la caja", "de": "Spielzeug in die Kiste", "mt": "Ġugarelli fil-kaxxa",
        ],
        "tidy.books": [
            "en": "Books on the shelf", "nl": "Boeken op de plank", "fr": "Les livres sur l'étagère",
            "es": "Libros en la estantería", "de": "Bücher ins Regal", "mt": "Kotba fuq l-ixkaffa",
        ],
        "tidy.clothes": [
            "en": "Clothes in the basket", "nl": "Kleren in de mand", "fr": "Les habits dans le panier",
            "es": "Ropa en el cesto", "de": "Kleider in den Korb", "mt": "Ħwejjeġ fil-qoffa",
        ],
        // School day
        "school.bag": [
            "en": "Pack your bag", "nl": "Tas inpakken", "fr": "Préparer le sac",
            "es": "Preparar la mochila", "de": "Tasche packen", "mt": "Lesti l-basket",
        ],
        "school.lunch": [
            "en": "Lunch box", "nl": "Broodtrommel", "fr": "La boîte à goûter",
            "es": "La fiambrera", "de": "Brotdose", "mt": "Il-lunch",
        ],
        "school.shoes": [
            "en": "Shoes on", "nl": "Schoenen aan", "fr": "Mettre les chaussures",
            "es": "Ponerse los zapatos", "de": "Schuhe anziehen", "mt": "Ilbes iż-żraben",
        ],
        "school.coat": [
            "en": "Coat on", "nl": "Jas aan", "fr": "Mettre le manteau",
            "es": "Ponerse el abrigo", "de": "Jacke anziehen", "mt": "Ilbes il-kowt",
        ],
        "school.bus": [
            "en": "Go to the bus", "nl": "Naar de bus", "fr": "Aller au bus",
            "es": "Ir al autobús", "de": "Zum Bus", "mt": "Lejn il-karozza tal-linja",
        ],
        // First / then
        "firstthen.first": [
            "en": "First", "nl": "Eerst", "fr": "D'abord",
            "es": "Primero", "de": "Erst", "mt": "L-ewwel",
        ],
        "firstthen.then": [
            "en": "Then", "nl": "Dan", "fr": "Ensuite",
            "es": "Después", "de": "Dann", "mt": "Imbagħad",
        ],
    ]
}
