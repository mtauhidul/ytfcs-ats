// In your tailwind.config.js file, add the xs breakpoint:

module.exports = {
  // ...other config options
  theme: {
    extend: {
      // ...other theme extensions
      screens: {
        xs: "480px",
        // The default breakpoints remain the same
        // 'sm': '640px',
        // 'md': '768px',
        // 'lg': '1024px',
        // 'xl': '1280px',
        // '2xl': '1536px',
      },
    },
  },
  // ...other config options
};
