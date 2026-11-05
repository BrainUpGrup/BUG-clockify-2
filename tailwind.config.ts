import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-[#FEF08A]', 'border-[#FACC15]', 'text-[#713F12]',
    'bg-[#BBF7D0]', 'border-[#4ADE80]', 'text-[#14532D]',
    'bg-[#BAE6FD]', 'border-[#38BDF8]', 'text-[#0369A1]',
    'bg-[#FBCFE8]', 'border-[#F472B6]', 'text-[#831843]',
    'bg-[#FED7AA]', 'border-[#FB923C]', 'text-[#7C2D12]',
    'bg-[#E9D5FF]', 'border-[#C084FC]', 'text-[#581C87]',
    'bg-[#FDE047]', 'bg-[#86EFAC]', 'bg-[#7DD3FC]', 'bg-[#F9A8D4]', 'bg-[#FDBA74]', 'bg-[#D8B4FE]',
    'bg-[#CA8A04]', 'bg-[#16A34A]', 'bg-[#0284C7]', 'bg-[#DB2777]', 'bg-[#EA580C]', 'bg-[#8E0E75]',
    'bg-[#FEF9C3]', 'bg-[#DCFCE7]', 'bg-[#E0F2FE]', 'bg-[#FCE7F3]', 'bg-[#FFEDD5]', 'bg-[#F3E8FF]',
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
