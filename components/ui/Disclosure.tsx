import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/ui/Icon";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type DisclosureProps = {
  label: string;
  children: ReactNode;
  /** Open on first render. Use for the one detail most people want. */
  defaultOpen?: boolean;
};

/**
 * A labelled row that reveals its detail on tap.
 *
 * Screens like the plan detail used to print every field inline — what it is,
 * why you are seeing it, review status, the exact protocol wording, the
 * triggering finding — which is a wall of text that buries the one line the
 * user actually needs. The essentials stay on screen; everything that answers
 * "tell me more" moves behind one of these.
 */
export function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.row}
      >
        <Text style={styles.label}>{label}</Text>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.slate}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={styles.body}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  row: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.mdSm,
    paddingVertical: spacing.mdSm,
  },
  label: {
    ...typography.bodyEmphasis,
    flex: 1,
    // A disclosure label is a control, not a link, so it stays charcoal.
    color: colors.heading,
  },
  body: {
    paddingBottom: spacing.base,
    borderRadius: radius.card,
  },
});
