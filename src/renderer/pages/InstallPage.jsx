import React, { useState } from "react";
import { Settings, Shield, HardDrive, Usb, ArrowUpCircle, Layers, Trash2, AlertTriangle } from "lucide-react";
import StepIndicator from "../components/shared/StepIndicator";
import SafetyWarning from "../components/shared/SafetyWarning";

const installOSes = [
  { id: "windows11", name: "Windows 11", icon: "🪟", desc: "With bypass patches" },
  { id: "windows10", name: "Windows 10", icon: "🪟", desc: "Classic" },
  { id: "ubuntu", name: "Ubuntu 24.04", icon: "🐧", desc: "LTS Desktop" },
  { id: "linuxmint", name: "Linux Mint 22", icon: "🌿", desc: "Beginner-friendly" },
  { id: "chromeos", name: "ChromeOS Flex", icon: "🌐", desc: "Lightweight" },
  { id: "macos", name: "macOS (OCLP)", icon: "🍎", desc: "For old Macs" },
  { id: "steamos", name: "SteamOS", icon: "🎮", desc: "Gaming" },
  { id: "android", name: "Android ROM", icon: "📱", desc: "LineageOS, /e/OS" },
];

const installModes = [
  {
    id: "usb",
    name: "USB Boot",
    icon: Usb,
    desc: "Run from USB without changing internal drive",
    safety: "safe",
    color: "text-green-400",
  },
  {
    id: "upgrade",
    name: "Force Upgrade",
    icon: ArrowUpCircle,
    desc: "Replace current OS with new version in-place",
    safety: "warning",
    color: "text-yellow-400",
  },
  {
    id: "dual",
    name: "Dual Boot",
    icon: Layers,
    desc: "Install alongside existing OS",
    safety: "info",
    color: "text-blue-400",
  },
  {
    id: "replace",
    name: "Full Replace",
    icon: Trash2,
    desc: "Erase everything and install fresh",
    safety: "danger",
    color: "text-red-400",
  },
];

const steps = ["Select OS", "Select Mode", "Review", "Install"];

export default function InstallPage() {
  const [selectedOS, setSelectedOS] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSelectOS = (os) => {
    setSelectedOS(os);
    setCurrentStep(1);
  };

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    setCurrentStep(2);
  };

  const handleStartInstall = () => {
    setCurrentStep(3);
    // In production, this would trigger the actual install
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-phoenix-500" />
          Guided Installation
        </h1>
        <p className="text-dark-400 mt-1">
          Advanced mode — step-by-step installation with safety checks
        </p>
      </div>

      {/* Step indicator */}
      <div className="glass rounded-xl p-4">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Step 1: Select OS */}
      {currentStep >= 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-dark-400" />
            Select Operating System
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {installOSes.map((os) => (
              <button
                key={os.id}
                onClick={() => handleSelectOS(os)}
                className={`glass rounded-xl p-4 text-left transition-all hover:bg-dark-800/50 ${
                  selectedOS?.id === os.id
                    ? "ring-2 ring-phoenix-500"
                    : ""
                }`}
              >
                <span className="text-2xl mb-2 block">{os.icon}</span>
                <p className="text-sm font-medium text-white">{os.name}</p>
                <p className="text-xs text-dark-400">{os.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Mode */}
      {currentStep >= 1 && selectedOS && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-dark-400" />
            Installation Mode
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {installModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode)}
                  className={`glass rounded-xl p-5 text-left transition-all hover:bg-dark-800/50 ${
                    selectedMode?.id === mode.id
                      ? "ring-2 ring-phoenix-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-dark-800 ${mode.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{mode.name}</p>
                      <p className="text-sm text-dark-400">{mode.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Review & Safety */}
      {currentStep >= 2 && selectedOS && selectedMode && (
        <div className="space-y-4">
          {/* Review summary */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3">Installation Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Target OS</span>
                <span className="text-white">{selectedOS.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Mode</span>
                <span className={selectedMode.color}>{selectedMode.name}</span>
              </div>
            </div>
          </div>

          {/* Safety warnings based on mode */}
          {selectedMode.safety === "danger" && (
            <SafetyWarning level="danger" title="DANGER: Full Replace">
              This will ERASE ALL DATA on your internal drive. All files, programs,
              and settings will be permanently lost. This action cannot be undone.
            </SafetyWarning>
          )}

          {selectedMode.safety === "warning" && (
            <SafetyWarning level="warning" title="In-Place Upgrade">
              This will upgrade your current OS in-place. Your files should be
              preserved, but creating a backup is strongly recommended.
            </SafetyWarning>
          )}

          {selectedMode.safety === "info" && (
            <SafetyWarning level="info" title="Dual Boot Setup">
              A new partition will be created for the second OS. You will be able
              to choose which OS to boot at startup using rEFInd or GRUB.
            </SafetyWarning>
          )}

          {selectedMode.safety === "safe" && (
            <SafetyWarning level="safe" title="USB Boot — Safe Mode">
              This is the safest option. The OS will run from the USB drive
              without making any changes to your internal storage.
            </SafetyWarning>
          )}

          {/* Start button */}
          <button
            onClick={handleStartInstall}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              selectedMode.safety === "danger"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gradient-to-r from-phoenix-600 to-phoenix-700 hover:from-phoenix-700 hover:to-phoenix-800 text-white"
            }`}
          >
            {selectedMode.safety === "danger" ? "🗑️ Erase & Install" : `🚀 Start ${selectedMode.name}`}
          </button>
        </div>
      )}

      {/* Step 4: In Progress */}
      {currentStep === 3 && (
        <div className="glass rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-phoenix-500/30 flex items-center justify-center">
            <Settings className="w-8 h-8 text-phoenix-500 animate-spin" />
          </div>
          <p className="text-white font-semibold mb-1">Installation in Progress...</p>
          <p className="text-sm text-dark-400">
            Follow the on-screen instructions to complete the installation.
          </p>
        </div>
      )}

      {/* Empty state */}
      {currentStep === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Settings className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-1">Select an operating system above</p>
          <p className="text-xs text-dark-500">Choose your target OS, then pick an installation mode</p>
        </div>
      )}
    </div>
  );
}
