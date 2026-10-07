import Svg, { Circle, Line } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { Accent, Ink, Paper } from "@/lib/specimen-tokens";

type MolecularStructureProps = {
  width?: number;
  height?: number;
};

/**
 * Simple connected-atom molecule for SNP consent.
 * Flat nodes and rounded bonds — a personalisation symbol, not a lab diagram.
 */
export function MolecularStructure({
  width = 100,
  height = 100,
}: MolecularStructureProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Molecular structure"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
    >
      <Circle cx={50} cy={50} r={42} fill={Accent.sageWash} />

      <Line
        x1={50}
        y1={50}
        x2={28}
        y2={28}
        stroke={Accent.tag}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={50}
        y1={50}
        x2={74}
        y2={30}
        stroke={Accent.tag}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={50}
        y1={50}
        x2={26}
        y2={68}
        stroke={Accent.tag}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={50}
        y1={50}
        x2={72}
        y2={72}
        stroke={Accent.tag}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={28}
        y1={28}
        x2={16}
        y2={42}
        stroke={Ink.soft}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={74}
        y1={30}
        x2={86}
        y2={44}
        stroke={Ink.soft}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={72}
        y1={72}
        x2={84}
        y2={60}
        stroke={Ink.soft}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <Circle cx={50} cy={50} r={9} fill={Accent.tag} />
      <Circle cx={28} cy={28} r={7} fill={Accent.sage} />
      <Circle cx={74} cy={30} r={7} fill={Accent.tag} />
      <Circle cx={26} cy={68} r={7} fill={Accent.sage} />
      <Circle cx={72} cy={72} r={7} fill={Accent.ochre} />
      <Circle cx={16} cy={42} r={4.5} fill={Accent.tagWash} />
      <Circle cx={86} cy={44} r={4.5} fill={Accent.tagWash} />
      <Circle cx={84} cy={60} r={4.5} fill={Paper.sheet} />
      <Circle cx={50} cy={50} r={3} fill={Paper.mount} />
    </Svg>
    </IllustrationFrame>
  );
}
