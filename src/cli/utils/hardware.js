const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Hardware detection orchestrator — runs platform-specific detection
 * and returns a unified hardware profile
 */
async function detectLocalHardware() {
  const platform = os.platform();
  const hardware = {
    platform,
    timestamp: new Date().toISOString(),
    cpu: detectCPU(),
    memory: detectMemory(),
    storage: await detectStorage(),
    gpu: detectGPU(),
    network: detectNetwork(),
    display: detectDisplay(),
    boot: detectBootInfo(),
    tpm: detectTPM(),
    secureBoot: detectSecureBoot(),
    battery: detectBattery(),
    connectedDevices: detectConnectedDevices(),
  };

  return hardware;
}

function detectCPU() {
  const cpus = os.cpus();
  const platform = os.platform();

  let model = cpus[0]?.model || 'Unknown';
  let vendor = 'Unknown';
  let cores = cpus.length;
  let speed = cpus[0]?.speed || 0;
  let architecture = os.arch();

  // Try to get more detailed info
  try {
    if (platform === 'darwin') {
      const sysctl = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();
      model = sysctl;
      vendor = execSync('sysctl -n machdep.cpu.vendor', { encoding: 'utf8' }).trim();
    } else if (platform === 'linux') {
      const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
      if (modelMatch) model = modelMatch[1].trim();
      const vendorMatch = cpuinfo.match(/vendor_id\s*:\s*(.+)/);
      if (vendorMatch) vendor = vendorMatch[1].trim();
    } else if (platform === 'win32') {
      const info = execSync('wmic cpu get Name,Manufacturer /format:list', { encoding: 'utf8' });
      const nameMatch = info.match(/Name=(.+)/);
      if (nameMatch) model = nameMatch[1].trim();
      const mfgMatch = info.match(/Manufacturer=(.+)/);
      if (mfgMatch) vendor = mfgMatch[1].trim();
    }
  } catch {}

  // Parse generation info for Intel/AMD
  let generation = null;
  const intelMatch = model.match(/Intel.*Core.*i(\d)-(\d)/);
  if (intelMatch) {
    generation = { brand: 'Intel', series: `i${intelMatch[1]}`, gen: parseInt(intelMatch[2]) };
  }
  const amdMatch = model.match(/AMD.*Ryzen\s+(\w)\s+(\d)(\d{3})/);
  if (amdMatch) {
    generation = { brand: 'AMD', series: amdMatch[1], model: `R${amdMatch[2]}${amdMatch[3]}` };
  }

  return {
    model,
    vendor,
    cores,
    speedMHz: speed,
    architecture,
    generation,
    features: {
      sse: true, // Most modern CPUs have SSE
      avx: architecture === 'x64',
      avx2: architecture === 'x64',
      arm64: architecture === 'arm64',
    },
  };
}

function detectMemory() {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();

  return {
    totalGB: Math.round(totalBytes / (1024 * 1024 * 1024) * 10) / 10,
    freeGB: Math.round(freeBytes / (1024 * 1024 * 1024) * 10) / 10,
    usedGB: Math.round((totalBytes - freeBytes) / (1024 * 1024 * 1024) * 10) / 10,
    totalBytes,
    platform: os.platform(),
  };
}

async function detectStorage() {
  const drives = [];

  try {
    if (os.platform() === 'darwin') {
      const output = execSync('diskutil list -plist', { encoding: 'utf8' });
      // Parse plist output
      const plist = require('plist');
      const parsed = plist.parse(output);
      if (parsed?.AllDisksOrRAIDDisks) {
        for (const disk of parsed.AllDisksOrRAIDDisks) {
          drives.push({
            name: disk.DeviceIdentifier || 'Unknown',
            sizeGB: Math.round((disk.Size || 0) / (1024 * 1024 * 1024) * 10) / 10,
            type: disk.IORegistryEntryName || 'Unknown',
            removable: disk.Removable || false,
          });
        }
      }
    } else if (os.platform() === 'linux') {
      const output = execSync('lsblk -J -o NAME,SIZE,TYPE,RM,MODEL', { encoding: 'utf8' });
      const parsed = JSON.parse(output);
      for (const disk of parsed.blockdevices || []) {
        drives.push({
          name: disk.name,
          sizeGB: parseSize(disk.size),
          type: disk.type,
          removable: disk.rm === '1' || disk.rm === true,
          model: disk.model || 'Unknown',
        });
      }
    } else if (os.platform() === 'win32') {
      const output = execSync('wmic diskdrive get Model,Size,MediaType /format:list', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.trim());
      let current = {};
      for (const line of lines) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key === 'Model') current.model = value;
        if (key === 'MediaType') current.type = value;
        if (key === 'Size' && value) {
          current.sizeGB = Math.round(parseInt(value) / (1024 * 1024 * 1024) * 10) / 10;
          drives.push(current);
          current = {};
        }
      }
    }
  } catch (err) {
    drives.push({ error: err.message });
  }

  return drives;
}

