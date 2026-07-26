const { USBManager } = require('../utils/usb');
const { SafetyManager } = require('../utils/safety');
const ora = require('ora');

/**
 * Create bootable media with optional bypass patches
 */
async function createMedia(options) {
  const spinner = ora('🔍 Detecting USB drives...').start();
  const safety = new SafetyManager(options.dryRun ? 'dry-run' : 'usb-only');
  const usb = new USBManager();

  try {
    // Detect USB drives
    const drives = await usb.listUSBDrives();

    if (drives.length === 0 || drives[0]?.error) {
      spinner.fail('No USB drives detected!');
      console.log('\n  ℹ️  Connect a USB drive and try again.');
      console.log('  ⚠️  The drive will be ERASED during this process.');
      return;
    }

    spinner.succeed(`Found ${drives.length} USB drive(s)\n`);

    // Display available drives
    console.log('  💿 Available USB Drives:');
    for (const [index, drive] of drives.entries()) {
      if (drive.error) continue;
      console.log(`     [${index + 1}] ${drive.name}: ${drive.size} ${drive.model ? `(${drive.model})` : ''}`);
      if (drive.mountPoint) console.log(`         Mounted at: ${drive.mountPoint}`);
    }
    console.log('');

    // Select target device
    let targetDevice;
    if (options.usb) {
      targetDevice = options.usb;
    } else {
      // Interactive selection
      const inquirer = require('inquirer');
      const { selection } = await inquirer.prompt([{
        type: 'number',
        name: 'selection',
        message: 'Select USB drive to use:',
        validate: (val) => val > 0 && val <= drives.length,
      }]);
      targetDevice = drives[selection - 1].path;
    }

    // Validate target
    await safety.validateTarget(targetDevice);

    console.log(`  🎯 Target: ${targetDevice}\n`);

    // OS selection
    let targetOS = options.os;
    if (!targetOS) {
      const inquirer = require('inquirer');
      const { os } = await inquirer.prompt([{
        type: 'list',
        name: 'os',
        message: 'Select OS to create bootable media for:',
        choices: [
          { name: 'Windows 11 (with TPM bypass)', value: 'windows11' },
          { name: 'Windows 10', value: 'windows10' },
          { name: 'Ubuntu 24.04 LTS', value: 'ubuntu' },
          { name: 'Linux Mint 22', value: 'linuxmint' },
          { name: 'ChromeOS Flex', value: 'chromeos' },
          { name: 'macOS (OCLP patched)', value: 'macos' },
          { name: 'SteamOS', value: 'steamos' },
          { name: 'Arch Linux', value: 'arch' },
        ],
      }]);
      targetOS = os;
    }

    // Confirm writing
    const confirmMsg = `⚠️  This will ERASE everything on ${targetDevice} and write ${targetOS} to it.\n    Continue?`;
    const confirmed = await safety.requestConfirmation(confirmMsg);

    if (!confirmed) {
      console.log('❌ Operation cancelled.');
      return;
    }

    // In dry-run mode, just preview
    if (options.dryRun) {
      safety.previewOperation({
        type: 'create_media',
        target: targetDevice,
        os: targetOS,
      });
      return;
    }

    // Prompt for ISO download location
    console.log('\n  📥 Download the OS ISO to continue:');
    const isos = {
      windows11: 'https://www.microsoft.com/software-download/windows11',
      windows10: 'https://www.microsoft.com/software-download/windows10',
      ubuntu: 'https://ubuntu.com/download/desktop',
      linuxmint: 'https://linuxmint.com/download.php',
      chromeos: 'https://chromeos.google/products/chromeosflex/',
      macos: 'https://support.apple.com/en-us/HT211683',
      steamos: 'https://store.steampowered.com/steamos/',
      arch: 'https://archlinux.org/download/',
    };

    console.log(`     ${isos[targetOS] || 'Download the appropriate ISO'}`);
    console.log('');

    const inquirer = require('inquirer');
    const { isoPath } = await inquirer.prompt([{
      type: 'input',
      name: 'isoPath',
      message: 'Enter the full path to the downloaded ISO:',
      validate: (val) => val.length > 0,
    }]);

    // Apply bypass patches if applicable
    if ((targetOS === 'windows11') && options.patch !== false) {
      console.log('\n  🔧 Applying Windows 11 bypass patches...');
      const { PatchManager } = require('../utils/patch');
      const patcher = new PatchManager();
      await patcher.applyWindowsPatch(isoPath);
    }

    // Write image to USB
    console.log('\n  💿 Writing image to USB drive...');
    await usb.writeImageToUSB(isoPath, targetDevice, { verify: true });

    // Eject
    const ejectConfirmed = await safety.requestConfirmation('Eject USB drive?', { defaultValue: true });
    if (ejectConfirmed) {
      await usb.eject(targetDevice);
    }

    console.log(`\n✅ Bootable ${targetOS} USB created successfully!`);
    console.log('  📋 Insert it into the target device and boot from USB.');

  } catch (err) {
    spinner.fail(`Media creation failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { createMedia };
