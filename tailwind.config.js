/** @type {import('tailwindcss').Config} */
// PRESCOPE v2 — White + Dark Orange + Glassmorphism.
// Keep in sync with lib/design-tokens.ts and global.css.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        orangeDark: "#C84B11",
        orangeBright: "#E8650A",
        orangeLight: "#FF8C42",
        softWhite: "#FDF9F7",
        pureWhite: "#FFFFFF",
        orangeTint: "#FFF3EC",
        orangeTintDeep: "#FFE8D6",

        // Text / borders
        charcoal: "#1A1A1A",
        darkText: "#2D2D2D",
        bodyText: "#5C5C5C",
        mutedText: "#9B9B9B",
        placeholderText: "#C0B8B3",
        borderLight: "#F0E8E3",
        borderMedium: "#E0D5CE",

        // Status
        successGreen: "#2DB87A",
        warningAmber: "#F5A623",
        dangerRed: "#E63B3B",

        // Legacy aliases → orange glass system
        primaryBlue: "#C84B11",
        deepNavy: "#1A1A1A",
        skyBlue: "#FF8C42",
        iceBlue: "#FDF9F7",
        deepTeal: "#C84B11",
        midTeal: "#FF8C42",
        lightTeal: "#FFF3EC",
        teal: "#C84B11",
        sage: "#2DB87A",
        sageLight: "#E8F8F1",
        coral: "#E63B3B",
        coralLight: "#FFF0F0",
        amber: "#F5A623",
        amberLight: "#FFF8EC",
        cream: "#FDF9F7",
        white: "#FFFFFF",
        slate: "#5C5C5C",
        mist: "#9B9B9B",
        border: "#F0E8E3",
      },
    },
  },
  plugins: [],
};
