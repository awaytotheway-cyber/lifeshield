/**
 * PRESCOPE Admin design tokens — shared blue-primary brand with the mobile app.
 * Hex values live here (and in CSS variables). Screens should import these.
 */
export const colors = {
  primaryBlue: "#2B5FE0",
  deepNavy: "#0B1E4D",
  skyBlue: "#6FA8F5",
  iceBlue: "#EAF1FF",
  riskLow: "#2FB8A6",
  riskModerate: "#F5A623",
  riskHigh: "#F26D6D",
  // Legacy aliases
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
  shadow: "rgba(43, 95, 224, 0.12)",
} as const;

export const shadows = {
  card: "0 8px 24px rgba(43, 95, 224, 0.12)",
  button: "0 4px 16px rgba(43, 95, 224, 0.22)",
  modal: "0 8px 32px rgba(11, 30, 77, 0.20)",
} as const;

export const radii = {
  card: 16,
  button: 12,
  input: 10,
  chip: 20,
  alert: 12,
} as const;

export const fonts = {
  display: '"Manrope", "Plus Jakarta Sans", system-ui, sans-serif',
  ui: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;
