import React from "react";
import { Usb, RefreshCw, AlertTriangle } from "lucide-react";

export default function USBSelector({
  drives = [],
  selectedDrive = null,
  onSelect = () => {},
  onRefresh = () => {},
  loading = false,
}) {
  const validDrives = drives.filter((d) => !d.error);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="w-5 h-5 text-phoenix-500 animate-spin" />
          <span className="text-dark-300">Scanning for USB drives...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Usb className="w-5 h-5 text-phoenix-500" />
          <h3 className="font-semibold text-white">USB Drives</h3>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {validDrives.length === 0 ? (
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 mb-1">No USB drives detected</p>
          <p className="text-xs text-dark-500">Connect a USB drive and click Refresh</p>
        </div>
      ) : (
        <div className="divide-y divide-dark-700">
          {validDrives.map((drive, index) => (
            <button
              key={drive.path || index}
              onClick={() => onSelect(drive)}
              className={`w-full p-4 flex items-center gap-4 text-left transition-all ${
                selectedDrive?.path === drive.path
                  ? "bg-phoenix-600/10 border-l-2 border-phoenix-500"
                  : "hover:bg-dark-800/50 border-l-2 border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  selectedDrive?.path === drive.path
                    ? "bg-phoenix-500/20 text-phoenix-400"
                    : "bg-dark-800 text-dark-400"
                }`}
              >
                <Usb className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {drive.model || drive.name || "Unknown Drive"}
                </p>
                <p className="text-sm text-dark-400">
                  {drive.size} • {drive.name}
                  {drive.mountPoint && ` • ${drive.mountPoint}`}
                </p>
              </div>
              {selectedDrive?.path === drive.path && (
                <div className="w-3 h-3 rounded-full bg-phoenix-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
