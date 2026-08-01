# Coloring iOS

The production app will be a native SwiftUI application using TikoKit and the
local Kotlin Multiplatform `ColoringCore` framework.

This first slice contains `Proof/ColoringCanvasProofView.swift`. It is not yet
registered as a shipping Xcode target. It proves the intended adapter before an
app project, persistence layer and library interface are generated.

## Run the proof locally

1. Build the simulator framework from `engines/coloring`:

   ```bash
   gradle :coloring-core:linkDebugFrameworkIosSimulatorArm64
   ```

2. Add the generated `ColoringCore.framework` to a temporary iOS 17 SwiftUI
   target, or wire it into the future Tiko Coloring project.
3. Add `Proof/ColoringCanvasProofView.swift` to the target.
4. Present `ColoringCanvasProofView()` from the temporary app scene.

The proof deliberately decodes `snapshotJson()` into private Swift DTOs. This
keeps the bridge narrow while the engine models are still changing. Once the
model stabilizes, the app may use generated typed Kotlin/Native models where
that improves performance without leaking UI concerns into the engine.

## Before creating the app target

- choose and automate local framework or XCFramework integration;
- add `TikoAppConfig.coloring` through the existing config generator;
- create the iOS project with TikoKit, tests, UI tests and release metadata;
- move the sample page into a bundled coloring-content package;
- add autosave and document package storage;
- add path caching so snapshots are not reparsed during every render;
- replace tap-only proof behavior with fill, brush, eraser, pan and zoom tools.
