/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spirit-primary': '#667eea',
        'spirit-secondary': '#764ba2',
        'spirit-accent': '#f093fb',
      },
      gradients: {
        'spirit-main': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'spirit-accent': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      }
    },
  },
  plugins: [],
}