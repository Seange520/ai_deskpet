/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        space: '#0F172A',
        panel: '#1E293B',
        neon: '#6EE7B7',
        danger: '#FF4D4D',
        muted: '#90919F',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Segoe UI', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'Consolas', 'monospace'],
      },
      boxShadow: { neon: '0 0 32px #6ee7b725' },
    },
  },
  plugins: [],
};
