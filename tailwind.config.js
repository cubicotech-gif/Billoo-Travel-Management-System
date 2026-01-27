/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        accent: {
          purple: '#7c3aed',
          blue: '#3b82f6',
          orange: '#f97316',
          teal: '#14b8a6',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      },
    },
  },
  plugins: [],
}
