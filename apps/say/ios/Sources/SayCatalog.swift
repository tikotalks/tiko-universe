import Foundation

/// Per-language content of one default card.
struct SayCardContent: Hashable {
    let title: String
    let speakText: String
    let listenFor: [String]

    init(_ title: String, speak: String? = nil, listen: [String]? = nil) {
        self.title = title
        self.speakText = speak ?? title
        self.listenFor = listen ?? [title.lowercased()]
    }
}

/// A bundled default card with localised content for every supported language.
struct SayDefaultCard {
    let id: String
    let categoryID: String
    let emoji: String
    let difficulty: Int
    let sortOrder: Int
    let content: [String: SayCardContent]

    /// English title — the Tiko media library is keyed in English.
    var mediaMatchKey: String { content["en"]?.title ?? id }
}

/// The bundled default catalogue. These are *default cards*, not fixed
/// content — Parent Mode edits are layered on top by `SayCardStore`.
/// Images resolve from the Tiko media library at runtime with the bundled
/// emoji as offline fallback.
enum SayCatalog {
    static let fallbackLanguage = "en"
    static let contentLanguages = ["en", "nl", "fr", "es", "de", "mt"]

    static let categories: [SayCategory] = [
        SayCategory(id: "animals", titleKey: "say.category.animals", emoji: "🐾", sortOrder: 0, mediaCategories: ["animals"]),
        SayCategory(id: "food", titleKey: "say.category.food", emoji: "🍎", sortOrder: 1, mediaCategories: ["food", "drinks", "snacks"]),
        SayCategory(id: "vehicles", titleKey: "say.category.vehicles", emoji: "🚗", sortOrder: 2, mediaCategories: ["transport", "vehicles"]),
        SayCategory(id: "body", titleKey: "say.category.body", emoji: "🖐️", sortOrder: 3, mediaCategories: ["body", "body-parts"]),
        SayCategory(id: "colors", titleKey: "say.category.colors", emoji: "🎨", sortOrder: 4, mediaCategories: ["colors"]),
        SayCategory(id: "numbers", titleKey: "say.category.numbers", emoji: "🔢", sortOrder: 5, mediaCategories: ["numbers"]),
    ]

    static func category(id: String) -> SayCategory? {
        categories.first { $0.id == id }
    }

    /// Resolves a default card for a language, falling back to English for
    /// languages without bundled content.
    static func card(_ defaultCard: SayDefaultCard, language: String) -> SayCard {
        let normalized = normalizedLanguage(language)
        let content = defaultCard.content[normalized]
            ?? defaultCard.content[fallbackLanguage]!
        return SayCard(
            id: defaultCard.id,
            categoryID: defaultCard.categoryID,
            title: content.title,
            speakText: content.speakText,
            listenFor: content.listenFor,
            emoji: defaultCard.emoji,
            imageURL: nil,
            difficulty: defaultCard.difficulty,
            isCustom: false,
            isHidden: false,
            sortOrder: defaultCard.sortOrder
        )
    }

