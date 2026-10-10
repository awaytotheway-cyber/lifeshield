import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { PressScale } from "@/components/ui/PressScale";
import { COPY } from "@/lib/copy";
import { QUESTIONNAIRE_HUB_SECTIONS, type HubSectionKey } from "@/lib/constants";
import { colors, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type SectionProgressProps = {
  progress: Record<string, boolean>;
  onPressSection: (key: HubSectionKey) => void;
};

/**
 * Section titles in constants are already numbered ("1. Demographics…").
 * The row shows the number in its own circle, so strip the prefix rather
 * than printing it twice. Falls back to the full title if it ever changes.
 */
function stripOrdinal(title: string): string {
  return title.replace(/^\s*\d+\.\s*/, "");
}

const SECTION_ICONS: Record<HubSectionKey, keyof typeof Feather.glyphMap> = {
  demographics: "user",
  reproductive_menstrual: "activity",
  radiation_occupational: "alert-triangle",
  comorbidities: "thermometer",
  family_history: "users",
  personal_history: "clipboard",
  lifestyle: "sun",
  stress: "wind",
  diet_environment: "coffee",
  prior_screening: "search",
};

/**
 * Hub list. Tap a row to open that section. Each row carries its ordinal,
 * a topic glyph and a completion chip so ten rows don't read as one block.
 */
export function SectionProgress({
  progress,
  onPressSection,
}: SectionProgressProps) {
  return (
    <View style={styles.list}>
      {QUESTIONNAIRE_HUB_SECTIONS.map((section, index) => {
        const done = Boolean(progress[section.key]);
        return (
          <PressScale
            key={section.key}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}. ${done ? COPY.hubStatusDone : COPY.hubStatusNotStarted}`}
            onPress={() => onPressSection(section.key)}
          >
            <GlassSurface intensity="card" style={styles.row}>
              <View
                style={[styles.ordinal, done ? styles.ordinalDone : null]}
              >
                <Text
                  style={[
                    styles.ordinalText,
                    done ? styles.ordinalTextDone : null,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>

              <View style={styles.text}>
                <View style={styles.titleRow}>
                  <Feather
                    name={SECTION_ICONS[section.key]}
                    size={13}
                    color={done ? colors.sage : colors.primaryBlue}
                  />
                  <Text style={styles.title} numberOfLines={2}>
                    {stripOrdinal(section.title)}
                  </Text>
                </View>

                {done ? (
                  <View style={styles.chip}>
                    <Feather name="check" size={11} color={colors.sage} />
                    <Text style={styles.chipText}>{COPY.hubStatusDone}</Text>
                  </View>
                ) : (
                  <Text style={styles.wait}>{COPY.hubStatusNotStarted}</Text>
                )}
              </View>

              <Feather name="chevron-right" size={20} color={colors.mist} />
            </GlassSurface>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
    gap: 10,
  },
  row: {
    minHeight: tapTarget,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.mdSm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.mdSm,
  },
  ordinal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iceBlue,
  },
  ordinalDone: {
    backgroundColor: colors.sageLight,
  },
  ordinalText: {
    fontFamily: fontFamily.medical,
    fontSize: 13,
    color: colors.primaryBlue,
  },
  // deepNavy, not sage: sage on sageLight is ~2.4:1 and fails WCAG AA.
  // The tinted circle and green check carry the "done" meaning instead.
  ordinalTextDone: {
    color: colors.deepNavy,
  },
  text: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.deepNavy,
  },
  chip: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.sageLight,
  },
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    lineHeight: 16,
    color: colors.deepNavy,
  },
  wait: {
    marginTop: 6,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.mist,
  },
});
