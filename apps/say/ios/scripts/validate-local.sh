#!/usr/bin/env bash
# Per-app validation wrapper — delegates to the shared Tiko iOS validator.
# Runs xcodegen + Info.plist/build-setting checks + a simulator build for say.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
exec "$REPO_ROOT/scripts/release/validate-ios.sh" "say"
