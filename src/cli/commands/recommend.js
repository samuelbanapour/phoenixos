const { detectLocalHardware } = require('../utils/hardware');
const path = require('path');
const fs = require('fs');

/**
 * Lazy ora import — needed because ora is ESM-only. At module scope it breaks
 * when the main process loads this file (for scoreOSMatch) inside the asar.
 */
function getOra() {
  try {
    return require('ora').default || require('ora');
  } catch {
    return () => ({ start: () => ({ succeed: () => {}, fail: () => {} }), succeed: () => {}, fail: () => {} });
  }
}

/**
 * Recommend the best OS for detected or specified hardware
 */
async function recommendOS(options) {
  const spinner = getOra()('🔍 Analyzing hardware and matching OSes...').start();

  try {
    // Load OS database
    const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'os-database.json');
    let osDB;
    try {
      osDB = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
      osDB = getDefaultOSDatabase();
    }

    // Get hardware info
    let hardware;
    if (options.hardware) {
      hardware = JSON.parse(options.hardware);
    } else {
      hardware = await detectLocalHardware();
    }

    spinner.succeed('Analysis complete!\n');

    // Score each OS against hardware
    const recommendations = scoreOSMatch(hardware, osDB, options.intent);

    // Print results
    printRecommendations(recommendations, hardware, options.intent);

    return recommendations;
  } catch (err) {
    spinner.fail(`Recommendation failed: ${err.message}`);
    process.exit(1);
  }
}

