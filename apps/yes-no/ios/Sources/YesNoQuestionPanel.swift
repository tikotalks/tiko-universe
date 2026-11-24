import SwiftUI
import TikoKit
import UIKit

// MARK: - The question on the board

/// The question as it stands on the board. Tapping it opens the panel where it
/// is changed, so the board itself never grows a keyboard.
struct YesNoQuestionBar: View {
    let question: String
    let hint: String
    let onEdit: () -> Void

    var body: some View {
        Button(action: onEdit) {
            Text(question)
                .font(.system(.title2, design: .rounded).weight(.semibold))
                .multilineTextAlignment(.center)
                // `.primary` over a tint of `.primary`: both follow the scheme
                // in effect, so the pair stays readable in light and in dark.
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 46)
                .padding(.vertical, 14)
                .background(Color.primary.opacity(0.07))
                .overlay(alignment: .trailing) {
                    Image(systemName: "pencil")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.secondary)
                        .padding(.trailing, 16)
                }
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(question)
        .accessibilityHint(hint)
        .accessibilityIdentifier("YesNoQuestionButton")
    }
}

// MARK: - The question panel

/// Where a question is set: typed, said, or picked from the earlier ones.
///
/// There is no cancel. Every way out — Return, a tap beside the panel, the
/// close button, an earlier question — leaves with what is in the field, which
/// the board then shows.
struct YesNoQuestionPanel: View {
    @Binding var draft: String
    let previousQuestions: [String]
    let languageCode: String
    /// Called before the microphone opens, so the app is not still talking.
    let onWillListen: () -> Void
    let onDone: () -> Void

    @ObservedObject var dictation: YesNoDictation
    @EnvironmentObject private var i18n: TikoI18n
    @FocusState private var fieldFocused: Bool

    private var accent: Color { TikoAppColor.yesNo.palette.primary }

    /// While typing, the earlier questions narrow to the ones that match, so
    /// the field doubles as a search. Nothing typed, or nothing found, shows
    /// them all.
    private var shownQuestions: [String] {
        let typed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !typed.isEmpty else { return previousQuestions }
        let matches = previousQuestions.filter {
            $0.localizedCaseInsensitiveContains(typed) && $0.caseInsensitiveCompare(typed) != .orderedSame
        }
        return matches.isEmpty ? previousQuestions : matches
    }

    var body: some View {
        TikoPopupCard(
            title: i18n.t("yesNo.question.title"),
            subtitle: i18n.t("yesNo.question.subtitle"),
            icon: "questionmark.bubble.fill",
            appColor: .yesNo,
            onClose: onDone
        ) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .center, spacing: 10) {
                    field
                    if dictation.canListen {
                        microphoneButton
                    }
                }
                dictationStatus
                earlierQuestions
            }
        }
        .task {
            // Let the panel finish arriving before the keyboard pushes it up.
            try? await Task.sleep(nanoseconds: 350_000_000)
            if dictation.state != .listening { fieldFocused = true }
        }
        .onDisappear { dictation.stop() }
    }

    // MARK: Field

    private var field: some View {
        HStack(alignment: .center, spacing: 8) {
            TextField(i18n.t("yesNo.question.placeholder"), text: $draft, axis: .vertical)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.primary)
                .lineLimit(1...4)
                .submitLabel(.done)
                .focused($fieldFocused)
                .onSubmit(onDone)
                .onChange(of: draft) { _, text in
                    // A growing field can take Return as a line break. A
                    // question has no line breaks: Return means "this one".
                    guard text.contains(where: \.isNewline) else { return }
                    draft = text.split(whereSeparator: \.isNewline).joined(separator: " ")
                    onDone()
                }
                .accessibilityIdentifier("YesNoQuestionField")

            if !draft.isEmpty {
                Button {
                    draft = ""
                    fieldFocused = true
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.secondary)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(i18n.t("yesNo.question.clear"))
                .accessibilityIdentifier("YesNoQuestionClearButton")
            }
        }
        .padding(.leading, 16)
        .padding(.trailing, 8)
        .padding(.vertical, 10)
        .frame(minHeight: 56)
        .background(Color(.systemBackground))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(fieldFocused ? accent.opacity(0.7) : Color.primary.opacity(0.08), lineWidth: fieldFocused ? 2 : 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    // MARK: Dictation

    private var microphoneButton: some View {
        let listening = dictation.state == .listening
        return Button {
            if !listening {
                onWillListen()
                // The keyboard has a microphone of its own; two at once fight.
                fieldFocused = false
            }
            dictation.toggle(languageCode: languageCode) { heard in
                draft = heard
            }
        } label: {
            Image(systemName: listening ? "stop.fill" : "mic.fill")
                .font(.system(size: 20, weight: .bold))
                // Solid in both states: white on the app colour reads the same
                // in light and in dark, where a tinted button went dim.
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(listening ? TikoAppColor.yesNo.palette.dark : accent)
                .clipShape(Circle())
                .background {
                    // Breathes with the voice, so it is plain the app hears it.
                    Circle()
                        .fill(accent.opacity(0.28))
                        .scaleEffect(listening ? 1.12 + CGFloat(dictation.level) * 0.3 : 1)
                        .animation(.easeOut(duration: 0.18), value: dictation.level)
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(i18n.t(listening ? "yesNo.question.stopListening" : "yesNo.question.say"))
        .accessibilityIdentifier("YesNoQuestionMicButton")
    }

    @ViewBuilder
    private var dictationStatus: some View {
        switch dictation.state {
        case .idle:
            EmptyView()
        case .listening:
            statusLine(i18n.t("yesNo.question.listening"), icon: "waveform")
        case .unavailable:
            statusLine(i18n.t("yesNo.question.micUnavailable"), icon: "mic.slash.fill")
        case .denied:
            VStack(alignment: .leading, spacing: 8) {
                statusLine(i18n.t("yesNo.question.micDenied"), icon: "mic.slash.fill")
                Button {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Text(i18n.t("yesNo.question.openSettings"))
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(TikoAppColor.yesNo.palette.dark)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func statusLine(_ text: String, icon: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .bold))
            Text(text)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 4)
    }

    // MARK: Earlier questions

    @ViewBuilder
    private var earlierQuestions: some View {
        if previousQuestions.isEmpty {
            Text(i18n.t("yesNo.question.hint"))
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 4)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                TikoFieldLabel(i18n.t("yesNo.question.earlier"))
                    .padding(.horizontal, 4)
                // A handful of questions sit in the panel as they are; a long
                // list scrolls inside a fixed window so the panel keeps its size.
                if shownQuestions.count <= 4 {
                    questionRows
                } else {
                    ScrollView { questionRows }
                        .scrollIndicators(.hidden)
                        .scrollDismissesKeyboard(.never)
                        .frame(height: 248)
                }
            }
        }
    }

    private var questionRows: some View {
        VStack(spacing: 8) {
            ForEach(shownQuestions, id: \.self) { question in
                Button {
                    draft = question
                    onDone()
                } label: {
                    HStack(spacing: 12) {
                        Text(question)
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.up.left")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 13)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }
}
