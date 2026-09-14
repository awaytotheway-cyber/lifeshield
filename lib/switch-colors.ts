/**
 * Colours for on/off switches and Yes/No toggles.
 * Blue-primary brand; coral only for genuine attention / safety questions.
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
    thumbOn: "#2B5FE0",
    trackOn: "rgba(43, 95, 224, 0.45)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#2B5FE0",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0B1E4D",
    idleBorder: "#6FA8F5",
  },
  secondary: {
    thumbOn: "#2FB8A6",
    trackOn: "rgba(47, 184, 166, 0.7)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#2FB8A6",
    selectedText: "#0B1E4D",
    idleFill: "#FFFFFF",
    idleText: "#0B1E4D",
    idleBorder: "#2FB8A6",
  },
  warning: {
    thumbOn: "#F26D6D",
    trackOn: "rgba(242, 109, 109, 0.5)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#F26D6D",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0B1E4D",
    idleBorder: "#6FA8F5",
  },
  default: {
    thumbOn: "#0B1E4D",
    trackOn: "rgba(11, 30, 77, 0.38)",
    thumbOff: "#FAFAFA",
    trackOff: "#E0E0E0",
    selectedFill: "#0B1E4D",
    selectedText: "#FFFFFF",
    idleFill: "#FFFFFF",
    idleText: "#0B1E4D",
    idleBorder: "#6FA8F5",
  },
};
