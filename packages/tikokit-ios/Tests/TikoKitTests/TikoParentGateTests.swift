import XCTest
@testable import TikoKit

/// Child Mode has to work on a device that never signed up — that gap is what
/// App Review reported as "unable to find Parental Controls" for Tiko First
/// (guideline 2.3.6).
final class TikoParentGateTests: XCTestCase {
    override func setUp() {
        super.setUp()
        TikoParentGate.clearLocalPin()
    }

    override func tearDown() {
        TikoParentGate.clearLocalPin()
        super.tearDown()
    }

    // MARK: - Which gate applies

    func testADeviceWithNoAccountUsesTheLocalGate() {
        XCTAssertTrue(TikoParentGate.usesLocalGate(nil))
    }

    func testAnUnverifiedAccountUsesTheLocalGate() {
        XCTAssertTrue(TikoParentGate.usesLocalGate(bundle(emailVerified: false)))
    }

    func testAVerifiedAccountUsesTheServer() {
        XCTAssertFalse(TikoParentGate.usesLocalGate(bundle(emailVerified: true)))
    }

    // MARK: - The local gate

    func testNoPinIsConfiguredOnAFreshDevice() {
        XCTAssertFalse(TikoParentGate.isLocalPinConfigured)
        XCTAssertFalse(TikoParentGate.isLocalChildModeActive)
    }

    func testConfiguringAPinEntersChildModeInOneStep() {
        TikoParentGate.configureLocalPin("1234")
        XCTAssertTrue(TikoParentGate.isLocalPinConfigured)
        XCTAssertTrue(TikoParentGate.isLocalChildModeActive)
    }

    func testTheCorrectPinVerifiesAndAWrongOneDoesNot() {
        TikoParentGate.configureLocalPin("1234")
        XCTAssertTrue(TikoParentGate.verifyLocalPin("1234"))
        XCTAssertFalse(TikoParentGate.verifyLocalPin("4321"))
        XCTAssertFalse(TikoParentGate.verifyLocalPin(""))
    }

    func testLeavingChildModeKeepsThePinSoReenteringDoesNotAskAgain() {
        TikoParentGate.configureLocalPin("1234")
        TikoParentGate.leaveLocalChildMode()
        XCTAssertFalse(TikoParentGate.isLocalChildModeActive)
        XCTAssertTrue(TikoParentGate.isLocalPinConfigured, "the PIN survives leaving child mode")

        TikoParentGate.enterLocalChildMode()
        XCTAssertTrue(TikoParentGate.isLocalChildModeActive)
        XCTAssertTrue(TikoParentGate.verifyLocalPin("1234"))
    }

    func testEnteringChildModeWithoutAPinDoesNothing() {
        TikoParentGate.enterLocalChildMode()
        XCTAssertFalse(TikoParentGate.isLocalChildModeActive)
    }

    func testClearingRemovesBothThePinAndTheMode() {
        TikoParentGate.configureLocalPin("1234")
        TikoParentGate.clearLocalPin()
        XCTAssertFalse(TikoParentGate.isLocalPinConfigured)
        XCTAssertFalse(TikoParentGate.isLocalChildModeActive)
        XCTAssertFalse(TikoParentGate.verifyLocalPin("1234"))
    }

    func testThePinIsNeverStoredInPlainText() {
        TikoParentGate.configureLocalPin("1234")
        let stored = UserDefaults.standard.data(forKey: "tiko.parentGate.local")
        let text = String(data: stored ?? Data(), encoding: .utf8) ?? ""
        XCTAssertFalse(text.contains("1234"), "the raw PIN must not be recoverable from storage")
    }

    func testTwoDevicesWithTheSamePinGetDifferentHashes() {
        TikoParentGate.configureLocalPin("1234")
        let first = UserDefaults.standard.data(forKey: "tiko.parentGate.local")
        TikoParentGate.clearLocalPin()
        TikoParentGate.configureLocalPin("1234")
        let second = UserDefaults.standard.data(forKey: "tiko.parentGate.local")
        XCTAssertNotEqual(first, second, "each PIN gets its own salt")
    }

    // MARK: - Combined state

    func testTheLocalGateAloneIsEnoughToReportChildMode() {
        XCTAssertFalse(TikoParentGate.isChildModeActive)
        TikoParentGate.configureLocalPin("1234")
        XCTAssertTrue(TikoParentGate.isChildModeActive, "apps must see child mode without an identity bundle")
    }

    // MARK: - Helpers

    private func bundle(emailVerified: Bool) -> TikoIdentityBundle {
        TikoIdentityBundle(
            subject: TikoIdentitySubject(id: "subject"),
            device: nil,
            account: TikoIdentityAccount(
                id: "account",
                subjectId: "subject",
                emailVerified: emailVerified,
                email: "parent@example.com",
                accountType: emailVerified ? "verified" : "temporary"
            ),
            session: nil,
            runtime: nil,
            capabilities: nil,
            roles: nil
        )
    }
}
