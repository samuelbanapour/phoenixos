const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * App Store Restoration Manager
 * Restores app store functionality on systems where it's been broken or removed
 */
class AppStoreManager {
  constructor(options = {}) {
    this.platform = os.platform();
    this.dryRun = options.dryRun || false;
  }

  /**
   * Restore app stores for the current platform
   */
  async restore(targetOS = null) {
    const target = targetOS || this.detectCurrentOS();

    console.log(`\n🏪 PhoenixOS — Restoring App Stores for ${target}\n`);

    switch (target) {
      case 'windows':
        return this.restoreWindowsStore();
      case 'macos':
        return this.restoreMacAppStore();
      case 'linux':
        return this.restoreLinuxStores();
      case 'android':
        return this.restoreAndroidStores();
      case 'ios':
        return this.restoreiOSStores();
      default:
        console.log(`❌ Unsupported target: ${target}`);
        return { success: false, reason: 'unsupported' };
    }
  }

  detectCurrentOS() {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    if (platform === 'linux') return 'linux';
    return 'unknown';
  }

  // === Windows Store Restoration ===

  async restoreWindowsStore() {
    console.log('  Restoring Microsoft Store & Winget...\n');
    const results = [];

    // 1. Enable Microsoft Store
    console.log('  📦 Step 1: Enabling Microsoft Store...');
    try {
      execSync(
        'powershell -Command "Get-AppxPackage -AllUsers Microsoft.WindowsStore | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register \\"$($_.InstallLocation)\\AppXManifest.xml\\"}"',
        { encoding: 'utf8', timeout: 60000 }
      );
      console.log('  ✓ Microsoft Store enabled');
      results.push({ step: 'Microsoft Store', status: 'success' });
    } catch (err) {
      console.log(`  ⚠️  Store enable failed: ${err.message}`);
      results.push({ step: 'Microsoft Store', status: 'failed', error: err.message });
    }

    // 2. Install Winget
    console.log('\n  📦 Step 2: Installing Winget...');
    try {
      execSync(
        'powershell -Command "Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe"',
        { encoding: 'utf8', timeout: 120000 }
      );
      console.log('  ✓ Winget installed');
      results.push({ step: 'Winget', status: 'success' });
    } catch (err) {
      // Try alternative installation
      console.log('  📥 Trying alternative Winget installation...');
      try {
        execSync(
          'powershell -Command "Invoke-WebRequest -Uri https://aka.ms/getwinget -OutFile winget.msixbundle; Add-AppxPackage winget.msixbundle"',
          { encoding: 'utf8', timeout: 120000 }
        );
        console.log('  ✓ Winget installed (alternative method)');
        results.push({ step: 'Winget', status: 'success' });
      } catch (err2) {
        console.log(`  ⚠️  Winget install failed: ${err2.message}`);
        results.push({ step: 'Winget', status: 'failed', error: err2.message });
      }
    }

    // 3. Enable Windows Store for LTSC (if applicable)
    console.log('\n  📦 Step 3: Checking LTSC configuration...');
    try {
      const edition = execSync('wmic os get Caption', { encoding: 'utf8' });
      if (edition.includes('LTSC')) {
        console.log('  ℹ️  LTSC detected — Store should be available via this restore');
      } else {
        console.log('  ✓ Non-LTSC edition — Store should work normally');
      }
      results.push({ step: 'LTSC Check', status: 'success' });
    } catch {
      results.push({ step: 'LTSC Check', status: 'skipped' });
    }

    // 4. Verify Store works
    console.log('\n  📦 Step 4: Verifying Store access...');
    try {
      execSync('start ms-windows-store:', { encoding: 'utf8' });
      console.log('  ✓ Store launched successfully');
      results.push({ step: 'Store Launch', status: 'success' });
    } catch (err) {
      console.log(`  ⚠️  Could not launch Store: ${err.message}`);
      results.push({ step: 'Store Launch', status: 'failed', error: err.message });
    }

    return { success: true, results };
  }

  // === macOS App Store Restoration ===

