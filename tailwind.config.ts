import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Google Sans'", "'Google Sans Text'", "'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        googlesans: ["'Google Sans'", "'Google Sans Text'", "'Plus Jakarta Sans'", "sans-serif"],
        montserrat: ["'Google Sans'", "'Google Sans Text'", "'Plus Jakarta Sans'", "sans-serif"],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.005em',
        wider: '0.015em',
        widest: '0.025em',
      },
      colors: {
        primary: {
          DEFAULT: "#8E0E75",
          hover: "#700B5C",
          light: "#F8F6FC",
          pastel: "#D8CFF0",
        },
        brand: {
          50: "#F8F6FC",
          100: "#F1ECF8",
          200: "#D8CFF0",
          300: "#BFB2E8",
          400: "#A6559C",
          500: "#8E0E75", // Púrpura/Ciruela corporativo
          600: "#700B5C", // Hover
          700: "#530844",
          800: "#35052C",
          900: "#191654", // Azul Índigo profundo de La Abuela
        },
        charcoal: {
          DEFAULT: "#292929", // Gris Carbón títulos
          muted: "#4A4A4A",   // Texto de cuerpo y tablas
        },
        success: {
          DEFAULT: "#3BB54A", // Verde de éxito/conversión
          hover: "#32993E",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(to right, #191654, #8E0E75)",
        "brand-gradient-hover": "linear-gradient(to right, #131043, #700B5C)",
        "brand-gradient-v": "linear-gradient(to bottom, #191654, #8E0E75)",
      },
    },
  },
  plugins: [],
};
export default config;
