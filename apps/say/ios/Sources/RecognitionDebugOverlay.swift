#if DEBUG
import SwiftUI

/// Development-only overlay exposing recognition internals. Enabled with the
/// `--say-debug` launch argument or a 2-second long press on the practice
/// screen. Never included in release builds and never child-facing.
struct RecognitionDebugOverlay: View {
    @ObservedObject var viewModel: PracticeViewModel
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Say debug")
                    .font(.caption.weight(.heavy))
                Spacer()
                Button("Close", action: onClose)
                    .font(.caption.weight(.bold))
            }

            Text(viewModel.debugDescription)
                .font(.system(size: 11, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)

            Toggle("Disable automatic success", isOn: $viewModel.debugAutoSuccessDisabled)
                .font(.caption)

            HStack(spacing: 8) {
                debugButton("Copy") {
                    UIPasteboard.general.string = viewModel.debugDescription
                }
                debugButton("Restart item") { viewModel.debugRestartItem() }
            }
            HStack(spacing: 8) {
                debugButton("✓ result") { viewModel.debugSimulateCorrect() }
                debugButton("✗ result") { viewModel.debugSimulateIncorrect() }
                debugButton("No recognizer") { viewModel.debugSimulateRecognizerUnavailable() }
            }
        }
        .padding(12)
        .frame(width: 320)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(12)
    }

    private func debugButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.bold))
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(Color.secondary.opacity(0.2))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
#endif
