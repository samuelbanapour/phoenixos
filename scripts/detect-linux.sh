#!/bin/bash
# PhoenixOS — Linux Hardware Detection Script
# Uses /proc, lspci, lsblk, dmidecode, and other Linux-specific tools

set -euo pipefail

echo "{"

# Basic system info
echo "\"kernel\": \"$(uname -r)\","
echo "\"arch\": \"$(uname -m)\","
echo "\"hostname\": \"$(hostname)\","

# OS info
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "\"osName\": \"$PRETTY_NAME\","
  echo "\"osId\": \"$ID\","
  echo "\"osVersion\": \"$VERSION_ID\","
fi

# CPU
if [ -f /proc/cpuinfo ]; then
  MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
  VENDOR=$(grep "vendor_id" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
  CORES=$(grep -c "^processor" /proc/cpuinfo)
  SPEED=$(grep "cpu MHz" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
  echo "\"cpu\": {"
  echo "  \"model\": \"$MODEL\","
  echo "  \"vendor\": \"$VENDOR\","
  echo "  \"cores\": $CORES,"
  echo "  \"speedMHz\": ${SPEED:-0}"
  echo "},"
fi

# Memory
if [ -f /proc/meminfo ]; then
  TOTAL_KB=$(grep "MemTotal" /proc/meminfo | awk '{print $2}')
  FREE_KB=$(grep "MemAvailable" /proc/meminfo | awk '{print $2}')
  echo "\"memory\": {"
  echo "  \"totalGB\": $(echo "scale=2; $TOTAL_KB / 1048576" | bc),"
  echo "  \"freeGB\": $(echo "scale=2; $FREE_KB / 1048576" | bc),"
  echo "  \"totalBytes\": $((TOTAL_KB * 1024))"
  echo "},"
fi

# GPU
echo "\"gpus\": ["
if command -v lspci &> /dev/null; then
  lspci | grep -i "vga\|3d\|display" | while IFS= read -r line; do
    GPU_NAME=$(echo "$line" | cut -d: -f3 | xargs)
    echo "  {\"name\": \"$GPU_NAME\", \"source\": \"lspci\"}"
  done | sed '$!s/$/,/'
else
  echo "  {\"name\": \"Unknown\", \"source\": \"no-lspci\"}"
fi
echo "],"

# Storage
echo "\"disks\": ["
if command -v lsblk &> /dev/null; then
  lsblk -J -o NAME,SIZE,TYPE,RM,MODEL 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for disk in data.get('blockdevices', []):
        print(json.dumps({
            'name': disk.get('name', 'Unknown'),
            'size': disk.get('size', 'Unknown'),
            'type': disk.get('type', 'Unknown'),
            'removable': disk.get('rm', False),
            'model': disk.get('model', 'Unknown')
        }))
except:
    pass
" 2>/dev/null | while IFS= read -r line; do
    echo "  $line"
done | sed '$!s/$/,/'
fi
echo "],"

# TPM
echo "\"tpm\": {"
if [ -e /dev/tpm0 ] || [ -e /dev/tpmrm0 ]; then
  TPM_VERSION=$(cat /sys/class/tpm/tpm0/tpm_version_major 2>/dev/null || echo "unknown")
  echo "  \"present\": true,"
  echo "  \"version\": \"$TPM_VERSION\""
else
  echo "  \"present\": false"
fi
echo "},"

# Secure Boot
echo "\"secureBoot\": {"
if command -v mokutil &> /dev/null; then
  SB_STATE=$(mokutil --sb-state 2>/dev/null || echo "unknown")
  echo "  \"enabled\": $(echo "$SB_STATE" | grep -q "enabled" && echo true || echo false),"
  echo "  \"state\": \"$SB_STATE\""
else
  echo "  \"enabled\": false,"
  echo "  \"state\": \"unknown (mokutil not installed)\""
fi
echo "},"

# EFI
echo "\"efi\": $(test -d /sys/firmware/efi && echo true || echo false),"

# Battery
echo "\"battery\": {"
if [ -e /sys/class/power_supply/BAT0 ]; then
  CAPACITY=$(cat /sys/class/power_supply/BAT0/capacity 2>/dev/null || echo "0")
  STATUS=$(cat /sys/class/power_supply/BAT0/status 2>/dev/null || echo "Unknown")
  echo "  \"present\": true,"
  echo "  \"level\": $CAPACITY,"
  echo "  \"status\": \"$STATUS\""
else
  echo "  \"present\": false"
fi
echo "}"

echo "}"
