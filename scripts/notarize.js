/**
 * PhoenixOS — afterSign hook for electron-builder
 *
 * macOS: Apply ad-hoc signing (identity "-") to the .app bundle.
 *        This prevents macOS from treating the app as damaged when
 *        run on Apple Silicon, and is sufficient for testing/dev use.
 * Windows/Linux: No-op — Windows gets signed via Partner Center,
 *                Linux AppImages don't use code signing.
 *
 * Usage: Defined in package.json as "afterSign"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const { electronPlatformName, appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  if (electronPlatformName === 'darwin') {
    const appPath = path.join(appOutDir, `${appName}.app`);
    if (!fs.existsSync(appPath)) {
      console.log(`⚠️  macOS .app not found at ${appPath} — skipping ad-hoc sign`);
      return;
    }

    console.log(`\n🔏 Ad-hoc signing macOS .app: ${appPath}`);

    try {
      // Deep sign with ad-hoc identity ("-")
      execSync(
        `codesign --force --deep --sign - --preserve-metadata=entitlements,resource-rules "${appPath}"`,
        { stdio: 'inherit', timeout: 120000 }
      );
      console.log('✅ Ad-hoc signing complete\n');

      // Verify
      const verify = execSync(
        `codesign --verify --deep --strict "${appPath}" 2>&1`,
        { encoding: 'utf8' }
      );
      console.log(`   Verification: ${verify.trim() || 'passed'}`);

      // List signing status
      const status = execSync(
        `codesign -dvvv "${appPath}" 2>&1 | grep -E "Authority|Signed|Identifier"`,
        { encoding: 'utf8' }
      );
      console.log(`   ${status.split('\n').filter(l => l.trim()).join('\n   ')}`);
    } catch (err) {
      console.error(`⚠️  Ad-hoc signing failed: ${err.message}`);
      console.log('   The build will proceed unsigned (app may show as damaged on macOS)');
    }
  } else {
    console.log(`ℹ️  Skipping code signing for ${electronPlatformName}`);
  }
};
