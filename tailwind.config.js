/** @type {import('tailwindcss').Config} */
// PRESCOPE brand colours — "Blue Glass" palette.
// Keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
//
// Deviation from the base design system, agreed deliberately:
// risk/semantic colours stay on the iOS system Green/Yellow/Red because those
// read as medical-standard to users. Everything else is Blue Glass.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ——— Blue Glass primaries ———
        primaryBlue: "#2B5FE0",
        deepNavy: "#0B1E4D",
        skyBlue: "#6FA8F5",
        iceBlue: "#EAF1FF",

        // ——— Risk semantics (iOS system Green/Yellow/Red, retained) ———
        riskLow: "#34C759",
        riskModerate: "#FFCC00",
        riskHigh: "#FF3B30",

        // ——— Neutrals ———
        white: "#FFFFFF",
        charcoal: "#0B1E4D",
        slate: "#4A5568",
        mist: "#9AA5B4",
        border: "#D4E0F5",

        // ——— Tinted backgrounds for chips and alert boxes ———
        sageLight: "#E8F8ED",
        amberLight: "#FFF8DB",
        coralLight: "#FFE5E3",
        lightTeal: "#D6E4FF",

        // ——— Legacy aliases → Blue Glass / iOS risk ———
        sage: "#34C759",
        amber: "#FFCC00",
        coral: "#FF3B30",
        deepTeal: "#2B5FE0",
        midTeal: "#6FA8F5",
        teal: "#2B5FE0",
        cream: "#EAF1FF",
        purple: "#AF52DE",
      },
    },
  },
  plugins: [],
};
