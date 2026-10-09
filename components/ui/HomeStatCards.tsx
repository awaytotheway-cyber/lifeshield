import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/components/ui/GlassCard";
import { PressScale } from "@/components/ui/PressScale";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

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
        <GlassCard intensity="card" style={styles.primaryCard}>
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
          <Feather name="chevron-right" size={20} color={colors.mist} />
        </GlassCard>
      </PressScale>

      <View style={styles.row}>
        <GlassCard intensity="card" style={styles.smallCard}>
          <View
            style={[
              styles.badge,
              { backgroundColor: consentsDone ? colors.sageLight : colors.iceBlue },
            ]}
          >
            <Feather
              name={consentsDone ? "check" : "file-text"}
              size={18}
              color={consentsDone ? colors.sage : colors.primaryBlue}
            />
          </View>
          <Text style={styles.smallValue}>
            {consentsDone ? "All signed" : `${consentCount} of ${consentTotal}`}
          </Text>
          <Text style={styles.smallLabel}>Consents</Text>
        </GlassCard>

        <GlassCard intensity="card" style={styles.smallCard}>
          <View
            style={[
              styles.badge,
              { backgroundColor: testPlanReady ? colors.sageLight : colors.iceBlue },
            ]}
          >
            <Feather
              name={testPlanReady ? "check-circle" : "lock"}
              size={18}
              color={testPlanReady ? colors.sage : colors.mist}
            />
          </View>
          <Text style={[styles.smallValue, !testPlanReady && styles.smallValueMuted]}>
            {testPlanReady ? "Ready" : "Locked"}
          </Text>
          <Text style={styles.smallLabel}>
            {testPlanReady ? "Test plan" : "After questionnaire"}
          </Text>
        </GlassCard>
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
    fontFamily: fontFamily.medical,
    fontSize: 15,
    color: colors.primaryBlue,
  },
  primaryValue: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    lineHeight: 28,
    color: colors.deepNavy,
  },
  primaryLabel: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate,
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
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  smallValue: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.deepNavy,
  },
  smallValueMuted: {
    color: colors.mist,
  },
  smallLabel: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
});
