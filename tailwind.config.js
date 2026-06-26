/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Graphite neutral base — solid black, cool-tinted
        atlab: {
          50: '#f5f6f8',
          100: '#e6e8ec',
          200: '#c7cad3',
          300: '#9aa0ad',
          400: '#6e7482',
          500: '#4d525e',
          600: '#363a44',
          700: '#262931',
          800: '#191b21',
          850: '#131519',
          900: '#0e0f13',
          950: '#08090b',
        },
        // Refined indigo accent (not neon)
        accent: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
