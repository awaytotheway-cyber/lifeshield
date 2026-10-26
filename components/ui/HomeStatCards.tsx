import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Surface } from "@/components/ui/Surface";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type HomeStatCardsProps = {
  questionnaireCount: number;
  questionnaireTotal: number;
  consentCount: number;
  consentTotal: number;
  testPlanReady: boolean;
  onPressQuestionnaire: () => void;
};

/**
 * Home progress summary: questionnaire ring on top, consents and test-plan
 * status side by side beneath. Replaces the flat three-number strip.
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
  const percent = Math.round(
    (questionnaireCount / (questionnaireTotal || 1)) * 100,
  );

  return (
    <View style={styles.wrap}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`Questionnaire, ${questionnaireCount} of ${questionnaireTotal} sections complete`}
        onPress={onPressQuestionnaire}
      >
        <Surface padded={false} style={styles.primaryCard}>
          <ProgressRing
            current={questionnaireCount}
            total={questionnaireTotal}
            size={72}
            thickness={7}
          >
            <Text style={styles.ringPercent}>{percent}%</Text>
          </ProgressRing>
          <View style={styles.primaryText}>
            <Text style={styles.primaryValue}>
              {questionnaireCount} of {questionnaireTotal}
            </Text>
            <Text style={styles.primaryLabel}>Sections complete</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.inkFaint} />
        </Surface>
      </PressScale>

      <View style={styles.row}>
        <Surface padded={false} style={styles.smallCard}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.mossTint },
            ]}
          >
            <Feather
              name={consentsDone ? "check" : "file-text"}
              size={18}
              color={consentsDone ? colors.mossDeep : colors.ink}
            />
          </View>
          <Text style={styles.smallValue}>
            {consentsDone ? "All signed" : `${consentCount} of ${consentTotal}`}
          </Text>
          <Text style={styles.smallLabel}>Consents</Text>
        </Surface>

        <Surface padded={false} style={styles.smallCard}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.mossTint },
            ]}
          >
            <Feather
              name={testPlanReady ? "check-circle" : "lock"}
              size={18}
              color={testPlanReady ? colors.mossDeep : colors.inkFaint}
            />
          </View>
          <Text style={[styles.smallValue, !testPlanReady && styles.smallValueMuted]}>
            {testPlanReady ? "Ready" : "Locked"}
          </Text>
          <Text style={styles.smallLabel}>
            {testPlanReady ? "Test plan" : "After questionnaire"}
          </Text>
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.mdSm,
  },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    padding: spacing.base,
  },
  primaryText: {
    flex: 1,
  },
  ringPercent: {
    ...typography.body,
    color: colors.ink,
  },
  primaryValue: {
    ...typography.title,
    color: colors.ink,
  },
  primaryLabel: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
  row: {
    flexDirection: "row",
    gap: spacing.mdSm,
  },
  smallCard: {
    flex: 1,
    padding: spacing.base,
    alignItems: "flex-start",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  smallValue: {
    ...typography.body,
    color: colors.ink,
  },
  smallValueMuted: {
    color: colors.inkSoft,
  },
  smallLabel: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
});
