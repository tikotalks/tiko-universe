import org.jetbrains.kotlin.gradle.plugin.mpp.apple.XCFramework

plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
}

group = "org.tiko.coloring"
version = "0.1.0"

kotlin {
    // Pin the toolchain so a local build matches CI instead of using whatever JDK
    // happens to launch Gradle.
    jvmToolchain(21)

    jvm()

    // One XCFramework covering device and both simulator architectures, so an app
    // target links a single binary instead of picking a slice per destination.
    // Build with `gradle :coloring-core:assembleColoringCoreXCFramework`; the result
    // lands in coloring-core/build/XCFrameworks/<config>/ and is never committed.
    val xcframework = XCFramework("ColoringCore")

    listOf(iosArm64(), iosSimulatorArm64(), iosX64()).forEach { target ->
        target.binaries.framework {
            baseName = "ColoringCore"
            isStatic = true
            xcframework.add(this)
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
        }

        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
