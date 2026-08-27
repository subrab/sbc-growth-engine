/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A0F1E',
        'navy-2': '#101a30',
        paper: '#F6F4EE',
        'paper-2': '#EFEBE1',
        ink: '#12151C',
        'ink-soft': '#4A5062',
        blue: '#3E63DD',
        'blue-deep': '#2947A3',
        amber: '#C9974D',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
