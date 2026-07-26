const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Installer bypass patch manager
 * Applies patches to bypass hardware checks during OS installation
 */
class PatchManager {
  constructor() {
    this.patchesDir = path.join(os.homedir(), '.phoenixos', 'patches');
    this.scriptsDir = path.join(__dirname, '..', '..', '..', 'scripts', 'patches');
    this.ensurePatchesDir();
  }

  ensurePatchesDir() {
    fs.mkdirSync(this.patchesDir, { recursive: true });
  }

  /**
   * Apply Windows 11 bypass patches
   * Creates a registry file that bypasses TPM, CPU, RAM, and Secure Boot checks
   */
  async applyWindowsPatch(isoPath) {
    console.log('  🔧 Creating Windows 11 bypass patches...\n');

    // Generate the bypass registry content
    const registryContent = this.generateWindowsBypassRegistry();
    const regPath = path.join(this.patchesDir, 'windows11-bypass.reg');
    fs.writeFileSync(regPath, registryContent);
    console.log(`  ✓ Registry file created: ${regPath}`);

    // Create an autounattend.xml for automated installation
    const xmlContent = this.generateAutounattend();
    const xmlPath = path.join(this.patchesDir, 'autounattend.xml');
    fs.writeFileSync(xmlPath, xmlContent);
    console.log(`  ✓ Autounattend.xml created: ${xmlPath}`);

    // Copy bypass scripts to ISO if possible
    console.log('\n  📋 To apply bypass during installation:');
    console.log('    1. Boot from the Windows 11 USB');
    console.log('    2. When setup starts, press Shift+F10 to open Command Prompt');
    console.log('    3. Type: regedit');
    console.log('    4. Import the bypass registry file');
    console.log('    5. Close regedit and continue installation\n');
    console.log('  Alternatively, the autounattend.xml can be placed on the USB root.\n');

    return { regPath, xmlPath };
  }

  /**
   * Generate Windows 11 bypass registry content
   */
  generateWindowsBypassRegistry() {
    return `Windows Registry Editor Version 5.00

; ═══════════════════════════════════════════════════════════════
; PhoenixOS — Windows 11 Installation Bypass Registry
; This bypasses TPM 2.0, CPU generation, RAM, and Secure Boot checks
; ═══════════════════════════════════════════════════════════════

[HKEY_LOCAL_MACHINE\\SYSTEM\\Setup\\LabConfig]
"BypassTPMCheck"=dword:00000001
"BypassSecureBootCheck"=dword:00000001
"BypassRAMCheck"=dword:00000001
"BypassStorageCheck"=dword:00000001
"BypassCPUCheck"=dword:00000001

[HKEY_LOCAL_MACHINE\\SYSTEM\\Setup\\MoSetup]
"AllowUpgradesWithUnsupportedTPM"=dword:00000001

[HKEY_LOCAL_MACHINE\\SYSTEM\\Setup\\UpgradeCompat]
"AllowUpgradesWithUnsupportedProcessor"=dword:00000001
"AllowUpgradesWithUnsupportedRAM"=dword:00000001
"AllowUpgradesWithUnsupportedDisk"=dword:00000001

; Disable hardware requirement checks
[HKEY_LOCAL_MACHINE\\SYSTEM\\Setup\\Status\\ChildCompletion]
"setup.exe"=dword:00000003

; ═══════════════════════════════════════════════════════════════
; These registry entries bypass the following Windows 11 checks:
; - TPM 2.0 module requirement
; - 8th-gen Intel / Ryzen 2000 CPU requirement
; - 4GB RAM minimum
; - 64GB storage minimum
; - Secure Boot requirement
; - UEFI firmware requirement
; ═══════════════════════════════════════════════════════════════
`;
  }

