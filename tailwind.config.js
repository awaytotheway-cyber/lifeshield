/** @type {import('tailwindcss').Config} */
// PRESCOPE brand colours — the orange + warm-white redesign.
// Keep in sync with lib/theme.ts (the source of truth) and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
//
// Legacy class names (bg-cream, text-teal, text-coral…) are kept and re-pointed
// at the new palette so the ~80 screens that still use them stop looking blue.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ——— New orange system ———
        orange: "#E8650A",
        orangeDeep: "#C84B11",
        orangeSoft: "#FF8C42",
        orangeTint: "#FFF3EC",
        orangeTintDeep: "#FFE4D1",
        background: "#FDFAF8",
        cloud: "#F7F1EC",
        ink: "#1F1B18",
        body: "#4A4440",
        muted: "#9B938D",
        faint: "#C4BBB4",
        line: "#F0E8E2",
        green: "#2DB87A",
        greenTint: "#E8F8F1",
        amberTint: "#FFF6E8",
        red: "#E6513B",
        redTint: "#FDEEEB",

        // ——— Legacy aliases → orange system ———
        primaryBlue: "#E8650A",
        deepNavy: "#1F1B18",
        skyBlue: "#FF8C42",
        iceBlue: "#FDFAF8",
        riskLow: "#2DB87A",
        riskModerate: "#F5A623",
        riskHigh: "#E6513B",
        deepTeal: "#C84B11",
        midTeal: "#E8650A",
        lightTeal: "#FFF3EC",
        sage: "#2DB87A",
        sageLight: "#E8F8F1",
        coral: "#E6513B",
        coralLight: "#FDEEEB",
        amber: "#F5A623",
        amberLight: "#FFF6E8",
        cream: "#F7F1EC",
        white: "#FFFFFF",
        charcoal: "#1F1B18",
        slate: "#9B938D",
        mist: "#C4BBB4",
        border: "#F0E8E2",
        teal: "#E8650A",
        purple: "#C84B11",
      },
    },
  },
  plugins: [],
};
