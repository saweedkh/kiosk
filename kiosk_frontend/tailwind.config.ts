import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        '2k': '2560px',
        '4k': '3840px',
      },
      colors: {
        primary: {
          DEFAULT: "#E17100",
          light: "#FF6900",
          dark: "#C55F00",
        },
        background: {
          DEFAULT: "#FFF3E8",
          dark: "#1A1A1A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          dark: "#2A2A2A",
        },
        text: {
          DEFAULT: "#000000",
          secondary: "#565F6E",
          dark: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E5E5E5",
          dark: "#3A3A3A",
        },
        gray: {
          DEFAULT: "#F3F4F6",
          dark: "#3A3A3A",
        },
      },
      fontFamily: {
        sans: ["var(--font-vazir)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "16px",
        xl: "50px",
      },
    },
  },
  plugins: [],
};

export default config;

