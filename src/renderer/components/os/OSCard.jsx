import React from "react";
import { HardDrive, Download, ArrowRight, Gamepad2, Briefcase, Feather, Server, Zap } from "lucide-react";
import CompatibilityBadge from "../shared/CompatibilityBadge";

const categoryIcons = {
  Desktop: HardDrive,
  Mobile: HardDrive,
  Gaming: Gamepad2,
  Server: Server,
};

export default function OSCard({ os, onSelect, compact = false }) {
  if (!os) return null;

  const CategoryIcon = categoryIcons[os.category] || HardDrive;

  if (compact) {
    return (
      <div
        className="glass rounded-xl p-4 hover:bg-dark-800/50 transition-all cursor-pointer group"
        onClick={() => onSelect?.(os)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CategoryIcon className="w-4 h-4 text-dark-400" />
            <h4 className="font-semibold text-white">{os.os}</h4>
            <span className="text-xs text-dark-500">{os.version}</span>
          </div>
          <CompatibilityBadge level={os.compatibility} score={os.score} size="sm" />
        </div>
        {os.bypassAvailable && (
          <div className="flex items-center gap-1 text-xs text-phoenix-400">
            <Zap className="w-3 h-3" />
            <span>Bypass available</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden hover:bg-dark-800/30 transition-all group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-dark-800 text-dark-300">
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{os.os}</h3>
              <p className="text-sm text-dark-400">
                {os.version} • {os.category}
              </p>
            </div>
          </div>
          <CompatibilityBadge level={os.compatibility} score={os.score} />
        </div>

        {/* Scores */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { key: "gamingScore", label: "Gaming", icon: Gamepad2 },
            { key: "productivityScore", label: "Work", icon: Briefcase },
            { key: "lightweightScore", label: "Light", icon: Feather },
            { key: "serverScore", label: "Server", icon: Server },
          ].map(({ key, label, icon: Icon }) => {
            const val = os[key];
            if (!val) return null;
            return (
              <div key={key} className="text-center">
                <Icon className="w-3 h-3 text-dark-500 mx-auto mb-1" />
                <p className="text-xs text-dark-400">{label}</p>
                <p className="text-sm font-semibold text-white">{val}%</p>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {os.notes && os.notes.length > 0 && (
          <div className="space-y-1 mb-4">
            {os.notes.map((note, i) => (
              <p key={i} className="text-xs text-dark-400 flex items-start gap-1.5">
                <span className="text-dark-500 mt-0.5">•</span>
                <span>{note}</span>
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {os.appStore && (
              <span className="text-xs text-dark-500 flex items-center gap-1">
                <Download className="w-3 h-3" />
                {os.appStore}
              </span>
            )}
            {os.bypassAvailable && (
              <span className="text-xs text-phoenix-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Force install
              </span>
            )}
          </div>
          <button
            onClick={() => onSelect?.(os)}
            className="flex items-center gap-1 text-sm text-phoenix-400 hover:text-phoenix-300 transition-colors"
          >
            Select
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
