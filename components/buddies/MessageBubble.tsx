import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type MessageBubbleProps = {
  body: string;
  /** Already formatted, `"08:14"`. The bubble does no date maths. */
  time: string;
  /** Mine is ink and right-aligned; theirs is white and left-aligned. */
  mine: boolean;
};

/**
 * Timestamp inside an ink bubble. `inkFaint` is 2.2:1 on ink and `inkMuted`
 * worse, so neither token can be used here — this is the board's own value,
 * which clears 6.3:1 on `ink`. Local by necessity, like `INK_PRESSED` in
 * Button.tsx, and it is a shade of the ink ramp rather than a new colour.
 */
const INK_BUBBLE_META = "#ADADA7";

/** Neither bubble may grow past this, per the board. */
const MAX_WIDTH = 282;

/**
 * One message.
 *
 * The corner that is 6 instead of 20 is the whole tail: bottom-right on mine,
 * bottom-left on theirs. There is no shadow, no border and no arrow — the
 * fill and that one corner carry the direction.
 */
export function MessageBubble({ body, time, mine }: MessageBubbleProps) {
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.body, mine ? styles.bodyMine : styles.bodyTheirs]}>
        {body}
      </Text>
      <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: MAX_WIDTH,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.ink,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: radius.surface,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    borderBottomRightRadius: radius.surface,
    borderBottomLeftRadius: 6,
  },
  body: {
    ...typography.body,
  },
  bodyMine: {
    color: colors.white,
  },
  bodyTheirs: {
    color: colors.ink,
  },
  time: {
    marginTop: 6,
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 15,
  },
  timeMine: {
    color: INK_BUBBLE_META,
  },
  timeTheirs: {
    color: colors.inkMuted,
  },
});
