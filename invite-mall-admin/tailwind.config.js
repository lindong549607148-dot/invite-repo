/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        xhs: {
          pink: '#FE2C55',
          'pink-light': '#FF6B8A',
          'pink-soft': '#FFE4E9',
          'pink-bg': '#FFF5F7',
          rose: '#FF4757',
          cream: '#FFF8F9',
          gray: '#8E8E93',
          'gray-light': '#F7F7F8',
        },
      },
      fontFamily: {
        sans: ['PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(254, 44, 85, 0.08)',
        'card-hover': '0 8px 24px rgba(254, 44, 85, 0.12)',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
      },
    },
  },
  plugins: [],
}
