/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0c1322",
        "surface-container": "#191f2f",
        "surface-container-low": "#141b2b",
        "surface-container-high": "#232a3a",
        "surface-container-highest": "#2e3545",
        "surface-container-lowest": "#070e1d",
        "on-surface": "#dce2f7",
        "on-surface-variant": "#bbcabf",
        "outline-variant": "#3c4a42",
        outline: "#86948a",
        primary: {
          DEFAULT: "#4edea3",
          container: "#10b981",
          fixed: "#6ffbbe",
          "on-container": "#00422b",
        },
        secondary: {
          DEFAULT: "#4cd7f6",
          container: "#03b5d3",
          fixed: "#acedff",
        },
        tertiary: {
          DEFAULT: "#d0bcff",
          container: "#b090ff",
        },
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['monospace']
      }
    },
  },
  plugins: [],
}
