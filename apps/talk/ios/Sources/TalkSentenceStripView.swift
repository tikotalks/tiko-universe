import SwiftUI
import TikoKit

/// The sentence bar: the words being built, a clear (x) shown once it has content,
/// and a play button on the right, all inside one bar. Tap a word to remove it.
struct TalkSentenceStripView: View {
    let words: [TalkWordTile]
    let canSpeak: Bool
    let isSpeaking: Bool
    let appColor: TikoAppColor
    let onRemove: (TalkWordTile) -> Void
    let onSpeak: () -> Void
    let onClear: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if words.isEmpty {
                        Text("Build a sentence")
                            .font(.system(.title3, design: .rounded).weight(.bold))
                            .foregroundStyle(appColor.palette.dark.opacity(0.46))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        ForEach(words) { word in
                            Button { onRemove(word) } label: {
                                Text(word.text)
                                    .font(.system(.title3, design: .rounded).weight(.heavy))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 9)
                                    .background(appColor.palette.primary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove \(word.text)")
                        }
                    }
                }
                .padding(.leading, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if !words.isEmpty {
                Button(action: onClear) {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(appColor.palette.dark.opacity(0.6))
                        .frame(width: 44, height: 44)
                        .background(Color.white.opacity(0.6))
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
        .background(Color.white.opacity(0.72))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(appColor.palette.primary.opacity(0.18), lineWidth: 1)
        )
    }
}
