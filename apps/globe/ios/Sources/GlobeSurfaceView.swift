import MetalKit
import SwiftUI

/// The Metal globe, wrapped for SwiftUI, with the three gestures the product
/// asks for: one finger spins, two fingers zoom, a tap selects.
struct GlobeSurfaceView: UIViewRepresentable {
    @ObservedObject var controller: GlobeController
    let meshes: GlobeMeshes
    let climates: [GlobeClimate]
    let appearance: GlobeAppearance

    func makeCoordinator() -> Coordinator { Coordinator(controller: controller) }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView()
        view.device = MTLCreateSystemDefaultDevice()
        view.colorPixelFormat = .bgra8Unorm
        view.depthStencilPixelFormat = .depth32Float
        view.sampleCount = GlobeRenderer.sampleCount
        view.isOpaque = true
        view.preferredFramesPerSecond = 60
        view.isMultipleTouchEnabled = true

        if let device = view.device,
           let renderer = GlobeRenderer(device: device, meshes: meshes, climates: climates, appearance: appearance) {
            renderer.onFrame = { [weak renderer, weak view] elapsed in
                MainActor.assumeIsolated {
                    // Read the size here rather than in `updateUIView`: SwiftUI
                    // calls that before the view has been laid out, so the size
                    // it would report is zero and no label could be placed.
                    if let bounds = view?.bounds.size { controller.viewSize = bounds }
                    controller.advance(by: elapsed)
                    renderer?.camera = controller.camera
                    renderer?.selectedCountryIndex = controller.selectedIndex
                    renderer?.selectionLift = Float(controller.selectionLift)
                }
            }
            context.coordinator.renderer = renderer
            view.delegate = renderer
        }

        let pan = UIPanGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePan))
        pan.maximumNumberOfTouches = 1
        let pinch = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch))
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap))
        pan.delegate = context.coordinator
        pinch.delegate = context.coordinator
        view.addGestureRecognizer(pan)
        view.addGestureRecognizer(pinch)
        view.addGestureRecognizer(tap)

        view.isAccessibilityElement = true
        view.accessibilityTraits = [.allowsDirectInteraction, .updatesFrequently]
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {
        context.coordinator.renderer?.appearance = appearance
        context.coordinator.renderer?.selectedCountryIndex = controller.selectedIndex
        view.clearColor = MTLClearColor(
            red: Double(appearance.background.x),
            green: Double(appearance.background.y),
            blue: Double(appearance.background.z),
            alpha: 1
        )
        view.accessibilityLabel = context.coordinator.surfaceLabel
    }

    @MainActor
    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        let controller: GlobeController
        var renderer: GlobeRenderer?
        private var lastTranslation: CGPoint = .zero
        /// What was under the fingers when the pinch began, and whether one is
        /// in progress — a pinch owns the globe outright, so one finger landing
        /// a moment before the other cannot also spin it.
        private var pinchAnchor: GeoPoint?
        private var isPinching = false

        init(controller: GlobeController) {
            self.controller = controller
        }

        /// What VoiceOver reads for the globe itself: the Earth until something
        /// is selected, then whatever is selected.
        var surfaceLabel: String {
            controller.selection == nil ? controller.earthLabel : controller.selectionName
        }

        @objc func handlePan(_ recognizer: UIPanGestureRecognizer) {
            guard let view = recognizer.view else { return }
            switch recognizer.state {
            case .began:
                lastTranslation = .zero
                controller.beginInteraction()
            case .changed:
                guard !isPinching else { return }
                let translation = recognizer.translation(in: view)
                controller.drag(
                    deltaX: Double(translation.x - lastTranslation.x),
                    deltaY: Double(translation.y - lastTranslation.y),
                    viewSize: view.bounds.size
                )
                lastTranslation = translation
            case .ended, .cancelled:
                guard !isPinching else { return }
                let velocity = recognizer.velocity(in: view)
                controller.endDrag(
                    velocityX: Double(velocity.x),
                    velocityY: Double(velocity.y),
                    viewSize: view.bounds.size
                )
            default:
                break
            }
        }

        @objc func handlePinch(_ recognizer: UIPinchGestureRecognizer) {
            guard let view = recognizer.view else { return }
            switch recognizer.state {
            case .began:
                isPinching = true
                controller.beginInteraction()
                // The midpoint between the fingers, in geography.
                pinchAnchor = controller.camera.geoPoint(
                    atViewPoint: recognizer.location(in: view),
                    viewSize: view.bounds.size
                )
            case .changed:
                controller.pinch(
                    scale: Double(recognizer.scale),
                    at: recognizer.location(in: view),
                    viewSize: view.bounds.size,
                    anchor: pinchAnchor
                )
                recognizer.scale = 1
            case .ended, .cancelled, .failed:
                isPinching = false
                pinchAnchor = nil
            default:
                break
            }
        }

        @objc func handleTap(_ recognizer: UITapGestureRecognizer) {
            guard let view = recognizer.view else { return }
            controller.tap(at: recognizer.location(in: view), viewSize: view.bounds.size)
        }

        nonisolated func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
        ) -> Bool {
            true
        }
    }
}
