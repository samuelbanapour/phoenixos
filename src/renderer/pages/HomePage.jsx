import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRight, Shield, Zap, Monitor, HardDrive } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Monitor,
      title: 'Detect Hardware',
      description: 'Scan any device to identify CPU, RAM, GPU, TPM, and compatibility',
      action: () => navigate('/detect'),
    },
    {
      icon: Zap,
      title: 'Force Upgrade',
      description: 'Install newer OS versions on hardware the manufacturer abandoned',
      action: () => navigate('/upgrade'),
    },
    {
      icon: HardDrive,
      title: 'Create Bootable USB',
      description: 'Make bootable media with installer bypasses pre-applied',
      action: () => navigate('/media'),
    },
    {
      icon: Shield,
      title: 'Restore App Stores',
      description: 'Get Microsoft Store, App Store, Play Store, and Flatpak working again',
      action: () => navigate('/restore'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Flame className="w-20 h-20 text-phoenix-500 fire-text" />
            <div className="absolute inset-0 blur-2xl bg-phoenix-500/20 rounded-full" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-white">Phoenix</span>
          <span className="text-phoenix-500">OS</span>
        </h1>
        <p className="text-xl text-dark-400 mb-2">
          Universal Hardware Revival Toolkit
        </p>
        <p className="text-dark-500 max-w-lg mx-auto">
          Force new operating systems onto hardware that manufacturers have abandoned.
          Detect, recommend, create, upgrade, and restore — without breaking anything.
        </p>
      </div>

      {/* Quick start */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {features.map(({ icon: Icon, title, description, action }) => (
          <button
            key={title}
            onClick={action}
            className="glass rounded-xl p-5 text-left hover:bg-dark-800/50 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-phoenix-500/10 text-phoenix-500 group-hover:bg-phoenix-500/20 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                  {title}
                  <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-phoenix-500 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-dark-400">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Safety notice */}
      <div className="glass rounded-xl p-5 border-l-4 border-green-500">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-400 mb-1">Safe by Default</h4>
            <p className="text-sm text-dark-400">
              PhoenixOS operates in USB-only mode by default. It will never modify your internal
              drive without explicit confirmation. Every operation requires your approval at each step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
