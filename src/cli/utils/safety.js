const fs = require('fs');
const path = require('path');
const os = require('os');

const SAFETY_CONFIG = {
  // Never write to these paths without explicit confirmation
  protectedPaths: [
    '/dev/disk',      // macOS disk devices
    '/dev/sd',        // Linux disk devices
    '\\\\.\\PHYSICALDRIVE', // Windows physical drives
  ],
  // Backup directory for boot configs
  backupDir: path.join(os.homedir(), '.phoenixos', 'backups'),
  // Safety modes
  modes: {
    USB_ONLY: 'usb-only',
    GUIDED: 'guided',
    DRY_RUN: 'dry-run',
  },
};

class SafetyManager {
  constructor(mode = SAFETY_CONFIG.modes.USB_ONLY) {
    this.mode = mode;
    this.dryRun = mode === SAFETY_CONFIG.modes.DRY_RUN;
    this.log = [];
    this.backupDir = SAFETY_CONFIG.backupDir;
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Check if a target path is a USB device
   */
  isUSBDevice(targetPath) {
    // macOS: /dev/disk* where disk# > internal disk
    // Linux: /dev/sd* where it's removable
    // Windows: Drive letters for removable media
    const normalized = targetPath.toLowerCase();

    // macOS USB patterns
    if (normalized.match(/^\/dev\/disk[2-9]/) || normalized.match(/^\/dev\/rdisk[2-9]/)) {
      return true;
    }

    // Linux USB patterns (need to check removable flag)
    if (normalized.match(/^\/dev\/sd[b-z]/)) {
      return true;
    }

    return false;
  }

  /**
   * Validate that a write target is safe
   */
  async validateTarget(targetPath, options = {}) {
    const { allowInternal = false, requireConfirmation = true } = options;

    // Always block protected paths
    if (SAFETY_CONFIG.protectedPaths.some(p => targetPath.includes(p))) {
      if (this.mode !== SAFETY_CONFIG.modes.GUIDED || !allowInternal) {
        throw new Error(
          `SAFETY BLOCK: "${targetPath}" is a protected system device. ` +
          `Use --dual-boot mode with explicit confirmation to modify internal drives.`
        );
      }
    }

    // In USB-only mode, only allow USB devices
    if (this.mode === SAFETY_CONFIG.modes.USB_ONLY && !this.isUSBDevice(targetPath)) {
      throw new Error(
        `SAFETY BLOCK: USB-only mode active. "${targetPath}" is not a USB device. ` +
        `Switch to guided mode to modify internal drives.`
      );
    }

    // Log the operation
    this.log.push({
      timestamp: new Date().toISOString(),
      action: 'validate_target',
      target: targetPath,
      allowed: true,
      mode: this.mode,
    });

    return true;
  }

  /**
   * Create a backup of boot configuration before making changes
   */
  async backupBootConfig(deviceName = 'unknown') {
    await this.ensureBackupDir();

    const timestamp = Date.now();
    const backupPath = path.join(this.backupDir, `bootconfig-${deviceName}-${timestamp}`);
    fs.mkdirSync(backupPath, { recursive: true });

    const platform = os.platform();
    const backupData = {
      timestamp: new Date().toISOString(),
      device: deviceName,
      platform,
      bootConfig: null,
    };

    try {
      if (platform === 'darwin') {
        // Backup macOS boot config
        const { execSync } = require('child_process');
        backupData.bootConfig = {
          startupDisk: execSync('bless --info', { encoding: 'utf8' }).trim(),
          nvram: execSync('nvram -p', { encoding: 'utf8' }).trim(),
        };
      } else if (platform === 'linux') {
        // Backup GRUB config
        const grubPath = '/boot/grub/grub.cfg';
        if (fs.existsSync(grubPath)) {
          backupData.bootConfig = {
            grub: fs.readFileSync(grubPath, 'utf8'),
            efiboot: require('child_process').execSync('efibootmgr -v', { encoding: 'utf8' }).trim(),
          };
        }
      } else if (platform === 'win32') {
        // Backup Windows boot config
        const { execSync } = require('child_process');
        backupData.bootConfig = {
          bcd: execSync('bcdedit /enum all', { encoding: 'utf8' }).trim(),
        };
      }
    } catch (err) {
      backupData.bootConfigError = err.message;
    }

    fs.writeFileSync(
      path.join(backupPath, 'backup.json'),
      JSON.stringify(backupData, null, 2)
    );

    this.log.push({
      timestamp: new Date().toISOString(),
      action: 'backup_boot_config',
      path: backupPath,
      device: deviceName,
    });

    return backupPath;
  }

  /**
   * Preview what an operation would do (dry-run mode)
   */
  previewOperation(operation) {
    const preview = {
      ...operation,
      dryRun: true,
      wouldExecute: true,
    };

    console.log('\n🔍 DRY RUN — The following operations would be performed:\n');
    console.log(`  Action: ${operation.type}`);
    console.log(`  Target: ${operation.target}`);
    if (operation.details) {
      console.log(`  Details: ${operation.details}`);
    }
    console.log('\n  No changes have been made.\n');

    this.log.push({
      timestamp: new Date().toISOString(),
      action: 'dry_run_preview',
      operation,
    });

    return preview;
  }

  /**
   * Request user confirmation before a destructive operation
   */
  async requestConfirmation(message, options = {}) {
    const { defaultValue = false } = options;

    // In dry-run mode, always return false (don't actually do anything)
    if (this.dryRun) {
      console.log(`\n🔒 Dry-run mode: Skipping "${message}"`);
      return false;
    }

    // Use inquirer for interactive prompts
    try {
      const inquirer = require('inquirer');
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message,
          default: defaultValue,
        },
      ]);
      return confirmed;
    } catch {
      // Fallback for non-interactive environments
      console.log(`\n⚠️  Non-interactive mode: Assuming NO for "${message}"`);
      return false;
    }
  }

  /**
   * Get the full safety log
   */
  getLog() {
    return this.log;
  }

  /**
   * Export safety log to file
   */
  async exportLog(filePath) {
    await this.ensureBackupDir();
    const exportPath = filePath || path.join(this.backupDir, `safety-log-${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(this.log, null, 2));
    return exportPath;
  }
}

module.exports = { SafetyManager, SAFETY_CONFIG };
