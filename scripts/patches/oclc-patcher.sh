#!/bin/bash
# PhoenixOS - macOS OCLP Integration Script
# Downloads and prepares OpenCore Legacy Patcher for unsupported Macs
#
# Usage: ./oclc-patcher.sh <target-mac-model> <target-macos-version>
# Example: ./oclc-patcher.sh MacBookPro12,1 Sonoma

set -e

MAC_MODEL="${1:-Unknown}"
MACOS_VERSION="${2:-Sonoma}"
OCLP_VERSION="1.5.0"
OCLP_URL="https://github.com/dortania/OpenCore-Legacy-Patcher/releases/download/${OCLP_VERSION}/OpenCore-Patcher-${OCLP_VERSION}.dmg"
WORK_DIR="/tmp/phoenixos-oclp"

echo "========================================"
echo "  PhoenixOS — macOS OCLP Patcher"
echo "========================================"
echo ""
echo "Target Mac Model:  ${MAC_MODEL}"
echo "Target macOS:      ${MACOS_VERSION}"
echo "OCLP Version:      ${OCLP_VERSION}"
echo ""

# Create work directory
mkdir -p "${WORK_DIR}"

# Check if running on a Mac
if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ This script must be run on macOS."
    echo "   To prepare OCLP on another OS, download the DMG manually from:"
    echo "   ${OCLP_URL}"
    exit 1
fi

# Check for existing OCLP
if command -v "OpenCore-Patcher" &>/dev/null; then
    echo "✅ OpenCore Legacy Patcher is already installed."
    echo "   Launch it from /Applications or Spotlight."
    exit 0
fi

echo "📥 Downloading OpenCore Legacy Patcher v${OCLP_VERSION}..."
curl -L -o "${WORK_DIR}/oclp.dmg" "${OCLP_URL}" 2>/dev/null

if [[ ! -f "${WORK_DIR}/oclp.dmg" ]]; then
    echo "❌ Download failed. Please download manually from:"
    echo "   ${OCLP_URL}"
    exit 1
fi

echo "💿 Mounting DMG..."
hdiutil attach "${WORK_DIR}/oclp.dmg" -quiet

# Find the mounted volume
OCLP_VOL=$(ls -d /Volumes/OpenCore-Patcher* 2>/dev/null | head -1)

if [[ -z "${OCLP_VOL}" ]]; then
    echo "❌ Could not find mounted OCLP volume."
    hdiutil detach "${WORK_DIR}/oclp.dmg" -quiet 2>/dev/null
    exit 1
fi

echo "📦 Installing OpenCore Legacy Patcher..."
cp -R "${OCLP_VOL}/OpenCore-Patcher.app" /Applications/

echo "🧹 Cleaning up..."
hdiutil detach "${OCLP_VOL}" -quiet 2>/dev/null
rm -f "${WORK_DIR}/oclp.dmg"

echo ""
echo "========================================"
echo "  ✅ OpenCore Legacy Patcher Installed"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Open 'OpenCore-Patcher' from /Applications"
echo "  2. Select your Mac model: ${MAC_MODEL}"
echo "  3. Build and install OpenCore to USB or internal drive"
echo "  4. Boot from the patched USB to install ${MACOS_VERSION}"
echo "  5. After installation, run OCLP again for post-install patches"
echo ""
echo "Note: Some features (Wi-Fi, Bluetooth, GPU acceleration)"
echo "      may require additional OCLP root patches after install."
echo ""
