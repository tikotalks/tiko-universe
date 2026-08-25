import Foundation
import CryptoKit

/// Child Mode without an account.
///
/// The identity worker only lets `verified` and `profile_manager` subjects set
/// a PIN and enter child mode, because a server-held PIN can be recovered by
/// email. That is right for an account, but it left a parent who never signs up
/// with no way to lock the app at all — and it is what App Review hit when they
/// went looking for Tiko First's parental controls (guideline 2.3.6).
///
/// So a device without a verified email keeps its own gate: a 4-digit PIN and a
/// child-mode flag that never leave the device. When the account *is* verified
/// the server stays authoritative and none of this is used.
///
/// **Forgetting the PIN is recoverable.** `TikoParentCodeEntrySheet` offers
/// "Forgot PIN?", which mails a code to any inbox the parent names and clears
/// the gate on success — an account is needed to *recover* the PIN, never to
/// *set* one. That keeps a child out without ever locking a parent out.
///
/// **Why `UserDefaults` and not the keychain.** The keychain survives deleting
/// the app, so a PIN stored there would outlive a reinstall and leave a parent
/// with no offline way back. Reinstalling stays the last resort behind email
/// recovery, and that only works if the gate goes with the app. Recoverability
/// wins over hiding the hash of a four-digit number that guards a UI lock, not
/// data.
public enum TikoParentGate {
    private static let storageKey = "tiko.parentGate.local"

    private struct Record: Codable {
        var salt: Data
        var hash: Data
        var childModeActive: Bool
    }

    // MARK: - Combined state

    /// The one answer to "is this device locked into Child Mode right now?".
    /// Every app asks this rather than reading a bundle, because a guest device
    /// may have no identity bundle at all.
    public static var isChildModeActive: Bool {
        if isLocalChildModeActive { return true }
        return (try? TikoDeviceSessionStore().load())?.isChildMode ?? false
    }

    /// Whether entering child mode should use the device-local gate rather than
    /// the server. Only a verified email buys the server path.
    public static func usesLocalGate(_ bundle: TikoIdentityBundle?) -> Bool {
        bundle?.account?.emailVerified != true
    }

    // MARK: - Local gate

    public static var isLocalPinConfigured: Bool { load() != nil }

    public static var isLocalChildModeActive: Bool { load()?.childModeActive ?? false }

    /// Sets the PIN and enters child mode in one step, mirroring what the
    /// server path does (set PIN → enable → enter).
    public static func configureLocalPin(_ pin: String) {
        let salt = randomSalt()
        save(Record(salt: salt, hash: digest(pin: pin, salt: salt), childModeActive: true))
    }

    /// Re-enters child mode with the PIN already set.
    public static func enterLocalChildMode() {
        guard var record = load() else { return }
        record.childModeActive = true
        save(record)
    }

    public static func verifyLocalPin(_ pin: String) -> Bool {
        guard let record = load() else { return false }
        // Constant-time comparison: the hashes are equal length, so a plain
        // `==` on Data would leak nothing useful here, but this keeps the
        // intent explicit.
        let candidate = digest(pin: pin, salt: record.salt)
        guard candidate.count == record.hash.count else { return false }
        var difference: UInt8 = 0
        for (lhs, rhs) in zip(candidate, record.hash) { difference |= lhs ^ rhs }
        return difference == 0
    }

    /// Leaves child mode but keeps the PIN, so re-entering does not ask for a
    /// new one — the same shape as the server's `mode: parent` transition.
    public static func leaveLocalChildMode() {
        guard var record = load() else { return }
        record.childModeActive = false
        save(record)
    }

    public static func clearLocalPin() {
        UserDefaults.standard.removeObject(forKey: storageKey)
    }

    // MARK: - Storage

    private static func load() -> Record? {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(Record.self, from: data)
    }

    private static func save(_ record: Record) {
        guard let data = try? JSONEncoder().encode(record) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private static func randomSalt() -> Data {
        var bytes = [UInt8](repeating: 0, count: 16)
        for index in bytes.indices { bytes[index] = UInt8.random(in: .min ... .max) }
        return Data(bytes)
    }

    private static func digest(pin: String, salt: Data) -> Data {
        Data(SHA256.hash(data: salt + Data(pin.utf8)))
    }
}
