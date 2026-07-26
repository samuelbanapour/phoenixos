# PhoenixOS — Universal Hardware Revival Toolkit

## Context

Old hardware gets abandoned by manufacturers — Windows 11 refuses to install without TPM 2.0, macOS won't run on pre-2018 Macs, Android phones stop getting Play Store updates. The result: perfectly functional hardware becomes e-waste because the software ecosystem rejects it.

**PhoenixOS** is a unified tool that detects any hardware, recommends the best OS for it, creates bootable media with installer bypasses applied, and restores app store functionality — all while never touching the internal drive unless explicitly asked.

The tool runs as both a CLI (scriptable, works headless) and an Electron web UI (polished, visual). It covers PCs, Macs, Android phones/tablets, iOS devices, and game consoles.

**Core capability: force-upgrade** — in addition to bootable media and dual-boot, PhoenixOS can force-upgrade a device in-place. For example: force Windows 11 onto a PC that fails TPM/CPU checks, force a newer macOS onto an old Mac, or flash a newer Android ROM onto an abandoned phone. USB-only mode is the safe default; guided upgrade mode unlocks in-place writes with confirmation at every step.

## Tech Stack

- **Electron + React + Tailwind** (same stack as existing SideloadX project — proven in this workspace)
- **Node.js** backend for hardware detection, media creation, USB management
- **Shell scripts** (platform-specific hardware detection helpers)
- **SQLite** (via better-sqlite3) for OS database and device profiles

## Project Structure

```
PhoenixOS/
├── package.json
├── vite.config.js
├── src/
│   ├── cli/                          # Standalone CLI tool
│   │   ├── index.js                  # CLI entry point (commander.js)
│   │   ├── commands/
│   │   │   ├── detect.js             # `phoenix detect` — scan hardware
│   │   │   ├── recommend.js          # `phoenix recommend` — suggest OS
│   │   │   ├── create-media.js       # `phoenix create` — make bootable USB
│   │   │   ├── upgrade.js            # `phoenix upgrade` — force in-place OS upgrade
│   │   │   ├── restore-store.js      # `phoenix restore` — fix app stores
│   │   │   └── install.js            # `phoenix install` — guided install
│   │   └── utils/
│   │       ├── hardware.js           # Cross-platform hardware detection orchestrator
│   │       ├── usb.js                # USB drive detection, writing, verification
│   │       ├── download.js           # OS image downloading with checksums
│   │       ├── patch.js              # Installer bypass patching
│   │       ├── upgrade.js            # Force in-place OS upgrade logic
│   │       ├── appstore.js           # App store restoration logic
│   │       ├── safety.js             # Safety checks, confirmations, dry-run
│   │       └── platforms/            # Platform-specific detection scripts
│   │           ├── detect-windows.ps1
│   │           ├── detect-macos.sh
│   │           └── detect-linux.sh
│   ├── main/                         # Electron main process
│   │   ├── index.js
│   │   └── ipc-handlers.js           # Bridges CLI utils to renderer
│   ├── preload/
│   │   └── index.js
│   └── renderer/                     # Web UI
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx
│       ├── pages/
│       │   ├── HomePage.jsx          # Landing — detect or connect device
│       │   ├── DetectPage.jsx        # Hardware scan results
│       │   ├── RecommendPage.jsx     # OS recommendations with scoring
│       │   ├── MediaPage.jsx         # Bootable USB creation wizard
│       │   ├── UpgradePage.jsx       # Force in-place OS upgrade
│       │   ├── RestorePage.jsx       # App store restoration
│       │   └── InstallPage.jsx       # Guided installation (advanced)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── TitleBar.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   └── StatusBar.jsx
│       │   ├── hardware/
│       │   │   ├── HardwareCard.jsx  # Display detected hardware
│       │   │   └── CompatibilityBadge.jsx
│       │   ├── os/
│       │   │   ├── OSCard.jsx        # OS recommendation card
│       │   │   └── RequirementList.jsx
│       │   ├── media/
│       │   │   ├── USBSelector.jsx
│       │   │   └── ProgressRing.jsx
│       │   └── shared/
│       │       ├── StepIndicator.jsx
│       │       └── SafetyWarning.jsx
│       └── styles/
│           └── globals.css
├── data/
│   ├── os-database.json              # All supported OSes + requirements
│   ├── bypass-patches.json           # Installer bypass configurations
│   ├── app-stores.json               # App store restoration configs
│   └── device-profiles.json          # Known device compatibility profiles
└── scripts/
    ├── detect-windows.ps1            # PowerShell hardware detection
    ├── detect-macos.sh               # macOS system_profiler detection
    ├── detect-linux.sh               # Linux /proc + lspci detection
    ├── detect-android.sh             # ADB-based Android detection
    ├── upgrade/
    │   ├── windows-upgrade.ps1       # Windows in-place upgrade with bypasses
    │   ├── macos-upgrade.sh          # macOS OCLP-based upgrade
    │   ├── android-flash.sh          # Android ROM flash via fastboot/ADB
    │   └── linux-upgrade.sh          # Linux distro upgrade
    └── patches/
        ├── windows-tpm-bypass.reg    # Windows 11 TPM bypass registry
        ├── windows-cpu-bypass.reg    # Windows 11 CPU check bypass
        ├── windows-ram-bypass.reg    # Windows 11 RAM check bypass
        └── oclc-patcher.sh          # macOS OCLP integration
```

