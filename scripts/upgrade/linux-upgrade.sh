#!/bin/bash
# PhoenixOS — Linux Distro Upgrade Script
# Detects the current Linux distribution and upgrades to the latest version
#
# Usage: ./linux-upgrade.sh [--dry-run]
# Example: ./linux-upgrade.sh --dry-run

set -e

DRY_RUN=false
LOG_FILE="/tmp/phoenixos-linux-upgrade-$(date +%Y%m%d-%H%M%S).log"

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

echo ""
echo "========================================"
echo "  PhoenixOS — Linux Distro Upgrade"
echo "========================================"
echo ""

# --- Detect distro ---
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$ID"
    elif [[ -f /etc/lsb-release ]]; then
        . /etc/lsb-release
        echo "$DISTRIB_ID" | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
}

detect_version() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$VERSION_ID"
    else
        echo "unknown"
    fi
}

detect_distro_name() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$NAME"
    else
        echo "Unknown Linux"
    fi
}

DISTRO=$(detect_distro)
VERSION=$(detect_version)
DISTRO_NAME=$(detect_distro_name)

# Hardware info
CPU_NAME=$(grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs || echo "Unknown")
TOTAL_RAM=$(free -h | awk '/Mem:/ {print $2}')
TOTAL_STORAGE=$(df -h / | tail -1 | awk '{print $2}')

log "INFO" "Distribution: $DISTRO_NAME ($DISTRO $VERSION)"
log "INFO" "CPU: $CPU_NAME"
log "INFO" "RAM: $TOTAL_RAM"
log "INFO" "Storage: $TOTAL_STORAGE"
log "INFO" "Kernel: $(uname -r)"

# --- Safety check ---
if [[ $EUID -ne 0 ]]; then
    log "ERROR" "This script must be run as root (use sudo)"
    exit 1
fi

if $DRY_RUN; then
    log "WARN" "DRY RUN — no changes will be applied"
    log "INFO" ""
fi

# --- Upgrade based on distro ---
case "$DISTRO" in
    ubuntu|linuxmint|pop)
        log "INFO" "Detected Debian-based distro: $DISTRO"
        log "INFO" ""

        if $DRY_RUN; then
            log "INFO" "Would run:"
            log "INFO" "  sudo apt update && sudo apt upgrade -y"
            log "INFO" "  sudo apt dist-upgrade -y"
            log "INFO" "  sudo do-release-upgrade (for Ubuntu)"
            log "INFO" ""
            log "INFO" "DRY RUN complete"
            exit 0
        fi

        # Update package lists
        log "INFO" "Step 1: Updating package lists..."
        apt update -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Package lists updated"

        # Upgrade installed packages
        log "INFO" "Step 2: Upgrading installed packages..."
        apt upgrade -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Packages upgraded"

        # Full distribution upgrade
        log "INFO" "Step 3: Running distribution upgrade..."
        apt dist-upgrade -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Distribution upgraded"

        # Try release upgrade (Ubuntu)
        if [[ "$DISTRO" == "ubuntu" ]]; then
            log "INFO" "Step 4: Checking for new release..."
            if command -v do-release-upgrade &>/dev/null; then
                log "INFO" "A new Ubuntu release may be available."
                log "INFO" "Run 'sudo do-release-upgrade' to upgrade to the next version."
                log "INFO" ""
                read -p "Run release upgrade now? (y/N): " DO_RELEASE
                if [[ "$DO_RELEASE" == "y" || "$DO_RELEASE" == "Y" ]]; then
                    do-release-upgrade -d 2>&1 | tee -a "$LOG_FILE"
                fi
            else
                log "INFO" "do-release-upgrade not found. Install with: apt install update-manager-core"
            fi
        fi
        ;;

    fedora)
        log "INFO" "Detected Fedora"
        log "INFO" ""

        if $DRY_RUN; then
            log "INFO" "Would run: sudo dnf upgrade --refresh -y"
            log "INFO" ""
            log "INFO" "DRY RUN complete"
            exit 0
        fi

        log "INFO" "Step 1: Upgrading all packages..."
        dnf upgrade --refresh -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Packages upgraded"

        log "INFO" "Step 2: Checking for new release..."
        dnf upgrade --releasever=latest -y 2>&1 | tee -a "$LOG_FILE" || true
        log "OK" "Fedora upgrade complete"
        ;;

    arch|manjaro)
        log "INFO" "Detected Arch-based distro: $DISTRO"
        log "INFO" ""

        if $DRY_RUN; then
            log "INFO" "Would run: sudo pacman -Syu"
            log "INFO" ""
            log "INFO" "DRY RUN complete"
            exit 0
        fi

        log "INFO" "Step 1: Full system upgrade..."
        pacman -Syu --noconfirm 2>&1 | tee -a "$LOG_FILE"
        log "OK" "System upgraded"
        ;;

    opensuse*|sles)
        log "INFO" "Detected openSUSE/SLES"
        log "INFO" ""

        if $DRY_RUN; then
            log "INFO" "Would run: sudo zypper refresh && sudo zypper update -y"
            log "INFO" ""
            log "INFO" "DRY RUN complete"
            exit 0
        fi

        log "INFO" "Step 1: Refreshing repositories..."
        zypper refresh 2>&1 | tee -a "$LOG_FILE"
        log "INFO" "Step 2: Updating packages..."
        zypper update -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Packages updated"
        ;;

    debian)
        log "INFO" "Detected Debian"
        log "INFO" ""

        if $DRY_RUN; then
            log "INFO" "Would run:"
            log "INFO" "  sudo apt update && sudo apt upgrade -y"
            log "INFO" "  sudo apt dist-upgrade -y"
            log "INFO" ""
            log "INFO" "DRY RUN complete"
            exit 0
        fi

        apt update -y 2>&1 | tee -a "$LOG_FILE"
        apt upgrade -y 2>&1 | tee -a "$LOG_FILE"
        apt dist-upgrade -y 2>&1 | tee -a "$LOG_FILE"
        log "OK" "Debian upgraded"
        ;;

    *)
        log "WARN" "Unsupported distribution: $DISTRO"
        log "INFO" "Supported: ubuntu, linuxmint, fedora, arch, manjaro, debian, opensuse"
        log "INFO" ""
        log "INFO" "Generic upgrade commands:"
        log "INFO" "  Debian/Ubuntu:  sudo apt update && sudo apt upgrade"
        log "INFO" "  Fedora:         sudo dnf upgrade"
        log "INFO" "  Arch:           sudo pacman -Syu"
        log "INFO" "  openSUSE:       sudo zypper update"
        exit 1
        ;;
esac

# --- Cleanup ---
log "INFO" "Cleaning up..."
case "$DISTRO" in
    ubuntu|linuxmint|pop|debian)
        apt autoremove -y 2>&1 | tee -a "$LOG_FILE"
        apt autoclean 2>&1 | tee -a "$LOG_FILE"
        ;;
    fedora)
        dnf autoremove -y 2>&1 | tee -a "$LOG_FILE"
        dnf clean all 2>&1 | tee -a "$LOG_FILE"
        ;;
esac

log "OK" "Cleanup complete"

log "INFO" ""
log "INFO" "========================================"
log "OK" "Linux upgrade complete!"
log "INFO" "========================================"
log "INFO" ""
log "INFO" "A reboot may be required to apply kernel updates."
log "INFO" "Log saved to: $LOG_FILE"
