import React from "react";
import { Cpu, HardDrive, Monitor, Wifi, Battery, Shield, Gamepad2, Info } from "lucide-react";

const iconMap = {
  cpu: Cpu,
  gpu: Gamepad2,
  storage: HardDrive,
  memory: Info,
  network: Wifi,
  display: Monitor,
  battery: Battery,
  boot: Shield,
  tpm: Shield,
  secureBoot: Shield,
};

const colorMap = {
  cpu: "from-blue-500/20 to-blue-600/10 text-blue-400",
  gpu: "from-purple-500/20 to-purple-600/10 text-purple-400",
  storage: "from-green-500/20 to-green-600/10 text-green-400",
  memory: "from-yellow-500/20 to-yellow-600/10 text-yellow-400",
  network: "from-cyan-500/20 to-cyan-600/10 text-cyan-400",
  display: "from-pink-500/20 to-pink-600/10 text-pink-400",
  battery: "from-emerald-500/20 to-emerald-600/10 text-emerald-400",
  boot: "from-orange-500/20 to-orange-600/10 text-orange-400",
  tpm: "from-red-500/20 to-red-600/10 text-red-400",
  secureBoot: "from-red-500/20 to-red-600/10 text-red-400",
};

function StatusDot({ ok }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-2 ${
        ok ? "bg-green-500" : "bg-red-500"
      }`}
    />
  );
}

export default function HardwareCard({ type, title, data, compact = false }) {
  const Icon = iconMap[type] || Info;
  const gradient = colorMap[type] || "from-gray-500/20 to-gray-600/10 text-gray-400";

  if (!data) return null;

  if (compact) {
    return (
      <div className="glass rounded-lg p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-dark-400 truncate">{title}</p>
          <p className="text-sm font-medium text-white truncate">
            {typeof data === "string"
              ? data
              : data.name || data.model || JSON.stringify(data).slice(0, 60)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div
        className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center gap-3`}
      >
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-2">
        {typeof data === "object" && data !== null ? (
          Object.entries(data).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            if (typeof value === "object" && !Array.isArray(value)) {
              return (
                <div key={key} className="border-l-2 border-dark-700 pl-3 py-1">
                  <p className="text-xs text-dark-500 uppercase tracking-wide">
                    {key}
                  </p>
                  {Object.entries(value).map(([subKey, subVal]) => (
                    <div
                      key={subKey}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-dark-400">{subKey}</span>
                      <span className="text-white font-medium">
                        {typeof subVal === "boolean" ? (
                          <StatusDot ok={subVal} />
                        ) : (
                          String(subVal)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }
            if (Array.isArray(value)) {
              return (
                <div key={key} className="border-l-2 border-dark-700 pl-3 py-1">
                  <p className="text-xs text-dark-500 uppercase tracking-wide">
                    {key}
                  </p>
                  {value.map((item, i) => (
                    <p key={i} className="text-sm text-dark-300">
                      {typeof item === "object"
                        ? JSON.stringify(item)
                        : String(item)}
                    </p>
                  ))}
                </div>
              );
            }
            return (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-dark-400">{key}</span>
                <span className="text-white font-medium">
                  {typeof value === "boolean" ? (
                    <StatusDot ok={value} />
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-dark-300">{String(data)}</p>
        )}
      </div>
    </div>
  );
}
