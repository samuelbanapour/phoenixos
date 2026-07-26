import React from "react";
import { CheckCircle, AlertTriangle, XCircle, MinusCircle, HelpCircle } from "lucide-react";

const badgeConfig = {
  excellent: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Excellent",
  },
  good: {
    icon: CheckCircle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "Good",
  },
  fair: {
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    label: "Fair",
  },
  poor: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Poor",
  },
  incompatible: {
    icon: MinusCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Incompatible",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-dark-400",
    bg: "bg-dark-700/50",
    border: "border-dark-600/30",
    label: "Unknown",
  },
};

export default function CompatibilityBadge({ level = "unknown", score = null, size = "md" }) {
  const config = badgeConfig[level] || badgeConfig.unknown;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${config.border} ${config.color} ${sizeClasses[size]}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
      <span>{config.label}</span>
      {score !== null && <span className="opacity-70 ml-0.5">{score}%</span>}
    </span>
  );
}
