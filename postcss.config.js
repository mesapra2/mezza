// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: ['>0.2%', 'not dead', 'not op_mini all'],
      flexbox: 'no-2009',
      grid: 'autoplace',
    },
  },
};