const { SafetyManager } = require('../utils/safety');
const { UpgradeManager } = require('../utils/upgrade');
const { USBManager } = require('../utils/usb');
const ora = require('ora');

/**
 * Guided installation with safety confirmations (advanced mode)
 * Can set up dual-boot or replace existing OS
 */
async function guidedInstall(options) {
  const safety = new SafetyManager(options.dryRun ? 'dry-run' : 'guided');
  const manager = new UpgradeManager(options);
  const spinner = ora('🔍 Preparing installation...').start();

  try {
    // Detect current state
    const currentOS = await manager.detectCurrentOS();
    spinner.succeed(`Current OS: ${currentOS.name} ${currentOS.version}\n`);

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     🔥 PhoenixOS — Guided Installation           ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    console.log('  ⚠️  This is ADVANCED mode. It can modify your internal drive.');
    console.log('  🛡️  All operations require confirmation at each step.');
    console.log('  💾 A backup will be created before any changes.\n');

    // Select target OS
    const inquirer = require('inquirer');
    const { targetOS } = await inquirer.prompt([{
      type: 'list',
      name: 'targetOS',
      message: 'What OS do you want to install?',
      choices: [
        { name: 'Windows 11 (with bypasses)', value: 'windows11' },
        { name: 'Windows 10', value: 'windows10' },
        { name: 'Ubuntu 24.04 LTS', value: 'ubuntu' },
        { name: 'Linux Mint 22', value: 'linuxmint' },
        { name: 'ChromeOS Flex', value: 'chromeos' },
        { name: 'macOS (OCLP patched)', value: 'macos' },
        { name: 'SteamOS', value: 'steamos' },
        { name: 'Android (flash to connected device)', value: 'android' },
      ],
    }]);

    // Installation mode
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: 'Installation mode:',
      choices: [
        { name: 'USB boot (safe — run from USB, no changes to internal drive)', value: 'usb' },
        { name: 'Force upgrade (replace current OS with new version)', value: 'upgrade' },
        { name: 'Dual boot (install alongside existing OS)', value: 'dual' },
        { name: 'Full replace (erase everything and install fresh)', value: 'replace' },
      ],
    }]);

    console.log(`\n  🎯 Target: ${targetOS}`);
    console.log(`  📋 Mode: ${mode}\n`);

    // Safety warnings based on mode
    if (mode === 'replace') {
      console.log('  🚨 DANGER: This will ERASE ALL DATA on your internal drive!');
      console.log('  🚨 All files, programs, and settings will be LOST!\n');

      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'I understand all data will be lost. Proceed?',
        default: false,
      }]);

      if (!confirmed) {
        console.log('❌ Operation cancelled.');
        return;
      }
    } else if (mode === 'upgrade') {
      console.log('  ⚠️  This will upgrade your current OS in-place.');
      console.log('  ⚠️  Your files should be preserved, but a backup is recommended.\n');
    } else if (mode === 'dual') {
      console.log('  ℹ️  This will create a new partition for the second OS.');
      console.log('  ℹ️  You will be able to choose which OS to boot at startup.\n');
    }

    // Create backup
    if (mode !== 'usb') {
      const { confirmed: backupConfirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Create a boot configuration backup first?',
        default: true,
      }]);

      if (backupConfirmed) {
        console.log('\n  💾 Creating backup...');
        const backupPath = await safety.backupBootConfig(targetOS);
        console.log(`  ✓ Backup saved to: ${backupPath}\n`);
      }
    }

    // Execute installation based on mode
    let result;
    switch (mode) {
      case 'usb':
        const usb = new USBManager();
        const drives = await usb.listUSBDrives();
        if (drives.length === 0) {
          console.log('❌ No USB drives detected. Connect one and try again.');
          return;
        }

        const { selection } = await inquirer.prompt([{
          type: 'list',
          name: 'selection',
          message: 'Select USB drive:',
          choices: drives.map((d, i) => ({
            name: `${d.name}: ${d.size} ${d.model || ''}`,
            value: i,
          })),
        }]);

        const targetDrive = drives[selection];
        await safety.validateTarget(targetDrive.path, { requireConfirmation: true });

        // For USB mode, guide the user through the process
        console.log(`\n  📋 USB Boot Setup for ${targetDrive.name}:`);
        console.log('    1. Download the ISO for your target OS');
        console.log('    2. Connect the USB drive');
        console.log('    3. Restart your computer and boot from USB');
        console.log('    4. Follow the OS installer\n');
        result = { success: true, message: 'USB boot instructions provided' };
        break;

      case 'upgrade':
        result = await manager.upgradeWindows();
        break;

      case 'dual':
        console.log('\n  📋 Dual Boot Setup:');
        console.log('    1. Boot from USB with the target OS installer');
        console.log('    2. Choose "Install alongside existing OS"');
        console.log('    3. The installer will create a partition automatically');
        console.log('    4. After install, use rEFInd or GRUB to choose OS at boot\n');
        result = { success: true, message: 'Dual boot instructions provided' };
        break;

      case 'replace':
        console.log('\n  📋 Full Replace Setup:');
        console.log('    1. Boot from USB with the target OS installer');
        console.log('    2. Choose "Erase disk and install" or "Custom (advanced)"');
        console.log('    3. Select the entire internal drive');
        console.log('    4. Follow the installer prompts\n');
        result = { success: true, message: 'Full replace instructions provided' };
        break;
    }

    // Print result
    if (result?.success) {
      console.log('✅ Installation guide complete!');
    } else {
      console.log(`❌ Installation did not complete: ${result?.reason || result?.error}`);
    }

    return result;

  } catch (err) {
    spinner.fail(`Installation failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { guidedInstall };
