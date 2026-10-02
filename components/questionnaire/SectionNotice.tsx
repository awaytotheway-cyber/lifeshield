import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors, Radius, Space, typeStyle } from "@/lib/theme";

export type NoticeTone = "error" | "info";

type SectionNoticeProps = {
  message: string;
  /** error = soft red, info = soft orange. Defaults to error. */
  tone?: NoticeTone;
};

const TONES = {
  error: { bg: Colors.redTint, text: Colors.red, icon: "alert-circle" },
  info: { bg: Colors.orangeTint, text: Colors.orangeDeep, icon: "info" },
} as const;

/**
 * Inline message inside a questionnaire section — a failed load, a failed
 * save, or a short framing note.
 *
 * PLAIN ENGLISH: the small tinted strip that explains something went wrong
 * (or adds a note) without ever blanking the screen.
 */
export function SectionNotice({ message, tone = "error" }: SectionNoticeProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[styles.wrap, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
    >
      <Feather name={palette.icon} size={18} color={palette.text} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.lg,
    borderRadius: Radius.input,
    padding: Space.md + 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  text: {
    flex: 1,
    ...typeStyle("secondary"),
  },
});
