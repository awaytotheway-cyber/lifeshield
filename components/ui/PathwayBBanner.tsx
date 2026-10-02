import { StyleSheet, Text, View } from "react-native";

import { PathwayBHandoff } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { COPY } from "@/lib/copy";
import { Colors, Gap, Radius, Space, typeStyle } from "@/lib/theme";

type PathwayBBannerProps = {
  onFindDoctor?: () => void;
  onSavePlace?: () => void;
};

/**
 * Calm hand-off look for Pathway B — warm and caring, not a red screen of
 * doom. The red is used only as a thin accent band behind the illustration.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <Card>
      <View style={styles.illustration}>
        <PathwayBHandoff width={160} height={140} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {COPY.pathwayBTitle}
      </Text>
      <Text style={styles.body}>{COPY.pathwayBBody}</Text>
      {onFindDoctor ? (
        <View style={styles.actions}>
          <PrimaryButton
            title={COPY.pathwayBFindDoctor}
            onPress={onFindDoctor}
            style={styles.primary}
          />
          {onSavePlace ? (
            <TextButton title={COPY.pathwayBSavePlace} onPress={onSavePlace} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Space.md,
    borderRadius: Radius.card - 4,
    backgroundColor: Colors.redTint,
  },
  title: {
    ...typeStyle("title"),
    marginTop: Space.lg,
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  actions: {
    marginTop: Gap.cards,
  },
  primary: {
    marginTop: 0,
  },
});
