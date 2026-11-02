/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        space: '#0D0D12',
        panel: '#15151D',
        neon: '#00FFD1',
        danger: '#FF4D4D',
        muted: '#90919F',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Consolas', 'monospace'],
      },
      boxShadow: { neon: '0 0 32px #00ffd125' },
    },
  },
  plugins: [],
};
