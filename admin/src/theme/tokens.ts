/**
 * LifeShield Admin design tokens.
 * Clinician/ops tool: calm, precise, credible — not hospital-portal blue.
 * Hex values live here (and in CSS variables). Screens should import these.
 */
export const colors = {
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
  shadow: "rgba(13, 74, 92, 0.08)",
} as const;

export const shadows = {
  card: "0 2px 12px rgba(13, 74, 92, 0.08)",
  button: "0 4px 16px rgba(13, 74, 92, 0.16)",
  modal: "0 8px 32px rgba(13, 74, 92, 0.20)",
} as const;

export const radii = {
  card: 16,
  button: 12,
  input: 10,
  chip: 20,
  alert: 12,
} as const;

export const fonts = {
  display: '"DM Serif Display", Georgia, "Times New Roman", serif',
  ui: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;