function detectGPU() {
  const gpus = [];

  try {
    if (os.platform() === 'darwin') {
      const output = execSync('system_profiler SPDisplaysDataType -json', { encoding: 'utf8' });
      const parsed = JSON.parse(output);
      const displays = parsed?.SPDisplaysDataType || [];
      for (const display of displays) {
        const gpu = display.sppci_model || display._name || 'Unknown';
        gpus.push({
          name: gpu,
          type: display.sppci_is_gpu === '_spdisplays_gpu' ? 'dedicated' : 'integrated',
          vram: display.sppci_vram || 'Unknown',
        });
      }
    } else if (os.platform() === 'linux') {
      const output = execSync('lspci | grep -i vga', { encoding: 'utf8' });
      for (const line of output.split('\n').filter(l => l.trim())) {
        gpus.push({ name: line.split(': ').pop()?.trim() || 'Unknown', type: 'unknown' });
      }
    } else if (os.platform() === 'win32') {
      const output = execSync('wmic path win32_VideoController get Name,AdapterRAM /format:list', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.trim());
      let current = {};
      for (const line of lines) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key === 'Name') current.name = value;
        if (key === 'AdapterRAM' && value) {
          current.vramMB = Math.round(parseInt(value) / (1024 * 1024));
          gpus.push(current);
          current = {};
        }
      }
    }
  } catch {}

  if (gpus.length === 0) {
    gpus.push({ name: 'Integrated Graphics', type: 'integrated' });
  }

  return gpus;
}

function detectNetwork() {
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (!addr.internal) {
        result.push({
          name,
          address: addr.address,
          family: addr.family,
          mac: addr.mac,
        });
      }
    }
  }

  return result;
}

function detectDisplay() {
  const displays = [];

  try {
    if (os.platform() === 'darwin') {
      const output = execSync('system_profiler SPDisplaysDataType -json', { encoding: 'utf8' });
      const parsed = JSON.parse(output);
      for (const display of parsed?.SPDisplaysDataType || []) {
        displays.push({
          name: display._name || 'Display',
          resolution: display._spdisplays_resolution || 'Unknown',
          retina: display._spdisplays_retina === 'spdisplays_installed',
        });
      }
    }
  } catch {}

  if (displays.length === 0) {
    displays.push({
      name: 'Primary Display',
      resolution: `${os.screen?.width || '?'}x${os.screen?.height || '?'}`,
      retina: false,
    });
  }

  return displays;
}

function detectBootInfo() {
  const info = {
    platform: os.platform(),
    secureBoot: false,
    efi: false,
  };

  try {
    if (os.platform() === 'darwin') {
      info.efi = true; // All modern Macs use EFI
      const output = execSync('nvram -p 2>/dev/null | grep -i secure', { encoding: 'utf8' });
      info.secureBoot = output.includes('1');
    } else if (os.platform() === 'linux') {
      info.efi = fs.existsSync('/sys/firmware/efi');
      if (info.efi) {
        const output = execSync('mokutil --sb-state 2>/dev/null || echo "unknown"', { encoding: 'utf8' }).trim();
        info.secureBoot = output.includes('enabled');
      }
    } else if (os.platform() === 'win32') {
      const output = execSync('powershell -Command "Confirm-SecureBootUEFI"', { encoding: 'utf8' }).trim();
      info.secureBoot = output === 'True';
      info.efi = true;
    }
  } catch {}

  return info;
}

function detectTPM() {
  const result = { present: false, version: null, manufacturer: null };

  try {
    if (os.platform() === 'win32') {
      const output = execSync('powershell -Command "Get-Tpm | Format-List"', { encoding: 'utf8' });
      result.present = output.includes('TpmPresent\\s*:\\s*True') || output.includes('TpmPresent : True');
      const versionMatch = output.match(/TpmVersion\s*:\s*(.+)/);
      if (versionMatch) result.version = versionMatch[1].trim();
    } else if (os.platform() === 'linux') {
      if (fs.existsSync('/dev/tpm0') || fs.existsSync('/dev/tpmrm0')) {
        result.present = true;
        const output = execSync('cat /sys/class/tpm/tpm0/tpm_version_major 2>/dev/null', { encoding: 'utf8' }).trim();
        result.version = output || '2.0';
      }
    } else if (os.platform() === 'darwin') {
      // Macs with T2 or Apple Silicon have Secure Enclave (acts as TPM)
      const model = execSync('sysctl -n hw.model', { encoding: 'utf8' }).trim();
      const hasT2 = /MacBookAir[8,9]|MacBookPro1[5-9]|Macmini[8,9]|iMac[19,20]|MacPro[7,8]|iMacPro/.test(model);
      const hasAppleSilicon = /^Mac/.test(model) && !hasT2;
      result.present = hasT2 || hasAppleSilicon;
      result.manufacturer = hasT2 ? 'Apple T2' : hasAppleSilicon ? 'Apple Secure Enclave' : null;
      result.version = hasT2 || hasAppleSilicon ? '2.0+' : null;
    }
  } catch {}

  return result;
}

