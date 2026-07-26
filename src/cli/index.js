#!/usr/bin/env node

const { Command } = require('commander');
const { detectHardware } = require('./commands/detect');
const { recommendOS } = require('./commands/recommend');
const { createMedia } = require('./commands/create-media');
const { upgradeOS } = require('./commands/upgrade');
const { restoreStore } = require('./commands/restore-store');
const { guidedInstall } = require('./commands/install');

const program = new Command();

program
  .name('phoenix')
  .description('PhoenixOS — Universal Hardware Revival Toolkit')
  .version('1.0.0');

program
  .command('detect')
  .description('Detect hardware specifications of this machine or a connected device')
  .option('-o, --output <format>', 'Output format (json, table, pretty)', 'pretty')
  .option('-f, --file <path>', 'Save results to file')
  .option('--android', 'Detect connected Android device via ADB')
  .option('--ios', 'Detect connected iOS device via libimobiledevice')
  .action(detectHardware);

program
  .command('recommend')
  .description('Recommend the best OS for detected or specified hardware')
  .option('-i, --intent <type>', 'Primary use case (gaming, productivity, minimal, server, general)', 'general')
  .option('--hardware <json>', 'Hardware specs JSON (otherwise auto-detect)')
  .option('-o, --output <format>', 'Output format (json, table, pretty)', 'pretty')
  .action(recommendOS);

program
  .command('create')
  .description('Create bootable media with installer bypasses applied')
  .option('--os <name>', 'Operating system to create media for')
  .option('--version <ver>', 'Specific OS version')
  .option('--usb <device>', 'Target USB device (otherwise interactive selection)')
  .option('--ventoy', 'Use Ventoy for multi-boot USB')
  .option('--dry-run', 'Preview actions without writing')
  .action(createMedia);

program
  .command('upgrade')
  .description('Force in-place OS upgrade (Windows 11 bypass, macOS OCLP, Android flash)')
  .option('--os <name>', 'Target OS to upgrade to')
  .option('--target <platform>', 'Target platform (windows, macos, android, linux)')
  .option('--dry-run', 'Preview upgrade actions without applying')
  .option('--backup', 'Create backup before upgrading (default: true)')
  .action(upgradeOS);

program
  .command('restore')
  .description('Restore app store functionality on a system')
  .option('--target <os>', 'Target OS (windows, macos, linux, android, ios)')
  .option('--auto', 'Automatically detect and restore')
  .option('--dry-run', 'Preview actions without applying')
  .action(restoreStore);

program
  .command('install')
  .description('Guided installation with safety confirmations (advanced)')
  .option('--os <name>', 'Operating system to install')
  .option('--dual-boot', 'Set up alongside existing OS')
  .option('--dry-run', 'Preview actions without installing')
  .action(guidedInstall);

program.parse();
