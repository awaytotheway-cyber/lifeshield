import { StyleSheet } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import { QUESTIONNAIRE_HUB_SECTIONS, type HubSectionKey } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { Space } from "@/lib/theme";

type SectionProgressProps = {
  progress: Record<string, boolean>;
  onPressSection: (key: HubSectionKey) => void;
};

/**
 * Hub list. Tap a row to open that section.
 *
 * PLAIN ENGLISH: one white card holding all ten sections as roomy rows. A
 * finished section shows a green “Done” pill; the rest show a chevron.
 */
export function SectionProgress({
  progress,
  onPressSection,
}: SectionProgressProps) {
  const lastIndex = QUESTIONNAIRE_HUB_SECTIONS.length - 1;

  return (
    <Card padded={false} style={styles.card}>
      {QUESTIONNAIRE_HUB_SECTIONS.map((section, index) => {
        const done = Boolean(progress[section.key]);
        return (
          <ListRow
            key={section.key}
            label={section.title}
            divider={index !== lastIndex}
            onPress={() => onPressSection(section.key)}
            // Finished sections get a green pill; the rest keep the chevron
            // so the row reads as an invitation rather than a status list.
            right={
              done ? <Chip label={COPY.hubStatusDone} tone="green" /> : undefined
            }
          />
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
});
