import SwiftUI
import TikoKit

struct TalkSavedPhrasesSheet: View {
    let phrases: [TalkSavedPhrase]
    let appColor: TikoAppColor
    let onSelect: (TalkSavedPhrase) -> Void
    let onDelete: (TalkSavedPhrase) -> Void
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
                        Text("Tap the star after building a sentence, or use a phrase often and the Sentence API can save it for quick speech.")
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
                                HStack(spacing: 12) {
                                    Image(systemName: phrase.isAuto ? "wand.and.stars" : "star.fill")
                                        .foregroundStyle(appColor.palette.primary)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(phrase.label ?? phrase.sentence)
                                            .font(.system(.headline, design: .rounded).weight(.bold))
                                        Text("Used \(phrase.usageCount) time\(phrase.usageCount == 1 ? "" : "s")")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.vertical, 8)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    onDelete(phrase)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                            .accessibilityLabel("Speak saved phrase \(phrase.label ?? phrase.sentence)")
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
