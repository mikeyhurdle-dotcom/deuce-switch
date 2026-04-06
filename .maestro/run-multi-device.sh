#!/bin/bash
#
# SMASHD Multi-Device Maestro Test Runner
#
# Runs the core test suite across multiple iOS simulator screen sizes
# to catch layout overflow, safe area, and tap target issues.
#
# Usage:
#   .maestro/run-multi-device.sh              # Run all devices
#   .maestro/run-multi-device.sh "iPhone 17e" # Run one device
#
# Prerequisites:
#   - Release build installed on all target simulators
#   - Maestro CLI installed (brew install maestro)
#

set -e

# ── Device Matrix ──────────────────────────────────────────────────────────
# Covers: smallest iPhone, standard, largest, and tablet
DEVICES=(
  "iPhone 17e"        # Smallest current iPhone — catches overflow
  "iPhone 17 Pro"     # Primary test device
  "iPhone 17 Pro Max" # Largest iPhone — verifies wide layout
  "iPad mini (A17 Pro)" # Tablet — tests adaptive layout
)

# Core tests to run on every device (skip slow/flaky ones for matrix)
CORE_TESTS=(
  "04_tab_navigation.yaml"
  "05_discover_loads_data.yaml"
  "36_coach_tab.yaml"
  "37_log_match_sheet.yaml"
  "39_stats_showcase.yaml"
  "14_settings_screen.yaml"
  "29_appearance_toggle.yaml"
)

# ── Colours ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Run ────────────────────────────────────────────────────────────────────
RESULTS_DIR=".maestro/results/multi-device-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Filter to single device if argument provided
if [ -n "$1" ]; then
  DEVICES=("$1")
fi

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

for device in "${DEVICES[@]}"; do
  echo ""
  echo -e "${YELLOW}━━━ Testing on: $device ━━━${NC}"

  # Boot the simulator
  UDID=$(xcrun simctl list devices available | grep "$device" | grep -v Booted | head -1 | grep -oE '[A-F0-9-]{36}')
  if [ -z "$UDID" ]; then
    # Try already booted
    UDID=$(xcrun simctl list devices available | grep "$device" | grep Booted | head -1 | grep -oE '[A-F0-9-]{36}')
  fi

  if [ -z "$UDID" ]; then
    echo -e "${RED}  ✗ Device '$device' not found — skipping${NC}"
    continue
  fi

  # Boot if not already running
  xcrun simctl boot "$UDID" 2>/dev/null || true
  sleep 2

  DEVICE_DIR="$RESULTS_DIR/$(echo "$device" | tr ' ' '_')"
  mkdir -p "$DEVICE_DIR"

  for test in "${CORE_TESTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    echo -n "  $test ... "

    if maestro --device "$UDID" test ".maestro/$test" > "$DEVICE_DIR/${test%.yaml}.log" 2>&1; then
      echo -e "${GREEN}PASS${NC}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo -e "${RED}FAIL${NC}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  done

  # Shutdown non-primary devices to free memory
  if [ "$device" != "iPhone 17 Pro" ]; then
    xcrun simctl shutdown "$UDID" 2>/dev/null || true
  fi
done

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}  ${RED}Failed: $FAIL_COUNT${NC}  Total: $TOTAL"
echo "  Results: $RESULTS_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with failure if any tests failed
[ "$FAIL_COUNT" -eq 0 ]
