#!/bin/bash
# PhoenixOS — macOS Hardware Detection Script
# Uses system_profiler, sysctl, ioreg, and other macOS-specific tools

set -euo pipefail

echo "{"

# Basic system info
MODEL=$(sysctl -n hw.model 2>/dev/null || echo "unknown")
echo "\"model\": \"$MODEL\","
echo "\"machine\": \"$(sysctl -n hw.machine 2>/dev/null || echo unknown)\","
echo "\"osVersion\": \"$(sw_vers -productVersion 2>/dev/null || echo unknown)\","
echo "\"osBuild\": \"$(sw_vers -buildVersion 2>/dev/null || echo unknown)\","

# CPU
echo "\"cpu\": {"
echo "  \"brand\": \"$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo unknown)\","
echo "  \"vendor\": \"$(sysctl -n machdep.cpu.vendor 2>/dev/null || echo unknown)\","
echo "  \"cores\": $(sysctl -n hw.physicalcpu 2>/dev/null || echo 0),"
echo "  \"threads\": $(sysctl -n hw.logicalcpu 2>/dev/null || echo 0),"
echo "  \"speedMHz\": $(sysctl -n hw.cpufrequency 2>/dev/null || sysctl -n hw.cpufrequency_max 2>/dev/null || echo 0),"
echo "  \"features\": [$(sysctl -n machdep.cpu.features 2>/dev/null | sed 's/ */"/g; s/^/"/; s/$/"/' || echo '')]"
echo "},"

# Memory
TOTAL_MEM=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
PAGE_SIZE=$(vm_stat | head -n 2 | tail -n 1 | awk '{print $NF}' | tr -d '.')
FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
INACTIVE_PAGES=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
echo "\"memory\": {"
echo "  \"totalBytes\": $TOTAL_MEM,"
echo "  \"totalGB\": $(echo "scale=2; $TOTAL_MEM / 1073741824" | bc),"
echo "  \"pageSize\": ${PAGE_SIZE:-16384}"
echo "},"

# Disk devices
echo "\"disks\": ["
diskutil list -plist 2>/dev/null | grep -A5 '<key>DeviceIdentifier</key>' | while read -r line; do
  if echo "$line" | grep -q '<string>'; then
    DEVICE=$(echo "$line" | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
    SIZE=$(diskutil info "$DEVICE" 2>/dev/null | grep "Disk Size:" | sed 's/.*(//;s/ bytes.*//')
    echo "  {\"device\": \"$DEVICE\", \"sizeBytes\": ${SIZE:-0}}"
  fi
done | sed '$!s/$/,/'
echo "],"

# GPU
echo "\"gpus\": ["
system_profiler SPDisplaysDataType -json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    displays = data.get('SPDisplaysDataType', [])
    for i, d in enumerate(displays):
        gpu = d.get('sppci_model', d.get('_name', 'Unknown'))
        vram = d.get('sppci_vram', 'Unknown')
        sep = ',' if i < len(displays) - 1 else ''
        print(f'{{\"name\": \"{gpu}\", \"vram\": \"{vram}\"}}{sep}')
except:
    print('{\"name\": \"Unknown\"}')
" 2>/dev/null || echo '{"name": "Unknown"}'
echo "],"

# USB devices
echo "\"usbDevices\": ["
system_profiler SPUSBDataType -json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    items = data.get('SPUSBDataType', [])
    def extract(items, depth=0):
        devices = []
        for item in items:
            dev = {}
            dev['name'] = item.get('_name', 'Unknown')
            dev['speed'] = item.get('speed', 'Unknown')
            dev['capacity'] = item.get('Media', [{}])[0].get('size_in_bytes', 0) if isinstance(item.get('Media'), list) else 0
            if 'items' in item:
                dev['items'] = extract(item['items'], depth+1)
            devices.append(dev)
        return devices
    devices = extract(items)
    json.dump(devices, sys.stdout)
except:
    print('[]')
" 2>/dev/null || echo '[]'
echo "]"
echo "}"
