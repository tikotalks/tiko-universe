// :tikokotlinkit — Tiko-branded shared logic, and the module that packages the
// iOS framework.
//
// The framework is named TikoCore and exports :stroke-core alongside this
// module's own API, so the Write app links one binary. `export` requires the
// dependency be declared `api`, not `implementation`.
//
// Produces packages/tikokotlinkit/build/XCFrameworks/release/TikoCore.xcframework
// via `./gradlew assembleTikoCoreXCFramework`. Built, never committed.

import org.jetbrains.kotlin.gradle.plugin.mpp.apple.XCFramework

plugins {
    alias(libs.plugins.kotlinMultiplatform)
}

kotlin {
    explicitApi()

    jvm()

    val xcframework = XCFramework("TikoCore")

    listOf(iosArm64(), iosSimulatorArm64(), iosX64()).forEach { target ->
        target.binaries.framework {
            baseName = "TikoCore"
            isStatic = true
            export(project(":stroke-core"))
            xcframework.add(this)
        }
    }

    sourceSets {
        commonMain.dependencies {
            api(project(":stroke-core"))
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
