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
        TikoOpenIconOption(name: "ui/pointer-hand", label: "Hand"),
        TikoOpenIconOption(name: "ui/pointer-cross", label: "Stop hand"),
        TikoOpenIconOption(name: "ui/clock", label: "Clock")
    ]

    public static func svg(named name: String) -> String {
        svgByName[name] ?? svgByName["ui/question-mark-fat"]!
    }

    private static let svgByName: [String: String] = [
        "ui/check-fat": #"<svg id="check-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><polyline points="13.5 23.14 34.71 58.5 63 9" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "wayfinding/cross": #"<svg id="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><polygon points="27 9 45 9 45 27 63 27 63 45 45 45 45 63 27 63 27 45 9 45 9 27 27 27 27 9" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1); stroke-width: 0px;"/><polygon points="27 9 45 9 45 27 63 27 63 45 45 45 45 63 27 63 27 45 9 45 9 27 27 27 27 9" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#,
        "ui/question-mark-fat": #"<svg id="question-mark-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="54" x2="36" y2="54" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-miterlimit: 10; stroke-width: 8px;"/><path d="M25.5,24c0-5.8,4.7-10.5,10.5-10.5s10.5,4.7,10.5,10.5c0,10.5-10.5,10.5-10.5,21" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "ui/add-fat": #"<svg id="add-fat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="13.5" x2="36" y2="58.5" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/><line x1="13.5" y1="36" x2="58.5" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width: 8px;"/></svg>"#,
        "ui/pointer-hand": #"<svg id="pointer-hand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M54,36c-2.49,0-4.5,2.01-4.5,4.5h0v-4.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v4.5-9c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v9V13.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v31.5l-9-9-4.5,4.15s4.5,13.85,18,27.35h22.5s9-9,9-22.5v-4.5c0-2.49-2.01-4.5-4.5-4.5Z" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1);"/><path d="M54,36c-2.49,0-4.5,2.01-4.5,4.5h0v-4.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v4.5-9c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v9V13.5c0-2.49-2.01-4.5-4.5-4.5s-4.5,2.01-4.5,4.5v31.5l-9-9-4.5,4.15s4.5,13.85,18,27.35h22.5s9-9,9-22.5v-4.5c0-2.49-2.01-4.5-4.5-4.5Z" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#,
        "ui/pointer-cross": #"<svg id="pointer-cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><line x1="36" y1="9" x2="36" y2="31.5" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="36" y1="40.5" x2="36" y2="63" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="9" y1="36" x2="31.5" y2="36" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/><line x1="40.5" y1="36" x2="63" y2="36" style="fill: none; stroke: var(--icon-stroke-color-secondary, var(--icon-stroke-color, currentColor)); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-secondary-m, var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1)));"/></svg>"#,
        "ui/clock": #"<svg id="clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="22.5" style="fill: var(--icon-fill, rgba(0, 0, 0, 0)); opacity: var(--icon-fill-opacity, 1);"/><circle cx="36" cy="36" r="22.5" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-miterlimit: 10; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/><line x1="36" y1="22.5" x2="36" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-linejoin: round; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/><line x1="36" y1="27" x2="36" y2="36" style="fill: none; stroke: var(--icon-stroke-color, currentColor); stroke-linecap: round; stroke-linejoin: round; stroke-width:var(--icon-stroke-width-m, calc(var(--icon-stroke-width, 5) * 1));"/></svg>"#
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
