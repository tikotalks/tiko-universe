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
    targets: [
        .target(name: "TikoKit"),
        .testTarget(name: "TikoKitTests", dependencies: ["TikoKit"])
    ]
)
