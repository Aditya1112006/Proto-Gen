/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'], // Keep inter as fallback, but rely on mono
      },
      colors: {
        neon: {
          green: '#39ff14',
          purple: '#bf5af2',
          cyan: '#00f0ff',
        },
        dark: {
          950: '#0a0a0f',
          900: '#0f0f1a',
          800: '#161625',
          700: '#1e1e32',
          600: '#2a2a40',
        },
        primary: {
          500: '#39ff14', // Alias primary 500 to neon green for legacy shared components
          600: '#2eff05', 
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'blink': 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(57, 255, 20, 0.3), 0 0 20px rgba(57, 255, 20, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(57, 255, 20, 0.5), 0 0 60px rgba(57, 255, 20, 0.2)' },
        },
        blink: {
          '50%': { opacity: 0 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