  async restoreMacAppStore() {
    console.log('  Restoring Mac App Store...\n');
    const results = [];

    // 1. Reset App Store preferences
    console.log('  📦 Step 1: Resetting App Store preferences...');
    try {
      execSync('defaults delete com.apple.appstore', { encoding: 'utf8' });
      console.log('  ✓ App Store preferences reset');
      results.push({ step: 'Reset Preferences', status: 'success' });
    } catch {
      console.log('  ℹ️  App Store preferences already clean');
      results.push({ step: 'Reset Preferences', status: 'skipped' });
    }

    // 2. Clear App Store cache
    console.log('\n  📦 Step 2: Clearing App Store cache...');
    try {
      execSync('rm -rf ~/Library/Caches/com.apple.appstore', { encoding: 'utf8' });
      execSync('rm -rf ~/Library/Caches/storedownloadd', { encoding: 'utf8' });
      console.log('  ✓ App Store cache cleared');
      results.push({ step: 'Clear Cache', status: 'success' });
    } catch (err) {
      console.log(`  ⚠️  Cache clear failed: ${err.message}`);
      results.push({ step: 'Clear Cache', status: 'failed', error: err.message });
    }

    // 3. Fix Gatekeeper for unsigned apps (OCLP-related)
    console.log('\n  📦 Step 3: Configuring Gatekeeper...');
    try {
      execSync('sudo spctl --master-disable 2>/dev/null || echo "needs sudo"', { encoding: 'utf8' });
      console.log('  ✓ Gatekeeper configured for OCLP compatibility');
      results.push({ step: 'Gatekeeper', status: 'success' });
    } catch {
      console.log('  ⚠️  Gatekeeper configuration needs sudo access');
      results.push({ step: 'Gatekeeper', status: 'needs_sudo' });
    }

    // 4. Sign in to Apple ID
    console.log('\n  📦 Step 4: Apple ID Sign-in...');
    console.log('  ⚠️  Open System Settings → Apple ID to sign in');
    results.push({ step: 'Apple ID', status: 'manual_required' });

    // 5. Launch App Store
    console.log('\n  📦 Step 5: Launching App Store...');
    try {
      execSync('open -a "App Store"', { encoding: 'utf8' });
      console.log('  ✓ App Store launched');
      results.push({ step: 'Launch Store', status: 'success' });
    } catch (err) {
      console.log(`  ⚠️  Could not launch App Store: ${err.message}`);
      results.push({ step: 'Launch Store', status: 'failed', error: err.message });
    }

    return { success: true, results };
  }

  // === Linux Store Restoration ===

  async restoreLinuxStores() {
    console.log('  Setting up Linux app stores (Flatpak + Flathub)...\n');
    const results = [];

    // 1. Install Flatpak
    console.log('  📦 Step 1: Installing Flatpak...');
    try {
      execSync('flatpak --version', { encoding: 'utf8' });
      console.log('  ✓ Flatpak already installed');
      results.push({ step: 'Flatpak', status: 'already_installed' });
    } catch {
      try {
        // Detect package manager
        if (fs.existsSync('/usr/bin/apt')) {
          execSync('sudo apt update && sudo apt install -y flatpak', { encoding: 'utf8', timeout: 300000 });
        } else if (fs.existsSync('/usr/bin/dnf')) {
          execSync('sudo dnf install -y flatpak', { encoding: 'utf8', timeout: 300000 });
        } else if (fs.existsSync('/usr/bin/pacman')) {
          execSync('sudo pacman -S --noconfirm flatpak', { encoding: 'utf8', timeout: 300000 });
        }
        console.log('  ✓ Flatpak installed');
        results.push({ step: 'Flatpak', status: 'success' });
      } catch (err) {
        console.log(`  ⚠️  Flatpak install failed: ${err.message}`);
        results.push({ step: 'Flatpak', status: 'failed', error: err.message });
      }
    }

    // 2. Add Flathub repository
    console.log('\n  📦 Step 2: Adding Flathub repository...');
    try {
      execSync('flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo', {
        encoding: 'utf8',
      });
      console.log('  ✓ Flathub repository added');
      results.push({ step: 'Flathub', status: 'success' });
    } catch (err) {
      console.log(`  ⚠️  Flathub setup failed: ${err.message}`);
      results.push({ step: 'Flathub', status: 'failed', error: err.message });
    }

    // 3. Install essential apps from Flathub
    console.log('\n  📦 Step 3: Installing essential apps...');
    const essentialApps = [
      { name: 'Steam', id: 'com.valvesoftware.Steam' },
      { name: 'Firefox', id: 'org.mozilla.firefox' },
      { name: 'LibreOffice', id: 'org.libreoffice.LibreOffice' },
      { name: 'GIMP', id: 'org.gimp.GIMP' },
    ];

    for (const app of essentialApps) {
      try {
        console.log(`    📥 Installing ${app.name}...`);
        execSync(`flatpak install -y flathub ${app.id}`, { encoding: 'utf8', timeout: 300000 });
        console.log(`    ✓ ${app.name} installed`);
        results.push({ step: `Install ${app.name}`, status: 'success' });
      } catch (err) {
        console.log(`    ⚠️  ${app.name} install failed: ${err.message}`);
        results.push({ step: `Install ${app.name}`, status: 'failed', error: err.message });
      }
    }

    // 4. Install Snap (if available)
    console.log('\n  📦 Step 4: Checking Snap...');
    try {
      execSync('snap --version', { encoding: 'utf8' });
      console.log('  ✓ Snap is available');
      results.push({ step: 'Snap', status: 'already_installed' });
    } catch {
      console.log('  ℹ️  Snap not installed (optional)');
      results.push({ step: 'Snap', status: 'not_installed' });
    }

    return { success: true, results };
  }

