import { StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { colors, radius } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type QuestionnaireStepperProps = {
  current: number;
  total: number;
  /** Omitted on a section that may not be left by the back arrow. */
  onBack?: () => void;
};

/** The segment bar. Thin enough to be a measure, not a feature. */
const SEGMENT_HEIGHT = 3;

/**
 * Top chrome for a questionnaire section: the way back, "Section 3 of 10" as
 * a micro eyebrow, and one segment per section underneath.
 *
 * Segments rather than a sliding bar: ten sections is a countable number, so
 * the bar can say which ones are behind you instead of only how far along a
 * continuous fill has slid. `current` and `total` mean exactly what they did —
 * the first `current` segments are filled.
 */
export function QuestionnaireStepper({
  current,
  total,
  onBack,
}: QuestionnaireStepperProps) {
  const filled = Math.max(0, Math.min(total, current));

  return (
    <View style={styles.bar}>
      <View style={styles.topRow}>
        {onBack ? (
          <IconButton
            icon="arrow-left"
            accessibilityLabel={COPY.hubBack}
            onPress={onBack}
            // Pulled out to the screen gutter so the glyph, not its 44pt hit
            // area, lines up with the headline under it.
            style={styles.back}
          />
        ) : null}
        <Text style={styles.label}>
          Section {current} of {total}
        </Text>
      </View>

      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: Math.max(0, total) }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < filled ? styles.segmentFilled : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    marginLeft: -12,
  },
  label: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  track: {
    marginTop: 16,
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  segmentFilled: {
    backgroundColor: colors.mossDeep,
  },
});
