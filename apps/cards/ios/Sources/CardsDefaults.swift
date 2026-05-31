let defaultCardCollections: [CardCollection] = [
    CardCollection(
        id: "needs",
        title: "Needs",
        symbol: "heart.fill",
        colorHex: 0xff8a1f,
        cards: [
            CommunicationCard(id: "eat", title: "Eat", speech: "I want to eat", symbol: "fork.knife", imageDataIdentifier: nil, colorHex: 0xffb347),
            CommunicationCard(id: "drink", title: "Drink", speech: "I want a drink", symbol: "cup.and.saucer.fill", imageDataIdentifier: nil, colorHex: 0x7ec8e3),
            CommunicationCard(id: "help", title: "Help", speech: "I need help", symbol: "hand.raised.fill", imageDataIdentifier: nil, colorHex: 0xef405d),
            CommunicationCard(id: "toilet", title: "Toilet", speech: "I need the toilet", symbol: "figure.stand", imageDataIdentifier: nil, colorHex: 0xa78bfa)
        ]
    ),
    CardCollection(
        id: "feelings",
        title: "Feelings",
        symbol: "face.smiling.fill",
        colorHex: 0x16b8a6,
        cards: [
            CommunicationCard(id: "happy", title: "Happy", speech: "I feel happy", symbol: "sun.max.fill", imageDataIdentifier: nil, colorHex: 0xf8c22e),
            CommunicationCard(id: "sad", title: "Sad", speech: "I feel sad", symbol: "cloud.rain.fill", imageDataIdentifier: nil, colorHex: 0x60a5fa),
            CommunicationCard(id: "angry", title: "Angry", speech: "I feel angry", symbol: "flame.fill", imageDataIdentifier: nil, colorHex: 0xef405d),
            CommunicationCard(id: "tired", title: "Tired", speech: "I feel tired", symbol: "moon.zzz.fill", imageDataIdentifier: nil, colorHex: 0x6366f1)
        ]
    ),
    CardCollection(
        id: "people",
        title: "People",
        symbol: "person.2.fill",
        colorHex: 0x2488ff,
        cards: [
            CommunicationCard(id: "mama", title: "Mama", speech: "I want Mama", symbol: "person.fill", imageDataIdentifier: nil, colorHex: 0xf472b6),
            CommunicationCard(id: "papa", title: "Papa", speech: "I want Papa", symbol: "person.fill", imageDataIdentifier: nil, colorHex: 0x38bdf8),
            CommunicationCard(id: "friend", title: "Friend", speech: "I want my friend", symbol: "figure.2", imageDataIdentifier: nil, colorHex: 0x93ee3f)
        ]
    ),
    CardCollection(
        id: "activities",
        title: "Activities",
        symbol: "figure.play",
        colorHex: 0x9b3fbd,
        cards: [
            CommunicationCard(id: "play", title: "Play", speech: "I want to play", symbol: "gamecontroller.fill", imageDataIdentifier: nil, colorHex: 0x93ee3f),
            CommunicationCard(id: "outside", title: "Outside", speech: "I want to go outside", symbol: "tree.fill", imageDataIdentifier: nil, colorHex: 0x16b8a6),
            CommunicationCard(id: "music", title: "Music", speech: "I want music", symbol: "music.note", imageDataIdentifier: nil, colorHex: 0xe84057),
            CommunicationCard(id: "break", title: "Break", speech: "I need a break", symbol: "pause.fill", imageDataIdentifier: nil, colorHex: 0x64748b)
        ]
    )
]
