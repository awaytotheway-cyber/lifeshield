import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type HomeStatCardsProps = {
  questionnaireCount: number;
  questionnaireTotal: number;
  consentCount: number;
  consentTotal: number;
  testPlanReady: boolean;
  onPressQuestionnaire: () => void;
};

type StatCardProps = {
  label: string;
  /** The big number. Carries the meaning, so it is the only bold thing here. */
  value: string;
  /** The grey word after the number — "of 10", "signed". Grammar, not meaning. */
  unit: string;
  /** One line of grey detail under the number. */
  detail: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * One white stat card: a micro-caps label up top, then a big number with a
 * small grey unit and a line of grey detail pushed to the bottom.
 *
 * No border, no shadow, no icon badge — white on the paper ground is the
 * whole separation, and the number is the whole picture.
 */
function StatCard({
  label,
  value,
  unit,
  detail,
  onPress,
  accessibilityLabel,
}: StatCardProps) {
  const body = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View>
        <Text style={styles.value}>
          {value}
          <Text style={styles.unit}>{unit}</Text>
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.card} accessibilityRole="summary">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${value}${unit}`}
      onPress={onPress}
      // Moss does not bounce: a press on a white card fills it with the paper
      // ground rather than scaling or shadowing it.
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {body}
    </Pressable>
  );
}

/**
 * The two home stat cards, side by side: questionnaire progress and consents.
 *
 * `testPlanReady` is the questionnaire card's detail line rather than a third
 * card — the test plan is a consequence of finishing the questionnaire, not an
 * independent number, and the board gives this row exactly two cards.
 */
export function HomeStatCards({
  questionnaireCount,
  questionnaireTotal,
  consentCount,
  consentTotal,
  testPlanReady,
  onPressQuestionnaire,
}: HomeStatCardsProps) {
  const consentsDone = consentCount >= consentTotal;

  return (
    <View style={styles.row}>
      <StatCard
        label="Questionnaire"
        value={String(questionnaireCount)}
        unit={` of ${questionnaireTotal}`}
        detail={testPlanReady ? "Test plan ready" : "Test plan after this"}
        onPress={onPressQuestionnaire}
        accessibilityLabel={`Questionnaire, ${questionnaireCount} of ${questionnaireTotal} sections complete`}
      />
      <StatCard
        label="Consents"
        value={String(consentCount)}
        unit={` of ${consentTotal}`}
        detail={consentsDone ? "All answered" : "Answer each to go on"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.mdSm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.surface,
    // 18 / 18 / 20 — the board's card inset, tighter than the 20 Surface uses
    // because two of these sit in one 390pt row.
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
    minHeight: 118,
    justifyContent: "space-between",
  },
  cardPressed: {
    backgroundColor: colors.paper,
  },
  label: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  value: {
    ...typography.displayL,
    color: colors.ink,
  },
  /**
   * 17 / 500 / `inkFaint`, per the Home board. It is below the 24px floor the
   * token file sets for `inkFaint`, and deliberately so: the unit is part of
   * the display number's run, not a line of body copy, and the number beside
   * it carries the meaning on its own.
   */
  unit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 17,
    color: colors.inkFaint,
  },
  detail: {
    marginTop: 5,
    ...typography.label,
    // 13px, so `inkSoft` — `inkFaint` would fail AA at this size.
    color: colors.inkSoft,
    fontFamily: fontFamily.body,
  },
});
