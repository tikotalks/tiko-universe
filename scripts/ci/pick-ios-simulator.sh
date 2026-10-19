#!/usr/bin/env bash
# Picks an iPhone simulator the selected Xcode can actually build for, and
# writes its UDID to $GITHUB_OUTPUT as `udid`.
#
# A runner image can carry simulators whose runtime the selected Xcode's SDK
# will not accept, and then xcodebuild lists no iOS destinations at all. So the
# device is matched to the SDK's own iOS version rather than to a device name,
# and when no runtime matches, the iOS platform for this Xcode is installed.
set -euo pipefail

sdk="$(xcrun --sdk iphonesimulator --show-sdk-version)"
echo "$(xcodebuild -version | head -1), iOS Simulator SDK $sdk"

# Prints `<udid>` for an existing iPhone on a runtime matching the SDK, or
# `create <device type> <runtime>` when the runtime exists but has no iPhone,
# or nothing when there is no matching runtime.
find_device() {
  python3 -I - "$sdk" <<'PY'
import json, subprocess, sys

def major_minor(version):
    return tuple(int(part) for part in version.split('.')[:2])

sdk = major_minor(sys.argv[1])
listing = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', '-j', 'runtimes', 'available']))
runtimes = [
    runtime for runtime in listing['runtimes']
    if runtime.get('platform') == 'iOS' and major_minor(runtime['version']) == sdk
]
if not runtimes:
    sys.exit(0)
runtime = max(runtimes, key=lambda r: [int(p) for p in r['version'].split('.')])

devices = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', '-j', 'devices', 'available']))
iphones = sorted(
    (d for d in devices['devices'].get(runtime['identifier'], []) if d['name'].startswith('iPhone')),
    key=lambda d: d['name'],
)
if iphones:
    print(iphones[-1]['udid'])
    sys.exit(0)

types = [t for t in runtime.get('supportedDeviceTypes', []) if t.get('productFamily') == 'iPhone']
if types:
    print('create', types[-1]['identifier'], runtime['identifier'])
PY
}

found="$(find_device)"
if [[ -z "$found" ]]; then
  echo "No iOS $sdk simulator runtime on this runner; installing the iOS platform for this Xcode."
  xcodebuild -downloadPlatform iOS
  found="$(find_device)"
fi

if [[ "$found" == create\ * ]]; then
  read -r _ device_type runtime <<<"$found"
  echo "No iPhone on $runtime; creating one ($device_type)."
  found="$(xcrun simctl create "CI iPhone" "$device_type" "$runtime")"
fi

if [[ -z "$found" ]]; then
  echo "::error::No iPhone simulator for the iOS $sdk SDK. Available:"
  xcrun simctl list devices available
  exit 1
fi

echo "Using simulator: $(xcrun simctl list devices | grep "$found" | xargs)"
echo "udid=$found" >> "${GITHUB_OUTPUT:-/dev/stdout}"
