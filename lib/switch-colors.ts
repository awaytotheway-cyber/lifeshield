/**
 * Colours for on/off switches and Yes/No toggles.
 * Same idea as MUI’s colour switches, but using LifeShield brand colours
 * (this app is React Native — we do not use MUI).
 *
 * Change a hex here and every switch that uses that colour name updates.
 */
export type SwitchColor = "primary" | "secondary" | "warning" | "default";

export const SWITCH_PALETTE: Record<
  SwitchColor,
  {
    thumbOn: string;
    trackOn: string;
    thumbOff: string;
    trackOff: string;
    selectedFill: string;
    selectedText: string;
    idleFill: string;
    idleText: string;
    idleBorder: string;
  }
> = {
  // Teal — default “on” colour (like MUI primary)
  primary: {
    thumbOn: "#1A535C",
    trackOn: "rgba(26, 83, 92, 0.45)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#1A535C",
    selectedText: "#FFF8F0",
    idleFill: "#FFFFFF",
    idleText: "#2D3436",
    idleBorder: "#A8C5A0",
  },
  // Sage — softer green (like MUI secondary)
  secondary: {
    thumbOn: "#A8C5A0",
    trackOn: "rgba(168, 197, 160, 0.7)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#A8C5A0",
    selectedText: "#2D3436",
    idleFill: "#FFFFFF",
    idleText: "#2D3436",
    idleBorder: "#A8C5A0",
  },
  // Coral — attention / safety questions (like MUI warning / custom pink)
  warning: {
    thumbOn: "#FF6B6B",
    trackOn: "rgba(255, 107, 107, 0.5)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#FF6B6B",
    selectedText: "#FFF8F0",
    idleFill: "#FFFFFF",
    idleText: "#2D3436",
    idleBorder: "#A8C5A0",
  },
  // Charcoal — quieter on/off (like MUI default)
  default: {
    thumbOn: "#2D3436",
    trackOn: "rgba(45, 52, 54, 0.38)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#2D3436",
    selectedText: "#FFF8F0",
    idleFill: "#FFFFFF",
    idleText: "#2D3436",
    idleBorder: "#A8C5A0",
  },
};
