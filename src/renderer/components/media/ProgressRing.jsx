import React from "react";

export default function ProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  label = null,
  sublabel = null,
  status = null,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  const statusColor = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
    active: "text-phoenix-400",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(71, 85, 105, 0.3)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f9a825" />
              <stop offset="100%" stopColor="#e65100" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
          {status && (
            <span className={`text-xs font-medium ${statusColor[status] || "text-dark-400"}`}>
              {status === "success" ? "Done" : status === "error" ? "Failed" : status === "active" ? "Working..." : status}
            </span>
          )}
        </div>
      </div>
      {label && <p className="text-sm font-medium text-white">{label}</p>}
      {sublabel && <p className="text-xs text-dark-400">{sublabel}</p>}
    </div>
  );
}
