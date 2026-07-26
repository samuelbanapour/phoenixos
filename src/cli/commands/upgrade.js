const { UpgradeManager } = require('../utils/upgrade');
const ora = require('ora').default || require('ora');

/**
 * Force in-place OS upgrade with bypass patches
 */
async function upgradeOS(options) {
  const spinner = ora('🔍 Detecting current OS...').start();
  const manager = new UpgradeManager(options);

  try {
    // Detect current OS
    const current = await manager.detectCurrentOS();
    spinner.succeed(`Current OS: ${current.name} ${current.version}\n`);

    // Show upgrade options
    if (!options.os) {
      console.log('  🔥 PhoenixOS — Force Upgrade Options\n');

      const inquirer = require('inquirer');
      const choices = [];

      if (current.platform === 'win32') {
        choices.push(
          { name: 'Force Windows 11 (bypass TPM/CPU checks)', value: 'windows11' },
          { name: 'Force Windows 10 (if on older version)', value: 'windows10' },
        );
      } else if (current.platform === 'darwin') {
        choices.push(
          { name: 'Force newer macOS via OCLP', value: 'macos' },
        );
      } else if (current.platform === 'linux') {
        choices.push(
          { name: 'Upgrade to latest distro version', value: 'linux' },
        );
      }

      // Android detection (via ADB)
      choices.push(
        { name: 'Flash Android ROM (requires USB connection)', value: 'android' },
      );

      if (choices.length === 0) {
        console.log('  ❌ No upgrade options available for this platform.');
        return;
      }

      const { targetOS } = await inquirer.prompt([{
        type: 'list',
        name: 'targetOS',
        message: 'What do you want to upgrade to?',
        choices,
      }]);

      options.os = targetOS;
    }

    console.log(`\n  🎯 Target: ${options.os}\n`);

    // Execute upgrade based on target
    let result;
    switch (options.os) {
      case 'windows11':
        result = await manager.upgradeWindows();
        break;

      case 'macos':
        result = await manager.upgradeMacOS();
        break;

      case 'android':
        const inquirer = require('inquirer');
        const { rom } = await inquirer.prompt([{
          type: 'list',
          name: 'rom',
          message: 'Select Android ROM:',
          choices: [
            { name: 'LineageOS (most popular, wide device support)', value: 'lineageos' },
            { name: '/e/OS (privacy-focused, de-Googled)', value: 'e-os' },
            { name: 'BlissOS (Android for PC)', value: 'blissos' },
            { name: 'Android-x86 (Android on x86 hardware)', value: 'android-x86' },
          ],
        }]);
        result = await manager.upgradeAndroid(rom);
        break;

      case 'linux':
        console.log('  🐧 Linux distro upgrade...');
        console.log('  ℹ️  For Linux, use your distro\'s built-in upgrade mechanism:');
        console.log('     • Ubuntu: sudo do-release-upgrade');
        console.log('     • Fedora: sudo dnf upgrade');
        console.log('     • Arch: sudo pacman -Syu');
        console.log('     • Mint: Update Manager → Upgrade to new version');
        result = { success: true, message: 'Linux upgrade instructions provided' };
        break;

      default:
        console.log(`  ❌ Unknown target: ${options.os}`);
        result = { success: false, reason: 'unknown_target' };
    }

    // Print result
    if (result?.success) {
      console.log('\n✅ Upgrade completed successfully!');
      if (result.backupPath) {
        console.log(`📁 Backup saved to: ${result.backupPath}`);
      }
    } else {
      console.log(`\n❌ Upgrade did not complete: ${result?.reason || result?.error}`);
    }

    return result;

  } catch (err) {
    spinner.fail(`Upgrade failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { upgradeOS };
