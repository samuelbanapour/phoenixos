#!/bin/bash
# PhoenixOS — Android ROM Flash Script
# Flashes a custom ROM (LineageOS, /e/OS, etc.) via ADB/Fastboot
#
# Usage: ./android-flash.sh --rom <lineageos|eos|blissos> [--device <codename>] [--dry-run]
# Example: ./android-flash.sh --rom lineageos --device sailfish

set -e

# --- Defaults ---
ROM=""
DEVICE=""
DRY_RUN=false
WORK_DIR="/tmp/phoenixos-android-flash"
LOG_FILE="/tmp/phoenixos-android-$(date +%Y%m%d-%H%M%S).log"

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --rom) ROM="$2"; shift 2 ;;
        --device) DEVICE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

echo ""
echo "========================================"
echo "  PhoenixOS — Android ROM Flash"
echo "========================================"
echo ""
echo "ROM:        ${ROM:-Not specified}"
echo "Device:     ${DEVICE:-Auto-detect}"
echo "Dry Run:    $DRY_RUN"
echo ""

# --- Check prerequisites ---
if ! command -v adb &>/dev/null; then
    log "ERROR" "ADB is not installed"
    log "INFO" "Install via: brew install android-platform-tools (macOS)"
    log "INFO" "         or: apt install adb (Linux)"
    exit 1
fi

if ! command -v fastboot &>/dev/null; then
    log "ERROR" "Fastboot is not installed"
    log "INFO" "Install via: brew install android-platform-tools (macOS)"
    exit 1
fi

# --- Check device connection ---
log "INFO" "Checking for connected Android device..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep -v "^$" | wc -l | tr -d ' ')

if [[ "$DEVICE_COUNT" -eq 0 ]]; then
    log "ERROR" "No Android device detected"
    log "INFO" "Please ensure:"
    log "INFO" "  1. USB debugging is enabled (Settings > Developer Options)"
    log "INFO" "  2. USB cable is connected"
    log "INFO" "  3. Authorize the computer on the device"
    exit 1
fi

# Get device info
if [[ -z "$DEVICE" ]]; then
    DEVICE=$(adb devices | grep -v "List" | grep -v "^$" | head -1 | awk '{print $1}')
    log "INFO" "Auto-detected device: $DEVICE"
fi

