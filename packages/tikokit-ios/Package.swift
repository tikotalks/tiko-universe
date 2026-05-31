// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TikoKit",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(name: "TikoKit", targets: ["TikoKit"])
    ],
    dependencies: [
        .package(url: "https://github.com/exyte/PopupView.git", from: "4.0.0")
    ],
    targets: [
        .target(
            name: "TikoKit",
            dependencies: [
                .product(name: "PopupView", package: "PopupView")
            ]
        ),
        .testTarget(name: "TikoKitTests", dependencies: ["TikoKit"])
    ]
)
