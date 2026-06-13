import SwiftUI

public struct TikoOpenIconOption: Identifiable, Equatable, Sendable {
    public let name: String
    public let label: String

    public var id: String { name }

    public init(name: String, label: String) {
        self.name = name
        self.label = label
    }
}

public enum TikoOpenIcons {
    public static let all: [TikoOpenIconOption] = [
        TikoOpenIconOption(name: "ui/check-fat", label: "Check"),
        TikoOpenIconOption(name: "wayfinding/cross", label: "Cross"),
        TikoOpenIconOption(name: "ui/question-mark-fat", label: "Question"),
        TikoOpenIconOption(name: "ui/add-fat", label: "Plus"),
        TikoOpenIconOption(name: "ui/subtract-fat", label: "Minus"),
        TikoOpenIconOption(name: "ui/info-fat", label: "Info"),
        TikoOpenIconOption(name: "ui/exclamation-mark-s", label: "Important"),
        TikoOpenIconOption(name: "ui/star-fat", label: "Star"),
        TikoOpenIconOption(name: "ui/circled-heart", label: "Heart"),
        TikoOpenIconOption(name: "ui/circled-check", label: "Circle check"),
        TikoOpenIconOption(name: "ui/circled-question-mark", label: "Circle question"),
        TikoOpenIconOption(name: "ui/squared-check", label: "Square check"),
        TikoOpenIconOption(name: "ui/squared-question-mark", label: "Square question"),
        TikoOpenIconOption(name: "ui/pointer-hand", label: "Hand"),
        TikoOpenIconOption(name: "ui/pointer-cross", label: "Stop hand"),
        TikoOpenIconOption(name: "ui/pointer-arrow", label: "Pointer"),
        TikoOpenIconOption(name: "ui/speech-balloon", label: "Speech"),
        TikoOpenIconOption(name: "ui/speech-balloon-square-text", label: "Message"),
        TikoOpenIconOption(name: "ui/talk-info", label: "Talk info"),
        TikoOpenIconOption(name: "ui/talk-question-mark", label: "Talk question"),
        TikoOpenIconOption(name: "ui/user", label: "Person"),
        TikoOpenIconOption(name: "ui/users", label: "People"),
        TikoOpenIconOption(name: "ui/user-heart", label: "Care"),
        TikoOpenIconOption(name: "ui/accessibility-person", label: "Accessibility"),
        TikoOpenIconOption(name: "ui/wheelchair-action", label: "Wheelchair"),
        TikoOpenIconOption(name: "ui/clock", label: "Clock"),
        TikoOpenIconOption(name: "ui/timer", label: "Timer"),
        TikoOpenIconOption(name: "ui/calendar-2", label: "Calendar"),
        TikoOpenIconOption(name: "ui/check-list", label: "Checklist"),
        TikoOpenIconOption(name: "ui/checklist-success", label: "Checklist done"),
        TikoOpenIconOption(name: "ui/books", label: "Books"),
        TikoOpenIconOption(name: "ui/home-location", label: "Home"),
        TikoOpenIconOption(name: "ui/building-house", label: "House"),
        TikoOpenIconOption(name: "ui/building-shop", label: "Shop"),
        TikoOpenIconOption(name: "ui/globe", label: "Globe"),
        TikoOpenIconOption(name: "ui/world", label: "World"),
        TikoOpenIconOption(name: "media/volume-iii", label: "Voice"),
        TikoOpenIconOption(name: "media/music-note", label: "Music"),
        TikoOpenIconOption(name: "media/headphones", label: "Headphones"),
        TikoOpenIconOption(name: "media/microphone", label: "Microphone"),
        TikoOpenIconOption(name: "media/camera", label: "Camera"),
        TikoOpenIconOption(name: "media/image", label: "Image"),
        TikoOpenIconOption(name: "media/playback-play", label: "Play"),
        TikoOpenIconOption(name: "media/playback-pause", label: "Pause"),
        TikoOpenIconOption(name: "food-drinks/bottle", label: "Bottle"),
        TikoOpenIconOption(name: "food-drinks/bread-slice", label: "Bread"),
        TikoOpenIconOption(name: "food-drinks/hamburger", label: "Food"),
        TikoOpenIconOption(name: "animals/cat-head", label: "Cat"),
        TikoOpenIconOption(name: "animals/fish", label: "Fish"),
        TikoOpenIconOption(name: "animals/turtle", label: "Turtle"),
        TikoOpenIconOption(name: "misc/toy-blocks", label: "Toys"),
        TikoOpenIconOption(name: "misc/furniture-bed", label: "Bed"),
        TikoOpenIconOption(name: "misc/plant", label: "Plant"),
        TikoOpenIconOption(name: "misc/fire", label: "Fire"),
        TikoOpenIconOption(name: "misc/key", label: "Key"),
        TikoOpenIconOption(name: "misc/lock", label: "Lock"),
        TikoOpenIconOption(name: "misc/unlock", label: "Unlock"),
        TikoOpenIconOption(name: "misc/shield-check", label: "Safe"),
        TikoOpenIconOption(name: "arrows/arrow-headed-left", label: "Left"),
        TikoOpenIconOption(name: "arrows/arrow-headed-right", label: "Right"),
        TikoOpenIconOption(name: "arrows/arrow-headed-up", label: "Up"),
        TikoOpenIconOption(name: "arrows/arrow-headed-down", label: "Down")
    ]

