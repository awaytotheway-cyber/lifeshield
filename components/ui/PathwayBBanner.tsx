import { StyleSheet, Text, View } from "react-native";

import { PathwayBHandoff } from "@/components/illustrations";
import { DangerButton, TextButton } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type PathwayBBannerProps = {
  onFindDoctor?: () => void;
  onSavePlace?: () => void;
};

/**
 * Calm hand-off for Pathway B — a plain white card, not a red screen of doom.
 *
 * The illustration stays for now: removing the illustration set is its own
 * task, and this banner’s drawing goes with it.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <Surface padded={false} style={styles.wrap}>
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.md,
  },
  illustration: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    ...typography.displayL,
    color: colors.ink,
  },
  body: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
});
