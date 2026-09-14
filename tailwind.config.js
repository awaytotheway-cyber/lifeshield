/** @type {import('tailwindcss').Config} */
// PRESCOPE brand colours — keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryBlue: "#2B5FE0",
        deepNavy: "#0B1E4D",
        skyBlue: "#6FA8F5",
        iceBlue: "#EAF1FF",
        riskLow: "#2FB8A6",
        riskModerate: "#F5A623",
        riskHigh: "#F26D6D",
        // Legacy aliases → blue glass system
        deepTeal: "#2B5FE0",
        midTeal: "#6FA8F5",
        lightTeal: "#D6E4FF",
        sage: "#2FB8A6",
        sageLight: "#E6F8F5",
        coral: "#F26D6D",
        coralLight: "#FDECEC",
        amber: "#F5A623",
        amberLight: "#FEF4E3",
        cream: "#EAF1FF",
        white: "#FFFFFF",
        charcoal: "#0B1E4D",
        slate: "#4A5568",
        mist: "#9AA5B4",
        border: "#D4E0F5",
        teal: "#2B5FE0",
      },
    },
  },
  plugins: [],
};
