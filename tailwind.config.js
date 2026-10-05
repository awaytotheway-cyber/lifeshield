/** @type {import('tailwindcss').Config} */
// PRESCOPE brand colours — "Blue Glass" palette.
// One name per colour: the old sage/coral/amber/teal/cream aliases are gone,
// because after two palette migrations they no longer described their values.
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
        heading: "#1A1A2E",
        skyBlue: "#6FA8F5",
        iceBlue: "#EAF1FF",
        appBackground: "#FAFBFC",

        // ——— Risk semantics (iOS system Green/Yellow/Red, retained) ———
        riskLow: "#34C759",
        riskModerate: "#FFCC00",
        riskHigh: "#FF3B30",

        // Text-safe risk variants. The vivid colours above are for fills,
        // icons and dots; coloured *words* use these, because the system
        // yellow and green fail WCAG AA as text on white.
        riskHighText: "#D70015",
        riskModerateText: "#8A6100",
        riskLowText: "#1B7F3B",

        // ——— Neutrals ———
        white: "#FFFFFF",
        charcoal: "#1A1A2E",
        slate: "#4A5568",
        mist: "#9AA5B4",
        border: "#D4E0F5",
        cardBorder: "#E5E7EB",

        // ——— Tinted backgrounds for chips and alert boxes ———
        riskLowLight: "#E8F8ED",
        riskModerateLight: "#FFF8DB",
        riskHighLight: "#FFE5E3",
        lightTeal: "#D6E4FF",

        // ——— Highlight accent — premium / highlights ———
        purple: "#AF52DE",
      },
    },
  },
  plugins: [],
};