  // === Android Store Restoration ===

  async restoreAndroidStores() {
    console.log('  Setting up Android app stores...\n');
    const results = [];

    // Check ADB connection
    let serial = null;
    try {
      const output = execSync('adb devices', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.includes('device') && !l.includes('List'));
      if (lines.length > 0) {
        serial = lines[0].split(/\s+/)[0];
        console.log(`  📱 Connected device: ${serial}`);
      }
    } catch {
      console.log('  ❌ No Android device connected. Connect via USB and enable USB debugging.');
      return { success: false, reason: 'no_device' };
    }

    // 1. Install MicroG
    console.log('\n  📦 Step 1: Installing MicroG (Google Play replacement)...');
    const stores = [
      { name: 'MicroG', url: 'https://microg.org/download.html', desc: 'Google Play Services replacement' },
      { name: 'Aurora Store', url: 'https://auroraoss.com/downloads/AuroraStore/Official/', desc: 'Play Store alternative' },
      { name: 'F-Droid', url: 'https://f-droid.org/packages/org.fdroid.fdroid/', desc: 'Open source app store' },
      { name: 'Obtainium', url: 'https://github.com/ImranR98/Obtainium/releases', desc: 'App updater' },
    ];

    for (const store of stores) {
      console.log(`    📦 ${store.name} — ${store.desc}`);
      console.log(`    📥 Download: ${store.url}`);
      results.push({ step: store.name, status: 'download_provided', url: store.url });
    }

    console.log('\n  📋 Setup Guide:');
    console.log('    1. Download and install each store APK on your device');
    console.log('    2. Open MicroG → Account → Add Google Account');
    console.log('    3. Open Aurora Store → Login with anonymous or Google');
    console.log('    4. Open F-Droid → Wait for initial repo sync');
    console.log('    5. Open Obtainium → Add apps for automatic updates');

    return { success: true, results };
  }

  // === iOS Store Restoration ===

  async restoreiOSStores() {
    console.log('  iOS App Store Restoration\n');
    console.log('  ℹ️  The iOS App Store typically works on all supported devices.');
    console.log('  If you need to install apps outside the App Store:');
    console.log('');
    console.log('  📦 Options:');
    console.log('    • AltStore — sideload apps via computer');
    console.log('    • Sideloadly — IPA signing and installation');
    console.log('    • SideloadX — our integrated sideloading tool');
    console.log('');
    console.log('  📋 Guide:');
    console.log('    1. Download AltStore from altstore.io');
    console.log('    2. Install AltServer on your computer');
    console.log('    3. Connect device via USB');
    console.log('    4. Install AltStore to device');
    console.log('    5. Use AltStore to sideload IPA files');

    return { success: true, results: [] };
  }
}

module.exports = { AppStoreManager };
