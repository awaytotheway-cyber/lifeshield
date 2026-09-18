/** @type {import('tailwindcss').Config} */
// LifeShield brand colours — keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryBlue: "#FF6000",
        deepNavy: "#242424",
        skyBlue: "#6C5BD4",
        iceBlue: "#FFFFFF",
        riskLow: "#1F9D74",
        riskModerate: "#E08A00",
        riskHigh: "#E1445A",
        // Legacy aliases → LifeShield white/orange glass system
        deepTeal: "#FF6000",
        midTeal: "#6C5BD4",
        lightTeal: "#FFE4D1",
        sage: "#1F9D74",
        sageLight: "#E3F7EF",
        coral: "#E1445A",
        coralLight: "#FDE8EB",
        amber: "#E08A00",
        amberLight: "#FFF1DC",
        cream: "#FFFFFF",
        white: "#FFFFFF",
        charcoal: "#241C14",
        slate: "#6B6560",
        mist: "#A39C94",
        border: "rgba(36,28,21,0.12)",
        teal: "#FF6000",
      },
    },
  },
  plugins: [],
};