## Implementation Plan

### Phase 1: Project Setup & CLI Core
1. Create project structure with package.json (Electron + React + Tailwind)
2. Set up CLI entry point with commander.js
3. Build hardware detection module:
   - `hardware.js` — orchestrator that calls platform-specific scripts
   - `detect-windows.ps1` — Get-CimInstance for CPU, RAM, GPU, TPM, Secure Boot
   - `detect-macos.sh` — system_profiler + ioreg for all hardware
   - `detect-linux.sh` — /proc/cpuinfo, lspci, lsblk, dmidecode
4. Build safety module:
   - USB-only mode enforcement
   - Confirmation prompts
   - Dry-run support
   - Backup boot config before changes

### Phase 2: OS Database & Recommendation Engine
1. Create `os-database.json` with all supported operating systems:
   - **Windows**: 11, 10, LTSC, IoT
   - **macOS**: Sequoia → High Sierra (via OCLP)
   - **Linux**: Ubuntu, Fedora, Mint, Arch, ChromeOS Flex, SteamOS
   - **Android**: LineageOS, /e/OS, BlissOS, Android-x86
   - **iOS**: (detection + AltStore guidance)
   - **Game consoles**: Switch (Atmosphere), PS4 (GoldHEN), Xbox (dev mode)
2. Each entry includes: requirements, recommended hardware range, app store notes
3. Build recommendation engine:
   - Match detected hardware against OS requirements
   - Score by performance fit, app availability, user intent (gaming/productivity/minimal)
   - Return ranked list with compatibility badges

### Phase 3: Media Creation & Force Upgrade
1. USB drive detection (list removable drives, show size/model)
2. OS image downloading (official URLs, checksum verification)
3. Image writing:
   - Cross-platform USB writing (Node `child_process` calling dd/diskpart)
   - Ventoy support for multi-boot USBs
4. Bypass patch application:
   - Windows 11: Apply TPM/CPU/RAM bypass registry entries to installer
   - macOS: Prepare OCLP patches for old Mac hardware
   - Android: Configure Treble GSI for target device
5. **Force Upgrade** (`phoenix upgrade`):
   - **Windows**: Download Windows 11 ISO → extract → inject bypass registry keys into install.wim → run in-place upgrade setup.exe
   - **macOS**: Download OCLP → apply root patches → force update to newer macOS via patched installer
   - **Android**: ADB sideload / fastboot flash custom ROM (LineageOS, /e/OS) replacing stock OS
   - **Linux**: Distro upgrade via package manager or in-place migration script
   - All upgrades create a backup first, show confirmation, support dry-run

### Phase 4: App Store Restoration
1. **Windows**: Enable Microsoft Store, install Winget, configure store for LTSC
2. **macOS**: OCLP post-install patches, App Store login fixes, Gatekeeper adjustments
3. **Android**: MicroG installation guide, Aurora Store setup, F-Droid + Obtainium
4. **Linux**: Flatpak + Flathub auto-setup, Snap enablement, AppImage support
5. **iOS**: AltStore/Sideloadly guidance, certificate management

### Phase 5: Electron Web UI
1. Main process setup with IPC bridges to CLI utils
2. Pages:
   - **Home**: Big "Detect My Hardware" button, device connection status
   - **Detect**: Animated hardware scan, results in cards
   - **Recommend**: OS recommendations with compatibility scores, filter by use case
   - **Media**: USB selection, image download progress, write progress
   - **Restore**: App store restoration for detected/selected OS
   - **Install**: Guided installation wizard (advanced mode)
3. Shared components: StepIndicator, SafetyWarning, ProgressRing
4. Dark theme by default, Tailwind styling

### Phase 6: Android & Device Support
1. ADB-based Android device detection (model, Android version, Treble support)
2. LineageOS/GSI download links based on device
3. MicroG + Aurora Store automated setup instructions
4. iOS device detection via libimobiledevice
5. Game console detection and homebrew guidance

## Key Files to Create

| File | Purpose |
|---|---|
| `package.json` | Project config, Electron + React + Tailwind |
| `src/cli/index.js` | CLI entry point with all commands |
| `src/cli/utils/hardware.js` | Hardware detection orchestrator |
| `src/cli/utils/usb.js` | USB management |
| `src/cli/utils/upgrade.js` | Force in-place OS upgrade logic |
| `src/cli/utils/appstore.js` | App store restoration |
| `src/cli/utils/safety.js` | Safety & confirmation system |
| `src/main/index.js` | Electron main process |
| `src/renderer/App.jsx` | Main React app with routing |
| `data/os-database.json` | OS requirements database |
| `data/bypass-patches.json` | Bypass configurations |

## Safety Guarantees

1. **USB-only by default** — never writes to internal storage without explicit opt-in
2. **Confirmation at every step** — user must approve before any destructive action
3. **Dry-run mode** — preview all changes before applying
4. **Backup before changes** — saves boot configuration before modification
5. **No hidden writes** — every write operation is logged and displayed
6. **Checksum verification** — validates all downloaded images before writing

## Verification

1. Run `node src/cli/index.js detect` on the current Mac — should return hardware info
2. Run `node src/cli/index.js recommend` — should suggest compatible OSes
3. Run `npm run dev` — Electron app should launch with web UI
4. Connect a USB drive, run `node src/cli/index.js create` — should detect drive and offer to write
5. Test on Windows/Linux via VM or cross-platform CI
