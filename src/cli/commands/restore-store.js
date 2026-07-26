const { AppStoreManager } = require('../utils/appstore');
const ora = require('ora');

/**
 * Restore app store functionality on a system
 */
async function restoreStore(options) {
  const spinner = ora('🔍 Detecting target OS...').start();
  const manager = new AppStoreManager(options);

  try {
    let target = options.target;

    // Auto-detect if not specified
    if (!target || options.auto) {
      target = manager.detectCurrentOS();
      spinner.succeed(`Auto-detected OS: ${target}\n`);
    } else {
      spinner.succeed(`Target: ${target}\n`);
    }

    // Confirm
    const inquirer = require('inquirer');
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: `Restore app stores for ${target}?`,
      default: true,
    }]);

    if (!confirmed) {
      console.log('❌ Operation cancelled.');
      return;
    }

    // Run restoration
    const result = await manager.restore(target);

    // Print summary
    if (result?.success) {
      console.log('\n✅ App store restoration complete!');
    } else {
      console.log(`\n❌ Restoration did not complete: ${result?.reason}`);
    }

    return result;

  } catch (err) {
    spinner.fail(`Restoration failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { restoreStore };
