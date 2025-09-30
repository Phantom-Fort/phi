// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
