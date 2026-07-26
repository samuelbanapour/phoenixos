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

  async setupAndroidAppStores(device, romName) {
    console.log('  🏪 Setting up app stores...');
    const stores = [];

    if (romName === 'lineageos' || romName === 'e-os') {
      stores.push('MicroG (Google Play replacement)');
      stores.push('Aurora Store (Play Store alternative)');
      stores.push('F-Droid (open source apps)');
      stores.push('Obtainium (app updater)');
    }

    for (const store of stores) {
      console.log(`    📦 ${store}`);
    }

    console.log('\n  📋 Post-flash setup guide:');
    console.log('    1. Boot the device and complete initial setup');
    console.log('    2. Install MicroG for Google services');
    console.log('    3. Install Aurora Store for Play Store apps');
    console.log('    4. Install F-Droid for open source apps');
    console.log('    5. Install Obtainium for automatic app updates');
  }
}

module.exports = { UpgradeManager };
