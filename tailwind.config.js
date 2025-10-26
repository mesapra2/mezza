/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    //require('tailwindcss-animate'),
  ],
  // ✨ Adicione esta configuração
  corePlugins: {
    preflight: true,
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
};