import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c",
          500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12",
        },
        ink: { DEFAULT: "#1c1917", soft: "#57534e", muted: "#a8a29e" },
        surface: { DEFAULT: "#ffffff", alt: "#faf7f2", dark: "#1c1917" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: { card: "1rem" },
      boxShadow: { card: "0 4px 24px -6px rgba(28,25,23,0.12)", lift: "0 12px 32px -8px rgba(28,25,23,0.22)" },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        floaty: { "0%,100%": { transform: "translateY(0) rotate(var(--r,0deg))" }, "50%": { transform: "translateY(-10px) rotate(var(--r,0deg))" } },
      },
      animation: { "fade-up": "fadeUp 0.6s ease-out both", floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
