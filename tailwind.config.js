/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        phoenix: {
          50: '#fef3e2',
          100: '#fde4b9',
          200: '#fcd48c',
          300: '#fbc35f',
          400: '#fab53d',
          500: '#f9a825',
          600: '#f57f17',
          700: '#e65100',
          800: '#bf360c',
          900: '#8b2500',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan': 'scan 2s ease-in-out',
        'fire': 'fire 1.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(249, 168, 37, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(249, 168, 37, 0.6)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: 0 },
          '50%': { opacity: 1 },
          '100%': { transform: 'translateY(100%)', opacity: 0 },
        },
        fire: {
          '0%, 100%': { textShadow: '0 0 10px #f9a825, 0 0 20px #e65100' },
          '50%': { textShadow: '0 0 20px #f9a825, 0 0 40px #e65100, 0 0 60px #bf360c' },
        },
      },
    },
  },
  plugins: [],
}
