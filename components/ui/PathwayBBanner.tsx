import { StyleSheet, Text, View } from "react-native";

import { PathwayBHandoff } from "@/components/illustrations";
import { DangerButton, TextButton } from "@/components/ui/Button";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type PathwayBBannerProps = {
  onFindDoctor?: () => void;
  onSavePlace?: () => void;
};

/**
 * Calm hand-off look for Pathway B — cream, not a red screen of doom.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <GlassSurface intensity="card" style={styles.wrap}>
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
    </GlassSurface>
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
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: colors.deepTeal,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
});
