import React from 'react';
import { Shield, Zap, Monitor } from 'lucide-react';

export default function StatusBar() {
  return (
    <div className="flex items-center justify-between h-7 bg-dark-900 border-t border-dark-700 px-4 text-xs text-dark-500">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-green-500" />
          <span>USB-Only Safe Mode</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-phoenix-500" />
          <span>Ready</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          <span>{navigator.platform}</span>
        </div>
        <span>PhoenixOS v1.0.0</span>
      </div>
    </div>
  );
}
