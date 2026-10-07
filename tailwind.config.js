/** @type {import('tailwindcss').Config} */
// PRESCOPE — SPECIMEN. Paper and ink.
// Keep in sync with lib/specimen-tokens.ts and global.css.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Type scale raised one notch across the board. The app is read by
      // people managing their own health, many of them older; nothing in
      // the UI should sit below 14.
      fontSize: {
        xs: ["14px", "20px"],
        sm: ["16px", "24px"],
        base: ["18px", "28px"],
        lg: ["20px", "30px"],
        xl: ["22px", "30px"],
        "2xl": ["26px", "34px"],
        "3xl": ["32px", "38px"],
      },
      // The SPECIMEN palette — paper, ink, and one accent. These are the
      // only colour names in the system; there is no second vocabulary.
      colors: {
        paperSheet: "#f5f2eb",
        paperMount: "#fcfbf7",
        paperDeep: "#eae5d8",
        paperPlate: "#e3ddce",
        inkFull: "#1b1a17",
        inkSoft: "#56524a",
        inkFaint: "#8c8678",
        inkGhost: "#b4ae9f",
        rule: "#d8d2c4",
        ruleStrong: "#bdb5a2",
        tag: "#a4341f",
        tagWash: "#f3e4e0",
        sage: "#5f6b4c",
        sageWash: "#e7eade",
        ochre: "#9a6b28",
        ochreWash: "#f4ebda",
      },
    },
  },
  plugins: [],
};
