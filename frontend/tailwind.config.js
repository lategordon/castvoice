/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#3d4a42",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        outline: "#6d7a72",
        "outline-variant": "#bccac0",
        "border-hairline": "#e2e8f0",
        "ink-primary": "#0f172a",
        "ink-secondary": "#334155",
        "ink-muted": "#64748b",
        primary: {
          DEFAULT: "#006948",
          container: "#00855d",
          fixed: "#85f8c4",
          "fixed-dim": "#68dba9",
          "on-container": "#f5fff7",
        },
        secondary: {
          DEFAULT: "#515f74",
          container: "#d5e3fd",
          fixed: "#d5e3fd",
          "on-container": "#57657b",
        },
        tertiary: {
          DEFAULT: "#006194",
          container: "#007bb9",
          fixed: "#cce5ff",
          "on-container": "#fdfcff",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "on-container": "#93000a",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
