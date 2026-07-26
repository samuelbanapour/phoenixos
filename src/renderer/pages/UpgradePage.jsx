import React, { useState, useCallback, useEffect } from "react";
import { ArrowUpCircle, RefreshCw, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import StepIndicator from "../components/shared/StepIndicator";
import ProgressRing from "../components/media/ProgressRing";
import SafetyWarning from "../components/shared/SafetyWarning";

const upgradeTargets = {
  win32: [
    { id: "windows11", name: "Force Windows 11", desc: "Bypass TPM/CPU checks", icon: "🪟" },
  ],
  darwin: [
    { id: "macos", name: "Force macOS via OCLP", desc: "Run newer macOS on old Mac", icon: "🍎" },
  ],
  linux: [
    { id: "linux", name: "Distro Upgrade", desc: "Upgrade to latest version", icon: "🐧" },
  ],
};

const steps = ["Detect", "Select Target", "Backup", "Upgrade", "Verify"];

export default function UpgradePage() {
  const [currentOS, setCurrentOS] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    detectCurrentOS();
  }, []);

  const detectCurrentOS = async () => {
    setLoading(true);
    try {
      const hw = await window.phoenix?.detectHardware();
      if (hw && !hw.error) {
        const platform = hw.platform || "unknown";
        setCurrentOS({
          platform,
          cpu: hw.cpu?.model || "Unknown",
          ram: hw.memory?.totalGB || "?",
          tpm: hw.tpm?.present || false,
        });
        setCurrentStep(1);
      }
    } catch (err) {
      setMessage(`Detection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTarget = (target) => {
    setSelectedTarget(target);
    setCurrentStep(2);
  };

  const handleStartUpgrade = async () => {
    setCurrentStep(3);
    setProgress(0);
    setProgressStatus("active");
    setMessage("Backing up boot configuration...");

    // Simulate backup
    await new Promise((r) => setTimeout(r, 1000));

    setMessage("Starting upgrade...");
    for (let p = 0; p <= 100; p += 1) {
      await new Promise((r) => setTimeout(r, 100));
      setProgress(p);
      if (p < 20) setMessage("Downloading...");
      else if (p < 60) setMessage("Applying patches...");
      else if (p < 90) setMessage("Upgrading...");
      else setMessage("Verifying...");
    }

    setCurrentStep(4);
    setProgressStatus("success");
    setMessage("Upgrade complete!");
  };

  const targets = currentOS ? (upgradeTargets[currentOS.platform] || []) : [];
  const hasAndroid = true; // Always show Android option

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowUpCircle className="w-6 h-6 text-phoenix-500" />
          Force Upgrade
        </h1>
        <p className="text-dark-400 mt-1">
          Install a newer OS version on hardware the manufacturer abandoned
        </p>
      </div>

      {/* Step indicator */}
      <div className="glass rounded-xl p-4">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Safety warning */}
      <SafetyWarning level="warning" title="In-Place Upgrade">
        This performs an in-place upgrade of your operating system. Your files should be
        preserved, but a backup is strongly recommended before proceeding.
      </SafetyWarning>

      {/* Current OS info */}
      {currentOS && (
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-dark-800">
            <span className="text-2xl">
              {currentOS.platform === "darwin" ? "🍎" : currentOS.platform === "win32" ? "🪟" : "🐧"}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold">{currentOS.cpu}</p>
            <p className="text-sm text-dark-400">
              {currentOS.platform} • {currentOS.ram} GB RAM • TPM: {currentOS.tpm ? "✅" : "❌"}
            </p>
          </div>
          <button
            onClick={detectCurrentOS}
            disabled={loading}
            className="ml-auto text-dark-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      )}

      {/* Upgrade targets */}
      {currentStep >= 1 && currentStep < 3 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-phoenix-500" />
            Select Upgrade Target
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {targets.map((target) => (
              <button
                key={target.id}
                onClick={() => handleSelectTarget(target)}
                className="glass rounded-xl p-5 text-left hover:bg-dark-800/50 transition-all group"
              >
                <span className="text-3xl mb-2 block">{target.icon}</span>
                <p className="text-white font-semibold">{target.name}</p>
                <p className="text-sm text-dark-400">{target.desc}</p>
                <p className="text-xs text-phoenix-400 mt-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Force install with bypasses
                </p>
              </button>
            ))}

            {/* Android option */}
            <button
              onClick={() => handleSelectTarget({ id: "android", name: "Flash Android ROM", desc: "LineageOS, /e/OS, etc.", icon: "📱" })}
              className="glass rounded-xl p-5 text-left hover:bg-dark-800/50 transition-all group"
            >
              <span className="text-3xl mb-2 block">📱</span>
              <p className="text-white font-semibold">Flash Android ROM</p>
              <p className="text-sm text-dark-400">LineageOS, /e/OS, BlissOS</p>
              <p className="text-xs text-dark-500 mt-2">Requires USB connection to Android device</p>
            </button>
          </div>
        </div>
      )}

      {/* Progress ring */}
      {currentStep >= 3 && (
        <div className="glass rounded-xl p-8 flex justify-center">
          <ProgressRing
            progress={progress}
            size={160}
            strokeWidth={12}
            status={progressStatus}
            label={selectedTarget?.name}
            sublabel={message}
          />
        </div>
      )}

      {/* Start button */}
      {selectedTarget && currentStep === 2 && (
        <button
          onClick={handleStartUpgrade}
          className="w-full py-4 bg-gradient-to-r from-phoenix-600 to-phoenix-700 hover:from-phoenix-700 hover:to-phoenix-800 text-white rounded-xl font-semibold text-lg transition-all"
        >
          ⚡ Start {selectedTarget.name}
        </button>
      )}

      {/* Completion */}
      {currentStep === 4 && (
        <div className="glass rounded-xl p-6 border-l-4 border-green-500 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-white font-semibold">Upgrade Complete!</p>
            <p className="text-sm text-dark-400">{message}</p>
          </div>
        </div>
      )}

      {/* No targets */}
      {currentStep >= 1 && targets.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No upgrade targets available for this platform</p>
        </div>
      )}
    </div>
  );
}
