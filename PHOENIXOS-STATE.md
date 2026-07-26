# PhoenixOS — Project State & Migration Guide

## Quick Migration
```bash
# Copy the entire project to your new disk
cp -R /Volumes/Claude/Claude\ Code\ AI\ made\ Games/PhoenixOS /Volumes/NewDisk/Path/To/PhoenixOS

# Then install dependencies
cd PhoenixOS && npm install
```

## Project Structure — July 25, 2026

```
PhoenixOS/
├── package.json                          # Electron + React + Tailwind + CLI
├── vite.config.js                        # Vite build config
├── tailwind.config.js                    # Tailwind with phoenix/orange theme
├── postcss.config.js
│
├── src/
│   ├── cli/
│   │   ├── index.js                      # CLI entry (commander.js — 6 commands)
│   │   ├── commands/
│   │   │   ├── detect.js                 # `phoenix detect` — hardware scan
│   │   │   ├── recommend.js              # `phoenix recommend` — OS matching
│   │   │   ├── create-media.js           # `phoenix create` — bootable USB
│   │   │   ├── upgrade.js                # `phoenix upgrade` — force in-place upgrade
│   │   │   ├── restore-store.js          # `phoenix restore` — app stores
│   │   │   └── install.js                # `phoenix install` — guided install
│   │   └── utils/
│   │       ├── hardware.js               # Cross-platform hardware detection
│   │       ├── safety.js                 # USB-only mode, confirmations, backups
│   │       ├── usb.js                    # USB drive detection & writing
│   │       ├── download.js               # OS image downloading + checksums
│   │       ├── patch.js                  # Windows/macOS/Android bypass patches
│   │       ├── upgrade.js                # In-place OS upgrade engine
│   │       └── appstore.js               # App store restoration logic
│   │
│   ├── main/
│   │   └── index.js                      # Electron main process + IPC handlers
│   │
│   ├── preload/
│   │   └── index.js                      # Context bridge (window.phoenix.*)
│   │
│   └── renderer/
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx                        # Router with 7 pages
│       ├── styles/
│       │   └── globals.css               # Tailwind + fire/glow/glass animations
│       ├── components/
│       │   ├── layout/
│       │   │   ├── TitleBar.jsx          # Frameless window controls
│       │   │   ├── Sidebar.jsx           # Nav with 7 routes
│       │   │   └── StatusBar.jsx         # Safety mode indicator
│       │   ├── hardware/
│       │   │   └── HardwareCard.jsx      # Hardware component display card
│       │   ├── os/
│       │   │   └── OSCard.jsx            # OS recommendation card
│       │   ├── media/
│       │   │   ├── USBSelector.jsx       # USB drive selector
│       │   │   └── ProgressRing.jsx      # SVG circular progress
│       │   └── shared/
│       │       ├── CompatibilityBadge.jsx # Compatibility level badge
│       │       ├── StepIndicator.jsx     # Step progress indicator
│       │       └── SafetyWarning.jsx     # Safety alert banners
│       └── pages/
│           ├── HomePage.jsx              # Hero + quick-start cards
│           ├── DetectPage.jsx            # Hardware scan + HardwareCard grid
│           ├── RecommendPage.jsx         # OS recommendations + OSCard list
│           ├── MediaPage.jsx             # Bootable USB creation wizard
│           ├── UpgradePage.jsx           # Force in-place OS upgrade
│           ├── RestorePage.jsx           # App store restoration
│           └── InstallPage.jsx           # Guided installation wizard
│
├── data/
│   ├── os-database.json                  # 16 OS entries with requirements
│   ├── bypass-patches.json               # Windows/macOS/Android bypass configs
│   ├── app-stores.json                   # App store restoration configs
│   └── device-profiles.json              # Known device compatibility profiles
│
└── scripts/
    ├── detect-macos.sh                   # system_profiler + sysctl
    ├── detect-linux.sh                   # /proc + lspci + lsblk
    ├── detect-windows.ps1                # PowerShell CIM queries
    ├── detect-android.sh                 # ADB-based device detection
    ├── patches/
    │   ├── windows-tpm-bypass.reg        # All bypasses (TPM/CPU/RAM/SecureBoot)
    │   ├── windows-cpu-bypass.reg        # CPU generation bypass only
    │   ├── windows-ram-bypass.reg        # RAM size bypass only
    │   └── oclc-patcher.sh              # macOS OCLP installer
    └── upgrade/
        ├── windows-upgrade.ps1           # Windows in-place upgrade with bypasses
        ├── macos-upgrade.sh              # macOS OCLP-based upgrade
        ├── android-flash.sh              # Android ROM flash via fastboot/ADB
        └── linux-upgrade.sh              # Linux distro upgrade
```

## What's Complete

- ✅ CLI entry point with all 6 commands (detect, recommend, create, upgrade, restore, install)
- ✅ Cross-platform hardware detection (macOS, Linux, Windows, Android)
- ✅ Safety module (USB-only mode, dry-run, backup, confirmation prompts)
- ✅ USB management (list, write, eject, format)
- ✅ Windows 11 bypass patches (registry + autounattend.xml generator)
- ✅ In-place upgrade engine (Windows 11 force, macOS OCLP, Android ROM flash, Linux distro)
- ✅ App store restoration (Windows Store, Mac App Store, Flatpak/Flathub, Android stores, iOS)
- ✅ Electron main process with IPC handlers
- ✅ Preload script (window.phoenix.* API)
- ✅ 7 React route pages with full implementations
- ✅ 7 shared UI components (HardwareCard, OSCard, USBSelector, ProgressRing, StepIndicator, SafetyWarning, CompatibilityBadge)
- ✅ Tailwind theme (phoenix orange/dark)
- ✅ CSS animations (fire glow, scan line, glass effect, pulse glow)
- ✅ Platform detection scripts (macOS, Linux, Windows, Android)
- ✅ Patch scripts (Windows TPM/CPU/RAM bypass, macOS OCLP)
- ✅ Upgrade scripts (Windows, macOS, Android, Linux)
- ✅ Data files (OS database, bypass patches, app stores, device profiles)
- ✅ npm dependencies installed

## Verification
1. `node src/cli/index.js --help` — should show all 6 commands
2. `node src/cli/index.js detect` — should print hardware info
3. `node src/cli/index.js recommend` — should score OSes against hardware
4. `npm run dev:web` — should start Vite dev server
5. `npm run dev` — should launch Electron app (requires npm install + Electron)

## To Pick Up After Migration
```bash
cd /NewDisk/PhoenixOS
npm install
node src/cli/index.js detect              # Test CLI works
npm run dev:web                            # Test web UI starts
```
