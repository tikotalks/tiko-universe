import Foundation
import TikoKit
import UIKit

struct TalkIdentityContext: Equatable, Sendable {
    let userId: String?
    let sessionToken: String?
}

protocol TalkIdentityProviding: AnyObject, Sendable {
    func bootstrapIdentity() async throws -> TalkIdentityContext
}

final class TikoTalkIdentityProvider: TalkIdentityProviding, @unchecked Sendable {
    private let client: TikoIdentityClient
    private let store: TikoDeviceSessionStore

    init(client: TikoIdentityClient = TikoIdentityClient(), store: TikoDeviceSessionStore = TikoDeviceSessionStore()) {
        self.client = client
        self.store = store
    }

    func bootstrapIdentity() async throws -> TalkIdentityContext {
        if let existing = try? store.load() {
            if let token = existing.accessToken,
               let refreshed = try? await client.refreshSession(accessToken: token) {
                try? store.save(refreshed)
                return TalkIdentityContext(userId: refreshed.subject.id, sessionToken: refreshed.accessToken)
            }
            if let token = existing.accessToken {
                return TalkIdentityContext(userId: existing.subject.id, sessionToken: token)
            }
        }

        let bundle = try await client.bootstrapDevice(name: UIDevice.current.name, platform: "ios")
        try? store.save(bundle)
        return TalkIdentityContext(userId: bundle.subject.id, sessionToken: bundle.accessToken)
    }
}
