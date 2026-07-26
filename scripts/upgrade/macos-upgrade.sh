#!/bin/bash
# PhoenixOS — macOS OCLP Upgrade Script
# Downloads and applies OpenCore Legacy Patcher to upgrade macOS on unsupported Macs
#
# Usage: ./macos-upgrade.sh [--target <version>] [--model <mac-model>] [--dry-run]
# Example: ./macos-upgrade.sh --target Sonoma --model MacBookPro12,1

set -e

# --- Defaults ---
TARGET_VERSION="Sonoma"
MAC_MODEL=""
DRY_RUN=false
WORK_DIR="/tmp/phoenixos-macos-upgrade"
LOG_FILE="/tmp/phoenixos-upgrade-$(date +%Y%m%d-%H%M%S).log"
OCLP_VERSION="1.5.0"

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --target) TARGET_VERSION="$2"; shift 2 ;;
        --model) MAC_MODEL="$2"; shift 2 ;;
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
echo "  PhoenixOS — macOS OCLP Upgrade"
echo "========================================"
echo ""
echo "Target macOS:  $TARGET_VERSION"
echo "Mac Model:     ${MAC_MODEL:-Auto-detect}"
echo "Dry Run:       $DRY_RUN"
echo ""

# --- Safety Checks ---
if [[ "$(uname)" != "Darwin" ]]; then
    log "ERROR" "This script must be run on macOS"
    exit 1
fi

# Auto-detect model if not provided
if [[ -z "$MAC_MODEL" ]]; then
    MAC_MODEL=$(sysctl -n hw.model)
    log "INFO" "Auto-detected Mac model: $MAC_MODEL"
fi

# Get current macOS version
CURRENT_VERSION=$(sw_vers -productVersion)
CURRENT_BUILD=$(sw_vers -buildVersion)
log "INFO" "Current macOS: $CURRENT_VERSION ($CURRENT_BUILD)"

# Get hardware info
CPU_NAME=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Unknown")
TOTAL_RAM=$(sysctl -n hw.memsize | awk '{printf "%.0f", $1/1073741824}')
TOTAL_STORAGE=$(df -H / | tail -1 | awk '{print $2}')

log "INFO" "CPU: $CPU_NAME"
log "INFO" "RAM: ${TOTAL_RAM} GB"
log "INFO" "Storage: $TOTAL_STORAGE"

# Check if model is supported natively
# Simplified check — a full database would be in os-database.json
NATIVE_SUPPORTED=false
case "$TARGET_VERSION" in
    Sequoia|Sonoma)
        # Generally 2018+ Macs are natively supported
        if [[ "$MAC_MODEL" == *"MacBook"* ]]; then
            YEAR=$(echo "$MAC_MODEL" | grep -oE '[0-9]{1},' | head -1)
            if [[ "$YEAR" -ge 5 ]]; then
                NATIVE_SUPPORTED=true
            fi
        fi
        ;;
    *)
        NATIVE_SUPPORTED=true
        ;;
esac

if $NATIVE_SUPPORTED; then
    log "INFO" "This Mac may be natively supported for $TARGET_VERSION"
    log "INFO" "Consider upgrading via System Settings > Software Update instead"
fi

if $DRY_RUN; then
    log "WARN" "DRY RUN — no changes will be applied"
    log "INFO" ""
    log "INFO" "Would perform the following steps:"
    log "INFO" "  1. Download OpenCore Legacy Patcher v$OCLP_VERSION"
    log "INFO" "  2. Create patched OpenCore EFI for $MAC_MODEL"
    log "INFO" "  3. Create bootable macOS $TARGET_VERSION USB installer"
    log "INFO" "  4. Apply root patches for hardware compatibility"
    log "INFO" ""
    log "INFO" "DRY RUN complete — no changes made"
    exit 0
fi

# --- Create work directory ---
mkdir -p "$WORK_DIR"

# --- Step 1: Download OCLP ---
log "INFO" "Step 1: Downloading OpenCore Legacy Patcher..."
OCLP_DMG="$WORK_DIR/oclp.dmg"
OCLP_URL="https://github.com/dortania/OpenCore-Legacy-Patcher/releases/download/${OCLP_VERSION}/OpenCore-Patcher-${OCLP_VERSION}.dmg"

if [[ -f "$OCLP_DMG" ]]; then
    log "INFO" "OCLP DMG already downloaded"
else
    curl -L -o "$OCLP_DMG" "$OCLP_URL" 2>/dev/null
    if [[ ! -f "$OCLP_DMG" ]]; then
        log "ERROR" "Failed to download OCLP"
        exit 1
    fi
fi
log "OK" "OCLP downloaded"

# --- Step 2: Install OCLP ---
log "INFO" "Step 2: Installing OpenCore Legacy Patcher..."
hdiutil attach "$OCLP_DMG" -quiet
OCLP_VOL=$(ls -d /Volumes/OpenCore-Patcher* 2>/dev/null | head -1)

if [[ -z "$OCLP_VOL" ]]; then
    log "ERROR" "Could not mount OCLP DMG"
    exit 1
fi

cp -R "$OCLP_VOL/OpenCore-Patcher.app" /Applications/ 2>/dev/null || true
hdiutil detach "$OCLP_VOL" -quiet 2>/dev/null
log "OK" "OCLP installed to /Applications"

# --- Step 3: Create USB Installer ---
log "INFO" "Step 3: Creating macOS $TARGET_VERSION USB installer..."
log "WARN" "Insert a 16GB+ USB drive now."
log "INFO" "The USB will be ERASED during this process."
log "INFO" ""
log "INFO" "OCLP will guide you through the USB creation process."
log "INFO" "Please open OpenCore-Patcher and follow the on-screen instructions."
log "INFO" ""

# Open OCLP
open -a "OpenCore-Patcher" 2>/dev/null || {
    log "WARN" "Could not open OCLP automatically"
    log "INFO" "Please open OpenCore-Patcher manually from /Applications"
}

log "INFO" ""
log "INFO" "========================================"
log "INFO" "  OCLP is now open"
log "INFO" "========================================"
log "INFO" ""
log "INFO" "Follow these steps in OCLP:"
log "INFO" "  1. Select your Mac model: $MAC_MODEL"
log "INFO" "  2. Click 'Build and Install OpenCore'"
log "INFO" "  3. Install OpenCore to USB drive"
log "INFO" "  4. Create macOS $TARGET_VERSION USB installer"
log "INFO" "  5. Boot from USB to install macOS"
log "INFO" "  6. After install, run OCLP for post-install patches"
log "INFO" ""
log "INFO" "Log saved to: $LOG_FILE"
