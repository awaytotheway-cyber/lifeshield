import { StyleSheet, Text, View } from "react-native";

import { PathwayBHandoff } from "@/components/illustrations";
import { DangerButton, TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { COPY } from "@/lib/copy";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type PathwayBBannerProps = {
  onFindDoctor?: () => void;
  onSavePlace?: () => void;
};

/**
 * Calm hand-off look for Pathway B — cream, not a red screen of doom.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <Sheet style={styles.wrap}>
      <View style={styles.illustration}>
        <PathwayBHandoff width={160} height={140} />
      </View>
      <Text style={styles.title}>{COPY.pathwayBTitle}</Text>
      <Text style={styles.body}>{COPY.pathwayBBody}</Text>
      {onFindDoctor ? (
        <DangerButton title={COPY.pathwayBFindDoctor} onPress={onFindDoctor} />
      ) : null}
      {onSavePlace ? (
        <TextButton title={COPY.pathwayBSavePlace} onPress={onSavePlace} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: Measure.loose,
  },
  illustration: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: SpecimenType.serif,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: Accent.tag,
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
  },
});
