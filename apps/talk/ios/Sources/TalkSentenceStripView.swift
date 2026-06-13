import SwiftUI
import TikoKit

/// The sentence bar: the words being built, a clear (x) once it has content, and
/// a play button on the right — all in one solid bar. Tap a word to say it,
/// double-tap to remove it. Words are coloured by part of speech.
struct TalkSentenceStripView: View {
    let words: [TalkWordTile]
    let canSpeak: Bool
    let isSpeaking: Bool
    let appColor: TikoAppColor
    let onSpeakWord: (TalkWordTile) -> Void
    let onRemove: (TalkWordTile) -> Void
    let onSpeak: () -> Void
    let onClear: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        if words.isEmpty {
                            Text("Build a sentence")
                                .font(.system(.title3, design: .rounded).weight(.bold))
                                .foregroundStyle(appColor.palette.dark.opacity(0.46))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            ForEach(words) { word in
                                Text(word.text)
                                    .font(.system(.title3, design: .rounded).weight(.heavy))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(TalkPosColor.color(for: word.pos))
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .id(word.id)
                                    .onTapGesture(count: 2) { onRemove(word) }
                                    .onTapGesture(count: 1) { onSpeakWord(word) }
                                    .accessibilityLabel(word.text)
                                    .accessibilityHint("Tap to say, double tap to remove")
                            }
                        }
                    }
                    .padding(.leading, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .onChange(of: words.count) { _, _ in
                    // Keep the most recently added word fully in view.
                    if let last = words.last?.id {
                        withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo(last, anchor: .trailing) }
                    }
                }
            }

            if !words.isEmpty {
                Button(action: onClear) {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(appColor.palette.dark.opacity(0.6))
                        .frame(width: 44, height: 44)
                        .background(appColor.palette.dark.opacity(0.08))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear sentence")
            }

            Button(action: onSpeak) {
                Image(systemName: isSpeaking ? "speaker.wave.3.fill" : "play.fill")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(canSpeak ? appColor.palette.primary : appColor.palette.primary.opacity(0.35))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(!canSpeak)
            .accessibilityLabel(isSpeaking ? "Speaking" : "Speak sentence")
            .padding(.trailing, 8)
        }
        .padding(.vertical, 8)
        .frame(minHeight: 72)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: appColor.palette.dark.opacity(0.12), radius: 12, y: 4)
    }
}
