import React, { useState, useCallback } from "react";
import { Store, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import SafetyWarning from "../components/shared/SafetyWarning";

const platforms = [
  {
    id: "windows",
    name: "Windows",
    icon: "🪟",
    stores: ["Microsoft Store", "Winget"],
    desc: "Re-enable Store and install Winget package manager",
  },
  {
    id: "macos",
    name: "macOS",
    icon: "🍎",
    stores: ["Mac App Store"],
    desc: "Fix App Store, Gatekeeper, and Apple ID sign-in",
  },
  {
    id: "linux",
    name: "Linux",
    icon: "🐧",
    stores: ["Flatpak", "Flathub", "Snap"],
    desc: "Install Flatpak + Flathub and essential apps",
  },
  {
    id: "android",
    name: "Android",
    icon: "📱",
    stores: ["Aurora Store", "F-Droid", "MicroG"],
    desc: "De-Googled app stores for custom ROMs",
  },
  {
    id: "ios",
    name: "iOS",
    icon: "📱",
    stores: ["AltStore", "Sideloadly"],
    desc: "Sideloading tools for IPA files",
  },
];

export default function RestorePage() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleRestore = useCallback(async (platformId) => {
    setSelectedPlatform(platformId);
    setLoading(true);
    setResults(null);

    try {
      const result = await window.phoenix?.restoreAppStore(platformId);
      setResults(result);
    } catch (err) {
      setResults({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-phoenix-500" />
          Restore App Stores
        </h1>
        <p className="text-dark-400 mt-1">
          Get app store functionality working on any system
        </p>
      </div>

      {/* Safety note */}
      <SafetyWarning level="info" title="Platform-Specific">
        App store restoration runs platform-specific commands. Some steps may require
        administrator/sudo privileges or manual intervention.
      </SafetyWarning>

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handleRestore(platform.id)}
            disabled={loading}
            className={`glass rounded-xl p-5 text-left transition-all hover:bg-dark-800/50 ${
              selectedPlatform === platform.id
                ? "ring-2 ring-phoenix-500"
                : ""
            } ${loading ? "opacity-50" : ""}`}
          >
            <span className="text-3xl mb-3 block">{platform.icon}</span>
            <h3 className="text-white font-semibold mb-1">{platform.name}</h3>
            <p className="text-sm text-dark-400 mb-3">{platform.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {platform.stores.map((store) => (
                <span
                  key={store}
                  className="text-xs bg-dark-800 text-dark-300 px-2 py-0.5 rounded-full"
                >
                  {store}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-xl p-6 text-center">
          <RefreshCw className="w-6 h-6 text-phoenix-500 animate-spin mx-auto mb-3" />
          <p className="text-dark-300">
            Restoring {platforms.find((p) => p.id === selectedPlatform)?.name} app stores...
          </p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-4">
          {results.success ? (
            <div className="glass rounded-xl p-5 border-l-4 border-green-500 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-white font-semibold">Restoration Complete!</p>
                <p className="text-sm text-dark-400">
                  {selectedPlatform} app store restoration finished.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-5 border-l-4 border-red-500">
              <p className="text-red-400 font-semibold mb-1">Restoration Failed</p>
              <p className="text-sm text-dark-400">{results.error || results.reason}</p>
            </div>
          )}

          {/* Detailed results */}
          {results.results && results.results.length > 0 && (
            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-dark-700">
                <h3 className="font-semibold text-white">Restoration Details</h3>
              </div>
              <div className="divide-y divide-dark-700">
                {results.results.map((step, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-dark-300">{step.step}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        step.status === "success" || step.status === "already_installed"
                          ? "bg-green-500/10 text-green-400"
                          : step.status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-dark-700 text-dark-400"
                      }`}
                    >
                      {step.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="glass rounded-xl p-12 text-center">
          <Store className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-1">Select a platform to restore</p>
          <p className="text-xs text-dark-500">Click any platform card above to begin</p>
        </div>
      )}
    </div>
  );
}
