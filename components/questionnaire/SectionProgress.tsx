import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { QUESTIONNAIRE_HUB_SECTIONS, type HubSectionKey } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, radius, status } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type SectionProgressProps = {
  progress: Record<string, boolean>;
  onPressSection: (key: HubSectionKey) => void;
};

/**
 * Section titles in constants are already numbered ("1. Demographics…").
 * The list reads its order from its own order, so the printed number is one
 * more thing to read and nothing more — strip it. Falls back to the full
 * title if the prefix ever changes.
 */
function stripOrdinal(title: string): string {
  return title.replace(/^\s*\d+\.\s*/, "");
}

/** A finished row, the row you are on, or one still ahead. */
type RowState = "done" | "current" | "upcoming";

/** A plain row. Comfortably past the 44pt floor. */
const ROW_HEIGHT = 60;

/** The row you are on is taller, so the eye lands on it first. */
const CURRENT_ROW_HEIGHT = 76;

/** The state dot. */
const DOT = 22;

/**
 * How far the tinted row bleeds past the card's text inset, so its fill looks
 * like part of the sheet rather than a chip dropped on top of it.
 */
const BLEED = 10;

/** Text on `mossTint` — the same pairing the `withinRange` chip uses. */
const ON_TINT = status.withinRange.text;

/**
 * The hub list: ten rows in one white sheet.
 *
 * A row carries its state in a dot — filled moss for done, a moss ring for
 * the one you are on, a grey ring for one still ahead — and the row you are
 * on is also filled with `mossTint` and a point past the others in height.
 * Nothing is told by colour alone: finished rows print "Done", and every row
 * reads its state aloud through its accessibility label.
 *
 * There is no topic glyph and no ordinal disc. Ten rows of chrome is what
 * made ten short section names read as one grey block.
 */
export function SectionProgress({
  progress,
  onPressSection,
}: SectionProgressProps) {
  // The row you are on is the first one still unanswered. Presentation only:
  // which sections may be opened, and in what order, is the hub's gate.
  const currentIndex = QUESTIONNAIRE_HUB_SECTIONS.findIndex(
    (section) => !progress[section.key],
  );

  return (
    <Surface padded={false} style={styles.sheet}>
      {QUESTIONNAIRE_HUB_SECTIONS.map((section, index) => {
        const done = Boolean(progress[section.key]);
        const state: RowState = done
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming";
        const current = state === "current";
        const last = index === QUESTIONNAIRE_HUB_SECTIONS.length - 1;

        return (
          <Pressable
            key={section.key}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}. ${done ? COPY.hubStatusDone : COPY.hubStatusNotStarted}`}
            onPress={() => onPressSection(section.key)}
            style={({ pressed }) => [
              styles.row,
              current ? styles.rowCurrent : null,
              // The divider sits under every row but the last, and never
              // under the tinted one — its fill is the separation already.
              !current && !last ? styles.rowDivided : null,
              pressed && !current ? styles.rowPressed : null,
            ]}
          >
            <View
              style={[
                styles.dot,
                done ? styles.dotDone : null,
                current ? styles.dotCurrent : null,
                state === "upcoming" ? styles.dotUpcoming : null,
              ]}
            >
              {done ? (
                <Feather name="check" size={12} color={colors.white} />
              ) : null}
            </View>

            <Text
              style={[
                styles.title,
                state === "upcoming" ? styles.titleUpcoming : null,
              ]}
              numberOfLines={2}
            >
              {stripOrdinal(section.title)}
            </Text>

            {done ? <Text style={styles.done}>{COPY.hubStatusDone}</Text> : null}
            {current ? (
              <Feather name="chevron-right" size={18} color={ON_TINT} />
            ) : null}
          </Pressable>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 20,
    // The card's own 20pt inset, split so the tinted row can bleed into it.
    paddingHorizontal: 20 - BLEED,
    paddingVertical: 8,
  },
  row: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: BLEED,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowDivided: {
    borderBottomWidth: 1,
    // Paper, not `hairline`: inside a white sheet the heavier line reads as a
    // rule between cards rather than a seam between rows.
    borderBottomColor: colors.paper,
  },
  rowCurrent: {
    minHeight: CURRENT_ROW_HEIGHT,
    marginVertical: 6,
    borderRadius: radius.control,
    backgroundColor: colors.mossTint,
  },
  rowPressed: {
    backgroundColor: colors.paper,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: {
    backgroundColor: colors.mossDeep,
  },
  dotCurrent: {
    borderWidth: 1.5,
    borderColor: colors.mossDeep,
  },
  dotUpcoming: {
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  title: {
    flex: 1,
    // 16 — the list-row size the board sets, one step over body copy so ten
    // of them in a column still read as things to tap.
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
  },
  titleUpcoming: {
    fontFamily: fontFamily.bodyMedium,
    color: colors.inkSoft,
  },
  done: {
    ...typography.label,
    color: colors.inkMuted,
  },
});
