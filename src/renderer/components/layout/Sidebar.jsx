import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Cpu, Lightbulb, Disc, ArrowUpCircle, Store, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/detect', icon: Cpu, label: 'Detect' },
  { to: '/recommend', icon: Lightbulb, label: 'Recommend' },
  { to: '/media', icon: Disc, label: 'Create Media' },
  { to: '/upgrade', icon: ArrowUpCircle, label: 'Force Upgrade' },
  { to: '/restore', icon: Store, label: 'Restore Stores' },
  { to: '/install', icon: Settings, label: 'Guided Install' },
];

export default function Sidebar() {
  return (
    <nav className="w-56 bg-dark-900 border-r border-dark-700 flex flex-col py-4">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-phoenix-600/20 text-phoenix-400 border-l-2 border-phoenix-500'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`
          }
          end={to === '/'}
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto px-4">
        <div className="text-xs text-dark-600 border-t border-dark-800 pt-4">
          <p>Universal Hardware</p>
          <p>Revival Toolkit</p>
        </div>
      </div>
    </nav>
  );
}
