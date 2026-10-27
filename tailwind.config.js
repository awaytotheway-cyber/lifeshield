/** @type {import('tailwindcss').Config} */
// PRESCOPE — the Moss palette. Keep in sync with lib/design-tokens.ts and
// global.css. NativeWind v5 also repeats these in global.css (@theme) because
// v5 is CSS-first.
//
// These are the only colour names there are: the blue glass aliases
// (primaryBlue, iceBlue, deepTeal, charcoal, slate, coral, cream, teal …) are
// gone rather than remapped, so a stale class fails loudly instead of quietly
// rendering the wrong hue. `mossBright` is a fill, never text.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0C0A",
        inkSoft: "#4F4F49",
        inkMuted: "#6B6B65",
        inkFaint: "#8A8A84",
        paper: "#F1F1EF",
        white: "#FFFFFF",
        mossDeep: "#5F6D17",
        mossMid: "#7D9022",
        mossBright: "#A3B82E",
        mossTint: "#EFF2E2",
        hairline: "#E4E4E0",
        // The three clinical statuses — fill and text, always with the word.
        withinRange: "#4A5612",
        withinRangeFill: "#EFF2E2",
        worthWatching: "#7A5610",
        worthWatchingFill: "#F0E6D2",
        worthDiscussing: "#9C3E16",
        worthDiscussingFill: "#F3DED4",
      },
      borderRadius: {
        // The three radii, and no others: look-at, press, round.
        surface: "20px",
        control: "4px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
