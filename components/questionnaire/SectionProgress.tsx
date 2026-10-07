import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";

import { Sheet } from "@/components/specimen/Sheet";
import { COPY } from "@/lib/copy";
import { QUESTIONNAIRE_HUB_SECTIONS, type HubSectionKey } from "@/lib/constants";
import { Accent, Ink, Measure, SpecimenType, tapTarget } from "@/lib/specimen-tokens";

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
            <Sheet style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: done ? Accent.sage : Ink.rule },
              ]}
            />
            <View style={styles.text}>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={[styles.status, done ? styles.done : styles.wait]}>
                {done ? COPY.hubStatusDone : COPY.hubStatusNotStarted}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={Accent.tag} />
            </Sheet>
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
    paddingHorizontal: Measure.base,
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
    fontFamily: SpecimenType.monoBold,
    fontSize: 17,
    color: Ink.full,
  },
  status: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
  },
  done: {
    color: Accent.sage,
  },
  wait: {
    color: Ink.soft,
  },
});
