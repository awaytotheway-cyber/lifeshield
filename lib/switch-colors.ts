/**
 * Colours for on/off switches and Yes/No toggles.
 * Orange-primary LifeShield brand; coral (risk red) only for genuine attention / safety questions.
 * idleFill/idleText stay a light pill (white bg, dark ink) by design — a small,
 * self-contained legibility affordance that doesn't need to track the dark theme.
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
  primary: {
    thumbOn: "#FF6000",
    trackOn: "rgba(255, 96, 0, 0.45)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#FF6000",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0E0E0E",
    idleBorder: "#9C90E8",
  },
  secondary: {
    thumbOn: "#34D399",
    trackOn: "rgba(52, 211, 153, 0.7)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#34D399",
    selectedText: "#0E0E0E",
    idleFill: "#FFFFFF",
    idleText: "#0E0E0E",
    idleBorder: "#34D399",
  },
  warning: {
    thumbOn: "#F2545D",
    trackOn: "rgba(242, 84, 93, 0.5)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#F2545D",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0E0E0E",
    idleBorder: "#9C90E8",
  },
  default: {
    thumbOn: "#242424",
    trackOn: "rgba(36, 36, 36, 0.6)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#242424",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0E0E0E",
    idleBorder: "#9C90E8",
  },
};
