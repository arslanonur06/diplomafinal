export default {
  plugins: {
    'postcss-import': {}, // For importing CSS files
    'tailwindcss/nesting': {}, // For nesting CSS
    'tailwindcss': {}, // The core Tailwind CSS plugin
    'autoprefixer': {}, // Add vendor prefixes for better browser compatibility
    'postcss-nesting': {} // Support for nested CSS
  }
};
