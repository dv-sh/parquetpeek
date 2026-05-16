/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Warm paper / aubergine palette — replaces the cold slate
        paper: {
          50: "#fdfaf3",   // lightest cream
          100: "#fbf6ec",  // page background (light mode)
          200: "#f4ecd9",  // soft warm border
          300: "#e8dcc1",  // divider
          400: "#c2b394",  // muted
          500: "#8c7e62",  // secondary text
          600: "#5a5040",  // body text on cream
          700: "#3d352a",  // strong text
          800: "#221d18",  // near-black, warm
          900: "#13100c",
        },
        // Dark mode surface — deep aubergine/plum, not blue-gray
        plum: {
          50: "#f3eef6",
          100: "#d9cde0",
          200: "#b09aae",
          300: "#8b7588",
          400: "#5e4f62",
          500: "#3f3346",
          600: "#2c2433",   // hover surfaces
          700: "#221c29",   // surface
          800: "#181320",   // body background (dark)
          900: "#0f0b15",
        },
        // Terracotta — signature warm accent
        clay: {
          50: "#fdf0ec",
          100: "#fad9d0",
          200: "#f3a99a",
          300: "#ec8270",
          400: "#e16b56",
          500: "#dc5b48",   // primary
          600: "#c14430",
          700: "#9a3424",
          800: "#73271b",
        },
        // Sage — for "true" / success
        sage: {
          400: "#7aa893",
          500: "#5a8a73",
          600: "#436b5a",
        },
        // Warm muted red for "false" / null / errors
        brick: {
          400: "#c97168",
          500: "#b8443a",
          600: "#962d24",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Iowan Old Style", "Palatino", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Consolas", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(60, 50, 30, 0.04), 0 4px 16px rgba(60, 50, 30, 0.06)",
        warm: "0 2px 8px rgba(220, 91, 72, 0.18)",
      },
    },
  },
  plugins: [],
};
