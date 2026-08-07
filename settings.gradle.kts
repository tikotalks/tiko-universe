// The Kotlin side of the Tiko monorepo.
//
// Two modules, deliberately separate:
//   :stroke-core     product-neutral tracing engine, knows nothing about Tiko
//   :tikokotlinkit   Tiko-branded shared logic
//
// They ship in one XCFramework because Kotlin/Native embeds its runtime per
// framework, but they share no types. See
// docs/adrs/2026-07-30-write-stroke-engine-boundary.md.
//
// The project directories live under engines/ and packages/ to match the
// conventions already in this repo rather than being collected into a Gradle-
// shaped tree.

pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "tiko-kotlin"

include(":stroke-core")
project(":stroke-core").projectDir = file("engines/stroke")

include(":tikokotlinkit")
project(":tikokotlinkit").projectDir = file("packages/tikokotlinkit")