function scoreOSMatch(hardware, osDB, intent) {
  const results = [];

  for (const os of osDB.oses) {
    const notes = [];
    let totalScore = 0;
    let maxScore = 0;

    // === CPU Architecture ===
    maxScore += 20;
    const cpuArch = os.requirements?.cpu?.architecture;
    if (cpuArch) {
      const hwArch = hardware.cpu?.architecture || '';
      if (cpuArch === 'any' || cpuArch.includes('any')) {
        totalScore += 20;
      } else if (cpuArch.toLowerCase().includes(hwArch.toLowerCase()) ||
                 hwArch.toLowerCase().includes(cpuArch.toLowerCase().replace(' or ', '/').split('/')[0])) {
        totalScore += 20;
      } else {
        notes.push(`CPU architecture mismatch (${hwArch} vs ${cpuArch})`);
      }
    } else {
      totalScore += 18; // No arch requirement = almost always compatible
    }

    // === CPU Cores ===
    maxScore += 12;
    const minCores = os.requirements?.cpu?.minCores;
    if (minCores) {
      if (hardware.cpu?.cores >= minCores) {
        totalScore += 12;
      } else {
        notes.push(`Low CPU cores (${hardware.cpu?.cores} < ${minCores})`);
      }
    } else {
      totalScore += 10;
    }

    // === CPU Speed ===
    maxScore += 8;
    const minSpeed = os.requirements?.cpu?.minSpeedGHz;
    if (minSpeed) {
      const hwSpeed = (hardware.cpu?.speedMHz || 0) / 1000;
      if (hwSpeed >= minSpeed) {
        totalScore += 8;
      } else {
        notes.push(`CPU speed below minimum (${hwSpeed.toFixed(1)} GHz < ${minSpeed} GHz)`);
      }
    } else {
      totalScore += 6;
    }

    // === Memory ===
    maxScore += 20;
    const minRAM = os.requirements?.memory?.minGB;
    if (minRAM) {
      if (hardware.memory?.totalGB >= minRAM) {
        totalScore += 20;
      } else {
        notes.push(`Insufficient RAM (${hardware.memory?.totalGB} GB < ${minRAM} GB)`);
      }
    } else {
      totalScore += 15;
    }

    // === Storage ===
    maxScore += 12;
    const minStorage = os.requirements?.storage?.minGB;
    if (minStorage) {
      const totalStorage = hardware.storage?.reduce((sum, d) => sum + (d.sizeGB || 0), 0) || 0;
      if (totalStorage >= minStorage) {
        totalScore += 12;
      } else {
        notes.push(`Insufficient storage (${totalStorage} GB < ${minStorage} GB)`);
      }
    } else {
      totalScore += 10;
    }

    // === TPM ===
    maxScore += 10;
    const tpmRequired = os.requirements?.tpm?.required;
    if (tpmRequired) {
      if (hardware.tpm?.present) {
        totalScore += 10;
      } else if (os.bypassAvailable) {
        totalScore += 8;
        notes.push('⚡ TPM bypass available');
      } else {
        notes.push('TPM 2.0 required but not present');
      }
    } else {
      totalScore += 8;
    }

    // === Secure Boot ===
    maxScore += 8;
    const secureBootRequired = os.requirements?.secureBoot;
    if (secureBootRequired) {
      if (hardware.secureBoot?.enabled) {
        totalScore += 8;
      } else if (os.bypassAvailable) {
        totalScore += 6;
        notes.push('⚡ Secure Boot bypass available');
      } else {
        notes.push('Secure Boot required but disabled');
      }
    } else {
      totalScore += 6;
    }

    // === GPU ===
    maxScore += 5;
    const gpuRequired = os.requirements?.gpu;
    if (gpuRequired) {
      const hasGPU = hardware.gpu && hardware.gpu.length > 0 && hardware.gpu[0]?.name !== 'Integrated Graphics';
      if (hasGPU || gpuRequired === 'integrated-ok') {
        totalScore += 5;
      } else {
        notes.push('Dedicated GPU recommended');
      }
    } else {
      totalScore += 4;
    }

    // === Boot Mode ===
    maxScore += 5;
    const bootMode = os.requirements?.bootMode;
    if (bootMode) {
      if (bootMode.toLowerCase().includes('uefi')) {
        if (hardware.boot?.efi) {
          totalScore += 5;
        } else if (os.bypassAvailable) {
          totalScore += 3;
          notes.push('⚡ Boot mode bypass available');
        } else {
          notes.push('UEFI boot required but system uses legacy BIOS');
        }
      } else {
        totalScore += 5; // BIOS or UEFI = works either way
      }
    } else {
      totalScore += 4;
    }

    // Calculate percentage
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // === Intent-based scoring (multiply by intent weight) ===
    let intentMultiplier = 1.0;
    if (intent === 'gaming' && os.gamingScore != null) {
      intentMultiplier = os.gamingScore / 100;
    } else if (intent === 'productivity' && os.productivityScore != null) {
      intentMultiplier = os.productivityScore / 100;
    } else if (intent === 'minimal' && os.lightweightScore != null) {
      intentMultiplier = os.lightweightScore / 100;
    } else if (intent === 'server' && os.serverScore != null) {
      intentMultiplier = os.serverScore / 100;
    }

    const finalScore = Math.round(percentage * intentMultiplier);

    // Determine compatibility badge
    let compatibility = 'unknown';
    if (finalScore >= 85) compatibility = 'excellent';
    else if (finalScore >= 70) compatibility = 'good';
    else if (finalScore >= 50) compatibility = 'fair';
    else if (finalScore >= 30) compatibility = 'poor';
    else compatibility = 'incompatible';

    // Add the OS-level note (from database)
    if (os.notes) {
      notes.unshift(os.notes);
    }

    // Capitalize category for display (os-database.json uses lowercase)
    const categoryMap = {
      desktop: 'Desktop', mobile: 'Mobile', gaming: 'Gaming',
      server: 'Server', lightweight: 'Lightweight',
    };
    const displayCategory = categoryMap[os.category] || os.category;

    results.push({
      os: os.os || os.name,
      version: os.version,
      id: os.id,
      category: displayCategory,
      manufacturer: os.manufacturer,
      website: os.website,
      score: finalScore,
      maxScore: 100,
      compatibility,
      requirements: os.requirements,
      notes,
      bypassAvailable: os.bypassAvailable || false,
      bypassTypes: os.bypassTypes || [],
      appStore: os.appStore,
      appStoreNotes: os.appStoreNotes,
      gamingScore: os.gamingScore || null,
      productivityScore: os.productivityScore || null,
      lightweightScore: os.lightweightScore || null,
      serverScore: os.serverScore || null,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

function printRecommendations(recommendations, hardware, intent) {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       🔥 PhoenixOS OS Recommendations           ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`  Hardware: ${hardware.cpu?.model || 'Unknown'} | ${hardware.memory?.totalGB || '?'} GB RAM`);
  console.log(`  Intent:   ${intent || 'general'}`);
  console.log('');

  const badges = {
    excellent: '🟢',
    good: '🟡',
    fair: '🟠',
    poor: '🔴',
    incompatible: '❌',
  };

  for (const rec of recommendations) {
    const badge = badges[rec.compatibility];
    const bypass = rec.bypassAvailable ? ' ⚡ (bypass available)' : '';

    console.log(`  ${badge} ${rec.os} ${rec.version} — ${rec.score}/${rec.maxScore}${bypass}`);
    console.log(`     Category: ${rec.category}`);
    console.log(`     App Store: ${rec.appStore || 'None'}`);

    if (rec.notes.length > 0) {
      for (const note of rec.notes) {
        console.log(`     📝 ${note}`);
      }
    }
    console.log('');
  }

  // Top recommendation
  const top = recommendations[0];
  if (top) {
    console.log('  ─────────────────────────────────────────────');
    console.log(`  🏆 Best match: ${top.os} ${top.version} (${top.score}% compatible)`);
    if (top.bypassAvailable) {
      console.log('  ⚡ This OS can be force-installed with bypass patches');
    }
    console.log('');
  }
}

function getDefaultOSDatabase() {
  return {
    oses: [
      {
        name: 'Windows 11', version: '23H2', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 2 }, memory: { minGB: 4 }, storage: { minGB: 64 }, tpm: { required: true }, secureBoot: true, bootMode: 'UEFI' },
        bypassAvailable: true, appStore: 'Microsoft Store',
        gamingScore: 95, productivityScore: 90, lightweightScore: 30, serverScore: 20,
      },
      {
        name: 'Windows 10', version: '22H2', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 1 }, memory: { minGB: 2 }, storage: { minGB: 32 }, secureBoot: false, bootMode: 'BIOS or UEFI' },
        bypassAvailable: false, appStore: 'Microsoft Store',
        gamingScore: 90, productivityScore: 85, lightweightScore: 40, serverScore: 20,
      },
      {
        name: 'macOS Sequoia', version: '15.x', category: 'Desktop',
        requirements: { cpu: { architecture: 'ARM64 or x64', minCores: 2 }, memory: { minGB: 4 }, storage: { minGB: 25 }, bootMode: 'UEFI' },
        bypassAvailable: true, appStore: 'Mac App Store',
        gamingScore: 50, productivityScore: 90, lightweightScore: 50, serverScore: 30,
      },
      {
        name: 'Ubuntu', version: '24.04 LTS', category: 'Desktop',
        requirements: { cpu: { architecture: 'any', minCores: 1 }, memory: { minGB: 2 }, storage: { minGB: 25 }, bootMode: 'BIOS or UEFI' },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 70, productivityScore: 75, lightweightScore: 60, serverScore: 80,
      },
      {
        name: 'Linux Mint', version: '22', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 1 }, memory: { minGB: 2 }, storage: { minGB: 15 }, bootMode: 'BIOS or UEFI' },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 65, productivityScore: 80, lightweightScore: 75, serverScore: 40,
      },
      {
        name: 'ChromeOS Flex', version: 'Latest', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 1 }, memory: { minGB: 4 }, storage: { minGB: 16 }, bootMode: 'BIOS or UEFI' },
        bypassAvailable: false, appStore: 'Web Store + Android Apps',
        gamingScore: 30, productivityScore: 70, lightweightScore: 85, serverScore: 10,
      },
      {
        name: 'Fedora', version: '40', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 2 }, memory: { minGB: 4 }, storage: { minGB: 20 }, bootMode: 'UEFI preferred' },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 70, productivityScore: 80, lightweightScore: 55, serverScore: 75,
      },
      {
        name: 'Arch Linux', version: 'Rolling', category: 'Desktop',
        requirements: { cpu: { architecture: 'x64', minCores: 1 }, memory: { minGB: 1 }, storage: { minGB: 2 }, bootMode: 'BIOS or UEFI' },
        bypassAvailable: false, appStore: 'Flatpak + AUR',
        gamingScore: 75, productivityScore: 70, lightweightScore: 90, serverScore: 85,
      },
      {
        name: 'LineageOS', version: '21', category: 'Mobile',
        requirements: { cpu: { architecture: 'ARM64' }, memory: { minGB: 2 }, storage: { minGB: 8 }, bootMode: 'Unlocked bootloader' },
        bypassAvailable: true, appStore: 'Aurora Store + F-Droid',
        gamingScore: 40, productivityScore: 60, lightweightScore: 80, serverScore: 5,
      },
      {
        name: 'SteamOS', version: '3.x', category: 'Gaming',
        requirements: { cpu: { architecture: 'x64', minCores: 2 }, memory: { minGB: 8 }, storage: { minGB: 64 }, bootMode: 'UEFI' },
        bypassAvailable: true, appStore: 'Steam',
        gamingScore: 98, productivityScore: 20, lightweightScore: 30, serverScore: 5,
      },
    ],
  };
}

module.exports = { recommendOS, scoreOSMatch };
