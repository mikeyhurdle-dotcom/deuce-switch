#!/bin/bash
#
# capture-screenshots.sh — App Store Screenshot Capture
#
# Prerequisites:
#   - Xcode installed with iOS Simulator
#   - Expo dev server running (npx expo start)
#   - Simulator booted with iPhone 15 Pro Max (6.7" display)
#
# Usage:
#   bash capture-screenshots.sh
#
# Output:
#   Screenshots saved to ../../../Projects/Padel\ Brand/03\ -\ Product/app-store-screenshots/
#
# "The most important step a man can take is the next one."

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
DEVICE_NAME="iPhone 15 Pro Max"
DEVICE_TYPE="com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro-Max"
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-17-5"
OUTPUT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)/Projects/Padel Brand/03 - Product/app-store-screenshots"

# Screenshot names matching APP-STORE-LISTING.md sequence
SCREENSHOTS=(
  "01-live-leaderboard"
  "02-score-entry"
  "03-player-profile"
  "04-scoutbot-map"
  "05-qr-join"
  "06-club-directory"
)

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() { echo "📸 $1"; }
err() { echo "❌ $1" >&2; exit 1; }

take_screenshot() {
  local name="$1"
  local path="${OUTPUT_DIR}/${name}.png"
  xcrun simctl io booted screenshot "$path" 2>/dev/null
  log "Saved: ${name}.png"
}

wait_for_input() {
  local screen_name="$1"
  echo ""
  echo "────────────────────────────────────────"
  echo "  📱 Navigate to: ${screen_name}"
  echo "────────────────────────────────────────"
  read -rp "  Press ENTER when ready to capture... "
}

# ─── Pre-flight ──────────────────────────────────────────────────────────────
log "Checking prerequisites..."

# Check Xcode
if ! command -v xcrun &>/dev/null; then
  err "xcrun not found — install Xcode from the Mac App Store"
fi

if ! xcrun simctl list devices &>/dev/null; then
  err "iOS Simulator not available — ensure Xcode is fully installed"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"
log "Output directory: ${OUTPUT_DIR}"

# ─── Boot Simulator ─────────────────────────────────────────────────────────
log "Looking for ${DEVICE_NAME}..."

# Find or create the device
DEVICE_UDID=$(xcrun simctl list devices available -j | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
  for d in devices:
    if '${DEVICE_NAME}' in d.get('name', '') and d.get('isAvailable', False):
      print(d['udid'])
      sys.exit(0)
print('')
" 2>/dev/null)

if [ -z "$DEVICE_UDID" ]; then
  log "Creating ${DEVICE_NAME} simulator..."
  DEVICE_UDID=$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_TYPE" "$RUNTIME" 2>/dev/null || true)
  if [ -z "$DEVICE_UDID" ]; then
    err "Could not create ${DEVICE_NAME} simulator. Check available runtimes: xcrun simctl list runtimes"
  fi
fi

# Boot if not already running
DEVICE_STATE=$(xcrun simctl list devices -j | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
  for d in devices:
    if d.get('udid') == '${DEVICE_UDID}':
      print(d.get('state', 'Unknown'))
      sys.exit(0)
print('Unknown')
" 2>/dev/null)

if [ "$DEVICE_STATE" != "Booted" ]; then
  log "Booting simulator..."
  xcrun simctl boot "$DEVICE_UDID" 2>/dev/null || true
  open -a Simulator
  sleep 5
  log "Simulator booted"
else
  log "Simulator already running"
fi

# ─── Set Appearance ─────────────────────────────────────────────────────────
log "Setting dark mode (matches Smashd theme)..."
xcrun simctl ui booted appearance dark 2>/dev/null || true

# Set clean status bar (9:41 AM, full signal, full battery, no carrier)
xcrun simctl status_bar booted override \
  --time "9:41" \
  --batteryState charged \
  --batteryLevel 100 \
  --wifiBars 3 \
  --cellularBars 4 \
  --operatorName "" 2>/dev/null || true

log "Status bar configured for clean screenshots"

# ─── Capture Screenshots ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SMASHD — APP STORE SCREENSHOT CAPTURE            ║"
echo "║                                                            ║"
echo "║  Make sure the Expo dev server is running:                 ║"
echo "║    npx expo start                                          ║"
echo "║                                                            ║"
echo "║  Navigate to each screen in the simulator, then press      ║"
echo "║  ENTER to capture. 6 screenshots needed.                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Screenshot 1: Live Tournament Leaderboard
wait_for_input "LIVE TOURNAMENT LEADERBOARD (mid-tournament, scores visible)"
take_screenshot "${SCREENSHOTS[0]}"

# Screenshot 2: Score Entry Screen
wait_for_input "SCORE ENTRY (active match with team scores)"
take_screenshot "${SCREENSHOTS[1]}"

# Screenshot 3: Player Profile
wait_for_input "PLAYER PROFILE (Smashd Level badge + match history)"
take_screenshot "${SCREENSHOTS[2]}"

# Screenshot 4: ScoutBot / Event Discovery
wait_for_input "SCOUTBOT MAP / EVENT LIST (map view with event pins)"
take_screenshot "${SCREENSHOTS[3]}"

# Screenshot 5: QR Join Screen
wait_for_input "QR CODE JOIN SCREEN (player scanning or join code entry)"
take_screenshot "${SCREENSHOTS[4]}"

# Screenshot 6: Club Directory
wait_for_input "CLUB DIRECTORY (club cards with ratings)"
take_screenshot "${SCREENSHOTS[5]}"

# ─── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    CAPTURE COMPLETE                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
log "Screenshots saved to:"
echo "  ${OUTPUT_DIR}/"
echo ""
ls -la "${OUTPUT_DIR}"/*.png 2>/dev/null || echo "  (no screenshots found)"
echo ""
echo "📋 Required sizes for App Store Connect:"
echo "  • 6.7\" (iPhone 15 Pro Max): 1290 × 2796 px  ← captured"
echo "  • 6.5\" (iPhone 14 Plus):    1284 × 2778 px  ← scale from 6.7\""
echo "  • 12.9\" iPad Pro:           2048 × 2732 px  ← separate capture needed"
echo ""
echo "Next: Add device framing + captions in Figma or Canva"
echo "Ref: APP-STORE-LISTING.md for caption copy"

# Reset status bar
xcrun simctl status_bar booted clear 2>/dev/null || true
