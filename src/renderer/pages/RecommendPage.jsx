import React, { useState, useCallback, useEffect } from "react";
import { Lightbulb, RefreshCw, Gamepad2, Briefcase, Feather, Server, HardDrive } from "lucide-react";
import OSCard from "../components/os/OSCard";

const intents = [
  { key: "general", label: "General", icon: HardDrive },
  { key: "gaming", label: "Gaming", icon: Gamepad2 },
  { key: "productivity", label: "Productivity", icon: Briefcase },
  { key: "minimal", label: "Minimal", icon: Feather },
  { key: "server", label: "Server", icon: Server },
];

export default function RecommendPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [hardware, setHardware] = useState(null);
  const [intent, setIntent] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runRecommend = useCallback(async (selectedIntent) => {
    setLoading(true);
    setError(null);
    setIntent(selectedIntent);

    try {
      // First detect hardware if not cached
      let hw = hardware;
      if (!hw) {
        hw = await window.phoenix?.detectHardware();
        if (hw?.error) {
          setError(hw.error);
          setLoading(false);
          return;
        }
        setHardware(hw);
      }

      // Get recommendations
      const result = await window.phoenix?.recommendOS(hw, selectedIntent);
      if (result?.error) {
        setError(result.error);
      } else {
        setRecommendations(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      setError(err.message || "Recommendation failed");
    } finally {
      setLoading(false);
    }
  }, [hardware]);

  // Auto-run on mount
  useEffect(() => {
    runRecommend("general");
  }, []);

  const topRec = recommendations[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-phoenix-500" />
            OS Recommendations
          </h1>
          <p className="text-dark-400 mt-1">Best operating systems for your hardware</p>
        </div>
        <button
          onClick={() => runRecommend(intent)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 disabled:bg-dark-800 text-dark-300 rounded-xl text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Intent filter */}
      <div className="flex gap-2 flex-wrap">
        {intents.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => runRecommend(key)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              intent === key
                ? "bg-phoenix-600/20 text-phoenix-400 border border-phoenix-500/30"
                : "bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 border border-transparent"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-phoenix-500 animate-spin mx-auto mb-3" />
          <p className="text-dark-300">Analyzing hardware and matching OSes...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-6 border-l-4 border-red-500">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Top recommendation */}
      {topRec && !loading && (
        <div className="glass rounded-xl p-5 border-l-4 border-phoenix-500 pulse-glow">
          <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">🏆 Best Match</p>
          <p className="text-lg font-bold text-white">
            {topRec.os} {topRec.version}
          </p>
          <p className="text-sm text-dark-400">
            {topRec.score}% compatible
            {topRec.bypassAvailable && (
              <span className="ml-2 text-phoenix-400">⚡ Force install available</span>
            )}
          </p>
        </div>
      )}

      {/* Recommendation cards */}
      {recommendations.length > 0 && !loading && (
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <OSCard key={`${rec.os}-${rec.version}-${i}`} os={rec} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {recommendations.length === 0 && !loading && !error && (
        <div className="glass rounded-xl p-12 text-center">
          <Lightbulb className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-1">No recommendations yet</p>
          <p className="text-xs text-dark-500">Run hardware detection first, then select an intent</p>
        </div>
      )}
    </div>
  );
}
