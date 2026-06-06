import SwiftUI
import TikoKit

struct TalkSentenceStripView: View {
    let words: [TalkWordTile]
    let canSpeak: Bool
    let isSpeaking: Bool
    let appColor: TikoAppColor
    let onRemove: (TalkWordTile) -> Void
    let onSpeak: () -> Void
    let onClear: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if words.isEmpty {
                        Text("Build a sentence")
                            .font(.system(.title3, design: .rounded).weight(.bold))
                            .foregroundStyle(appColor.palette.dark.opacity(0.46))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 4)
                    } else {
                        ForEach(words) { word in
                            Button {
                                onRemove(word)
                            } label: {
                                HStack(spacing: 6) {
                                    Text(word.text)
                                    Image(systemName: "xmark")
                                        .font(.caption2.weight(.heavy))
                                }
                                .font(.system(.title3, design: .rounded).weight(.heavy))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(appColor.palette.primary)
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove \(word.text)")
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
            }
            .frame(minHeight: 74)
            .background(Color.white.opacity(0.72))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(appColor.palette.primary.opacity(0.18), lineWidth: 1)
            )

            HStack(spacing: 12) {
                Button(action: onSpeak) {
                    Label(isSpeaking ? "Speaking" : "Speak", systemImage: isSpeaking ? "speaker.wave.3.fill" : "speaker.wave.2.fill")
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canSpeak ? appColor.palette.primary : appColor.palette.primary.opacity(0.35))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(!canSpeak)

                Button(action: onClear) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(appColor.palette.dark.opacity(canSpeak ? 0.72 : 0.28))
                        .frame(width: 52, height: 52)
                        .background(Color.white.opacity(0.48))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canSpeak)
                .accessibilityLabel("Clear sentence")
            }
        }
    }
}
