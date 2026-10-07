import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";

import { Sheet } from "@/components/specimen/Sheet";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type EmptyStateProps = {
  icon?: IconName;
  heading: string;
  explanation: string;
  /** Optional drawing. When set, the icon is not shown. */
  illustration?: ReactNode;
};

/** Designed empty state — never “No data found”. */
export function EmptyState({
  icon = "inbox",
  heading,
  explanation,
  illustration,
}: EmptyStateProps) {
  return (
    <Sheet style={styles.wrap}>
      {illustration ?? (
        <Icon name={icon} size={32} color={Accent.tag} />
      )}
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{explanation}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Measure.loose,
    alignItems: "center",
    paddingHorizontal: Measure.base,
    paddingVertical: Measure.loose,
  },
  heading: {
    marginTop: 16,
    fontFamily: SpecimenType.serif,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: Accent.tag,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
    textAlign: "center",
  },
});
