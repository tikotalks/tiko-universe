import Foundation
import SwiftUI
import TikoCore
import TikoKit

/// Everything a grown-up can tune, and the one place those choices are named.
///
/// Difficulty is resolved by the engine, not here — these are the inputs it
/// takes, so iOS and a future Android client cannot drift on what "harder"
/// means.
enum WriteSettings {
    static let modelDemoKey = "tiko.write.modelDemo"
    static let difficultyKey = "tiko.write.difficulty"
    static let offPathKey = "tiko.write.offPath"
    static let strokeOrderKey = "tiko.write.strokeOrder"
    static let leftHandedKey = "tiko.write.leftHanded"
    static let pencilOnlyKey = "tiko.write.pencilOnly"
    static let guidesKey = "tiko.write.guides"
    static let speakOnFinishKey = "tiko.write.speakOnFinish"

    /// How forgiving the corridor is. The engine turns this into a tolerance.
    enum Difficulty: String, CaseIterable, Identifiable {
        case gentle, normal, exact
        var id: String { rawValue }

        var toleranceFraction: Double {
            switch self {
            case .gentle: return 0.18
            case .normal: return 0.13
            case .exact: return 0.09
            }
        }

        var titleKey: String { "write.settings.difficulty.\(rawValue)" }
    }

    enum OffPath: String, CaseIterable, Identifiable {
        case wait, lastPoint, restart
        var id: String { rawValue }

        var policy: OffPathPolicy {
            switch self {
            case .wait: return .stayInPlace
            case .lastPoint: return .backToLastKeyPoint
            case .restart: return .backToStart
            }
        }

        var titleKey: String { "write.settings.offPath.\(rawValue)" }
    }

    /// Builds the engine's settings from what the grown-up chose. Kept in one
    /// place so no screen invents its own difficulty.
    @MainActor
    static func traceSettings() -> TraceSettings {
        let defaults = UserDefaults.standard
        let difficulty = Difficulty(rawValue: defaults.string(forKey: difficultyKey) ?? "") ?? .normal
        let offPath = OffPath(rawValue: defaults.string(forKey: offPathKey) ?? "") ?? .wait
        let strokeOrder = defaults.object(forKey: strokeOrderKey) as? Bool ?? true

        return TraceSettings(
            toleranceFraction: difficulty.toleranceFraction,
            backtrackSlack: 0.04,
            offPathPolicy: offPath.policy,
            strokeOrderStrict: strokeOrder,
            allowLiftBetweenKeyPoints: true,
            startToleranceFraction: 0.18,
            maxAdvancePerSample: 0.15,
            attemptCount: 1
        )
    }

    @MainActor static var modelDemoEnabled: Bool {
        UserDefaults.standard.object(forKey: modelDemoKey) as? Bool ?? true
    }

    @MainActor static var guidesEnabled: Bool {
        UserDefaults.standard.object(forKey: guidesKey) as? Bool ?? true
    }

    @MainActor static var leftHanded: Bool {
        UserDefaults.standard.bool(forKey: leftHandedKey)
    }

    @MainActor static var pencilOnly: Bool {
        UserDefaults.standard.bool(forKey: pencilOnlyKey)
    }

    @MainActor static var speakOnFinish: Bool {
        UserDefaults.standard.object(forKey: speakOnFinishKey) as? Bool ?? true
    }
}

/// Parent Mode: the settings sheet, plus the family's own words.
///
/// Everything here is configuration, which the design principles put behind the
/// PIN gate — TikoAppShell only shows this content in Parent Mode.
struct WriteSettingsContent: View {
    @ObservedObject var i18n: TikoI18n
    @ObservedObject var wordStore: WriteWordStore
    let languageCode: String

    @AppStorage(WriteSettings.modelDemoKey) private var modelDemo = true
    @AppStorage(WriteSettings.difficultyKey) private var difficulty = WriteSettings.Difficulty.normal.rawValue
    @AppStorage(WriteSettings.offPathKey) private var offPath = WriteSettings.OffPath.wait.rawValue
    @AppStorage(WriteSettings.strokeOrderKey) private var strokeOrder = true
    @AppStorage(WriteSettings.leftHandedKey) private var leftHanded = false
    @AppStorage(WriteSettings.pencilOnlyKey) private var pencilOnly = false
    @AppStorage(WriteSettings.guidesKey) private var guides = true
    @AppStorage(WriteSettings.speakOnFinishKey) private var speakOnFinish = true

    @State private var typed = ""
    @State private var showingAdd = false
    @State private var rejected = false

    private let tint = TikoAppColor.write.palette.primary

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            section(i18n.t("write.settings.tracing")) {
                picker(i18n.t("write.settings.difficulty"), selection: $difficulty,
                       options: WriteSettings.Difficulty.allCases.map { ($0.rawValue, i18n.t($0.titleKey)) })
                picker(i18n.t("write.settings.offPath"), selection: $offPath,
                       options: WriteSettings.OffPath.allCases.map { ($0.rawValue, i18n.t($0.titleKey)) })
                toggle(i18n.t("write.settings.strokeOrder"), isOn: $strokeOrder)
            }

            section(i18n.t("write.settings.help")) {
                // On by default: a child who has not been shown how a letter is
                // made cannot discover it from a static outline.
                toggle(i18n.t("write.settings.modelDemo"), isOn: $modelDemo)
                toggle(i18n.t("write.settings.guides"), isOn: $guides)
                toggle(i18n.t("write.settings.speak"), isOn: $speakOnFinish)
            }

            section(i18n.t("write.settings.hands")) {
                toggle(i18n.t("write.settings.leftHanded"), isOn: $leftHanded)
                toggle(i18n.t("write.settings.pencilOnly"), isOn: $pencilOnly)
            }

            section(i18n.t("write.group.words")) {
                Button { showingAdd = true } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text(i18n.t("write.words.add"))
                            .font(.system(.body, design: .rounded).weight(.semibold))
                        Spacer()
                    }
                    .foregroundStyle(tint)
                }
                .buttonStyle(.plain)

                ForEach(wordStore.words.filter(\.isCustom)) { word in
                    HStack {
                        Text(word.text).font(.system(.body, design: .rounded))
                        Spacer()
                        Button {
                            wordStore.removeCustom(word)
                            wordStore.refresh(language: languageCode)
                        } label: {
                            Image(systemName: "minus.circle")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(i18n.t("write.words.remove")) \(word.text)")
                    }
                }
            }
        }
        .onAppear { wordStore.refresh(language: languageCode) }
        .alert(i18n.t("write.words.add"), isPresented: $showingAdd) {
            TextField(i18n.t("write.words.placeholder"), text: $typed)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button(i18n.t("write.words.save")) {
                rejected = wordStore.addCustom(typed) == nil
                typed = ""
                wordStore.refresh(language: languageCode)
            }
            Button(i18n.t("write.words.cancel"), role: .cancel) { typed = "" }
        } message: {
            Text(i18n.t(rejected ? "write.words.rejected" : "write.words.hint"))
        }
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
            content()
        }
    }

    private func toggle(_ title: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Text(title).font(.system(.body, design: .rounded))
        }
        .tint(tint)
    }

    private func picker(_ title: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(.body, design: .rounded))
            Picker(title, selection: selection) {
                ForEach(options, id: \.0) { Text($0.1).tag($0.0) }
            }
            .pickerStyle(.segmented)
        }
    }
}
