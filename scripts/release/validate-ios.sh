#!/usr/bin/env bash
# Shared pre-release validation for a Tiko iOS app. Run from the repo root with
# the app slug as $1. Validates that the XcodeGen project generates, the Info.plist
# resolves version from build settings, the privacy/encryption keys exist, and the
# app builds for a simulator. Exits non-zero on any failure so CI gates block bad
# releases.
set -euo pipefail

APP="${1:?usage: validate-ios.sh <app-slug>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$REPO_ROOT/apps/$APP/ios"

[ -f "$IOS_DIR/Project.yml" ] || { echo "✗ $APP: ios/Project.yml not found"; exit 1; }
PROJECT_NAME="$(grep -m1 '^name:' "$IOS_DIR/Project.yml" | sed 's/name: *//')"
PROJECT="$IOS_DIR/$PROJECT_NAME.xcodeproj"

echo "▸ $APP: linting Project.yml version source-of-truth"
grep -q 'MARKETING_VERSION:' "$IOS_DIR/Project.yml" || { echo "✗ $APP: Project.yml missing MARKETING_VERSION"; exit 1; }
grep -q 'CURRENT_PROJECT_VERSION:' "$IOS_DIR/Project.yml" || { echo "✗ $APP: Project.yml missing CURRENT_PROJECT_VERSION"; exit 1; }

echo "▸ $APP: checking Info.plist uses build-setting refs"
grep -q 'CFBundleShortVersionString' "$IOS_DIR/Sources/Info.plist"
grep -A1 'CFBundleShortVersionString' "$IOS_DIR/Sources/Info.plist" | grep -q '\$(MARKETING_VERSION)' || { echo "✗ $APP: Info.plist CFBundleShortVersionString must be \$(MARKETING_VERSION)"; exit 1; }
grep -A1 'CFBundleVersion' "$IOS_DIR/Sources/Info.plist" | grep -q '\$(CURRENT_PROJECT_VERSION)' || { echo "✗ $APP: Info.plist CFBundleVersion must be \$(CURRENT_PROJECT_VERSION)"; exit 1; }
grep -q 'ITSAppUsesNonExemptEncryption' "$IOS_DIR/Sources/Info.plist" || { echo "✗ $APP: Info.plist missing ITSAppUsesNonExemptEncryption"; exit 1; }

echo "▸ $APP: generating Xcode project (xcodegen)"
if ! command -v xcodegen >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then brew install xcodegen; else echo "✗ xcodegen required"; exit 1; fi
fi
( cd "$IOS_DIR" && xcodegen generate >/dev/null )

echo "▸ $APP: building for iPhone simulator"
SCHEME="$PROJECT_NAME"
xcodebuild -quiet \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$REPO_ROOT/.build/derived/$APP" \
  build

echo "✓ $APP: validation passed"
