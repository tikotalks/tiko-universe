// Root build file. Declares the plugins so subprojects can apply them without
// repeating versions; no configuration lives here.
plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.kotlinSerialization) apply false
}
