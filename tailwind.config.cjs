/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
      colors: {
        apple: {
          bg: '#f5f5f7', card: '#ffffff', blue: '#007AFF', indigo: '#5856D6',
          green: '#34C759', orange: '#FF9500', red: '#FF3B30', pink: '#FF2D55',
          teal: '#5AC8FA', gray: '#8E8E93', text: '#1D1D1F', secondary: '#86868B',
          border: '#E5E5EA', fill: '#F2F2F7',
        },
      },
    },
  },
  plugins: [],
};
