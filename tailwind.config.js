/** @type {import('tailwindcss').Config} */
// PRESCOPE brand colours — keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryBlue: "#007AFF",
        deepNavy: "#000000",
        skyBlue: "#5AC8FA",
        iceBlue: "#F2F2F7",
        riskLow: "#34C759",
        riskModerate: "#FFCC00",
        riskHigh: "#FF3B30",
        // Legacy aliases → iOS palette
        deepTeal: "#007AFF",
        midTeal: "#5AC8FA",
        lightTeal: "#E5F2FF",
        sage: "#34C759",
        sageLight: "#E8F8ED",
        coral: "#FF3B30",
        coralLight: "#FFE5E3",
        amber: "#FFCC00",
        amberLight: "#FFF8DB",
        cream: "#F2F2F7",
        white: "#FFFFFF",
        charcoal: "#000000",
        slate: "#8E8E93",
        mist: "#C7C7CC",
        border: "#E5E5EA",
        teal: "#007AFF",
        purple: "#AF52DE",
      },
    },
  },
  plugins: [],
};
