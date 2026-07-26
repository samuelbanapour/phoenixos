const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * OS image downloader with checksum verification
 */
class DownloadManager {
  constructor() {
    this.downloadDir = path.join(os.homedir(), '.phoenixos', 'downloads');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    fs.mkdirSync(this.downloadDir, { recursive: true });
  }

  /**
   * Download a file with progress tracking
   */
  async download(url, filename, options = {}) {
    const { expectedChecksum, onProgress } = options;
    const outputPath = path.join(this.downloadDir, filename);

    console.log(`  📥 Downloading: ${filename}`);
    console.log(`     URL: ${url}`);
    console.log(`     Destination: ${outputPath}`);

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(url, { headers: { 'User-Agent': 'PhoenixOS/1.0' } }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`     Redirecting to: ${response.headers.location}`);
          return this.download(response.headers.location, filename, options).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;

        const fileStream = fs.createWriteStream(outputPath);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (onProgress) {
            const progress = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : null;
            onProgress({ downloadedBytes, totalBytes, progress });
          }
          if (totalBytes) {
            const pct = Math.round((downloadedBytes / totalBytes) * 100);
            process.stdout.write(`\r     Progress: ${pct}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          console.log('\n     ✓ Download complete');
          resolve(outputPath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
      });

      request.on('error', reject);
      request.setTimeout(300000, () => {
        request.destroy();
        reject(new Error('Download timed out'));
      });
    });
  }

  /**
   * Verify file checksum
   */
  async verifyChecksum(filePath, expectedChecksum, algorithm = 'sha256') {
    console.log(`  🔐 Verifying checksum (${algorithm})...`);

    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const actual = hash.digest('hex');
        const match = actual.toLowerCase() === expectedChecksum.toLowerCase();
        if (match) {
          console.log(`     ✓ Checksum verified: ${actual.substring(0, 16)}...`);
        } else {
          console.log(`     ❌ Checksum mismatch!`);
          console.log(`        Expected: ${expectedChecksum}`);
          console.log(`        Actual:   ${actual}`);
        }
        resolve(match);
      });
      stream.on('error', reject);
    });
  }

  /**
   * Get available OS downloads
   */
  getAvailableDownloads() {
    return {
      windows11: {
        name: 'Windows 11 23H2',
        url: 'https://www.microsoft.com/software-download/windows11',
        size: '~5.2 GB',
        checksum: null, // Must be obtained after download
        notes: 'Download the ISO manually. Bypass patches will be applied automatically.',
      },
      windows10: {
        name: 'Windows 10 22H2',
        url: 'https://www.microsoft.com/software-download/windows10',
        size: '~5.7 GB',
        checksum: null,
      },
      ubuntu2404: {
        name: 'Ubuntu 24.04 LTS',
        url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso',
        size: '~4.7 GB',
        checksum: null,
      },
      linuxmint22: {
        name: 'Linux Mint 22',
        url: 'https://linuxmint.com/download.php',
        size: '~2.1 GB',
        checksum: null,
      },
      chromeosflex: {
        name: 'ChromeOS Flex',
        url: 'https://chromeos.google/products/chromeosflex/',
        size: '~1.5 GB',
        notes: 'Use Chromebook Recovery Utility or create from website.',
      },
      steamos: {
        name: 'SteamOS 3.x',
        url: 'https://store.steampowered.com/steamos/',
        size: '~2.8 GB',
        notes: 'Download the recovery image for Steam Deck or custom install.',
      },
      archlinux: {
        name: 'Arch Linux',
        url: 'https://archlinux.org/download/',
        size: '~800 MB',
        checksum: null,
      },
      lineageos: {
        name: 'LineageOS 21',
        url: 'https://download.lineageos.org/',
        size: '~1.2 GB',
        notes: 'Select your device model for the correct build.',
      },
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = { DownloadManager, formatBytes };
