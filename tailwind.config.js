/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        space: '#1B1626',
        panel: '#221B2E',
        neon: '#FFC98B',
        blush: '#F2A6A0',
        rose: '#E8B4C8',
        life: '#A9D3B4',
        danger: '#FF4D4D',
        muted: '#C3B8B0',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Segoe UI', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'Consolas', 'monospace'],
      },
      boxShadow: { neon: '0 8px 24px #130f1c14, 0 20px 48px #130f1c1f' },
    },
  },
  plugins: [],
};
