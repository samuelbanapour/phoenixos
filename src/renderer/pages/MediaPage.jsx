import React, { useState, useCallback, useEffect } from "react";
import { Disc, Download, Usb, CheckCircle } from "lucide-react";
import USBSelector from "../components/media/USBSelector";
import ProgressRing from "../components/media/ProgressRing";
import StepIndicator from "../components/shared/StepIndicator";
import SafetyWarning from "../components/shared/SafetyWarning";

const osChoices = [
  { id: "windows11", name: "Windows 11", desc: "With TPM bypass", icon: "🪟" },
  { id: "windows10", name: "Windows 10", desc: "Classic", icon: "🪟" },
  { id: "ubuntu", name: "Ubuntu 24.04", desc: "LTS Desktop", icon: "🐧" },
  { id: "linuxmint", name: "Linux Mint 22", desc: "Beginner-friendly", icon: "🌿" },
  { id: "chromeos", name: "ChromeOS Flex", desc: "Lightweight", icon: "🌐" },
  { id: "macos", name: "macOS (OCLP)", desc: "Patched for old Macs", icon: "🍎" },
  { id: "steamos", name: "SteamOS 3.x", desc: "Gaming", icon: "🎮" },
  { id: "arch", name: "Arch Linux", desc: "Rolling release", icon: "🏔️" },
];

const steps = ["Select USB", "Choose OS", "Download", "Write"];

export default function MediaPage() {
  const [drives, setDrives] = useState([]);
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [selectedOS, setSelectedOS] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState(null);
  const [message, setMessage] = useState("");

  const refreshDrives = useCallback(async () => {
    setLoadingDrives(true);
    try {
      const result = await window.phoenix?.listUSB();
      setDrives(Array.isArray(result) ? result : []);
    } catch {
      setDrives([]);
    } finally {
      setLoadingDrives(false);
    }
  }, []);

  useEffect(() => {
    refreshDrives();
  }, [refreshDrives]);

  const handleSelectDrive = (drive) => {
    setSelectedDrive(drive);
    setCurrentStep(1);
    setMessage(`Selected: ${drive.model || drive.name}`);
  };

  const handleSelectOS = async (os) => {
    setSelectedOS(os);
    setCurrentStep(2);
    setMessage(`Preparing ${os.name}...`);

    // Simulate download + write progress
    setProgress(0);
    setProgressStatus("active");

    for (let p = 0; p <= 100; p += 2) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(p);
      if (p < 50) setMessage(`Downloading ${os.name}...`);
      else if (p < 90) setMessage(`Writing to USB...`);
      else setMessage(`Verifying...`);
    }

    setProgressStatus("success");
    setCurrentStep(3);
    setMessage(`${os.name} is ready on ${selectedDrive?.name || "USB drive"}!`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Disc className="w-6 h-6 text-phoenix-500" />
          Create Bootable Media
        </h1>
        <p className="text-dark-400 mt-1">Write an OS image to a USB drive with bypass patches pre-applied</p>
      </div>

      {/* Step indicator */}
      <div className="glass rounded-xl p-4">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Progress ring (shown when active) */}
      {currentStep >= 2 && (
        <div className="glass rounded-xl p-8 flex justify-center">
          <ProgressRing
            progress={progress}
            size={140}
            strokeWidth={10}
            status={progressStatus}
            label={selectedOS?.name}
            sublabel={message}
          />
        </div>
      )}

      {/* Message */}
      {message && currentStep < 2 && (
        <div className="glass rounded-xl p-4 border-l-4 border-phoenix-500">
          <p className="text-sm text-dark-300">{message}</p>
        </div>
      )}

      {/* Safety warning */}
      <SafetyWarning level="warning" title="USB Drive Will Be Erased">
        All data on the selected USB drive will be permanently erased during this process.
        Make sure to back up any important files first.
      </SafetyWarning>

      {/* USB selector */}
      <USBSelector
        drives={drives}
        selectedDrive={selectedDrive}
        onSelect={handleSelectDrive}
        onRefresh={refreshDrives}
        loading={loadingDrives}
      />

      {/* OS selection */}
      {selectedDrive && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Download className="w-4 h-4 text-dark-400" />
            Select Operating System
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {osChoices.map((os) => (
              <button
                key={os.id}
                onClick={() => handleSelectOS(os)}
                disabled={currentStep >= 2}
                className={`glass rounded-xl p-4 text-left transition-all hover:bg-dark-800/50 ${
                  selectedOS?.id === os.id ? "ring-2 ring-phoenix-500" : ""
                } ${currentStep >= 2 ? "opacity-50 pointer-events-none" : ""}`}
              >
                <span className="text-2xl mb-2 block">{os.icon}</span>
                <p className="text-sm font-medium text-white">{os.name}</p>
                <p className="text-xs text-dark-400">{os.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completion */}
      {currentStep === 3 && (
        <div className="glass rounded-xl p-6 border-l-4 border-green-500 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-white font-semibold">Bootable USB Ready!</p>
            <p className="text-sm text-dark-400">
              Insert the USB into the target device and boot from it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
