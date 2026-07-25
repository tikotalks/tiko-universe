// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TikoKit",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(name: "TikoKit", targets: ["TikoKit"]),
        // Speech recognition lives in its own product: linking it is what makes
        // Apple require the microphone and speech purpose strings, so only the
        // apps that actually listen (Say, Sum's voice answering) depend on it.
        .library(name: "TikoSpeechKit", targets: ["TikoSpeechKit"])
    ],
    dependencies: [
        .package(url: "https://github.com/exyte/PopupView.git", from: "4.0.0")
    ],
    targets: [
        .target(
            name: "TikoKit",
            dependencies: [
                .product(name: "PopupView", package: "PopupView")
            ],
            resources: [.process("Resources")]
        ),
        .target(name: "TikoSpeechKit", dependencies: ["TikoKit"]),
        .testTarget(name: "TikoKitTests", dependencies: ["TikoKit", "TikoSpeechKit"])
    ]
)
