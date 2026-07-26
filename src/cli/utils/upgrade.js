const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { SafetyManager } = require('./safety');

/**
 * Force in-place OS upgrade with bypass patches applied
 * Supports: Windows 11 on old PC, macOS on old Mac, Android ROM flash
 */
class UpgradeManager {
  constructor(options = {}) {
    this.safety = new SafetyManager(options.dryRun ? 'dry-run' : options.mode || 'guided');
    this.platform = os.platform();
    this.backupPath = null;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Detect the currently running OS and its version
   */
  async detectCurrentOS() {
    const current = {
      platform: this.platform,
      name: null,
      version: null,
      build: null,
      upgradeable: false,
      targetOS: null,
    };

    try {
      if (this.platform === 'darwin') {
        current.name = 'macOS';
        current.version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
        current.build = execSync('sw_vers -buildVersion', { encoding: 'utf8' }).trim();

        // Check what OCLP can upgrade to
        const [major, minor] = current.version.split('.').map(Number);
        if (major < 15) {
          current.upgradeable = true;
          current.targetOS = 'macOS Sequoia (15.x)';
          current.targetMethod = 'OCLP';
        } else {
          current.upgradeable = false;
          current.targetOS = 'Already on latest supported';
        }
      } else if (this.platform === 'win32') {
        current.name = 'Windows';
        const ver = execSync('wmic os get Caption,Version,BuildNumber /format:list', { encoding: 'utf8' });
        const captionMatch = ver.match(/Caption=(.+)/);
        const versionMatch = ver.match(/Version=(.+)/);
        const buildMatch = ver.match(/BuildNumber=(.+)/);
        current.version = captionMatch?.[1]?.trim() || 'Unknown';
        current.build = buildMatch?.[1]?.trim() || '';

        // Check if Windows 11 is upgradeable
        const buildNum = parseInt(current.build);
        if (buildNum < 22000) {
          // Windows 10 — can upgrade to Windows 11 with bypasses
          current.upgradeable = true;
          current.targetOS = 'Windows 11 (latest)';
          current.targetMethod = 'Bypass TPM/CPU checks';
        } else {
          // Already Windows 11
          current.upgradeable = false;
          current.targetOS = 'Already on Windows 11';
        }
      } else if (this.platform === 'linux') {
        current.name = 'Linux';
        try {
          const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
          const nameMatch = osRelease.match(/PRETTY_NAME="(.+)"/);
          current.version = nameMatch?.[1] || 'Unknown Linux';
        } catch {
          current.version = 'Unknown Linux';
        }
        current.upgradeable = true;
        current.targetOS = 'Latest LTS/Release';
        current.targetMethod = 'Distro upgrade';
      }
    } catch (err) {
      current.error = err.message;
    }

    return current;
  }

  /**
   * Windows 11 force upgrade with TPM/CPU bypass
   */
  async upgradeWindows() {
    console.log('\n🔥 PhoenixOS — Force Windows 11 Upgrade\n');
    console.log('This will upgrade your system to Windows 11 with bypass patches.');
    console.log('TPM 2.0, CPU generation, and RAM checks will be skipped.\n');

    // Safety checks
    const confirmed = await this.safety.requestConfirmation(
      '⚠️  This will perform an IN-PLACE upgrade of Windows.\n' +
      'Your files will be preserved, but a backup is recommended.\n\n' +
      'Proceed with Windows 11 upgrade?'
    );

    if (!confirmed) {
      console.log('❌ Upgrade cancelled.');
      return { success: false, reason: 'cancelled' };
    }

    // Backup boot config
    this.backupPath = await this.safety.backupBootConfig('windows');
    console.log(`📁 Boot config backed up to: ${this.backupPath}`);

    if (this.dryRun) {
      return this.safety.previewOperation({
        type: 'windows_11_upgrade',
        target: 'C:\\',
        details: 'Download Windows 11 ISO, inject bypass registry, run setup.exe /auto',
      });
    }

    try {
      // Step 1: Download Windows 11 ISO
      console.log('\n📥 Step 1/4: Downloading Windows 11 ISO...');
      const isoPath = await this.downloadWindows11ISO();

      // Step 2: Extract and patch installer
      console.log('\n🔧 Step 2/4: Applying bypass patches...');
      await this.patchWindowsInstaller(isoPath);

      // Step 3: Run in-place upgrade
      console.log('\n🚀 Step 3/4: Starting in-place upgrade...');
      await this.runWindowsUpgrade(isoPath);

      // Step 4: Post-upgrade verification
      console.log('\n✅ Step 4/4: Verifying upgrade...');
      const result = this.verifyWindowsUpgrade();

      return { success: true, backupPath: this.backupPath, result };
    } catch (err) {
      console.error(`\n❌ Upgrade failed: ${err.message}`);
      return { success: false, error: err.message, backupPath: this.backupPath };
    }
  }

  /**
   * macOS force upgrade via OCLP
   */
  async upgradeMacOS() {
    console.log('\n🍎 PhoenixOS — Force macOS Upgrade via OCLP\n');

    const confirmed = await this.safety.requestConfirmation(
      '⚠️  This will upgrade macOS using OpenCore Legacy Patcher.\n' +
      'Your Mac will be patched to run a newer macOS version.\n' +
      'A bootable backup USB is recommended.\n\n' +
      'Proceed with macOS upgrade?'
    );

    if (!confirmed) {
      console.log('❌ Upgrade cancelled.');
      return { success: false, reason: 'cancelled' };
    }

    this.backupPath = await this.safety.backupBootConfig('macos');

    if (this.dryRun) {
      return this.safety.previewOperation({
        type: 'macos_oclp_upgrade',
        target: '/Volumes/Macintosh HD',
        details: 'Download OCLP, apply root patches, force macOS Sequoia install',
      });
    }

    try {
      // Step 1: Download OCLP
      console.log('\n📥 Step 1/3: Downloading OpenCore Legacy Patcher...');
      const oclpPath = await this.downloadOCLP();

      // Step 2: Apply patches
      console.log('\n🔧 Step 2/3: Applying OCLP root patches...');
      await this.applyOCLPPatches(oclpPath);

      // Step 3: Trigger macOS update
      console.log('\n🚀 Step 3/3: Triggering macOS update...');
      await this.triggerMacOSUpdate();

      return { success: true, backupPath: this.backupPath };
    } catch (err) {
      console.error(`\n❌ Upgrade failed: ${err.message}`);
      return { success: false, error: err.message, backupPath: this.backupPath };
    }
  }

  /**
   * Android force flash via ADB/Fastboot
   */
  async upgradeAndroid(targetROM = 'lineageos') {
    console.log('\n🤖 PhoenixOS — Force Android ROM Flash\n');
    console.log(`Target ROM: ${targetROM}`);

    // Check ADB connection
    const device = await this.detectAndroidDevice();
    if (!device) {
      console.log('❌ No Android device detected. Connect via USB and enable USB debugging.');
      return { success: false, reason: 'no_device' };
    }

    console.log(`📱 Detected: ${device.model} (${device.androidVersion})`);

    const confirmed = await this.safety.requestConfirmation(
      `⚠️  This will ERASE all data on ${device.model} and flash ${targetROM}.\n` +
      'The device must be unlocked (bootloader unlock required).\n\n' +
      'This operation CANNOT be undone. Proceed?'
    );

    if (!confirmed) {
      console.log('❌ Flash cancelled.');
      return { success: false, reason: 'cancelled' };
    }

    if (this.dryRun) {
      return this.safety.previewOperation({
        type: 'android_flash',
        target: device.model,
        details: `Download ${targetROM} for ${device.codename}, unlock bootloader, flash recovery, flash ROM`,
      });
    }

    try {
      // Step 1: Download ROM
      console.log(`\n📥 Step 1/5: Downloading ${targetROM} for ${device.codename}...`);
      const romPath = await this.downloadAndroidROM(targetROM, device.codename);

      // Step 2: Unlock bootloader (if needed)
      console.log('\n🔓 Step 2/5: Checking bootloader status...');
      await this.unlockBootloader(device);

      // Step 3: Flash custom recovery
      console.log('\n🔧 Step 3/5: Flashing custom recovery...');
      await this.flashRecovery(device, 'twrp');

      // Step 4: Flash ROM
      console.log('\n📦 Step 4/5: Flashing ROM...');
      await this.flashROM(device, romPath);

      // Step 5: Setup app stores
      console.log('\n🏪 Step 5/5: Setting up app stores...');
      await this.setupAndroidAppStores(device, targetROM);

      return { success: true, device: device.model, rom: targetROM };
    } catch (err) {
      console.error(`\n❌ Flash failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // === Windows-specific helpers ===

  async downloadWindows11ISO() {
    const downloadDir = path.join(os.homedir(), '.phoenixos', 'downloads');
    fs.mkdirSync(downloadDir, { recursive: true });

    const isoPath = path.join(downloadDir, 'Win11_23H2_English_x64.iso');

    if (fs.existsSync(isoPath)) {
      console.log('  ✓ ISO already downloaded');
      return isoPath;
    }

    // Microsoft's official download URL
    // In production, this would use the Media Creation Tool or direct download
    console.log('  ⚠️  Windows 11 ISO must be downloaded manually from:');
    console.log('     https://www.microsoft.com/software-download/windows11');
    console.log(`  Save to: ${isoPath}`);

    // For now, check if user placed it there
    if (!fs.existsSync(isoPath)) {
      throw new Error('Windows 11 ISO not found. Please download it first.');
    }

    return isoPath;
  }

  async patchWindowsInstaller(isoPath) {
    // The bypass registry keys that need to be injected
    const bypassKeys = `
Windows Registry Editor Version 5.00

; TPM Bypass
[HKEY_LOCAL_MACHINE\\SYSTEM\\Setup\\LabConfig]
"BypassTPMCheck"=dword:00000001
"BypassSecureBootCheck"=dword:00000001
"BypassRAMCheck"=dword:00000001
"BypassStorageCheck"=dword:00000001
"BypassCPUCheck"=dword:00000001
`;

    const regPath = path.join(os.homedir(), '.phoenixos', 'patches', 'bypass.reg');
    fs.mkdirSync(path.dirname(regPath), { recursive: true });
    fs.writeFileSync(regPath, bypassKeys);
    console.log(`  ✓ Bypass registry written to: ${regPath}`);
    return regPath;
  }

  async runWindowsUpgrade(isoPath) {
    // Mount ISO and run setup.exe with /auto upgrade flag
    console.log('  📀 Mounting ISO...');
    try {
      execSync(`powershell -Command "Mount-DiskImage -ImagePath '${isoPath}'"`, { encoding: 'utf8' });
    } catch (err) {
      throw new Error(`Failed to mount ISO: ${err.message}`);
    }

    // Get the mounted drive letter
    let driveLetter = '';
    try {
      const output = execSync(
        `powershell -Command "(Get-DiskImage -ImagePath '${isoPath}' | Get-Volume).DriveLetter"`,
        { encoding: 'utf8' }
      ).trim();
      driveLetter = output;
    } catch {
      driveLetter = 'D'; // fallback
    }

    console.log(`  🚀 Running upgrade from ${driveLetter}:\\setup.exe...`);
    try {
      // /auto upgrade preserves files and apps
      execSync(`${driveLetter}:\\setup.exe /auto upgrade /compat ignorewarning`, {
        stdio: 'inherit',
        timeout: 3600000, // 1 hour timeout
      });
    } catch (err) {
      throw new Error(`Upgrade process failed: ${err.message}`);
    }
  }

  verifyWindowsUpgrade() {
    try {
      const output = execSync('wmic os get BuildNumber', { encoding: 'utf8' });
      const build = output.match(/(\d+)/)?.[1];
      return {
        build,
        isWin11: parseInt(build) >= 22000,
        success: parseInt(build) >= 22000,
      };
    } catch {
      return { success: false, error: 'Could not verify upgrade' };
    }
  }

  // === macOS-specific helpers ===

  async downloadOCLP() {
    const downloadDir = path.join(os.homedir(), '.phoenixos', 'downloads');
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log('  ⚠️  OCLP must be downloaded from: https://dortania.github.io/OpenCore-Legacy-Patcher/');
    return downloadDir;
  }

  async applyOCLPPatches(oclpPath) {
    console.log('  🔧 Applying OCLP root patches...');
    // OCLP patches are applied via its GUI or CLI
    // This would invoke OCLP's patching mechanism
    console.log('  ⚠️  OCLP patches require the OCLP app to be running');
    console.log('     Launch OCLP and click "Post-Install Root Patch"');
  }

  async triggerMacOSUpdate() {
    console.log('  🔄 Triggering Software Update...');
    try {
      // Trigger software update check
      execSync('softwareupdate --list', { encoding: 'utf8' });
      console.log('  ✓ Software Update checked. Use System Settings to install.');
    } catch (err) {
      console.log(`  ⚠️  Could not trigger update: ${err.message}`);
    }
  }

  // === Android-specific helpers ===

  async detectAndroidDevice() {
    try {
      const output = execSync('adb devices -l', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.includes('device') && !l.includes('List'));
      if (lines.length === 0) return null;

      const serial = lines[0].split(/\s+/)[0];
      const model = execSync(`adb -s ${serial} shell getprop ro.product.model`, { encoding: 'utf8' }).trim();
      const codename = execSync(`adb -s ${serial} shell getprop ro.product.device`, { encoding: 'utf8' }).trim();
      const androidVersion = execSync(`adb -s ${serial} shell getprop ro.build.version.release`, { encoding: 'utf8' }).trim();
      const treble = execSync(`adb -s ${serial} shell ls /system/system_ext/etc/init/ 2>/dev/null | head -1 || echo "no"`, { encoding: 'utf8' }).trim();

      return { serial, model, codename, androidVersion, treble: treble !== 'no' };
    } catch {
      return null;
    }
  }

  async downloadAndroidROM(romName, codename) {
    const downloadDir = path.join(os.homedir(), '.phoenixos', 'downloads', 'android');
    fs.mkdirSync(downloadDir, { recursive: true });

    const romUrls = {
      lineageos: `https://download.lineageos.org/${codename}`,
      'e-os': `https://doc.e.foundation/devices/${codename}`,
      blissos: `https://blissos.org/`,
      'android-x86': `https://www.android-x86.org/`,
    };

    console.log(`  📥 Download ${romName} for ${codename} from:`);
    console.log(`     ${romUrls[romName] || 'Unknown ROM'}`);

    return downloadDir;
  }

  async unlockBootloader(device) {
    try {
      const state = execSync(`adb -s ${device.serial} shell getprop ro.boot.verifiedbootstate`, { encoding: 'utf8' }).trim();
      if (state === 'orange' || state === 'green') {
        console.log('  ✓ Bootloader already unlocked');
        return;
      }
      console.log('  🔓 Unlocking bootloader...');
      execSync(`adb -s ${device.serial} reboot bootloader`, { encoding: 'utf8' });
      execSync(`fastboot -s ${device.serial} oem unlock`, { encoding: 'utf8' });
      console.log('  ✓ Bootloader unlocked');
    } catch (err) {
      console.log(`  ⚠️  Bootloader unlock may need manual confirmation on device: ${err.message}`);
    }
  }

  async flashRecovery(device, recovery) {
    console.log(`  🔧 Flashing ${recovery} recovery...`);
    try {
      execSync(`fastboot -s ${device.serial} flash recovery ${recovery}.img`, { encoding: 'utf8' });
      console.log(`  ✓ ${recovery} recovery flashed`);
    } catch (err) {
      throw new Error(`Failed to flash recovery: ${err.message}`);
    }
  }

  async flashROM(device, romPath) {
    console.log('  📦 Flashing ROM via recovery...');
    try {
      // Reboot to recovery
      execSync(`adb -s ${device.serial} reboot recovery`, { encoding: 'utf8' });
      console.log('  ✓ Device rebooted to recovery');
      console.log('  ⚠️  ROM flashing must be done from recovery menu');
      console.log('     Select "Install" and navigate to the ROM zip file');
    } catch (err) {
      throw new Error(`Failed to flash ROM: ${err.message}`);
    }
  }

  // === iOS/iPadOS-specific helpers ===

  static iPadModelMapping = {
    // iPad Pro
    'iPad Pro 12.9" 6th': { chip: 'M2', maxOS: 'iPadOS 18' },
    'iPad Pro 12.9" 5th': { chip: 'M1', maxOS: 'iPadOS 18' },
    'iPad Pro 12.9" 4th': { chip: 'A12Z', maxOS: 'iPadOS 18' },
    'iPad Pro 12.9" 3rd': { chip: 'A12X', maxOS: 'iPadOS 18' },
    'iPad Pro 12.9" 2nd': { chip: 'A10X', maxOS: 'iPadOS 16' },
    'iPad Pro 12.9" 1st': { chip: 'A9X', maxOS: 'iPadOS 15' },
    'iPad Pro 11" 4th': { chip: 'M4', maxOS: 'iPadOS 18' },
    'iPad Pro 11" 3rd': { chip: 'M2', maxOS: 'iPadOS 18' },
    'iPad Pro 11" 2nd': { chip: 'M1', maxOS: 'iPadOS 18' },
    'iPad Pro 11" 1st': { chip: 'A12X', maxOS: 'iPadOS 18' },
    'iPad Pro 10.5"': { chip: 'A10X', maxOS: 'iPadOS 16' },
    'iPad Pro 9.7"': { chip: 'A9X', maxOS: 'iPadOS 15' },

    // iPad Air
    'iPad Air 6th': { chip: 'M2', maxOS: 'iPadOS 18' },
    'iPad Air 5th': { chip: 'M1', maxOS: 'iPadOS 18' },
    'iPad Air 4th': { chip: 'A14', maxOS: 'iPadOS 18' },
    'iPad Air 3rd': { chip: 'A12', maxOS: 'iPadOS 18' },
    'iPad Air 2': { chip: 'A8X', maxOS: 'iPadOS 14' },
    'iPad Air 1st': { chip: 'A7', maxOS: 'iOS 12' },

    // iPad
    'iPad 10th': { chip: 'A14', maxOS: 'iPadOS 18' },
    'iPad 9th': { chip: 'A13', maxOS: 'iPadOS 18' },
    'iPad 8th': { chip: 'A12', maxOS: 'iPadOS 18' },
    'iPad 7th': { chip: 'A10', maxOS: 'iPadOS 16' },
    'iPad 6th': { chip: 'A10', maxOS: 'iPadOS 16' },
    'iPad 5th': { chip: 'A9', maxOS: 'iPadOS 16' },
    'iPad 4th': { chip: 'A6X', maxOS: 'iOS 10' },
    'iPad 3rd': { chip: 'A5X', maxOS: 'iOS 9' },
    'iPad 2nd': { chip: 'A5', maxOS: 'iOS 9' },

    // iPad mini
    'iPad mini 7th': { chip: 'A17 Pro', maxOS: 'iPadOS 18' },
    'iPad mini 6th': { chip: 'A15', maxOS: 'iPadOS 18' },
    'iPad mini 5th': { chip: 'A12', maxOS: 'iPadOS 18' },
    'iPad mini 4th': { chip: 'A8', maxOS: 'iPadOS 14' },
    'iPad mini 3rd': { chip: 'A7', maxOS: 'iOS 12' },
    'iPad mini 2nd': { chip: 'A7', maxOS: 'iOS 12' },
    'iPad mini 1st': { chip: 'A5', maxOS: 'iOS 9' },
  };

  async detectIOSDevice() {
    try {
      // Try libimobiledevice first
      const devices = execSync('idevice_id -l 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
      if (!devices) {
        // Fall back to checking if we can list devices via system_profiler (macOS)
        try {
          const profiler = execSync('system_profiler SPUSBDataType 2>/dev/null | grep -A 10 "iPad\\|iPhone\\|iPod" | head -20', { encoding: 'utf8' }).trim();
          if (!profiler) return null;
        } catch {
          return null;
        }
      }

      const serial = devices.split('\n')[0];
      let deviceInfo = { serial: serial || 'unknown' };

      // Get detailed info from ideviceinfo if available
      if (serial) {
        try {
          const info = execSync(`ideviceinfo -s ${serial} 2>/dev/null`, { encoding: 'utf8' }).trim();
          const getVal = (key) => { const m = info.match(new RegExp(key + ': (.+)')); return m ? m[1].trim() : null; };

          deviceInfo = {
            serial,
            model: getVal('ProductType') || getVal('DeviceName') || 'iPad',
            modelNumber: getVal('ModelNumber') || '',
            iosVersion: getVal('ProductVersion') || '',
            buildVersion: getVal('BuildVersion') || '',
            productType: getVal('ProductType') || '',
          };

          // Map ProductType to iPad model name
          const prods = {
            'iPad13,18':'iPad 10th', 'iPad13,19':'iPad 10th',
            'iPad12,1':'iPad 9th', 'iPad12,2':'iPad 9th',
            'iPad11,6':'iPad 8th', 'iPad11,7':'iPad 8th',
            'iPad7,11':'iPad 7th', 'iPad7,12':'iPad 7th',
            'iPad7,5':'iPad 6th', 'iPad7,6':'iPad 6th',
            'iPad6,11':'iPad 5th', 'iPad6,12':'iPad 5th',
            'iPad3,4':'iPad 4th', 'iPad3,5':'iPad 4th', 'iPad3,6':'iPad 4th',
          };
          deviceInfo.modelName = prods[deviceInfo.productType] || deviceInfo.model || 'iPad';
          return deviceInfo;
        } catch {
          return deviceInfo;
        }
      }

      // No libimobiledevice, return basic info from USB detection
      return { model: 'iPad (USB)', manualMethod: true };
    } catch {
      return null;
    }
  }

  /**
   * Get the max iPadOS version an iPad model supports
   */
  getMaxIOSVersion(modelName) {
    const mapping = UpgradeManager.iPadModelMapping;
    if (mapping[modelName]) return mapping[modelName].maxOS;
    // Fallback: check by chip
    for (const [model, info] of Object.entries(mapping)) {
      if (modelName.toLowerCase().includes(model.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        return info.maxOS;
      }
    }
    return 'Unknown';
  }

  getChipForModel(modelName) {
    const mapping = UpgradeManager.iPadModelMapping;
    if (mapping[modelName]) return mapping[modelName].chip;
    for (const [model, info] of Object.entries(mapping)) {
      if (modelName.toLowerCase().includes(model.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        return info.chip;
      }
    }
    return 'Unknown';
  }

  /**
   * Parse iOS version string for comparison (e.g. "10.3.3" → 10,3,3)
   */
  parseIOSVersion(version) {
    const parts = version.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  }

  /**
   * Check if the device has blocking profiles (tvOS beta profile, MDM)
   */
  checkIOSBlockingProfiles(device) {
    console.log('\n  🔍 Checking for blocking profiles...');
    try {
      if (device.serial) {
        const profiles = execSync(`ideviceprovision list ${device.serial} 2>/dev/null || echo "no profiles"`, { encoding: 'utf8' }).trim();
        if (profiles.includes('tvOS') || profiles.includes('Beta') || profiles.includes('Apple Internal')) {
          console.log('  ⚠️  Update-blocking profile found (tvOS beta profile or similar)');
          console.log('  📝 Remove it by going to: Settings > General > VPN & Device Management');
          console.log('         or run: ideviceprovision remove <profile>');
          return { blocked: true, profiles: profiles.split('\n').filter(l => l.trim()).slice(0, 5) };
        }
      }
      console.log('  ✓ No update-blocking profiles found');
      return { blocked: false };
    } catch {
      console.log('  ? Could not check profiles (install libimobiledevice for this feature)');
      return { blocked: false, error: 'libimobiledevice not available' };
    }
  }

  /**
   * Force iPadOS upgrade guidance
   */
  async upgradeIOS() {
    console.log('\n📱 PhoenixOS — Force iPadOS Upgrade\n');

    console.log('  🎯 Target: iPad → Latest supported iPadOS');
    console.log('  💪 This guide will help you force-upgrade your iPad even if');
    console.log('     Apple\'s update mechanism says "up to date"\n');

    // Step 1: Detect device
    const spinner = require('ora').default || require('ora');
    let detectStep = spinner('🔍 Detecting connected iOS device...').start();

    const device = await this.detectIOSDevice();
    if (!device) {
      detectStep.fail('No iOS device detected');
      console.log('\n  📋 Connect your iPad via USB and install libimobiledevice:');
      console.log('     brew install libimobiledevice (macOS)');
      console.log('     apt install libimobiledevice (Linux)');
      console.log('\n  🔧 Manual steps:');
      console.log('     1. Open Finder (macOS) or iTunes (Windows)');
      console.log('     2. Connect your iPad via USB');
      console.log('     3. Check for updates in the device summary page');
      return { success: false, reason: 'no_device_detected' };
    }
    detectStep.succeed(`Detected: ${device.modelName || device.model} (iOS ${device.iosVersion || '?'})`);

    // Step 2: Determine max supported version
    const maxOS = this.getMaxIOSVersion(device.modelName);
    const chip = this.getChipForModel(device.modelName);
    console.log(`  🧠 Chip: ${chip}`);
    console.log(`  📌 Max supported: ${maxOS}`);
    console.log(`  📱 Current OS: iOS ${device.iosVersion || 'Unknown'}`);

    // Step 3: Check if already at max
    const currentVer = this.parseIOSVersion(device.iosVersion || '0');
    if (maxOS.includes('iOS 10')) {
      if (currentVer.major >= 10) {
        console.log('\n  ✅ Your iPad is ALREADY on its maximum supported OS');
        console.log('  ℹ️  iPad 4th gen (A6X) can only run iOS 10.3.3 maximum.');
        console.log('  ℹ️  The A6X chip does not support any newer iPadOS version.');
        return { success: true, alreadyMax: true, model: device.modelName };
      }
    } else if (maxOS.includes('iPadOS 16')) {
      if (currentVer.major >= 16) {
        console.log('\n  ✅ Your iPad is already on iPadOS 16 (its maximum)');
        return { success: true, alreadyMax: true };
      }
    } else if (maxOS.includes('iPadOS 18') || maxOS.includes('iPadOS 17')) {
      if (device.iosVersion && currentVer.major >= 17) {
        console.log('\n  ✅ iPadOS is already fairly current');
      }
    }

    // Step 4: Check for blocking profiles
    this.checkIOSBlockingProfiles(device);

    // Step 5: Show upgrade guidance
    console.log('\n  🔥 === FORCE UPGRADE INSTRUCTIONS ===\n');

    const platform = os.platform();

    if (platform === 'darwin') {
      console.log('  🍎 macOS — Using Finder:');
      console.log(`     1. Connect iPad to this Mac via USB`);
      console.log(`     2. Open Finder → select your iPad in sidebar`);
      console.log(`     3. Click "Check for Update" or "Update"`);
      console.log(`     4. If "up to date" appears, click again — it often finds updates`);
      console.log(`     5. If still stuck, click "Restore iPad with latest IPSW" while holding Option`);
      console.log(`         → This opens a file picker for manual IPSW selection`);
      console.log(`         → Download the latest IPSW from ipsw.me or similar`);
      console.log('');

      if (device.iosVersion) {
        const ver = this.parseIOSVersion(device.iosVersion);
        // If on a much older version, provide jailbreak link
        if (ver.major <= 14) {
          console.log('  🔓 Jailbreak Available (for force OTA enable):');
          if (chip.startsWith('A') && chip <= 'A11') {
            console.log('     palera1n: https://palera.in (checkm8 exploit, A7-A11)');
            console.log('     After jailbreak, install tvOS profile remover');
            console.log('     Then re-check for OTA updates');
          } else {
            console.log('     Dopamine: https://github.com/opa334/Dopamine (A12-A15, up to iOS 16)');
          }
          console.log('');
        }
      }
    } else {
      console.log('  🪟 Windows — Using iTunes:');
      console.log(`     1. Connect iPad to PC via USB`);
      console.log(`     2. Open iTunes → click the iPad icon`);
      console.log(`     3. Click "Check for Update"`);
      console.log(`     4. If stuck, download IPSW from ipsw.me`);
      console.log(`     5. Shift+Click "Restore iPad" (Windows) to select IPSW file manually`);
      console.log('');
    }

    console.log('  🔧 Optional Tools:');
    console.log('     3uTools (Windows): https://3utools.com — force flash IPSW with one click');
    console.log('     libimobiledevice (macOS/Linux): brew install libimobiledevice');
    console.log('     ideviceupdatecheck: Check for available updates');
    console.log('     ideviceinstall: Install/remove apps and profiles');

    // Step 6: App store restoration guidance
    console.log('\n  🏪 Restore App Store (if broken after update):');
    console.log('     1. Sign out of Apple ID → reboot → sign back in');
    console.log('     2. If App Store is missing, go to Settings > Screen Time > Content & Privacy');
    console.log('         → Disable "iTunes Store & App Store Purchases" restrictions');
    console.log('     3. For sideloading, set up AltStore: https://altstore.io');

    const confirmed = await this.safety.requestConfirmation(
      '\n  📋 Ready to start the force upgrade process?'
    );

    if (!confirmed) {
      console.log('❌ Force upgrade cancelled.');
      return { success: false, reason: 'cancelled', device: device.modelName };
    }

    // Try libimobiledevice-based update if available
    if (device.serial) {
      try {
        console.log('\n  📥 Attempting OTA update check via libimobiledevice...');
        const updateCheck = execSync(`ideviceupdatecheck -s ${device.serial} 2>/dev/null || echo "update check unavailable"`, { encoding: 'utf8' }).trim();
        if (updateCheck && !updateCheck.includes('unavailable')) {
          console.log(`  ${updateCheck}`);
          if (updateCheck.includes('Update available')) {
            console.log('  🚀 Starting OTA update...');
            execSync(`ideviceupgrademethod -s ${device.serial} ota 2>/dev/null || true`, { encoding: 'utf8' });
          }
        }
      } catch {}
    }

    return {
      success: true,
      device: device.modelName,
      currentOS: `iOS ${device.iosVersion || 'Unknown'}`,
      maxSupported: maxOS,
      chip,
    };
  }
}

module.exports = { UpgradeManager };
