import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        wine: { DEFAULT: "#842A42", dark: "#672035", light: "#A54A63" },
        rose: { light: "#F3D9D2", soft: "#F9ECE8" },
        cream: "#FFF4EF",
        beige: "#F5EDE5",
        sage: { DEFAULT: "#E4EBDD", dark: "#4E6B3D" },
        ink: { DEFAULT: "#392D32", muted: "#6E5F65", subtle: "#9A8B90" },
        line: "#EADDD6",
        danger: { DEFAULT: "#B42318", soft: "#FDECEA" },
        warn: { DEFAULT: "#9A5B00", soft: "#FFF3DC" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: {
        card: "0 1px 2px rgba(57,45,50,0.04), 0 4px 16px rgba(57,45,50,0.05)",
        lift: "0 2px 4px rgba(57,45,50,0.06), 0 10px 28px rgba(57,45,50,0.08)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "dialog-in": { from: { opacity: "0", transform: "translate(-50%,-48%) scale(.98)" }, to: { opacity: "1", transform: "translate(-50%,-50%) scale(1)" } },
      },
      animation: {
        "fade-in": "fade-in .25s ease-out both",
        "overlay-in": "overlay-in .15s ease-out",
        "dialog-in": "dialog-in .18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
