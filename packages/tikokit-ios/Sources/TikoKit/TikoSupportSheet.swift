import SwiftUI

/// Support, in Parent Mode, in every Tiko app.
///
/// The form is built from whatever Arlez publishes for this app, not from a list
/// written here: change the categories in Arlez and every installed app follows
/// without a release. The only thing this file decides is how it looks and what
/// it says while waiting, failing or succeeding.
public struct TikoSupportSheet: View {
    private let appColor: TikoAppColor
    private let appName: String
    private let onClose: () -> Void

    @AppStorage("tiko.language") private var languageID = "en"

    @State private var phase: Phase = .loading
    @State private var configuration: TikoSupportConfiguration?
    @State private var category: TikoSupportCategory?
    @State private var values: [String: String] = [:]
    @State private var email = ""
    @State private var sending = false
    @State private var problem: String?

    @State private var tickets: [TikoSupportTicket] = []
    @State private var openTicket: TikoSupportTicket?
    @State private var conversation: TikoSupportConversation?
    @State private var replyText = ""
    @FocusState private var typing: Bool

    private let client = TikoArlezClient()
    private let store: TikoSupportTicketStoring

    private enum Phase: Equatable {
        case loading
        case unavailable
        case picking
        case filling
        case sent
        case reading
    }

    public init(
        appColor: TikoAppColor,
        appName: String? = nil,
        store: TikoSupportTicketStoring = TikoSupportTicketStore(),
        onClose: @escaping () -> Void
    ) {
        self.appColor = appColor
        self.store = store
        // Defaulted from the bundle so the shared settings sheet, which does not
        // know the app's display name, does not have to be given one.
        self.appName = appName
            ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
            ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String
            ?? "Tiko"
        self.onClose = onClose
    }

