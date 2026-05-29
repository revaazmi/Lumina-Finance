import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        fg: "#ffffff",
        border: "#000000",
        accent: {
          cyan: "#00d4ff",
          pink: "#ff0055",
          green: "#00ff9d",
          yellow: "#ffff00",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "Consolas", "monospace"],
        sans: ["'Arial Black'", "Impact", "sans-serif"],
      },
      borderWidth: {
        4: "4px",
      },
      boxShadow: {
        none: "none",
        hard: "4px 4px 0px 0px #000",
      },
    },
  },
  plugins: [],
};
export default config;
