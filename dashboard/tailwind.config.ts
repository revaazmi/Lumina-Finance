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
        bg: "#fafafa",
        fg: "#111111",
        border: "#e5e7eb",
        muted: "#f5f5f5",
        subtle: "#9ca3af",
        income: "#16a34a",
        expense: "#dc2626",
        brand: {
          DEFAULT: "#0a0a0a",
          muted: "#737373",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
