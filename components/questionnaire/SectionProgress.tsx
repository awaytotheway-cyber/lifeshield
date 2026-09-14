import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { COPY } from "@/lib/copy";
import { QUESTIONNAIRE_HUB_SECTIONS, type HubSectionKey } from "@/lib/constants";
import { colors, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type SectionProgressProps = {
  progress: Record<string, boolean>;
  onPressSection: (key: HubSectionKey) => void;
};

/**
 * Hub list. Tap a row to open that section.
 */
export function SectionProgress({
  progress,
  onPressSection,
}: SectionProgressProps) {
  return (
    <View style={styles.list}>
      {QUESTIONNAIRE_HUB_SECTIONS.map((section) => {
        const done = Boolean(progress[section.key]);
        return (
          <Pressable
            key={section.key}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}. ${done ? COPY.hubStatusDone : COPY.hubStatusNotStarted}`}
            onPress={() => onPressSection(section.key)}
          >
            <GlassSurface intensity="card" style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: done ? colors.sage : colors.border },
              ]}
            />
            <View style={styles.text}>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={[styles.status, done ? styles.done : styles.wait]}>
                {done ? COPY.hubStatusDone : COPY.hubStatusNotStarted}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.midTeal} />
            </GlassSurface>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
    gap: 8,
  },
  row: {
    minHeight: tapTarget,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  status: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
  },
  done: {
    color: colors.sage,
  },
  wait: {
    color: colors.slate,
  },
});
