import SwiftUI
import TikoCore
import TikoKit

/// The words a child can write, with a way for a grown-up to add one.
struct WordList: View {
    @ObservedObject var store: WriteWordStore
    let i18n: TikoI18n
    let onPick: (WriteWordStore.Word) -> Void

    @State private var showingAdd = false
    @State private var typed = ""
    @State private var rejected = false

    private let columns = [GridItem(.adaptive(minimum: 140, maximum: 240), spacing: 14)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 14) {
                // Adding a word is a grown-up's job, so it sits first and looks
                // different from the words themselves.
                Button { showingAdd = true } label: {
                    VStack(spacing: 8) {
                        Image(systemName: "plus")
                            .font(.system(size: 30, weight: .bold))
                        Text(i18n.t("write.words.add")).font(.subheadline)
                    }
                    .frame(maxWidth: .infinity, minHeight: 96)
                    .foregroundStyle(TikoAppColor.write.palette.primary)
                    .background(
                        RoundedRectangle(cornerRadius: 22)
                            .strokeBorder(
                                TikoAppColor.write.palette.primary.opacity(0.5),
                                style: StrokeStyle(lineWidth: 2, dash: [7, 5])
                            )
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("write.words.add"))

                ForEach(store.words) { word in
                    Button { onPick(word) } label: {
                        VStack(spacing: 6) {
                            Text(word.text)
                                .font(.system(size: 30, weight: .semibold, design: .rounded))
                                .minimumScaleFactor(0.5)
                                .lineLimit(1)
                            Text("\(word.glyphIDs.count)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 96)
                        .background(
                            Color.primary.opacity(word.isCustom ? 0.10 : 0.05),
                            in: RoundedRectangle(cornerRadius: 22)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(word.text)
                }
            }
            .padding(16)
        }
        .alert(i18n.t("write.words.add"), isPresented: $showingAdd) {
            TextField(i18n.t("write.words.placeholder"), text: $typed)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button(i18n.t("write.words.save")) { save() }
            Button(i18n.t("write.words.cancel"), role: .cancel) { typed = "" }
        } message: {
            Text(i18n.t(rejected ? "write.words.rejected" : "write.words.hint"))
        }
    }

    private func save() {
        // A word the pack cannot spell is refused rather than silently trimmed:
        // a child tracing their own name should get their name.
        rejected = store.addCustom(typed) == nil
        typed = ""
        store.refresh(language: Locale.current.language.languageCode?.identifier ?? "en")
    }
}

/// Writing one word.
struct WordScreen: View {
    let word: WriteWordStore.Word
    let pack: GlyphPack
    let languageCode: String
    let i18n: TikoI18n
    let onNext: () -> Void

    @StateObject private var model: WordTraceModel
    @State private var failed = false

    init(
        word: WriteWordStore.Word,
        pack: GlyphPack,
        languageCode: String,
        i18n: TikoI18n,
        onNext: @escaping () -> Void
    ) {
        self.word = word
        self.pack = pack
        self.languageCode = languageCode
        self.i18n = i18n
        self.onNext = onNext
        _model = StateObject(
            wrappedValue: WordTraceModel(
                word: word, pack: pack, settings: TraceSettings.companion.forgiving
            ) ?? WordTraceModel.placeholder(pack: pack)
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            // The whole word in text above the canvas, with the letter in hand
            // marked. A child who cannot yet read the shapes can still see how
            // far along they are.
            HStack(spacing: 2) {
                ForEach(Array(word.text.enumerated()), id: \.offset) { index, character in
                    Text(String(character))
                        .font(.system(size: 26, weight: .semibold, design: .rounded))
                        .foregroundStyle(
                            index < model.completedLetters
                                ? TikoAppColor.write.palette.primary
                                : (index == model.currentIndex ? Color.primary : Color.secondary.opacity(0.45))
                        )
                }
            }
            .padding(.top, 6)

            ZStack {
                WordCanvasView(model: model, tint: TikoAppColor.write.palette.primary)
                TikoCelebrationOverlay(
                    trigger: model.celebrationTrigger,
                    variant: TikoCelebrationVariant.allCases.randomElement() ?? .stars,
                    emoji: "⭐️",
                    appColor: .write
                )
                .allowsHitTesting(false)

                if model.isComplete {
                    WordWellDone(
                        word: word,
                        languageCode: languageCode,
                        i18n: i18n,
                        onNext: onNext
                    )
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.72), value: model.isComplete)
            .padding(.horizontal, 8)

            if !model.isComplete {
                HStack(spacing: 28) {
                    Button { model.restart() } label: {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 26, weight: .semibold))
                            .frame(width: 64, height: 64)
                    }
                    .accessibilityLabel(i18n.t("write.action.again"))

                    Button(action: onNext) {
                        Image(systemName: "arrow.forward")
                            .font(.system(size: 26, weight: .semibold))
                            .frame(width: 64, height: 64)
                    }
                    .accessibilityLabel(i18n.t("write.action.next"))
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.circle)
                .padding(.bottom, 18)
            }
        }
    }
}

/// The finish for a word: the word itself, large, spoken, and one way on.
private struct WordWellDone: View {
    let word: WriteWordStore.Word
    let languageCode: String
    let i18n: TikoI18n
    let onNext: () -> Void

    @State private var appeared = false
    @State private var voice = TikoVoiceService()

    var body: some View {
        ZStack {
            Color.black.opacity(0.18).ignoresSafeArea()
            VStack(spacing: 18) {
                Text(word.text)
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundStyle(TikoAppColor.write.palette.primary)
                    .minimumScaleFactor(0.4)
                    .lineLimit(1)
                    .scaleEffect(appeared ? 1 : 0.7)
                    .animation(.spring(response: 0.5, dampingFraction: 0.58), value: appeared)

                Text(i18n.t("write.wellDone"))
                    .font(.system(size: 24, weight: .bold, design: .rounded))

                Button(action: onNext) {
                    Image(systemName: "arrow.forward")
                        .font(.system(size: 30, weight: .bold))
                        .frame(width: 78, height: 78)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .tint(TikoAppColor.write.palette.primary)
                .accessibilityLabel(i18n.t("write.action.next"))
            }
            .padding(.horizontal, 34)
            .padding(.vertical, 32)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 44, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 44, style: .continuous)
                    .strokeBorder(TikoAppColor.write.palette.primary.opacity(0.25), lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.16), radius: 26, y: 10)
            .padding(24)
        }
        .onAppear {
            appeared = true
            Task {
                try? await Task.sleep(nanoseconds: 550_000_000)
                await voice.speak(word.text, languageCode: languageCode)
            }
        }
        .onDisappear { voice.stop() }
    }
}

extension WordTraceModel {
    /// Never reached in practice — the word list only offers words the pack can
    /// spell — but a StateObject cannot be optional, so this keeps the failure
    /// visible as an empty canvas rather than a crash.
    static func placeholder(pack: GlyphPack) -> WordTraceModel {
        let fallback = WriteWordStore.Word(
            id: "a", text: "a", shapeId: nil, glyphIDs: ["lower-a"], isCustom: false
        )
        return WordTraceModel(word: fallback, pack: pack, settings: TraceSettings.companion.forgiving)!
    }
}
