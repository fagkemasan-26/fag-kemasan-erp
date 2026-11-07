/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fag: {
          darkest: '#022C22',
          dark: '#064E3B',
          primary: '#0A5C40',
          emerald: '#10B981',
          light: '#ECFDF5',
          accent: '#34D399',
        }
      }
    },
  },
  plugins: [],
}
