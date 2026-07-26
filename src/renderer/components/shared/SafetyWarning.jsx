import React from "react";
import { ShieldAlert, AlertTriangle, Info, Shield } from "lucide-react";

const levelConfig = {
  danger: {
    icon: ShieldAlert,
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-400",
    heading: "text-red-300",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    heading: "text-yellow-300",
    iconColor: "text-yellow-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    text: "text-blue-400",
    heading: "text-blue-300",
    iconColor: "text-blue-500",
  },
  safe: {
    icon: Shield,
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    text: "text-green-400",
    heading: "text-green-300",
    iconColor: "text-green-500",
  },
};

export default function SafetyWarning({
  level = "warning",
  title,
  message,
  children,
  className = "",
}) {
  const config = levelConfig[level] || levelConfig.warning;
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border-l-4 ${config.border} rounded-r-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1">
          {title && <h4 className={`font-semibold mb-1 ${config.heading}`}>{title}</h4>}
          {message && <p className={`text-sm ${config.text}`}>{message}</p>}
          {children && <div className={`text-sm ${config.text} mt-2`}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
