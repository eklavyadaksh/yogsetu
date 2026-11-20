/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FBF9F5',
        surface: '#FFFFFF',
        sand: {
          50: '#FDFBF7',
          100: '#F7F3EB',
          200: '#EFE8DC',
          300: '#DECDB8',
          400: '#C7AE91',
        },
        teal: {
          50: '#F0F9F8',
          100: '#D6EFEB',
          200: '#B0DFD7',
          500: '#147D76',
          600: '#0E605B',
          700: '#0D5C58',
          800: '#0A4441',
          900: '#073230',
        },
        coral: {
          50: '#FFF5F2',
          100: '#FEE5DE',
          400: '#F38B73',
          500: '#E06D53',
          600: '#C85339',
        },
        slate: {
          850: '#151E2E',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        instrument: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(13, 92, 88, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'lift': '0 10px 25px -4px rgba(13, 92, 88, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
