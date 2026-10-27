import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius, status } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type SafetyStripProps = {
  /** The sentence itself. Both call sites pass it verbatim — see below. */
  text: string;
  /**
   * `plain` is the shield-and-sentence line under the buddies list; `moss` is
   * the filled strip the chat board draws inside the thread.
   */
  tone?: "plain" | "moss";
};

/**
 * The two safety promises, as a component rather than as loose copy.
 *
 * They are the whole reason a stranger-to-stranger chat is shippable here, so
 * they are not decoration and they are not paraphrasable:
 *
 *   list   — "Buddies see only your first name, city and goals. You can block
 *             or leave a chat at any time."
 *   thread — "Results and reports are never shared in chat."
 *
 * The second one is kept true structurally, not by this line: `ChatMessage`
 * has no attachment and no result id (see the header of lib/chat.ts). If that
 * ever changes, this sentence becomes a lie and must come down with it.
 *
 * The moss tone uses the `withinRange` pairing (#4A5612 on `mossTint`) rather
 * than the board's #3A4210, which is not in the palette. Same hue, a token
 * pairing, and 7:1 on the tint.
 */
export function SafetyStrip({ text, tone = "plain" }: SafetyStripProps) {
  const moss = tone === "moss";
  const iconColor = moss ? status.withinRange.text : colors.inkMuted;

  return (
    <View style={[styles.row, moss ? styles.moss : styles.plain]}>
      <Feather
        name="shield"
        size={moss ? 20 : 18}
        color={iconColor}
        style={styles.icon}
      />
      <Text style={[styles.text, moss ? styles.mossText : styles.plainText]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  plain: {
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  moss: {
    backgroundColor: colors.mossTint,
    borderRadius: radius.surface,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  icon: {
    flexShrink: 0,
    marginRight: 11,
  },
  text: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
  },
  plainText: {
    color: colors.inkSoft,
    // 13 x 1.55 = 20.15
    lineHeight: 20,
  },
  mossText: {
    color: status.withinRange.text,
    // 13 x 1.45 = 18.85
    lineHeight: 19,
  },
});