    static func defaultCards(categoryID: String, language: String) -> [SayCard] {
        defaultCards
            .filter { $0.categoryID == categoryID }
            .map { card($0, language: language) }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    /// "nl-BE" → "nl"
    static func normalizedLanguage(_ code: String) -> String {
        code.replacingOccurrences(of: "_", with: "-")
            .split(separator: "-").first.map { String($0).lowercased() } ?? fallbackLanguage
    }

    private static func card(
        _ id: String, _ category: String, _ emoji: String, _ difficulty: Int, _ order: Int,
        en: SayCardContent, nl: SayCardContent, fr: SayCardContent,
        es: SayCardContent, de: SayCardContent, mt: SayCardContent
    ) -> SayDefaultCard {
        SayDefaultCard(id: id, categoryID: category, emoji: emoji, difficulty: difficulty, sortOrder: order, content: [
            "en": en, "nl": nl, "fr": fr, "es": es, "de": de, "mt": mt,
        ])
    }

    static let defaultCards: [SayDefaultCard] = [
        // MARK: Animals
        card("animal_cat", "animals", "🐱", 1, 0,
             en: .init("Cat", listen: ["cat", "kitty"]), nl: .init("Kat", listen: ["kat", "poes"]),
             fr: .init("Chat"), es: .init("Gato"), de: .init("Katze"), mt: .init("Qattus")),
        card("animal_dog", "animals", "🐶", 1, 1,
             en: .init("Dog", listen: ["dog", "doggy"]), nl: .init("Hond"),
             fr: .init("Chien"), es: .init("Perro"), de: .init("Hund"), mt: .init("Kelb")),
        card("animal_lion", "animals", "🦁", 2, 2,
             en: .init("Lion"), nl: .init("Leeuw"),
             fr: .init("Lion"), es: .init("León"), de: .init("Löwe"), mt: .init("Iljun")),
        card("animal_elephant", "animals", "🐘", 3, 3,
             en: .init("Elephant"), nl: .init("Olifant"),
             fr: .init("Éléphant", listen: ["éléphant", "elephant"]), es: .init("Elefante"),
             de: .init("Elefant"), mt: .init("Iljunfant")),
        card("animal_monkey", "animals", "🐵", 2, 4,
             en: .init("Monkey"), nl: .init("Aap"),
             fr: .init("Singe"), es: .init("Mono"), de: .init("Affe"), mt: .init("Xadina")),
        card("animal_horse", "animals", "🐴", 2, 5,
             en: .init("Horse"), nl: .init("Paard"),
             fr: .init("Cheval"), es: .init("Caballo"), de: .init("Pferd"), mt: .init("Żiemel")),
        card("animal_cow", "animals", "🐮", 1, 6,
             en: .init("Cow"), nl: .init("Koe"),
             fr: .init("Vache"), es: .init("Vaca"), de: .init("Kuh"), mt: .init("Baqra")),
        card("animal_pig", "animals", "🐷", 1, 7,
             en: .init("Pig", listen: ["pig", "piggy"]), nl: .init("Varken"),
             fr: .init("Cochon"), es: .init("Cerdo"), de: .init("Schwein"), mt: .init("Ħanżir")),
        card("animal_duck", "animals", "🦆", 1, 8,
             en: .init("Duck"), nl: .init("Eend"),
             fr: .init("Canard"), es: .init("Pato"), de: .init("Ente"), mt: .init("Papra")),
        card("animal_rabbit", "animals", "🐰", 2, 9,
             en: .init("Rabbit", listen: ["rabbit", "bunny"]), nl: .init("Konijn"),
             fr: .init("Lapin"), es: .init("Conejo"), de: .init("Kaninchen", listen: ["kaninchen", "hase"]), mt: .init("Fenek")),

        // MARK: Food
        card("food_apple", "food", "🍎", 2, 0,
             en: .init("Apple"), nl: .init("Appel"),
             fr: .init("Pomme"), es: .init("Manzana"), de: .init("Apfel"), mt: .init("Tuffieħa")),
        card("food_banana", "food", "🍌", 2, 1,
             en: .init("Banana"), nl: .init("Banaan"),
             fr: .init("Banane"), es: .init("Plátano", listen: ["plátano", "banana"]),
             de: .init("Banane"), mt: .init("Banana")),
        card("food_bread", "food", "🍞", 2, 2,
             en: .init("Bread"), nl: .init("Brood"),
             fr: .init("Pain"), es: .init("Pan"), de: .init("Brot"), mt: .init("Ħobż")),
        card("food_milk", "food", "🥛", 1, 3,
             en: .init("Milk"), nl: .init("Melk"),
             fr: .init("Lait"), es: .init("Leche"), de: .init("Milch"), mt: .init("Ħalib")),
        card("food_egg", "food", "🥚", 1, 4,
             en: .init("Egg"), nl: .init("Ei", listen: ["ei", "eitje"]),
             fr: .init("Œuf", listen: ["œuf", "oeuf"]), es: .init("Huevo"), de: .init("Ei"), mt: .init("Bajda")),
        card("food_cheese", "food", "🧀", 2, 5,
             en: .init("Cheese"), nl: .init("Kaas"),
             fr: .init("Fromage"), es: .init("Queso"), de: .init("Käse"), mt: .init("Ġobon")),
        card("food_water", "food", "💧", 2, 6,
             en: .init("Water"), nl: .init("Water"),
             fr: .init("Eau"), es: .init("Agua"), de: .init("Wasser"), mt: .init("Ilma")),
        card("food_tomato", "food", "🍅", 2, 7,
             en: .init("Tomato"), nl: .init("Tomaat"),
             fr: .init("Tomate"), es: .init("Tomate"), de: .init("Tomate"), mt: .init("Tadama")),
        card("food_cookie", "food", "🍪", 2, 8,
             en: .init("Cookie", listen: ["cookie", "biscuit"]), nl: .init("Koekje", listen: ["koekje", "koek"]),
             fr: .init("Biscuit"), es: .init("Galleta"), de: .init("Keks"), mt: .init("Gallettina")),
        card("food_icecream", "food", "🍦", 3, 9,
             en: .init("Ice cream", listen: ["ice cream", "icecream"]), nl: .init("IJsje", listen: ["ijsje", "ijs"]),
             fr: .init("Glace"), es: .init("Helado"), de: .init("Eis"), mt: .init("Ġelat")),

        // MARK: Vehicles
        card("vehicle_car", "vehicles", "🚗", 1, 0,
             en: .init("Car"), nl: .init("Auto"),
             fr: .init("Voiture"), es: .init("Coche", listen: ["coche", "carro", "auto"]),
             de: .init("Auto"), mt: .init("Karozza")),
        card("vehicle_bus", "vehicles", "🚌", 1, 1,
             en: .init("Bus"), nl: .init("Bus"),
             fr: .init("Bus"), es: .init("Autobús", listen: ["autobús", "bus"]), de: .init("Bus"), mt: .init("Xarabank")),
        card("vehicle_train", "vehicles", "🚆", 2, 2,
             en: .init("Train"), nl: .init("Trein"),
             fr: .init("Train"), es: .init("Tren"), de: .init("Zug"), mt: .init("Ferrovija")),
        card("vehicle_boat", "vehicles", "⛵", 2, 3,
             en: .init("Boat"), nl: .init("Boot"),
             fr: .init("Bateau"), es: .init("Barco"), de: .init("Boot"), mt: .init("Dgħajsa")),
        card("vehicle_plane", "vehicles", "✈️", 2, 4,
             en: .init("Plane", listen: ["plane", "airplane", "aeroplane"]), nl: .init("Vliegtuig"),
             fr: .init("Avion"), es: .init("Avión"), de: .init("Flugzeug"), mt: .init("Ajruplan")),
        card("vehicle_bike", "vehicles", "🚲", 1, 5,
             en: .init("Bike", listen: ["bike", "bicycle"]), nl: .init("Fiets"),
             fr: .init("Vélo"), es: .init("Bici", listen: ["bici", "bicicleta"]), de: .init("Fahrrad"), mt: .init("Rota")),
        card("vehicle_truck", "vehicles", "🚚", 2, 6,
             en: .init("Truck", listen: ["truck", "lorry"]), nl: .init("Vrachtwagen"),
             fr: .init("Camion"), es: .init("Camión"), de: .init("Lastwagen", listen: ["lastwagen", "laster"]), mt: .init("Trakk")),
        card("vehicle_tractor", "vehicles", "🚜", 2, 7,
             en: .init("Tractor"), nl: .init("Tractor", listen: ["tractor", "trekker"]),
             fr: .init("Tracteur"), es: .init("Tractor"), de: .init("Traktor"), mt: .init("Trattur")),

        // MARK: Body
        card("body_head", "body", "🙂", 1, 0,
             en: .init("Head"), nl: .init("Hoofd"),
             fr: .init("Tête"), es: .init("Cabeza"), de: .init("Kopf"), mt: .init("Ras")),
        card("body_nose", "body", "👃", 1, 1,
             en: .init("Nose"), nl: .init("Neus"),
             fr: .init("Nez"), es: .init("Nariz"), de: .init("Nase"), mt: .init("Mnieħer")),
        card("body_mouth", "body", "👄", 2, 2,
             en: .init("Mouth"), nl: .init("Mond"),
             fr: .init("Bouche"), es: .init("Boca"), de: .init("Mund"), mt: .init("Ħalq")),
        card("body_ear", "body", "👂", 1, 3,
             en: .init("Ear"), nl: .init("Oor"),
             fr: .init("Oreille"), es: .init("Oreja"), de: .init("Ohr"), mt: .init("Widna")),
        card("body_eye", "body", "👁️", 1, 4,
             en: .init("Eye"), nl: .init("Oog"),
             fr: .init("Œil", listen: ["œil", "oeil"]), es: .init("Ojo"), de: .init("Auge"), mt: .init("Għajn")),
        card("body_hand", "body", "✋", 1, 5,
             en: .init("Hand"), nl: .init("Hand"),
             fr: .init("Main"), es: .init("Mano"), de: .init("Hand"), mt: .init("Id")),
        card("body_foot", "body", "🦶", 1, 6,
             en: .init("Foot"), nl: .init("Voet"),
             fr: .init("Pied"), es: .init("Pie"), de: .init("Fuß", listen: ["fuß", "fuss"]), mt: .init("Sieq")),
        card("body_hair", "body", "💇", 1, 7,
             en: .init("Hair"), nl: .init("Haar"),
             fr: .init("Cheveux"), es: .init("Pelo"), de: .init("Haare", listen: ["haare", "haar"]), mt: .init("Xagħar")),

        // MARK: Colors
        card("color_red", "colors", "🔴", 1, 0,
             en: .init("Red"), nl: .init("Rood"),
             fr: .init("Rouge"), es: .init("Rojo"), de: .init("Rot"), mt: .init("Aħmar")),
        card("color_blue", "colors", "🔵", 1, 1,
             en: .init("Blue"), nl: .init("Blauw"),
             fr: .init("Bleu"), es: .init("Azul"), de: .init("Blau"), mt: .init("Blu")),
        card("color_green", "colors", "🟢", 2, 2,
             en: .init("Green"), nl: .init("Groen"),
             fr: .init("Vert"), es: .init("Verde"), de: .init("Grün"), mt: .init("Aħdar")),
        card("color_yellow", "colors", "🟡", 2, 3,
             en: .init("Yellow"), nl: .init("Geel"),
             fr: .init("Jaune"), es: .init("Amarillo"), de: .init("Gelb"), mt: .init("Isfar")),
        card("color_orange", "colors", "🟠", 2, 4,
             en: .init("Orange"), nl: .init("Oranje"),
             fr: .init("Orange"), es: .init("Naranja"), de: .init("Orange"), mt: .init("Oranġjo")),
        card("color_pink", "colors", "🩷", 1, 5,
             en: .init("Pink"), nl: .init("Roze"),
             fr: .init("Rose"), es: .init("Rosa"), de: .init("Rosa"), mt: .init("Roża")),
        card("color_purple", "colors", "🟣", 2, 6,
             en: .init("Purple"), nl: .init("Paars"),
             fr: .init("Violet"), es: .init("Morado"), de: .init("Lila"), mt: .init("Vjola")),
        card("color_white", "colors", "⚪", 2, 7,
             en: .init("White"), nl: .init("Wit"),
             fr: .init("Blanc"), es: .init("Blanco"), de: .init("Weiß", listen: ["weiß", "weiss"]), mt: .init("Abjad")),
        card("color_black", "colors", "⚫", 2, 8,
             en: .init("Black"), nl: .init("Zwart"),
             fr: .init("Noir"), es: .init("Negro"), de: .init("Schwarz"), mt: .init("Iswed")),
        card("color_brown", "colors", "🟤", 2, 9,
             en: .init("Brown"), nl: .init("Bruin"),
             fr: .init("Marron"), es: .init("Marrón"), de: .init("Braun"), mt: .init("Kannella")),

        // MARK: Numbers (digits count as correct — recognizers often
        // transcribe "two" as "2")
        card("num_one", "numbers", "1️⃣", 1, 0,
             en: .init("One", listen: ["one", "1"]), nl: .init("Een", listen: ["een", "één", "1"]),
             fr: .init("Un", listen: ["un", "1"]), es: .init("Uno", listen: ["uno", "1"]),
             de: .init("Eins", listen: ["eins", "1"]), mt: .init("Wieħed", listen: ["wieħed", "1"])),
        card("num_two", "numbers", "2️⃣", 1, 1,
             en: .init("Two", listen: ["two", "2"]), nl: .init("Twee", listen: ["twee", "2"]),
             fr: .init("Deux", listen: ["deux", "2"]), es: .init("Dos", listen: ["dos", "2"]),
             de: .init("Zwei", listen: ["zwei", "2"]), mt: .init("Tnejn", listen: ["tnejn", "2"])),
        card("num_three", "numbers", "3️⃣", 2, 2,
             en: .init("Three", listen: ["three", "3"]), nl: .init("Drie", listen: ["drie", "3"]),
             fr: .init("Trois", listen: ["trois", "3"]), es: .init("Tres", listen: ["tres", "3"]),
             de: .init("Drei", listen: ["drei", "3"]), mt: .init("Tlieta", listen: ["tlieta", "3"])),
        card("num_four", "numbers", "4️⃣", 1, 3,
             en: .init("Four", listen: ["four", "4"]), nl: .init("Vier", listen: ["vier", "4"]),
             fr: .init("Quatre", listen: ["quatre", "4"]), es: .init("Cuatro", listen: ["cuatro", "4"]),
             de: .init("Vier", listen: ["vier", "4"]), mt: .init("Erbgħa", listen: ["erbgħa", "4"])),
        card("num_five", "numbers", "5️⃣", 1, 4,
             en: .init("Five", listen: ["five", "5"]), nl: .init("Vijf", listen: ["vijf", "5"]),
             fr: .init("Cinq", listen: ["cinq", "5"]), es: .init("Cinco", listen: ["cinco", "5"]),
             de: .init("Fünf", listen: ["fünf", "5"]), mt: .init("Ħamsa", listen: ["ħamsa", "5"])),
        card("num_six", "numbers", "6️⃣", 1, 5,
             en: .init("Six", listen: ["six", "6"]), nl: .init("Zes", listen: ["zes", "6"]),
             fr: .init("Six", listen: ["six", "6"]), es: .init("Seis", listen: ["seis", "6"]),
             de: .init("Sechs", listen: ["sechs", "6"]), mt: .init("Sitta", listen: ["sitta", "6"])),
        card("num_seven", "numbers", "7️⃣", 2, 6,
             en: .init("Seven", listen: ["seven", "7"]), nl: .init("Zeven", listen: ["zeven", "7"]),
             fr: .init("Sept", listen: ["sept", "7"]), es: .init("Siete", listen: ["siete", "7"]),
             de: .init("Sieben", listen: ["sieben", "7"]), mt: .init("Sebgħa", listen: ["sebgħa", "7"])),
        card("num_eight", "numbers", "8️⃣", 2, 7,
             en: .init("Eight", listen: ["eight", "8"]), nl: .init("Acht", listen: ["acht", "8"]),
             fr: .init("Huit", listen: ["huit", "8"]), es: .init("Ocho", listen: ["ocho", "8"]),
             de: .init("Acht", listen: ["acht", "8"]), mt: .init("Tmienja", listen: ["tmienja", "8"])),
        card("num_nine", "numbers", "9️⃣", 1, 8,
             en: .init("Nine", listen: ["nine", "9"]), nl: .init("Negen", listen: ["negen", "9"]),
             fr: .init("Neuf", listen: ["neuf", "9"]), es: .init("Nueve", listen: ["nueve", "9"]),
             de: .init("Neun", listen: ["neun", "9"]), mt: .init("Disgħa", listen: ["disgħa", "9"])),
        card("num_ten", "numbers", "🔟", 1, 9,
             en: .init("Ten", listen: ["ten", "10"]), nl: .init("Tien", listen: ["tien", "10"]),
             fr: .init("Dix", listen: ["dix", "10"]), es: .init("Diez", listen: ["diez", "10"]),
             de: .init("Zehn", listen: ["zehn", "10"]), mt: .init("Għaxra", listen: ["għaxra", "10"])),
    ]
}
