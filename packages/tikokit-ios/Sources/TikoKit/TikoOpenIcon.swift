import SwiftUI
import WebKit

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
        TikoOpenIconOption(name: "ui/pointer-hand", label: "Hand"),
        TikoOpenIconOption(name: "ui/pointer-cross", label: "Stop hand"),
        TikoOpenIconOption(name: "ui/speech-balloon", label: "Speech"),
        TikoOpenIconOption(name: "ui/user", label: "Person"),
        TikoOpenIconOption(name: "ui/users", label: "People"),
        TikoOpenIconOption(name: "ui/clock", label: "Clock"),
        TikoOpenIconOption(name: "ui/timer", label: "Timer"),
        TikoOpenIconOption(name: "ui/books", label: "Books"),
        TikoOpenIconOption(name: "ui/home-location", label: "Home"),
        TikoOpenIconOption(name: "media/volume-iii", label: "Voice"),
        TikoOpenIconOption(name: "media/music-note", label: "Music"),
        TikoOpenIconOption(name: "media/headphones", label: "Headphones"),
        TikoOpenIconOption(name: "media/microphone", label: "Microphone"),
        TikoOpenIconOption(name: "media/camera", label: "Camera"),
        TikoOpenIconOption(name: "media/image", label: "Image")
    ]

    public static func svg(named name: String) -> String {
        svgByName[name] ?? svgByName["ui/question-mark-fat"]!
    }

    private static let svgByName: [String: String] = [
        "ui/check-fat": #"<svg id="check-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><polyline points="13.5 23.14 34.71 58.5 63 9" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "wayfinding/cross": #"<svg id="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><polygon points="27 9 45 9 45 27 63 27 63 45 45 45 45 63 27 63 27 45 9 45 9 27 27 27 27 9" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1); stroke-width: 0px;"/><polygon points="27 9 45 9 45 27 63 27 63 45 45 45 45 63 27 63 27 45 9 45 9 27 27 27 27 9" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#,
        "ui/question-mark-fat": #"<svg id="question-mark-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="54" x2="36" y2="54" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-miterlimit: 10; stroke-width: 8px;"/><path d="M25.5,24c0-5.8,4.7-10.5,10.5-10.5s10.5,4.7,10.5,10.5c0,10.5-10.5,10.5-10.5,21" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "ui/add-fat": #"<svg id="add-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="13.5" x2="36" y2="58.5" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/><line x1="13.5" y1="36" x2="58.5" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "ui/subtract-fat": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="14" y1="36" x2="58" y2="36" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:8px;"/></svg>"#,
        "ui/info-fat": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="24" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><line x1="36" y1="32" x2="36" y2="52" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:7px;"/><circle cx="36" cy="21" r="4" style="fill:var(--icon-stroke-color,currentColor);"/></svg>"#,
        "ui/exclamation-mark-s": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="14" x2="36" y2="45" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:8px;"/><circle cx="36" cy="57" r="4" style="fill:var(--icon-stroke-color,currentColor);"/></svg>"#,
        "ui/star-fat": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><polygon points="36 8 43.5 27 64 27 47.5 39.5 54 61 36 48 18 61 24.5 39.5 8 27 28.5 27" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:6px;"/></svg>"#,
        "ui/circled-heart": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="25" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><path d="M36 51s-16-9-16-20c0-6 4-10 9-10 3 0 5.5 1.6 7 4 1.5-2.4 4-4 7-4 5 0 9 4 9 10 0 11-16 20-16 20Z" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:5px;"/></svg>"#,
        "ui/circled-check": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="25" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><polyline points="23 36 32 45 50 25" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-linejoin:round;stroke-width:6px;"/></svg>"#,
        "ui/circled-question-mark": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="25" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><path d="M27 28c0-5 4-9 9-9s9 4 9 9c0 8-9 8-9 17" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/><circle cx="36" cy="54" r="3.5" style="fill:var(--icon-stroke-color,currentColor);"/></svg>"#,
        "ui/pointer-hand": #"<svg id="pointer-hand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M54,36c-2.49,0-4.5,2.01-4.5,4.5h0v-4.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v4.5-9c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v9V13.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v31.5l-9-9-4.5,4.15s4.5,13.85,18,27.35h22.5s9-9,9-22.5v-4.5c0-2.49-2.01-4.5-4.5-4.5Z" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1);"/><path d="M54,36c-2.49,0-4.5,2.01-4.5,4.5h0v-4.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v4.5-9c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v9V13.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v31.5l-9-9-4.5,4.15s4.5,13.85,18,27.35h22.5s9-9,9-22.5v-4.5c0-2.49-2.01-4.5-4.5-4.5Z" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#,
        "ui/pointer-cross": #"<svg id="pointer-cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="9" x2="36" y2="31.5" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="36" y1="40.5" x2="36" y2="63" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="9" y1="36" x2="31.5" y2="36" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="40.5" y1="36" x2="63" y2="36" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/></svg>"#,
        "ui/speech-balloon": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M15 18h42v29H34L23 58V47h-8Z" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:6px;"/></svg>"#,
        "ui/user": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="24" r="11" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><path d="M17 60c3-13 13-19 19-19s16 6 19 19" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/></svg>"#,
        "ui/users": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="29" cy="25" r="9" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><circle cx="49" cy="29" r="7" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><path d="M13 59c3-12 12-18 17-18s14 6 17 18M41 46c5 1 12 5 15 13" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:5px;"/></svg>"#,
        "ui/clock": #"<svg id="clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="22.5" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1);"/><circle cx="36" cy="36" r="22.5" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/><line x1="36" y1="22.5" x2="36" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-linejoin: round; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/><line x1="36" y1="27" x2="36" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-linejoin: round; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#,
        "ui/timer": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="39" r="21" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><line x1="28" y1="10" x2="44" y2="10" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/><line x1="36" y1="39" x2="47" y2="28" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/></svg>"#,
        "ui/books": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect x="14" y="15" width="13" height="42" rx="3" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><rect x="30" y="15" width="13" height="42" rx="3" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><path d="M47 18l10 36" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:5px;"/></svg>"#,
        "ui/home-location": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M12 34 36 14l24 20" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-linejoin:round;stroke-width:6px;"/><path d="M20 32v25h32V32" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:6px;"/></svg>"#,
        "media/volume-iii": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M12 29h12l16-13v40L24 43H12Z" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:6px;"/><path d="M48 24c4 4 6 8 6 12s-2 8-6 12M56 17c7 6 10 12 10 19s-3 13-10 19" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:5px;"/></svg>"#,
        "media/music-note": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M44 14v34" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/><path d="M44 14l15 5" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/><circle cx="30" cy="52" r="10" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/></svg>"#,
        "media/headphones": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M15 39a21 21 0 0 1 42 0" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/><rect x="12" y="39" width="12" height="18" rx="4" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/><rect x="48" y="39" width="12" height="18" rx="4" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/></svg>"#,
        "media/microphone": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect x="27" y="10" width="18" height="34" rx="9" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><path d="M18 34c0 10 8 18 18 18s18-8 18-18M36 52v10" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-width:6px;"/></svg>"#,
        "media/camera": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect x="12" y="23" width="48" height="34" rx="6" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><path d="M27 23l4-8h10l4 8" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linejoin:round;stroke-width:6px;"/><circle cx="36" cy="40" r="9" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:5px;"/></svg>"#,
        "media/image": #"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect x="12" y="16" width="48" height="40" rx="5" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-width:6px;"/><path d="M18 50l15-15 10 10 6-6 8 11" style="fill:none;stroke:var(--icon-stroke-color,currentColor);stroke-linecap:round;stroke-linejoin:round;stroke-width:5px;"/><circle cx="48" cy="27" r="4" style="fill:var(--icon-stroke-color,currentColor);"/></svg>"#
    ]
}

public struct TikoOpenIconView: UIViewRepresentable {
    private let name: String
    private let color: String

    public init(_ name: String, color: String = "#FFFFFF") {
        self.name = name
        self.color = color
    }

    public func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView(frame: .zero)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.scrollView.backgroundColor = .clear
        view.isUserInteractionEnabled = false
        return view
    }

    public func updateUIView(_ view: WKWebView, context: Context) {
        view.loadHTMLString(html, baseURL: nil)
    }

    private var html: String {
        """
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              html, body { margin: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
              body { display: grid; place-items: center; color: \(color); }
              svg { width: 100%; height: 100%; display: block; --icon-stroke-color: \(color); --icon-stroke-color-secondary: \(color); --icon-fill: transparent; --icon-stroke-width: 5; }
            </style>
          </head>
          <body>\(TikoOpenIcons.svg(named: name))</body>
        </html>
        """
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