function detectSecureBoot() {
  try {
    if (os.platform() === 'darwin') {
      return { enabled: true, uefi: true }; // Macs always have Secure Boot
    } else if (os.platform() === 'linux') {
      const output = execSync('mokutil --sb-state 2>/dev/null || echo "unknown"', { encoding: 'utf8' }).trim();
      return { enabled: output.includes('enabled'), uefi: fs.existsSync('/sys/firmware/efi') };
    } else if (os.platform() === 'win32') {
      const output = execSync('powershell -Command "Confirm-SecureBootUEFI"', { encoding: 'utf8' }).trim();
      return { enabled: output === 'True', uefi: true };
    }
  } catch {}

  return { enabled: false, uefi: false };
}

function detectBattery() {
  const result = { present: false, level: null, charging: false };

  try {
    if (os.platform() === 'darwin') {
      const output = execSync('pmset -g batt', { encoding: 'utf8' });
      if (output.includes('InternalBattery')) {
        result.present = true;
        const levelMatch = output.match(/(\d+)%/);
        if (levelMatch) result.level = parseInt(levelMatch[1]);
        result.charging = output.includes('charging') || output.includes('AC attached');
      }
    } else if (os.platform() === 'linux') {
      if (fs.existsSync('/sys/class/power_supply/BAT0')) {
        result.present = true;
        const capacity = fs.readFileSync('/sys/class/power_supply/BAT0/capacity', 'utf8').trim();
        result.level = parseInt(capacity);
        const status = fs.readFileSync('/sys/class/power_supply/BAT0/status', 'utf8').trim();
        result.charging = status === 'Charging';
      }
    }
  } catch {}

  return result;
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)([KMGT]?i?B?)/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const units = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024, 'T': 1024 * 1024 * 1024 * 1024 };
  return Math.round((value * (units[unit] || 1)) / (1024 * 1024 * 1024) * 10) / 10;
}

/**
 * Detect connected devices (iOS/iPadOS via USB)
 */
function detectConnectedDevices() {
  const devices = [];

  // Try libimobiledevice (best — gives full model/OS info)
  try {
    const deviceList = execSync('idevice_id -l 2>/dev/null', { encoding: 'utf8' }).trim();
    if (deviceList) {
      const serials = deviceList.split('\n').filter(s => s.trim());
      for (const serial of serials) {
        try {
          const info = execSync(`ideviceinfo -s ${serial} 2>/dev/null`, { encoding: 'utf8' }).trim();
          const getVal = (key) => { const m = info.match(new RegExp(key + ': (.+)')); return m ? m[1].trim() : null; };
          const productType = getVal('ProductType') || '';
          const iosVersion = getVal('ProductVersion') || '';
          const modelName = getVal('DeviceName') || '';

          devices.push({
            type: 'iOS',
            serial,
            productType,
            modelName,
            iosVersion,
            connected: true,
          });
        } catch {
          devices.push({ type: 'iOS', serial, connected: true, modelName: 'iPad/iPhone (via libimobiledevice)' });
        }
      }
      if (devices.length > 0) return devices;
    }
  } catch {}

  // Fallback: check via system_profiler on macOS
  try {
    if (os.platform() === 'darwin') {
      const output = execSync(
        `system_profiler SPUSBDataType -json 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
def find_ios(items, depth=0):
    if depth > 5: return
    if isinstance(items, dict):
        for k, v in items.items():
            if isinstance(v, str) and 'iPad' in v or 'iPhone' in v or 'iPod' in v:
                print(f'FOUND: {v}')
            find_ios(v, depth+1)
        if isinstance(items.get('_items'), list):
            for i in items['_items']:
                find_ios(i, depth+1)
        for k, v in items.items():
            if k != '_items' and not isinstance(v, (str, list)):
                find_ios(v, depth+1)
    elif isinstance(items, list):
        for i in items:
            find_ios(i, depth+1)
find_ios(d)
" 2>/dev/null`, { encoding: 'utf8' }).trim();

      const found = output.split('\n').filter(l => l.startsWith('FOUND:'));
      for (const line of found) {
        const name = line.replace('FOUND: ', '');
        devices.push({
          type: 'iOS',
          modelName: name,
          connected: true,
          method: 'usb_detection',
        });
      }
    }
  } catch {}

  // Check via ADB for Android devices too
  try {
    const adbDevices = execSync('adb devices -l 2>/dev/null', { encoding: 'utf8' }).trim();
    const lines = adbDevices.split('\n').filter(l => l.includes('device') && !l.includes('List'));
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const serial = parts[0];
      const modelMatch = line.match(/model:(\S+)/);
      devices.push({
        type: 'Android',
        serial,
        modelName: modelMatch ? modelMatch[1] : 'Android device',
        connected: true,
        method: 'adb',
      });
    }
  } catch {}

  return devices;
}

module.exports = { detectLocalHardware };
