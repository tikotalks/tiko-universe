import SwiftUI
import TikoKit

struct TalkSavedPhrasesSheet: View {
    let phrases: [TalkSavedPhrase]
    let appColor: TikoAppColor
    let onSelect: (TalkSavedPhrase) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if phrases.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "star.bubble.fill")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundStyle(appColor.palette.primary.opacity(0.55))
                        Text("No saved phrases yet")
                            .font(.system(.title3, design: .rounded).weight(.heavy))
                        Text("Sentences you use often will appear here.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(phrases) { phrase in
                            Button {
                                onSelect(phrase)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(phrase.label ?? phrase.sentence)
                                        .font(.system(.headline, design: .rounded).weight(.bold))
                                    Text("Used \(phrase.usageCount) time\(phrase.usageCount == 1 ? "" : "s")")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Saved phrases")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
