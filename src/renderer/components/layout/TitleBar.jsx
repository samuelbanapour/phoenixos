import React from 'react';
import { Flame, Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const handleMinimize = () => window.phoenix?.minimize();
  const handleMaximize = () => window.phoenix?.maximize();
  const handleClose = () => window.phoenix?.close();

  return (
    <div className="flex items-center justify-between h-10 bg-dark-900 border-b border-dark-700 select-none" style={{ WebkitAppRegion: 'drag' }}>
      {/* App title */}
      <div className="flex items-center gap-2 pl-4">
        <Flame className="w-5 h-5 text-phoenix-500" />
        <span className="text-sm font-semibold text-dark-200">PhoenixOS</span>
        <span className="text-xs text-dark-500">v1.0.0</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center gap-1 pr-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-600 text-dark-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