    public var body: some View {
        let labels = TikoSupportLabels.forLanguage(languageID)

        TikoPopupCard(
            title: labels.support,
            subtitle: subtitle(labels),
            icon: "lifepreserver.fill",
            appColor: appColor,
            onClose: onClose
        ) {
            VStack(spacing: 16) {
                switch phase {
                case .loading:
                    ProgressView().padding(.vertical, 30)
                case .unavailable:
                    message(labels.unavailable, icon: "wifi.exclamationmark")
                    retryButton(labels)
                case .picking:
                    categoryList(labels)
                    if !tickets.isEmpty { previousList(labels) }
                case .filling:
                    form(labels)
                case .sent:
                    message(labels.sentTitle, icon: "checkmark.circle.fill")
                    Text(labels.sentBody)
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    if let ticket = tickets.first {
                        primaryButton(labels.readConversation) { open(ticket) }
                    }
                case .reading:
                    conversationView(labels)
                }

                if let problem {
                    Text(problem)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button(labels.done) { typing = false }
            }
        }
        .task { await start() }
    }

    // MARK: - Steps

    private func subtitle(_ labels: TikoSupportLabels) -> String? {
        switch phase {
        case .filling: return category?.helpText ?? labels.subtitle
        case .reading: return conversation?.projectName
        default: return labels.subtitle
        }
    }

    @ViewBuilder
    private func categoryList(_ labels: TikoSupportLabels) -> some View {
        TikoSettingsSection(title: labels.whatIsIt) {
            ForEach(configuration?.categories ?? []) { item in
                TikoSettingsActionRow(
                    title: item.label,
                    value: nil,
                    icon: item.icon ?? "bubble.left.and.bubble.right",
                    appColor: appColor
                ) {
                    category = item
                    values = [:]
                    problem = nil
                    phase = .filling
                }
            }
        }
    }

    @ViewBuilder
    private func previousList(_ labels: TikoSupportLabels) -> some View {
        TikoSettingsSection(title: labels.previous) {
            ForEach(tickets) { ticket in
                TikoSettingsActionRow(
                    title: ticket.categoryLabel,
                    value: Self.dayFormatter.string(from: ticket.createdAt),
                    icon: "bubble.left.and.bubble.right",
                    appColor: appColor
                ) { open(ticket) }
            }
        }
    }

    private func form(_ labels: TikoSupportLabels) -> some View {
        let fields: [TikoSupportField] = category?.fields ?? []
        return VStack(alignment: .leading, spacing: 14) {
            ForEach(fields) { field in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 4) {
                        Text(field.label).font(.subheadline.weight(.semibold))
                        if !field.required {
                            Text(labels.optional).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    TextField("", text: binding(for: field.id), axis: .vertical)
                        .focused($typing)
                        .lineLimit(field.kind == .shortText ? 1...1 : 3...8)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color.primary.opacity(0.055))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Text(labels.email).font(.subheadline.weight(.semibold))
                    Text(labels.optional).font(.caption).foregroundStyle(.secondary)
                }
                TextField("", text: $email)
                    .focused($typing)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.emailAddress)
                    .padding(12)
                    .background(Color.primary.opacity(0.055))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text(labels.emailHint).font(.caption).foregroundStyle(.secondary)
            }

            HStack(spacing: 10) {
                Button(labels.back) { phase = .picking; problem = nil }
                    .buttonStyle(.bordered)
                Spacer()
                Button(action: { Task { await send() } }) {
                    if sending { ProgressView() } else { Text(labels.send) }
                }
                .buttonStyle(.borderedProminent)
                .tint(appColor.palette.primary)
                .disabled(sending || !canSend)
            }
        }
    }

    @ViewBuilder
    private func conversationView(_ labels: TikoSupportLabels) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let first = conversation?.message {
                bubble(first, fromSupport: false)
            }
            ForEach(conversation?.messages ?? []) { message in
                bubble(message.body, fromSupport: message.isFromSupport)
            }
            if conversation?.messages.isEmpty ?? true {
                Text(labels.noReplyYet).font(.footnote).foregroundStyle(.secondary)
            }

            if conversation?.replyingIsOpen ?? false {
                TextField(labels.reply, text: $replyText, axis: .vertical)
                    .focused($typing)
                    .lineLimit(2...6)
                    .padding(12)
                    .background(Color.primary.opacity(0.055))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            } else {
                Text(labels.closed).font(.caption).foregroundStyle(.secondary)
            }

            HStack {
                Button(labels.back) { phase = .picking; conversation = nil; problem = nil }
                    .buttonStyle(.bordered)
                Spacer()
                if conversation?.replyingIsOpen ?? false {
                    Button(action: { Task { await sendReply() } }) {
                        if sending { ProgressView() } else { Text(labels.send) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(appColor.palette.primary)
                    .disabled(sending || replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func bubble(_ text: String, fromSupport: Bool) -> some View {
        HStack {
            if fromSupport { Spacer(minLength: 30) }
            Text(text)
                .font(.callout)
                .padding(12)
                .background(fromSupport ? appColor.palette.primary.opacity(0.14) : Color.primary.opacity(0.055))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            if !fromSupport { Spacer(minLength: 30) }
        }
    }

    private func message(_ text: String, icon: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 34))
                .foregroundStyle(appColor.palette.primary)
            Text(text)
                .font(.headline)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 12)
    }

    private func retryButton(_ labels: TikoSupportLabels) -> some View {
        primaryButton(labels.tryAgain) { Task { await start(force: true) } }
    }

    private func primaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .buttonStyle(.borderedProminent)
            .tint(appColor.palette.primary)
    }

    // MARK: - Work

    private var canSend: Bool {
        guard let category else { return false }
        return category.fields
            .filter(\.required)
            .allSatisfy { !(values[$0.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func binding(for id: String) -> Binding<String> {
        Binding(get: { values[id] ?? "" }, set: { values[id] = $0 })
    }

    private func start(force: Bool = false) async {
        if !force, configuration != nil { return }
        tickets = store.sortedTickets
        guard let productID = TikoArlez.productIDForRunningApp else {
            phase = .unavailable
            return
        }
        phase = .loading
        do {
            configuration = try await client.configuration(productID: productID)
            phase = .picking
        } catch {
            phase = .unavailable
        }
    }

    private func send() async {
        guard let category, let productID = TikoArlez.productIDForRunningApp else { return }
        sending = true
        problem = nil
        defer { sending = false }
        do {
            let ticket = try await client.submit(
                productID: productID,
                category: category,
                fields: values,
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                installationID: nil,
                // Enough to reproduce a bug without identifying a child.
                //
                // Do not name a key `appVersion` or `appBuild`: Arlez reserves
                // the `app*` namespace and rejects the whole report with a bare
                // 400, which reaches a parent as "that did not send" with no
                // clue why. `app` itself is accepted.
                metadata: [
                    "app": appName,
                    "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
                    "build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "",
                    "system": Self.systemDescription,
                    "language": languageID
                ]
            )
            store.add(ticket)
            tickets = store.sortedTickets
            values = [:]
            phase = .sent
        } catch let error as TikoSupportError {
            problem = describe(error)
        } catch {
            problem = TikoSupportLabels.forLanguage(languageID).couldNotSend
        }
    }

    private func open(_ ticket: TikoSupportTicket) {
        openTicket = ticket
        conversation = nil
        replyText = ""
        problem = nil
        phase = .reading
        Task { await refreshConversation(ticket) }
    }

    private func refreshConversation(_ ticket: TikoSupportTicket) async {
        do {
            conversation = try await client.conversation(for: ticket)
        } catch let error as TikoSupportError where error.isGone {
            // Withdrawn, or the window closed. Forget it rather than leaving a
            // row that only ever produces an error.
            store.remove(id: ticket.id)
            tickets = store.sortedTickets
            phase = .picking
        } catch {
            problem = TikoSupportLabels.forLanguage(languageID).couldNotLoad
        }
    }

    private func sendReply() async {
        guard let ticket = openTicket else { return }
        let text = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        sending = true
        problem = nil
        defer { sending = false }
        do {
            try await client.reply(to: ticket, body: text)
            replyText = ""
            await refreshConversation(ticket)
        } catch {
            problem = TikoSupportLabels.forLanguage(languageID).couldNotSend
        }
    }

    private func describe(_ error: TikoSupportError) -> String {
        let labels = TikoSupportLabels.forLanguage(languageID)
        switch error {
        case .missingRequiredField: return labels.fillRequired
        case .notConfigured: return labels.unavailable
        default: return labels.couldNotSend
        }
    }

    private static var systemDescription: String {
#if canImport(UIKit)
        "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)"
#else
        "unknown"
#endif
    }

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()
}

#if canImport(UIKit)
import UIKit
#endif
