import SwiftUI
import WebKit
import TikoKit

// Attaches the WKWebView directly to the UIWindow at an off-screen position.
// WKWebView renders through a separate GPU compositor layer that bypasses
// UIKit's clipsToBounds — the only reliable fix is to keep it out of the
// SwiftUI layout tree entirely.
struct WebViewWindowAttacher: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.isHidden = true
        v.backgroundColor = .clear
        return v
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        guard webView.superview == nil, let window = uiView.window else { return }
        webView.frame = CGRect(x: -1000, y: -1000, width: 1, height: 1)
        window.addSubview(webView)
        window.sendSubviewToBack(webView)
    }
}

struct RenameSheet: View {
    let title: String
    let label: String
    let value: String
    let onSave: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var draft: String

    init(title: String, label: String, value: String, onSave: @escaping (String) -> Void) {
        self.title = title
        self.label = label
        self.value = value
        self.onSave = onSave
        _draft = State(initialValue: value)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(label, text: $draft)
                }
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(draft)
                        dismiss()
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
