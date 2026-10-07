import { Accent, Ink, Paper } from "@/lib/specimen-tokens";

/**
 * Colours for on/off switches and Yes/No toggles.
 *
 * Paper and ink, like everything else. The specimen tag is the "on"
 * state; ochre marks a genuine attention or safety question; sage
 * marks a benign affirmative. There is no second brand colour here.
 */
export type SwitchColor = "primary" | "secondary" | "warning" | "default";

type SwitchTones = {
  thumbOn: string;
  trackOn: string;
  thumbOff: string;
  trackOff: string;
  selectedFill: string;
  selectedText: string;
  idleFill: string;
  idleText: string;
  idleBorder: string;
};

const OFF = {
  thumbOff: Paper.mount,
  trackOff: Ink.rule,
  idleFill: Paper.mount,
  idleText: Ink.full,
  idleBorder: Ink.rule,
} as const;

export const SWITCH_PALETTE: Record<SwitchColor, SwitchTones> = {
  primary: {
    ...OFF,
    thumbOn: Accent.tag,
    trackOn: Accent.tagWash,
    selectedFill: Accent.tag,
    selectedText: Paper.sheet,
    idleBorder: Accent.tagEdge,
  },
  secondary: {
    ...OFF,
    thumbOn: Accent.sage,
    trackOn: Accent.sageWash,
    selectedFill: Accent.sage,
    selectedText: Paper.sheet,
    idleBorder: Accent.sageEdge,
  },
  warning: {
    ...OFF,
    thumbOn: Accent.ochre,
    trackOn: Accent.ochreWash,
    selectedFill: Accent.ochre,
    selectedText: Paper.sheet,
    idleBorder: Accent.ochreEdge,
  },
  default: {
    ...OFF,
    thumbOn: Ink.full,
    trackOn: Ink.rule,
    selectedFill: Ink.full,
    selectedText: Paper.sheet,
  },
};
