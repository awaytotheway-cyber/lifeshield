/** @type {import('tailwindcss').Config} */
// LifeShield brand colours — keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryBlue: "#FF6000",
        deepNavy: "#0E0E0E",
        skyBlue: "#9C90E8",
        iceBlue: "#141414",
        riskLow: "#34D399",
        riskModerate: "#FFC24B",
        riskHigh: "#F2545D",
        // Legacy aliases → LifeShield dark orange/purple glass system
        deepTeal: "#FF6000",
        midTeal: "#9C90E8",
        lightTeal: "#FFDCC0",
        sage: "#34D399",
        sageLight: "rgba(52,211,153,0.16)",
        coral: "#F2545D",
        coralLight: "rgba(242,84,93,0.16)",
        amber: "#FFC24B",
        amberLight: "rgba(255,194,75,0.16)",
        cream: "#141414",
        white: "#FFFFFF",
        charcoal: "#F5F3F0",
        slate: "#B7B3AE",
        mist: "#8C8781",
        border: "rgba(255,255,255,0.1)",
        teal: "#FF6000",
      },
    },
  },
  plugins: [],
};
