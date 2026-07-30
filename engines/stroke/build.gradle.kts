// :stroke-core — product-neutral tracing engine.
//
// No framework target of its own: it is exported through :tikokotlinkit's
// TikoCore.xcframework, because Kotlin/Native embeds its runtime per framework.
// Publishing this module standalone later means adding a framework target here,
// not restructuring.
//
// The jvm target exists so the engine's real test suite runs on Linux CI without
// a Mac.

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    explicitApi()

    jvm()
    iosArm64()
    iosSimulatorArm64()
    iosX64()

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.serialization.json)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
