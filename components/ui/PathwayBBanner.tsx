import { StyleSheet, Text } from "react-native";

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
 * No drawing above the title. The handoff illustration went with the rest of
 * the set, and nothing replaced it: a graphic here would be the second thing
 * on the card asking to be looked at, and the one thing that matters is the
 * sentence telling the user to see a doctor.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <Surface padded={false} style={styles.wrap}>
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
