#!/bin/bash
# PhoenixOS — Android Device Detection Script
# Uses ADB to detect connected Android devices

set -euo pipefail

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo '{"error": "ADB not installed. Install Android platform-tools first."}'
    exit 1
fi

# Check for connected devices
DEVICES=$(adb devices -l 2>/dev/null | grep -v "List" | grep "device" || true)

if [ -z "$DEVICES" ]; then
    echo '{"devices": [], "error": "No Android devices detected. Connect via USB and enable USB debugging."}'
    exit 0
fi

echo "{"
echo "\"devices\": ["

FIRST=true
while IFS= read -r line; do
    SERIAL=$(echo "$line" | awk '{print $1}')
    if [ -z "$SERIAL" ]; then continue; fi

    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ","
    fi

    # Get device properties
    MODEL=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Unknown")
    BRAND=$(adb -s "$SERIAL" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || echo "Unknown")
    DEVICE=$(adb -s "$SERIAL" shell getprop ro.product.device 2>/dev/null | tr -d '\r' || echo "Unknown")
    ANDROID_VER=$(adb -s "$SERIAL" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "Unknown")
    SDK_VER=$(adb -s "$SERIAL" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo "Unknown")
    BUILD=$(adb -s "$SERIAL" shell getprop ro.build.display.id 2>/dev/null | tr -d '\r' || echo "Unknown")
    SECURITY=$(adb -s "$SERIAL" shell getprop ro.build.version.security_patch 2>/dev/null | tr -d '\r' || echo "Unknown")

    # Check bootloader status
    BOOTLOADER=$(adb -s "$SERIAL" shell getprop ro.boot.verifiedbootstate 2>/dev/null | tr -d '\r' || echo "unknown")

    # Check if rooted
    ROOTED="false"
    ROOT_CHECK=$(adb -s "$SERIAL" shell "su -c 'id' 2>/dev/null | grep -q 'uid=0' && echo 'yes' || echo 'no'" 2>/dev/null | tr -d '\r' || echo "no")
    if [ "$ROOT_CHECK" = "yes" ]; then
        ROOTED="true"
    fi

    # Check Treble support
    TREBLE="false"
    if adb -s "$SERIAL" shell "ls /system/system_ext/etc/init/ 2>/dev/null | head -1" 2>/dev/null | grep -q .; then
        TREBLE="true"
    fi

    # Get architecture
    ARCH=$(adb -s "$SERIAL" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r' || echo "unknown")

    # Get storage info
    STORAGE_TOTAL=$(adb -s "$SERIAL" shell "cat /proc/sdinfo 2>/dev/null | grep 'total:' | awk '{print \$2}' || echo '0'" 2>/dev/null | tr -d '\r' || echo "0")

    cat <<EOF
    {
        "serial": "$SERIAL",
        "model": "$MODEL",
        "brand": "$BRAND",
        "device": "$DEVICE",
        "androidVersion": "$ANDROID_VER",
        "sdkVersion": "$SDK_VER",
        "build": "$BUILD",
        "securityPatch": "$SECURITY",
        "architecture": "$ARCH",
        "bootloaderState": "$BOOTLOADER",
        "rooted": $ROOTED,
        "trebleSupport": $TREBLE,
        "storageTotalGB": $STORAGE_TOTAL
    }
EOF
done <<< "$DEVICES"

echo "]"
echo "}"
