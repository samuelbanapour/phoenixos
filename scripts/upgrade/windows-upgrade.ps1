#Requires -RunAsAdministrator
<#
.SYNOPSIS
    PhoenixOS - Windows In-Place Upgrade with Bypass Patches

.DESCRIPTION
    Performs an in-place upgrade of Windows (e.g., Windows 10 → Windows 11)
    while applying TPM/CPU/RAM bypass registry entries. The upgrade preserves
    files and applications while moving to the newer OS version.

.PARAMETER TargetVersion
    Target Windows version (default: "11")

.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER ISOPath
    Path to a pre-downloaded Windows ISO (optional — will download if not provided)

.EXAMPLE
    .\windows-upgrade.ps1 -TargetVersion "11" -DryRun
    .\windows-upgrade.ps1 -TargetVersion "11" -ISOPath "C:\Downloads\Win11.iso"
#>

param(
    [string]$TargetVersion = "11",
    [switch]$DryRun,
    [string]$ISOPath
)

$ErrorActionPreference = "Stop"
$LogFile = "$env:TEMP\phoenixos-upgrade-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $entry
    switch ($Level) {
        "ERROR" { Write-Host $entry -ForegroundColor Red }
        "WARN"  { Write-Host $entry -ForegroundColor Yellow }
        "OK"    { Write-Host $entry -ForegroundColor Green }
        default { Write-Host $entry }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PhoenixOS — Windows $TargetVersion Upgrade" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Safety Checks ---
Write-Log "Starting Windows $TargetVersion in-place upgrade"
Write-Log "Log file: $LogFile"

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Log "ERROR: This script requires Administrator privileges" "ERROR"
    exit 1
}
Write-Log "Admin privileges confirmed" "OK"

# Check current OS
$currentBuild = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuild
$currentVersion = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").DisplayVersion
Write-Log "Current OS build: $currentBuild (version $currentVersion)"

# Backup boot configuration
Write-Log "Backing up boot configuration..."
$backupDir = "$env:TEMP\phoenixos-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

try {
    bcdedit /export "$backupDir\bcd-backup.dat" | Out-Null
    Write-Log "Boot configuration backed up to $backupDir" "OK"
} catch {
    Write-Log "Warning: Could not backup boot config: $_" "WARN"
}

# Backup registry hives
try {
    reg export "HKLM\SYSTEM" "$backupDir\SYSTEM.reg" /y 2>$null
    reg export "HKLM\SOFTWARE" "$backupDir\SOFTWARE.reg" /y 2>$null
    Write-Log "Registry hives backed up" "OK"
} catch {
    Write-Log "Warning: Could not backup registry: $_" "WARN"
}

if ($DryRun) {
    Write-Log "DRY RUN MODE — no changes will be applied" "WARN"
    Write-Log ""
    Write-Log "Would apply the following bypass registry entries:"
    Write-Log "  HKLM\SYSTEM\Setup\LabConfig\BypassTPMCheck = 1"
    Write-Log "  HKLM\SYSTEM\Setup\LabConfig\BypassCPUCheck = 1"
    Write-Log "  HKLM\SYSTEM\Setup\LabConfig\BypassRAMCheck = 1"
    Write-Log "  HKLM\SYSTEM\Setup\LabConfig\BypassSecureBootCheck = 1"
    Write-Log ""
    Write-Log "Would download Windows $TargetVersion ISO and run in-place upgrade"
    Write-Log "DRY RUN complete — no changes made" "OK"
    exit 0
}

# --- Apply Bypass Registry Keys ---
Write-Log "Applying Windows $TargetVersion bypass registry entries..."

$labConfigPath = "HKLM:\SYSTEM\Setup\LabConfig"
if (-not (Test-Path $labConfigPath)) {
    New-Item -Path $labConfigPath -Force | Out-Null
}

$registryEntries = @{
    "BypassTPMCheck" = 1
    "BypassCPUCheck" = 1
    "BypassRAMCheck" = 1
    "BypassSecureBootCheck" = 1
    "BypassStorageCheck" = 1
}

foreach ($name in $registryEntries.Keys) {
    Set-ItemProperty -Path $labConfigPath -Name $name -Value $registryEntries[$name] -Type DWord
    Write-Log "  Set $name = $($registryEntries[$name])" "OK"
}

Write-Log "All bypass registry entries applied" "OK"

# --- Download Windows ISO ---
if (-not $ISOPath -or -not (Test-Path $ISOPath)) {
    Write-Log "No ISO provided — downloading Windows $TargetVersion ISO..."
    $downloadDir = "$env:TEMP\phoenixos-downloads"
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null

    if ($TargetVersion -eq "11") {
        $isoUrl = "https://software-static.download.prss.microsoft.com/sg/download/888969d5-f34g-4e03-ac9d-1f9786c66749/22631.2861.231205-1222.GE_RELEASE_SVC_PROD2_CLIENTCORE_OEMRET_A64FRE_EN-US.ISO"
    } else {
        Write-Log "ERROR: Automatic download only supported for Windows 11. Please provide -ISOPath." "ERROR"
        exit 1
    }

    $ISOPath = "$downloadDir\windows$TargetVersion.iso"
    Write-Log "Downloading to $ISOPath..."
    try {
        Invoke-WebRequest -Uri $isoUrl -OutFile $ISOPath -UseBasicParsing
        Write-Log "ISO downloaded successfully" "OK"
    } catch {
        Write-Log "ERROR: Download failed: $_" "ERROR"
        Write-Log "Please download manually and use -ISOPath parameter" "ERROR"
        exit 1
    }
}

# --- Mount ISO and Run Upgrade ---
Write-Log "Mounting ISO: $ISOPath"
$mountResult = Mount-DiskImage -ImagePath $ISOPath -PassThru
$driveLetter = ($mountResult | Get-Volume).DriveLetter + ":"
Write-Log "ISO mounted at $driveLetter" "OK"

Write-Log "Starting Windows $TargetVersion in-place upgrade..."
Write-Log "This may take 30-60 minutes. The system will restart multiple times."

try {
    # Run setup.exe with auto-upgrade parameters
    $setupArgs = @(
        "$driveLetter\setup.exe"
        "/auto", "upgrade"
        "/quiet"
        "/noreboot"
        "/compat", "ignorewarning"
    )

    Write-Log "Running: $($setupArgs -join ' ')"
    $process = Start-Process -FilePath $setupArgs[0] -ArgumentList $setupArgs[1..($setupArgs.Length-1)] -Wait -PassThru -NoNewWindow

    if ($process.ExitCode -eq 0) {
        Write-Log "Windows $TargetVersion upgrade completed successfully!" "OK"
        Write-Log "A restart will be required to complete the installation."
    } else {
        Write-Log "Setup exited with code $($process.ExitCode)" "WARN"
        Write-Log "Check $env:TEMP\setupact.log for details"
    }
} catch {
    Write-Log "ERROR: Upgrade failed: $_" "ERROR"
} finally {
    # Dismount ISO
    Dismount-DiskImage -ImagePath $ISOPath -ErrorAction SilentlyContinue | Out-Null
    Write-Log "ISO dismounted"
}

Write-Log ""
Write-Log "========================================" "OK"
Write-Log "Upgrade process complete!" "OK"
Write-Log "Log saved to: $LogFile"
Write-Log "Backup saved to: $backupDir"
Write-Log "========================================" "OK"