  /**
   * Generate autounattend.xml for automated Windows installation
   */
  generateAutounattend() {
    return `<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <settings pass="windowsPE">
        <component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <SetupUILanguage>
                <UILanguage>en-US</UILanguage>
            </SetupUILanguage>
            <InputLocale>en-US</InputLocale>
            <SystemLocale>en-US</SystemLocale>
            <UILanguage>en-US</UILanguage>
            <UserLocale>en-US</UserLocale>
        </component>
        <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <RunSynchronous>
                <RunSynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v BypassTPMCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>2</Order>
                    <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v BypassSecureBootCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>3</Order>
                    <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v BypassRAMCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>4</Order>
                    <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v BypassCPUCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>5</Order>
                    <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v BypassStorageCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
            </RunSynchronous>
        </component>
    </settings>
</unattend>`;
  }

  /**
   * Apply macOS OCLP patches
   */
  async applyMacOSPatches() {
    console.log('  🍎 macOS OCLP Patch Guide\n');

    console.log('  📋 Steps to patch macOS with OCLP:');
    console.log('    1. Download OCLP from: https://dortania.github.io/OpenCore-Legacy-Patcher/');
    console.log('    2. Open OCLP on your Mac');
    console.log('    3. Click "Build and Install OpenCore"');
    console.log('    4. Click "Post-Install Root Patch"');
    console.log('    5. Select the patches for your hardware');
    console.log('    6. Reboot when prompted\n');

    console.log('  🔧 Supported patches:');
    console.log('    • GPU/Metal acceleration for older Macs');
    console.log('    • Wi-Fi and Bluetooth fixes');
    console.log('    • USB port mapping');
    console.log('    • Audio fixes');
    console.log('    • Wake/Sleep fixes\n');

    return { success: true, message: 'OCLP patch guide provided' };
  }

  /**
   * Apply Android device patches
   */
  async applyAndroidPatches(deviceCodename, targetROM) {
    console.log(`  🤖 Android Patches for ${deviceCodename}\n`);

    console.log('  📋 Steps to flash custom ROM:');
    console.log(`    1. Download ${targetROM} for ${deviceCodename}`);
    console.log('    2. Download TWRP recovery for your device');
    console.log('    3. Enable USB debugging on your device');
    console.log('    4. Boot into bootloader: adb reboot bootloader');
    console.log('    5. Unlock bootloader: fastboot oem unlock');
    console.log('    6. Flash recovery: fastboot flash recovery twrp.img');
    console.log('    7. Boot into recovery: fastboot reboot recovery');
    console.log('    8. In TWRP, wipe data/factory reset');
    console.log(`    9. In TWRP, install ${targetROM} zip`);
    console.log('    10. Reboot system\n');

    return { success: true, message: 'Android flash guide provided' };
  }

  /**
   * List all available patches
   */
  listPatches() {
    const patches = [
      {
        name: 'Windows 11 TPM Bypass',
        platform: 'windows',
        description: 'Bypasses TPM 2.0, CPU generation, RAM, and Secure Boot checks',
        file: 'windows11-bypass.reg',
      },
      {
        name: 'Windows 11 Autounattend',
        platform: 'windows',
        description: 'Automated installation with all checks bypassed',
        file: 'autounattend.xml',
      },
      {
        name: 'macOS OCLP Patches',
        platform: 'macos',
        description: 'GPU, Wi-Fi, Bluetooth, USB, and audio patches for old Macs',
        file: 'oclp-patcher.sh',
      },
      {
        name: 'Android Custom ROM Guide',
        platform: 'android',
        description: 'Step-by-step guide for flashing LineageOS, /e/OS, etc.',
        file: 'android-flash.sh',
      },
    ];

    console.log('\n  📦 Available Patches:\n');
    for (const patch of patches) {
      console.log(`  🔧 ${patch.name}`);
      console.log(`     Platform: ${patch.platform}`);
      console.log(`     Description: ${patch.description}`);
      console.log(`     File: ${patch.file}\n`);
    }

    return patches;
  }
}

module.exports = { PatchManager };