    public static func systemSymbol(named name: String) -> String {
        symbolByName[name] ?? "questionmark"
    }

    private static let symbolByName: [String: String] = [
        "ui/check-fat": "checkmark",
        "wayfinding/cross": "xmark",
        "ui/question-mark-fat": "questionmark",
        "ui/add-fat": "plus",
        "ui/subtract-fat": "minus",
        "ui/info-fat": "info.circle",
        "ui/exclamation-mark-s": "exclamationmark",
        "ui/star-fat": "star",
        "ui/circled-heart": "heart.circle",
        "ui/circled-check": "checkmark.circle",
        "ui/circled-question-mark": "questionmark.circle",
        "ui/squared-check": "checkmark.square",
        "ui/squared-question-mark": "questionmark.square",
        "ui/pointer-hand": "hand.point.up",
        "ui/pointer-cross": "plus.viewfinder",
        "ui/pointer-arrow": "cursorarrow",
        "ui/speech-balloon": "bubble.left",
        "ui/speech-balloon-square-text": "text.bubble",
        "ui/talk-info": "info.bubble",
        "ui/talk-question-mark": "questionmark.bubble",
        "ui/user": "person",
        "ui/users": "person.2",
        "ui/user-heart": "person.crop.circle.badge.heart",
        "ui/accessibility-person": "figure",
        "ui/wheelchair-action": "figure.roll",
        "ui/clock": "clock",
        "ui/timer": "timer",
        "ui/calendar-2": "calendar",
        "ui/check-list": "checklist",
        "ui/checklist-success": "checklist.checked",
        "ui/books": "books.vertical",
        "ui/home-location": "house",
        "ui/building-house": "house.lodge",
        "ui/building-shop": "storefront",
        "ui/globe": "globe",
        "ui/world": "globe.europe.africa",
        "media/volume-iii": "speaker.wave.3",
        "media/music-note": "music.note",
        "media/headphones": "headphones",
        "media/microphone": "mic",
        "media/camera": "camera",
        "media/image": "photo",
        "media/playback-play": "play",
        "media/playback-pause": "pause",
        "food-drinks/bottle": "waterbottle",
        "food-drinks/bread-slice": "birthday.cake",
        "food-drinks/hamburger": "fork.knife",
        "animals/cat-head": "cat",
        "animals/fish": "fish",
        "animals/turtle": "tortoise",
        "misc/toy-blocks": "cube",
        "misc/furniture-bed": "bed.double",
        "misc/plant": "leaf",
        "misc/fire": "flame",
        "misc/key": "key",
        "misc/lock": "lock",
        "misc/unlock": "lock.open",
        "misc/shield-check": "checkmark.shield",
        "arrows/arrow-headed-left": "arrow.left",
        "arrows/arrow-headed-right": "arrow.right",
        "arrows/arrow-headed-up": "arrow.up",
        "arrows/arrow-headed-down": "arrow.down"
    ]
}

public struct TikoOpenIconView: View {
    private let name: String
    private let color: String

    public init(_ name: String, color: String = "#FFFFFF") {
        self.name = name
        self.color = color
    }

    public var body: some View {
        Image(systemName: TikoOpenIcons.systemSymbol(named: name))
            .resizable()
            .scaledToFit()
            .symbolRenderingMode(.monochrome)
            .foregroundStyle(Color(hexString: color) ?? .white)
            .accessibilityHidden(true)
    }
}

public struct TikoOpenIconPicker: View {
    @Binding private var selection: String
    private let icons: [TikoOpenIconOption]
    private let columns: [GridItem]

    public init(selection: Binding<String>, icons: [TikoOpenIconOption] = TikoOpenIcons.all, columns: Int = 4) {
        self._selection = selection
        self.icons = icons
        self.columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: columns)
    }

    public var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(icons) { icon in
                Button {
                    selection = selection == icon.name ? "" : icon.name
                } label: {
                    TikoOpenIconView(icon.name, color: "#17131C")
                        .frame(width: 30, height: 30)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(selection == icon.name ? Color.accentColor.opacity(0.18) : Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(selection == icon.name ? Color.accentColor : Color.primary.opacity(0.08), lineWidth: selection == icon.name ? 2 : 1)
                        }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(icon.label)
            }
        }
    }
}
