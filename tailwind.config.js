/** @type {import('tailwindcss').Config} */
// LifeShield brand colours — keep in sync with lib/design-tokens.ts and global.css.
// NativeWind v5 also repeats these in global.css (@theme) because v5 is CSS-first.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        deepTeal: "#0D4A5C",
        midTeal: "#1A7A9A",
        lightTeal: "#D6EEF5",
        sage: "#6B9E7A",
        sageLight: "#E8F3EB",
        coral: "#E8634A",
        coralLight: "#FDECEA",
        amber: "#D4873A",
        amberLight: "#FDF3E4",
        cream: "#FAF8F5",
        white: "#FFFFFF",
        charcoal: "#1C2329",
        slate: "#4A5568",
        mist: "#9AA5B4",
        border: "#E2E8F0",
        // Older screens still use className="bg-teal". Same as deep teal.
        teal: "#0D4A5C",
      },
    },
  },
  plugins: [],
};
