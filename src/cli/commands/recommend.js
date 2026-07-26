const { detectLocalHardware } = require('../utils/hardware');
const path = require('path');
const fs = require('fs');
const ora = require('ora').default || require('ora');

/**
 * Recommend the best OS for detected or specified hardware
 */
async function recommendOS(options) {
  const spinner = ora('🔍 Analyzing hardware and matching OSes...').start();

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
    const score = {
      os: os.os || os.name,
      version: os.version,
      category: os.category,
      score: 0,
      maxScore: 100,
      compatibility: 'unknown',
      requirements: os.requirements,
      notes: [],
      bypassAvailable: os.bypassAvailable || false,
      appStore: os.appStore,
    };

    // CPU compatibility
    if (os.requirements.cpuArch) {
      if (hardware.cpu?.architecture === os.requirements.cpuArch ||
          os.requirements.cpuArch.includes(hardware.cpu?.architecture)) {
        score.score += 25;
      } else if (os.requirements.cpuArch === 'any') {
        score.score += 20;
      } else {
        score.notes.push(`CPU architecture mismatch (${hardware.cpu?.architecture} vs ${os.requirements.cpuArch})`);
      }
    } else {
      score.score += 20;
    }

    // CPU cores
    if (os.requirements.minCores) {
      if (hardware.cpu?.cores >= os.requirements.minCores) {
        score.score += 15;
      } else {
        score.notes.push(`Low CPU cores (${hardware.cpu?.cores} < ${os.requirements.minCores})`);
      }
    } else {
      score.score += 10;
    }

    // CPU generation (for Windows/macOS specific requirements)
    if (os.requirements.minCPUGen && hardware.cpu?.generation) {
      const gen = hardware.cpu.generation;
      if (gen.gen >= os.requirements.minCPUGen || gen.brand !== 'Intel') {
        score.score += 10;
      } else {
        score.notes.push(`CPU generation below minimum (gen ${gen.gen} < ${os.requirements.minCPUGen})`);
        if (os.bypassAvailable) {
          score.notes.push(`⚡ Bypass available — can force install`);
        }
      }
    } else {
      score.score += 10;
    }

    // Memory
    if (os.requirements.minRAM) {
      if (hardware.memory?.totalGB >= os.requirements.minRAM) {
        score.score += 20;
      } else {
        score.notes.push(`Insufficient RAM (${hardware.memory?.totalGB} GB < ${os.requirements.minRAM} GB)`);
      }
    } else {
      score.score += 15;
    }

    // Storage
    if (os.requirements.minStorage) {
      const totalStorage = hardware.storage?.reduce((sum, d) => sum + (d.sizeGB || 0), 0) || 0;
      if (totalStorage >= os.requirements.minStorage) {
        score.score += 10;
      } else {
        score.notes.push(`Insufficient storage (${totalStorage} GB < ${os.requirements.minStorage} GB)`);
      }
    } else {
      score.score += 10;
    }

    // TPM (for Windows 11)
    if (os.requirements.tpm2) {
      if (hardware.tpm?.present) {
        score.score += 10;
      } else if (os.bypassAvailable) {
        score.score += 8;
        score.notes.push('⚡ TPM bypass available');
      } else {
        score.notes.push('TPM 2.0 required but not present');
      }
    } else {
      score.score += 5;
    }

    // Secure Boot
    if (os.requirements.secureBoot) {
      if (hardware.secureBoot?.enabled) {
        score.score += 5;
      } else if (os.bypassAvailable) {
        score.score += 4;
        score.notes.push('⚡ Secure Boot bypass available');
      } else {
        score.notes.push('Secure Boot required but disabled');
      }
    } else {
      score.score += 3;
    }

    // GPU
    if (os.requirements.gpu) {
      const hasGPU = hardware.gpu && hardware.gpu.length > 0 && hardware.gpu[0]?.name !== 'Integrated Graphics';
      if (hasGPU || os.requirements.gpu === 'integrated-ok') {
        score.score += 5;
      } else {
        score.notes.push('Dedicated GPU recommended');
      }
    } else {
      score.score += 3;
    }

    // Intent-based scoring
    if (intent === 'gaming' && os.gamingScore) {
      score.score = Math.round(score.score * (os.gamingScore / 100));
    } else if (intent === 'productivity' && os.productivityScore) {
      score.score = Math.round(score.score * (os.productivityScore / 100));
    } else if (intent === 'minimal' && os.lightweightScore) {
      score.score = Math.round(score.score * (os.lightweightScore / 100));
    } else if (intent === 'server' && os.serverScore) {
      score.score = Math.round(score.score * (os.serverScore / 100));
    }

    // Determine compatibility badge
    if (score.score >= 85) score.compatibility = 'excellent';
    else if (score.score >= 70) score.compatibility = 'good';
    else if (score.score >= 50) score.compatibility = 'fair';
    else if (score.score >= 30) score.compatibility = 'poor';
    else score.compatibility = 'incompatible';

    results.push(score);
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
        requirements: { cpuArch: 'x64', minCores: 2, minRAM: 4, minStorage: 64, tpm2: true, secureBoot: true },
        bypassAvailable: true, appStore: 'Microsoft Store',
        gamingScore: 95, productivityScore: 90, lightweightScore: 30, serverScore: 20,
      },
      {
        name: 'Windows 10', version: '22H2', category: 'Desktop',
        requirements: { cpuArch: 'x64', minCores: 1, minRAM: 2, minStorage: 32 },
        bypassAvailable: false, appStore: 'Microsoft Store',
        gamingScore: 90, productivityScore: 85, lightweightScore: 40, serverScore: 20,
      },
      {
        name: 'macOS Sequoia', version: '15.x', category: 'Desktop',
        requirements: { cpuArch: ['x64', 'arm64'], minCores: 2, minRAM: 4, minStorage: 25 },
        bypassAvailable: true, appStore: 'Mac App Store',
        gamingScore: 50, productivityScore: 90, lightweightScore: 50, serverScore: 30,
      },
      {
        name: 'Ubuntu', version: '24.04 LTS', category: 'Desktop',
        requirements: { cpuArch: 'any', minCores: 1, minRAM: 2, minStorage: 25 },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 70, productivityScore: 75, lightweightScore: 60, serverScore: 80,
      },
      {
        name: 'Linux Mint', version: '22', category: 'Desktop',
        requirements: { cpuArch: 'x64', minCores: 1, minRAM: 2, minStorage: 15 },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 65, productivityScore: 80, lightweightScore: 75, serverScore: 40,
      },
      {
        name: 'ChromeOS Flex', version: 'Latest', category: 'Desktop',
        requirements: { cpuArch: 'x64', minCores: 1, minRAM: 4, minStorage: 16 },
        bypassAvailable: false, appStore: 'Web Store + Android Apps',
        gamingScore: 30, productivityScore: 70, lightweightScore: 85, serverScore: 10,
      },
      {
        name: 'Fedora', version: '40', category: 'Desktop',
        requirements: { cpuArch: 'x64', minCores: 2, minRAM: 4, minStorage: 20 },
        bypassAvailable: false, appStore: 'Flatpak + Flathub',
        gamingScore: 70, productivityScore: 80, lightweightScore: 55, serverScore: 75,
      },
      {
        name: 'Arch Linux', version: 'Rolling', category: 'Desktop',
        requirements: { cpuArch: 'x64', minCores: 1, minRAM: 1, minStorage: 10 },
        bypassAvailable: false, appStore: 'Flatpak + AUR',
        gamingScore: 75, productivityScore: 70, lightweightScore: 90, serverScore: 85,
      },
      {
        name: 'LineageOS', version: '21', category: 'Mobile',
        requirements: { cpuArch: ['arm64', 'arm'], minCores: 2, minRAM: 2, minStorage: 16 },
        bypassAvailable: true, appStore: 'Aurora Store + F-Droid',
        gamingScore: 40, productivityScore: 60, lightweightScore: 80, serverScore: 5,
      },
      {
        name: 'SteamOS', version: '3.x', category: 'Gaming',
        requirements: { cpuArch: 'x64', minCores: 2, minRAM: 8, minStorage: 64 },
        bypassAvailable: true, appStore: 'Steam',
        gamingScore: 98, productivityScore: 20, lightweightScore: 30, serverScore: 5,
      },
    ],
  };
}

module.exports = { recommendOS };