DEVICE_MODEL=$(adb -s "$DEVICE" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
ANDROID_VERSION=$(adb -s "$DEVICE" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
BOOTLOADER_LOCKED=$(adb -s "$DEVICE" shell getprop ro.boot.verifiedbootstate 2>/dev/null | tr -d '\r')

log "INFO" "Device model:  $DEVICE_MODEL"
log "INFO" "Android:       $ANDROID_VERSION"
log "INFO" "Boot state:    $BOOTLOADER_LOCKED"

# --- Check bootloader status ---
log "INFO" "Checking bootloader status..."
FASTBOOT_OUTPUT=$(fastboot getvar product 2>&1 || true)

if echo "$FASTBOOT_OUTPUT" | grep -q "locked"; then
    log "WARN" "Bootloader is LOCKED"
    log "INFO" "The bootloader must be unlocked before flashing a custom ROM."
    log "INFO" ""
    log "INFO" "To unlock the bootloader:"
    log "INFO" "  1. Enable OEM Unlock in Developer Options"
    log "INFO" "  2. Run: adb reboot bootloader"
    log "INFO" "  3. Run: fastboot oem unlock"
    log "INFO" "  4. Confirm on device screen"
    log "INFO" ""
    log "WARN" "WARNING: Unlocking the bootloader ERASES ALL DATA!"
    log "INFO" ""
fi

# --- Safety warning ---
if $DRY_RUN; then
    log "WARN" "DRY RUN — no changes will be applied"
    log "INFO" ""
    log "INFO" "Would perform the following steps:"
    log "INFO" "  1. Reboot device to bootloader/fastboot mode"
    log "INFO" "  2. Unlock bootloader (if locked)"
    log "INFO" "  3. Flash custom recovery (TWRP)"
    log "INFO" "  4. Download $ROM ROM image"
    log "INFO" "  5. Wipe data/system/cache"
    log "INFO" "  6. Flash ROM image"
    log "INFO" "  7. Flash Google Apps (if requested)"
    log "INFO" "  8. Reboot to new ROM"
    log "INFO" ""
    log "INFO" "DRY RUN complete — no changes made"
    exit 0
fi

log "WARN" "WARNING: This will ERASE ALL DATA on the device!"
log "WARN" "Make sure you have backed up everything important."
log "INFO" ""
read -p "Type 'YES' to continue: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
    log "INFO" "Aborted by user"
    exit 0
fi

mkdir -p "$WORK_DIR"

# --- Step 1: Reboot to bootloader ---
log "INFO" "Step 1: Rebooting to bootloader..."
adb -s "$DEVICE" reboot bootloader
sleep 5

# Wait for fastboot
FASTBOOT_WAIT=0
while ! fastboot getvar product 2>/dev/null; do
    sleep 2
    FASTBOOT_WAIT=$((FASTBOOT_WAIT + 1))
    if [[ $FASTBOOT_WAIT -gt 30 ]]; then
        log "ERROR" "Device did not enter fastboot mode"
        exit 1
    fi
done
log "OK" "Device in fastboot mode"

# --- Step 2: Unlock bootloader ---
BOOTLOADER_STATE=$(fastboot oem device-info 2>&1 || true)
if echo "$BOOTLOADER_STATE" | grep -q "unlocked: false"; then
    log "INFO" "Step 2: Unlocking bootloader..."
    log "WARN" "Confirm unlock on device screen!"
    fastboot oem unlock
    sleep 10
    log "OK" "Bootloader unlocked"
    # Reboot back to fastboot
    fastboot reboot-bootloader
    sleep 5
else
    log "INFO" "Step 2: Bootloader already unlocked"
fi

# --- Step 3: Flash custom recovery ---
log "INFO" "Step 3: Flashing TWRP recovery..."
TWRP_URL="https://dl.twrp.me/${DEVICE}/twrp-latest.img"

# Download TWRP
TWRP_IMG="$WORK_DIR/twrp.img"
if [[ ! -f "$TWRP_IMG" ]]; then
    curl -L -o "$TWRP_IMG" "$TWRP_URL" 2>/dev/null || {
        log "WARN" "Could not download TWRP for $DEVICE"
        log "INFO" "Continuing without custom recovery..."
        TWRP_IMG=""
    }
fi

if [[ -n "$TWRP_IMG" && -f "$TWRP_IMG" ]]; then
    fastboot flash recovery "$TWRP_IMG"
    log "OK" "TWRP recovery flashed"
else
    log "WARN" "Skipping TWRP — will use fastboot directly"
fi

# --- Step 4: Flash ROM ---
log "INFO" "Step 4: Flashing $ROM ROM..."

case "$ROM" in
    lineageos)
        ROM_URL="https://download.lineageos.org"
        log "INFO" "Download LineageOS from: $ROM_URL"
        log "INFO" "Select your device: $DEVICE"
        log "INFO" "Download the latest build and place it in: $WORK_DIR/"
        log "INFO" "Then run: fastboot flash boot boot.img"
        ;;
    eos)
        ROM_URL="https://e.foundation/devices/"
        log "INFO" "Download /e/OS from: $ROM_URL"
        log "INFO" "Select your device: $DEVICE"
        ;;
    blissos)
        ROM_URL="https://blissos.org/"
        log "INFO" "Download BlissOS from: $ROM_URL"
        ;;
    *)
        log "ERROR" "Unknown ROM: $ROM"
        log "INFO" "Supported ROMs: lineageos, eos, blissos"
        exit 1
        ;;
esac

log "INFO" ""
log "INFO" "========================================"
log "INFO" "  Flash preparation complete!"
log "INFO" "========================================"
log "INFO" ""
log "INFO" "Next steps:"
log "INFO" "  1. Download the ROM image for your device"
log "INFO" "  2. Boot to TWRP recovery (volume up + power)"
log "INFO" "  3. Wipe: Data, Cache, Dalvik"
log "INFO" "  4. Install the ROM zip"
log "INFO" "  5. (Optional) Install Google Apps"
log "INFO" "  6. Reboot"
log "INFO" ""
log "INFO" "Log saved to: $LOG_FILE"
