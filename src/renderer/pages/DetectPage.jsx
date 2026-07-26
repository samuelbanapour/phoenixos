import React, { useState, useCallback } from "react";
import { Cpu, HardDrive, Zap, RefreshCw, Download, Shield, AlertTriangle } from "lucide-react";
import HardwareCard from "../components/hardware/HardwareCard";
import SafetyWarning from "../components/shared/SafetyWarning";

const sectionOrder = ["cpu", "memory", "gpu", "storage", "tpm", "secureBoot", "boot", "battery", "network", "display"];

const sectionLabels = {
  cpu: "CPU",
  memory: "Memory",
  gpu: "GPU",
  storage: "Storage",
  tpm: "TPM",
  secureBoot: "Secure Boot",
  boot: "Boot",
  battery: "Battery",
  network: "Network",
  display: "Display",
};

export default function DetectPage() {
  const [hardware, setHardware] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDetection = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHardware(null);

    try {
      const result = await window.phoenix?.detectHardware();
      if (result?.error) {
        setError(result.error);
      } else {
        setHardware(result);
      }
    } catch (err) {
      setError(err.message || "Detection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const issues = [];
  if (hardware) {
    if (!hardware.tpm?.present) issues.push("No TPM 2.0 detected (Windows 11 needs bypass)");
    if (hardware.memory?.totalGB < 4) issues.push("Low RAM (< 4 GB) — may limit OS options");
    if (hardware.cpu?.cores < 2) issues.push("Very few CPU cores — performance may be limited");
    if (!hardware.secureBoot?.enabled) issues.push("Secure Boot is disabled");
    if (!hardware.boot?.efi) issues.push("Legacy BIOS detected (not UEFI)");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-phoenix-500" />
            Hardware Detection
          </h1>
          <p className="text-dark-400 mt-1">Scan this machine to identify all hardware components</p>
        </div>
        <button
          onClick={runDetection}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-phoenix-600 hover:bg-phoenix-700 disabled:bg-dark-700 text-white rounded-xl font-medium transition-colors"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {loading ? "Scanning..." : hardware ? "Re-Scan" : "Detect Hardware"}
        </button>
      </div>

      {/* Scan animation */}
      {loading && (
        <div className="glass rounded-xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-phoenix-500/5 to-transparent" />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-phoenix-500/30 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-phoenix-500 animate-pulse" />
            </div>
            <p className="text-white font-semibold mb-1">Scanning Hardware...</p>
            <p className="text-dark-400 text-sm">Detecting CPU, RAM, GPU, storage, and more</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <SafetyWarning level="danger" title="Detection Error" message={error} />
      )}

      {/* Results */}
      {hardware && !loading && (
        <>
          {/* Platform badge */}
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-phoenix-500/10">
              <Cpu className="w-5 h-5 text-phoenix-500" />
            </div>
            <div>
              <p className="text-white font-medium">
                {hardware.cpu?.model || "Unknown CPU"}
              </p>
              <p className="text-sm text-dark-400">
                {hardware.platform} • {hardware.cpu?.architecture} • {hardware.cpu?.cores} cores • {hardware.memory?.totalGB} GB RAM
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(hardware, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "phoenixos-hardware.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="ml-auto flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>

          {/* Hardware cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionOrder.map((key) => {
              const data = hardware[key];
              if (!data) return null;
              if (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) return null;
              if (Array.isArray(data) && data.length === 0) return null;
              return (
                <HardwareCard
                  key={key}
                  type={key}
                  title={sectionLabels[key]}
                  data={data}
                />
              );
            })}
          </div>

          {/* Connected devices (iPads, iPhones, Android via USB) */}
          {hardware.connectedDevices && hardware.connectedDevices.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-phoenix-500" />
                Connected Devices ({hardware.connectedDevices.length})
              </h3>
              <div className="space-y-2">
                {hardware.connectedDevices.map((dev, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
                    <span className="text-2xl">{dev.type === 'iOS' ? '📱' : '🤖'}</span>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{dev.modelName || dev.productType || 'Unknown Device'}</p>
                      <p className="text-xs text-dark-400">
                        {dev.type}{dev.iosVersion ? ` • iOS ${dev.iosVersion}` : ''}
                        {dev.productType ? ` • ${dev.productType}` : ''}
                        {dev.method ? ` • via ${dev.method}` : ' • via USB'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                      Connected
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dark-500 mt-3">
                ℹ️ Connected iOS devices can be force-upgraded from the <span className="text-phoenix-400">Upgrade</span> page
              </p>
            </div>
          )}

          {/* Compatibility summary */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-dark-400" />
              Compatibility Summary
            </h3>
            {issues.length === 0 ? (
              <p className="text-green-400 text-sm">
                ✅ Hardware is well-supported by modern operating systems
              </p>
            ) : (
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-dark-300">{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="glass rounded-xl p-5 border-l-4 border-phoenix-500">
            <p className="text-sm text-dark-300">
              <span className="text-phoenix-400 font-medium">Next step:</span>{" "}
              Go to <span className="text-white">Recommend</span> to see which operating systems are best for this hardware.
            </p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!hardware && !loading && !error && (
        <div className="glass rounded-xl p-12 text-center">
          <Cpu className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-1">No hardware detected yet</p>
          <p className="text-xs text-dark-500">Click "Detect Hardware" to scan this machine</p>
        </div>
      )}
    </div>
  );
}
