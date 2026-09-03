import AVFoundation
import SwiftUI
import UIKit

/// The camera, looking for a Tiko code.
///
/// AVFoundation reads QR codes natively, so scanning needs no third-party
/// decoder and works on every supported device.
struct RadioScannerView: UIViewControllerRepresentable {
    let onCode: (String) -> Void
    let onFailure: () -> Void

    func makeUIViewController(context: Context) -> RadioScannerViewController {
        let controller = RadioScannerViewController()
        controller.onCode = onCode
        controller.onFailure = onFailure
        return controller
    }

    func updateUIViewController(_ uiViewController: RadioScannerViewController, context: Context) {}
}

final class RadioScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    var onFailure: (() -> Void)?

    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "mt.tiko.radio.scanner")
    private var previewLayer: AVCaptureVideoPreviewLayer?
    /// One code per presentation: a QR in front of the lens fires every frame.
    private var hasReported = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        view.clipsToBounds = true
        configureSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        hasReported = false
        startRunning()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopRunning()
    }

    private func configureSession() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            onFailure?()
            return
        }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            onFailure?()
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        previewLayer = layer
    }

    private func startRunning() {
        guard !session.isRunning, !session.inputs.isEmpty else { return }
        // Starting a capture session blocks, so keep it off the main thread.
        let session = session
        sessionQueue.async { session.startRunning() }
    }

    private func stopRunning() {
        guard session.isRunning else { return }
        let session = session
        sessionQueue.async { session.stopRunning() }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !hasReported,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else { return }
        hasReported = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        stopRunning()
        onCode?(value)
    }
}

enum RadioCameraAccess {
    static var isDenied: Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        return status == .denied || status == .restricted
    }

    /// Ask once, so the scanner can show the "camera is blocked" line instead of
    /// a black rectangle.
    static func request() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
        default: return false
        }
    }
}
