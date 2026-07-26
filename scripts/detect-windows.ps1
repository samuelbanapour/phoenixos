# PhoenixOS — Windows Hardware Detection Script
# Uses PowerShell Get-CimInstance for comprehensive hardware info

$ErrorActionPreference = "SilentlyContinue"

# Create output object
$output = @{
    platform = "win32"
    timestamp = (Get-Date).ToString("o")
}

# CPU
$cpu = Get-CimInstance -ClassName Win32_Processor
$output.cpu = @{
    model = $cpu.Name
    vendor = $cpu.Manufacturer
    cores = $cpu.NumberOfCores
    threads = $cpu.NumberOfLogicalProcessors
    speedMHz = $cpu.MaxClockSpeed
    architecture = if ($cpu.Architecture -eq 9) { "x64" } elseif ($cpu.Architecture -eq 12) { "arm64" } else { "x86" }
}

# Memory
$mem = Get-CimInstance -ClassName Win32_ComputerSystem
$totalGB = [math]::Round($mem.TotalPhysicalMemory / 1GB, 2)
$output.memory = @{
    totalGB = $totalGB
    totalBytes = $mem.TotalPhysicalMemory
}

# GPU
$gpus = Get-CimInstance -ClassName Win32_VideoController
$output.gpus = @()
foreach ($gpu in $gpus) {
    $output.gpus += @{
        name = $gpu.Name
        vramMB = [math]::Round($gpu.AdapterRAM / 1MB)
        driver = $gpu.DriverVersion
        status = $gpu.Status
    }
}

# Storage
$disks = Get-CimInstance -ClassName Win32_DiskDrive
$output.disks = @()
foreach ($disk in $disks) {
    $output.disks += @{
        model = $disk.Model
        sizeGB = [math]::Round($disk.Size / 1GB, 2)
        interface = $disk.InterfaceType
        mediaType = $disk.MediaType
    }
}

# TPM
try {
    $tpm = Get-Tpm
    $output.tpm = @{
        present = $tpm.TpmPresent
        enabled = $tpm.TpmEnabled
        ready = $tpm.TpmReady
        version = if ($tpm.ManufacturerVersion) { $tpm.ManufacturerVersion } else { "unknown" }
        manufacturer = $tpm.ManufacturerId
    }
} catch {
    $output.tpm = @{ present = $false }
}

# Secure Boot
try {
    $sb = Confirm-SecureBootUEFI
    $output.secureBoot = @{
        enabled = $sb
        uefi = $true
    }
} catch {
    $output.secureBoot = @{
        enabled = $false
        uefi = $false
    }
}

# Windows version
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$output.os = @{
    name = $os.Caption
    version = $os.Version
    build = $os.BuildNumber
    architecture = $os.OSArchitecture
}

# Network
$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
$output.network = @()
foreach ($adapter in $adapters) {
    $output.network += @{
        name = $adapter.Name
        mac = $adapter.MacAddress
        speed = $adapter.LinkSpeed
    }
}

# Battery (for laptops)
$battery = Get-CimInstance -ClassName Win32_Battery
if ($battery) {
    $output.battery = @{
        present = $true
        level = $battery.EstimatedChargeRemaining
        charging = ($battery.BatteryStatus -eq 2)
    }
} else {
    $output.battery = @{ present = $false }
}

# Output as JSON
$output | ConvertTo-Json -Depth 5
