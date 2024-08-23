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
        dusk: "#120f21",
        manilla: "rgb(245, 241, 230)",
        manillaDark: "rgb(74, 71, 61)",
        manillaLink: "rgb(229,102,15)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      dropShadow: {
        glowPurple: [
          "0 0px 20px rgba(165, 145, 230, 0.35)",
          "0 0px 65px rgba(165, 145, 230, 0.2)"
        ],
        glowSunset: [
          "0 0px 20px rgba(255, 94, 116, 0.35)",
          "0 0px 65px rgba(255, 94, 116, 0.2)"
        ]
      }
    },
  },
  plugins: [],
};
export default config;
