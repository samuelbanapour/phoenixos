const { detectLocalHardware } = require('../utils/hardware');

/** Lazy ora — ESM-only in asar, load inside function not module scope */
function getOra() {
  try {
    return require('ora').default || require('ora');
  } catch {
    return () => ({ start: () => ({ succeed: () => {}, fail: () => {} }), succeed: () => {}, fail: () => {} });
  }
}

async function detectHardware(options) {
  const spinner = getOra()('🔍 Scanning hardware...').start();

  try {
    const hardware = await detectLocalHardware();
    spinner.succeed('Hardware detection complete!\n');

    if (options.output === 'json') {
      console.log(JSON.stringify(hardware, null, 2));
    } else if (options.output === 'table') {
      printTable(hardware);
    } else {
      printPretty(hardware);
    }

    if (options.file) {
      const fs = require('fs');
      fs.writeFileSync(options.file, JSON.stringify(hardware, null, 2));
      console.log(`\n📁 Results saved to: ${options.file}`);
    }

    return hardware;
  } catch (err) {
    spinner.fail(`Detection failed: ${err.message}`);
    process.exit(1);
  }
}

function printPretty(hw) {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          🔥 PhoenixOS Hardware Report            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Platform
  console.log(`  🖥️  Platform: ${hw.platform}`);
  console.log('');

  // CPU
  if (hw.cpu) {
    console.log('  🧠 CPU');
    console.log(`     Model:    ${hw.cpu.model}`);
    console.log(`     Vendor:   ${hw.cpu.vendor}`);
    console.log(`     Cores:    ${hw.cpu.cores}`);
    console.log(`     Speed:    ${hw.cpu.speedMHz} MHz`);
    console.log(`     Arch:     ${hw.cpu.architecture}`);
    if (hw.cpu.generation) {
      console.log(`     Gen:      ${hw.cpu.generation.brand || ''} ${hw.cpu.generation.series || ''} ${hw.cpu.generation.gen || hw.cpu.generation.model || ''}`);
    }
    console.log('');
  }

  // Memory
  if (hw.memory) {
    console.log('  💾 Memory');
    console.log(`     Total:    ${hw.memory.totalGB} GB`);
    console.log(`     Free:     ${hw.memory.freeGB} GB`);
    console.log('');
  }

  // Storage
  if (hw.storage && hw.storage.length > 0) {
    console.log('  💿 Storage');
    for (const disk of hw.storage) {
      if (disk.error) {
        console.log(`     Error: ${disk.error}`);
      } else {
        const removable = disk.removable ? ' [USB]' : '';
        console.log(`     ${disk.name}: ${disk.sizeGB} GB (${disk.type || 'disk'})${removable}`);
      }
    }
    console.log('');
  }

  // GPU
  if (hw.gpu && hw.gpu.length > 0) {
    console.log('  🎮 GPU');
    for (const gpu of hw.gpu) {
      console.log(`     ${gpu.name} (${gpu.type || 'unknown'})${gpu.vram ? ` - ${gpu.vram}` : ''}`);
    }
    console.log('');
  }

  // TPM
  if (hw.tpm) {
    console.log('  🔐 TPM');
    console.log(`     Present:  ${hw.tpm.present ? '✅ Yes' : '❌ No'}`);
    if (hw.tpm.version) console.log(`     Version:  ${hw.tpm.version}`);
    if (hw.tpm.manufacturer) console.log(`     Maker:    ${hw.tpm.manufacturer}`);
    console.log('');
  }

  // Secure Boot
  if (hw.secureBoot) {
    console.log('  🔒 Secure Boot');
    console.log(`     Enabled:  ${hw.secureBoot.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`     UEFI:     ${hw.secureBoot.uefi ? '✅ Yes' : '❌ No'}`);
    console.log('');
  }

  // Boot
  if (hw.boot) {
    console.log('  🚀 Boot');
    console.log(`     EFI:      ${hw.boot.efi ? '✅ Yes' : '❌ No'}`);
    console.log('');
  }

  // Battery
  if (hw.battery && hw.battery.present) {
    console.log('  🔋 Battery');
    console.log(`     Level:    ${hw.battery.level}%`);
    console.log(`     Charging: ${hw.battery.charging ? '✅ Yes' : '❌ No'}`);
    console.log('');
  }

  // Network
  if (hw.network && hw.network.length > 0) {
    console.log('  🌐 Network');
    for (const iface of hw.network.slice(0, 5)) {
      console.log(`     ${iface.name}: ${iface.address} (${iface.family})`);
    }
    console.log('');
  }

  // Compatibility summary
  console.log('  📋 Compatibility Summary');
  const issues = [];
  if (!hw.tpm?.present) issues.push('No TPM 2.0 (Windows 11 needs bypass)');
  if (hw.memory?.totalGB < 4) issues.push('Low RAM (< 4GB)');
  if (hw.cpu?.cores < 2) issues.push('Very few CPU cores');
  if (!hw.secureBoot?.enabled) issues.push('Secure Boot disabled');
  if (!hw.boot?.efi) issues.push('Legacy BIOS (not UEFI)');

  if (issues.length === 0) {
    console.log('     ✅ Hardware is well-supported by modern OSes');
  } else {
    for (const issue of issues) {
      console.log(`     ⚠️  ${issue}`);
    }
  }
}

function printTable(hw) {
  const rows = [];
  if (hw.cpu) rows.push(['CPU', hw.cpu.model, `${hw.cpu.cores} cores`]);
  if (hw.memory) rows.push(['RAM', `${hw.memory.totalGB} GB`, `${hw.memory.freeGB} GB free`]);
  if (hw.gpu) rows.push(['GPU', hw.gpu.map(g => g.name).join(', '), hw.gpu[0]?.type || '']);
  if (hw.tpm) rows.push(['TPM', hw.tpm.present ? 'Present' : 'Absent', hw.tpm.version || '']);
  if (hw.secureBoot) rows.push(['Secure Boot', hw.secureBoot.enabled ? 'On' : 'Off', hw.secureBoot.uefi ? 'UEFI' : 'BIOS']);

  console.log('Component'.padEnd(15) + 'Details'.padEnd(50) + 'Notes');
  console.log('─'.repeat(80));
  for (const [comp, details, notes] of rows) {
    console.log(comp.padEnd(15) + details.padEnd(50) + notes);
  }
}

module.exports = { detectHardware };
