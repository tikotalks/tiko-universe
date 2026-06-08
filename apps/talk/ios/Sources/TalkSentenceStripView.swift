import SwiftUI
import TikoKit

struct TalkSentenceStripView: View {
    let words: [TalkWordTile]
    let displayText: String
    let canSpeak: Bool
    let isSpeaking: Bool
    let appColor: TikoAppColor
    let onRemove: (TalkWordTile) -> Void
    let onMove: (Int, Int) -> Void
    let onSpeak: () -> Void
    let onSave: () -> Void
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
                        ForEach(Array(words.enumerated()), id: \.element.id) { index, word in
                            HStack(spacing: 6) {
                                Button {
                                    onMove(index, max(0, index - 1))
                                } label: {
                                    Image(systemName: "chevron.left")
                                        .font(.caption.weight(.heavy))
                                }
                                .disabled(index == 0)
                                .opacity(index == 0 ? 0.25 : 1)

                                Button {
                                    onRemove(word)
                                } label: {
                                    HStack(spacing: 6) {
                                        Text(word.text)
                                        Image(systemName: "xmark")
                                            .font(.caption2.weight(.heavy))
                                    }
                                }
                                .accessibilityLabel("Remove \(word.text)")

                                Button {
                                    onMove(index, min(words.count - 1, index + 1))
                                } label: {
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.heavy))
                                }
                                .disabled(index == words.count - 1)
                                .opacity(index == words.count - 1 ? 0.25 : 1)
                            }
                            .font(.system(.title3, design: .rounded).weight(.heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(appColor.palette.primary)
                            .clipShape(Capsule())
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

            if !displayText.isEmpty, displayText != words.talkSentenceText {
                Text(displayText)
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundStyle(appColor.palette.dark.opacity(0.68))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityLabel("Sentence preview: \(displayText)")
            }

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
                .accessibilityLabel("Speak sentence")

                Button(action: onSave) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(appColor.palette.dark.opacity(canSpeak ? 0.72 : 0.28))
                        .frame(width: 52, height: 52)
                        .background(Color.white.opacity(0.48))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canSpeak)
                .accessibilityLabel("Save sentence")

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
